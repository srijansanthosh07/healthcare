import datetime
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from models import Event, EventRelationship

logger = logging.getLogger("medtimeline.intelligence")

# Diagnostic & Therapeutic Mapping Rules for AI Relationship Engine (FR-13)
THERAPEUTIC_MAP = {
    "diabetes": ["metformin", "insulin", "glipizide", "jardiance", "hba1c", "glucose"],
    "hypertension": ["amlodipine", "lisinopril", "losartan", "metoprolol", "blood pressure"],
    "hyperlipidemia": ["atorvastatin", "simvastatin", "rosuvastatin", "cholesterol", "lipid"],
    "coronary": ["aspirin", "clopidogrel", "atorvastatin", "nitroglycerin", "troponin", "ekg"],
    "infection": ["amoxicillin", "azithromycin", "ciprofloxacin", "wbc", "fever"]
}

def detect_and_store_relationships(patient_id: str, db: Session) -> List[EventRelationship]:
    """
    Scans patient events and infers relationships (symptom -> diagnosis -> lab -> prescription).
    Every inferred link is explicitly tagged is_ai_generated=True (Rule 1).
    """
    events = db.query(Event).filter(Event.patient_id == patient_id).order_by(Event.event_date.asc()).all()
    if len(events) < 2:
        return []

    created_rel_ids = set()

    for i, ev_from in enumerate(events):
        data_from = ev_from.data_json or {}
        text_from = (str(data_from.get("title", "")) + " " +
                     str(data_from.get("condition", "")) + " " +
                     str(data_from.get("test_name", "")) + " " +
                     str(data_from.get("medicine", ""))).lower()

        for j, ev_to in enumerate(events):
            if i >= j:
                continue # Only forward in time or cross-category

            data_to = ev_to.data_json or {}
            text_to = (str(data_to.get("title", "")) + " " +
                       str(data_to.get("condition", "")) + " " +
                       str(data_to.get("test_name", "")) + " " +
                       str(data_to.get("medicine", ""))).lower()

            rel_type = None
            reason = ""

            # Check Diagnosis -> Medication link
            if ev_from.event_type == "diagnosis" and ev_to.event_type == "medication":
                cond = data_from.get("condition", "").lower()
                med = data_to.get("medicine", "").lower()

                for key, targets in THERAPEUTIC_MAP.items():
                    if key in cond and any(t in med for t in targets):
                        rel_type = "diagnosis_to_medication"
                        reason = f"AI Inferred: Diagnosis '{data_from.get('condition')}' indicates prescription of '{data_to.get('medicine')}'."
                        break

            # Check Diagnosis -> Lab Result link
            elif ev_from.event_type == "diagnosis" and ev_to.event_type == "lab_result":
                cond = data_from.get("condition", "").lower()
                lab = data_to.get("test_name", "").lower()

                for key, targets in THERAPEUTIC_MAP.items():
                    if key in cond and any(t in lab for t in targets):
                        rel_type = "diagnosis_to_lab"
                        reason = f"AI Inferred: Diagnosis '{data_from.get('condition')}' prompts monitoring lab '{data_to.get('test_name')}'."
                        break

            # Check Lab Result -> Medication link
            elif ev_from.event_type == "lab_result" and ev_to.event_type == "medication":
                lab_status = data_from.get("status", "")
                if lab_status in ["High", "Abnormal"]:
                    rel_type = "lab_to_prescription"
                    reason = f"AI Inferred: Abnormal lab '{data_from.get('test_name')}' ({data_from.get('value')}) triggered medication '{data_to.get('medicine')}'."

            if rel_type:
                # Check if relationship already exists
                existing = db.query(EventRelationship).filter(
                    EventRelationship.from_event_id == ev_from.id,
                    EventRelationship.to_event_id == ev_to.id
                ).first()

                if not existing:
                    rel = EventRelationship(
                        from_event_id=ev_from.id,
                        to_event_id=ev_to.id,
                        relationship_type=rel_type,
                        is_ai_generated=True, # Rule 1: Explicit AI lineage tag
                        is_verified=False,
                        confidence=0.88,
                        reasoning=reason
                    )
                    db.add(rel)
                    created_rel_ids.add(rel.id)

    db.commit()
    logger.info(f"Detected and stored {len(created_rel_ids)} AI event relationships for patient={patient_id}")
    return db.query(EventRelationship).filter(EventRelationship.from_event_id.in_([e.id for e in events])).all()


def detect_contradictions(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Scans patient events for conflicting structured facts (e.g. allergy status).
    Flags BOTH events rather than resolving automatically (Rule 2 / FR-17).
    """
    contradictions = []
    
    # 1. Check Allergy Contradictions (e.g. "No Known Drug Allergies" vs active "Penicillin Allergy")
    allergies = [e for e in events if e.get("event_type") == "allergy"]
    for i, a1 in enumerate(allergies):
        for j, a2 in enumerate(allergies):
            if i >= j:
                continue
            d1 = a1.get("data", {})
            d2 = a2.get("data", {})
            alg1 = str(d1.get("allergen", "")).lower()
            alg2 = str(d2.get("allergen", "")).lower()

            if ("nkda" in alg1 or "none" in alg1 or "no known" in alg1) and ("nkda" not in alg2 and "none" not in alg2 and "no known" not in alg2 and len(alg2) > 2):
                contradictions.append({
                    "event_id_1": a1["id"],
                    "event_id_2": a2["id"],
                    "field": "allergies",
                    "conflict_type": "Conflicting Allergy Status",
                    "description": f"Document on {a1['event_date']} records '{d1.get('allergen')}', but document on {a2['event_date']} lists specific allergy '{d2.get('allergen')}'.",
                    "severity": "danger"
                })

    # 2. Check Medication Dosage Contradictions (same drug name with conflicting doses in short window)
    meds = [e for e in events if e.get("event_type") == "medication"]
    for i, m1 in enumerate(meds):
        for j, m2 in enumerate(meds):
            if i >= j:
                continue
            d1 = m1.get("data", {})
            d2 = m2.get("data", {})
            name1 = str(d1.get("medicine", "")).lower()
            name2 = str(d2.get("medicine", "")).lower()

            if name1 and name1 == name2:
                dose1 = str(d1.get("dose", "")).lower()
                dose2 = str(d2.get("dose", "")).lower()
                if dose1 and dose2 and dose1 != dose2:
                    contradictions.append({
                        "event_id_1": m1["id"],
                        "event_id_2": m2["id"],
                        "field": "medication_dosage",
                        "conflict_type": "Conflicting Drug Dosage",
                        "description": f"Conflicting dosage for {d1.get('medicine')}: {d1.get('dose')} ({m1['event_date']}) vs {d2.get('dose')} ({m2['event_date']}).",
                        "severity": "warning"
                    })

    return contradictions


def detect_timeline_gaps(events: List[Dict[str, Any]], gap_threshold_days: int = 60) -> List[Dict[str, Any]]:
    """
    Identifies unrecorded gaps (>60 days) between consecutive patient events.
    Returns gap markers labeled 'No record available for X days' (Rule 3 / FR-18).
    """
    if len(events) < 2:
        return []

    # Sort events by date ascending
    sorted_events = sorted([e for e in events if e.get("event_date")], key=lambda x: x["event_date"])
    gaps = []

    for i in range(len(sorted_events) - 1):
        e1 = sorted_events[i]
        e2 = sorted_events[i + 1]

        try:
            d1 = datetime.datetime.strptime(e1["event_date"], "%Y-%m-%d")
            d2 = datetime.datetime.strptime(e2["event_date"], "%Y-%m-%d")
            delta = (d2 - d1).days

            if delta >= gap_threshold_days:
                months = round(delta / 30.44, 1)
                gaps.append({
                    "type": "gap_marker",
                    "start_date": e1["event_date"],
                    "end_date": e2["event_date"],
                    "gap_days": delta,
                    "gap_months": months,
                    "label": f"No record available for {delta} days ({months} months)",
                    "after_event_id": e1["id"],
                    "before_event_id": e2["id"]
                })
        except Exception:
            continue

    return gaps


def extract_lab_trends(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Groups repeated numeric lab values across events for time-series charting (FR-16).
    """
    lab_events = [e for e in events if e.get("event_type") == "lab_result"]
    trends_by_test = {}

    for le in lab_events:
        data = le.get("data", {})
        test_name = data.get("test_name", "Unknown Test")
        val_str = str(data.get("value", ""))

        # Parse numeric value from text
        try:
            num_val = float(val_str.replace(",", "").strip())
        except ValueError:
            continue

        if test_name not in trends_by_test:
            trends_by_test[test_name] = {
                "test_name": test_name,
                "unit": data.get("unit", ""),
                "reference_range": data.get("reference_range", ""),
                "data_points": []
            }

        trends_by_test[test_name]["data_points"].append({
            "event_id": le["id"],
            "date": le.get("event_date"),
            "value": num_val,
            "status": data.get("status", "Normal"),
            "document_id": le.get("source_document", {}).get("id")
        })

    # Sort data points chronologically for each test
    for t_name, t_data in trends_by_test.items():
        t_data["data_points"].sort(key=lambda x: x["date"] or "")

    return {
        "tests_count": len(trends_by_test),
        "trends": list(trends_by_test.values())
    }
