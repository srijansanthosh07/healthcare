from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from db import get_db
from models import Event, Document, Extraction, Patient, EventRelationship
from intelligence import detect_and_store_relationships, detect_contradictions, detect_timeline_gaps, extract_lab_trends

router = APIRouter(prefix="/api", tags=["Timeline & Intelligence"])

@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(
    patient_id: str,
    event_type: Optional[str] = Query(None, description="Filter by event_type"),
    sort_order: str = Query("desc", description="Sort order: desc or asc"),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Step 1: Detect and persist AI relationships
    try:
        detect_and_store_relationships(patient_id, db)
    except Exception as e:
        print(f"Relationship detection warning: {e}")

    # Fetch events
    query = db.query(Event).filter(Event.patient_id == patient_id)
    if event_type:
        query = query.filter(Event.event_type == event_type)

    if sort_order.lower() == "asc":
        query = query.order_by(asc(Event.event_date))
    else:
        query = query.order_by(desc(Event.event_date))

    events = query.all()

    timeline_items = []
    for ev in events:
        doc = db.query(Document).filter(Document.id == ev.document_id).first()
        ext = db.query(Extraction).filter(Extraction.id == ev.extraction_id).first() if ev.extraction_id else None

        data = ev.data_json or {}
        event_confidence = float(data.get("confidence", ext.confidence if ext and ext.confidence else 1.0))
        is_flagged = data.get("flagged", False) or (ext and ext.status == "needs_review") or (event_confidence < 0.85)

        # Fetch relationship links for this event (Rule 1: Tag AI-generated vs Verified)
        rel_records = db.query(EventRelationship).filter(
            (EventRelationship.from_event_id == ev.id) | (EventRelationship.to_event_id == ev.id)
        ).all()

        relationships = []
        for r in rel_records:
            other_id = r.to_event_id if r.from_event_id == ev.id else r.from_event_id
            direction = "outgoing" if r.from_event_id == ev.id else "incoming"
            other_ev = db.query(Event).filter(Event.id == other_id).first()
            relationships.append({
                "relationship_id": r.id,
                "direction": direction,
                "related_event_id": other_id,
                "related_event_title": other_ev.data_json.get("title") if other_ev and other_ev.data_json else "Related Event",
                "relationship_type": r.relationship_type,
                "is_ai_generated": r.is_ai_generated, # Rule 1: Always explicit
                "is_verified": r.is_verified,
                "confidence": r.confidence,
                "reasoning": r.reasoning
            })

        timeline_items.append({
            "id": ev.id,
            "patient_id": ev.patient_id,
            "event_type": ev.event_type,
            "event_date": ev.event_date.strftime("%Y-%m-%d") if ev.event_date else None,
            "data": data,
            "confidence": event_confidence,
            "needs_review": is_flagged,
            "relationships": relationships,
            "source_document": {
                "id": doc.id if doc else ev.document_id,
                "storage_key": doc.storage_key if doc else "",
                "upload_type": doc.upload_type if doc else "pdf",
                "uploaded_at": doc.uploaded_at.isoformat() if doc else None,
                "file_url": f"/api/documents/{doc.id}/file" if doc else ""
            },
            "extraction": {
                "id": ext.id if ext else None,
                "status": ext.status if ext else "completed",
                "confidence": ext.confidence if ext else event_confidence
            }
        })

    # Step 2: Detect Contradictions (FR-17 / Rule 2: Flag both events)
    contradictions = detect_contradictions(timeline_items)
    contradiction_event_ids = set()
    for c in contradictions:
        contradiction_event_ids.add(c["event_id_1"])
        contradiction_event_ids.add(c["event_id_2"])

    for item in timeline_items:
        if item["id"] in contradiction_event_ids:
            item["has_contradiction"] = True

    # Step 3: Detect Timeline Gaps (FR-18 / Rule 3: Explicit gap markers)
    gaps = detect_timeline_gaps(timeline_items, gap_threshold_days=60)

    # Insert gap markers into stream
    stream_with_gaps = []
    gap_map = {g["after_event_id"]: g for g in gaps}

    for item in timeline_items:
        stream_with_gaps.append(item)
        if item["id"] in gap_map:
            g_data = gap_map[item["id"]]
            stream_with_gaps.append({
                "is_gap_marker": True,
                "id": f"gap-{g_data['after_event_id']}",
                "start_date": g_data["start_date"],
                "end_date": g_data["end_date"],
                "gap_days": g_data["gap_days"],
                "label": g_data["label"]
            })

    return {
        "patient_id": patient.id,
        "patient_code": patient.patient_code,
        "total_events": len(timeline_items),
        "flagged_events_count": sum(1 for item in timeline_items if item["needs_review"]),
        "contradiction_count": len(contradictions),
        "gap_count": len(gaps),
        "contradictions": contradictions,
        "events": stream_with_gaps
    }

@router.get("/patients/{patient_id}/trends")
def get_patient_lab_trends(patient_id: str, db: Session = Depends(get_db)):
    """
    Returns time series lab values for trend line charting (FR-16).
    """
    events = db.query(Event).filter(Event.patient_id == patient_id).all()
    event_dicts = []
    for ev in events:
        doc = db.query(Document).filter(Document.id == ev.document_id).first()
        event_dicts.append({
            "id": ev.id,
            "event_type": ev.event_type,
            "event_date": ev.event_date.strftime("%Y-%m-%d") if ev.event_date else None,
            "data": ev.data_json or {},
            "source_document": {"id": doc.id if doc else ev.document_id}
        })

    return extract_lab_trends(event_dicts)

@router.post("/relationships/{relationship_id}/verify")
def verify_relationship(relationship_id: str, db: Session = Depends(get_db)):
    """
    Clinician verification endpoint: marks an AI link as Doctor-Verified (FR-13).
    """
    rel = db.query(EventRelationship).filter(EventRelationship.id == relationship_id).first()
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship link not found")

    rel.is_verified = True
    rel.is_ai_generated = False # Doctor verified
    db.commit()

    return {
        "id": rel.id,
        "is_verified": True,
        "is_ai_generated": False,
        "message": "Relationship link verified by doctor."
    }
