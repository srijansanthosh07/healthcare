import os
import datetime
import logging
from sqlalchemy.orm import Session

from config import settings
from db import SessionLocal
from models import Document, Extraction, Event
from minio_client import storage_client
from ocr_nlp import extract_raw_text, run_llm_structured_extraction, evaluate_extraction_confidence

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medtimeline.worker")

def process_document_job(document_id: str):
    """
    Background job that processes document OCR + NLP extraction asynchronously.
    """
    logger.info(f"[Job Start] Processing document_id={document_id}")
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document id={document_id} not found in database.")
            return

        doc.status = "processing"
        db.commit()

        # Step 1: Retrieve file from MinIO storage
        try:
            file_bytes = storage_client.get_file_bytes(doc.storage_key)
        except Exception as e:
            logger.error(f"Failed to fetch storage_key={doc.storage_key}: {e}")
            doc.status = "failed"
            extraction = Extraction(
                document_id=doc.id,
                raw_text="[Error loading file from storage]",
                extracted_json={"error": str(e)},
                confidence=0.0,
                status="failed"
            )
            db.add(extraction)
            db.commit()
            return

        # Step 2: Run OCR + LLM/Heuristic Extraction (FR-11: Resilient wrapper)
        try:
            raw_text, is_handwritten = extract_raw_text(file_bytes, doc.storage_key)
            extracted_json = run_llm_structured_extraction(raw_text, doc.storage_key)
            avg_confidence, extraction_status = evaluate_extraction_confidence(extracted_json)

            # Step 3: Write to extractions table
            extraction = Extraction(
                document_id=doc.id,
                raw_text=raw_text,
                extracted_json=extracted_json,
                confidence=avg_confidence,
                status=extraction_status # 'completed' or 'needs_review'
            )
            db.add(extraction)
            db.flush() # get extraction.id

            # Step 4: Create Event records for patient timeline
            events_to_create = []

            # Process Medicines
            for med in extracted_json.get("medicines", []):
                events_to_create.append(Event(
                    patient_id=doc.patient_id,
                    document_id=doc.id,
                    extraction_id=extraction.id,
                    event_type="medication",
                    event_date=doc.uploaded_at or datetime.datetime.utcnow(),
                    data_json={
                        "title": f"Medication: {med.get('name', 'Unknown')}",
                        "medicine": med.get("name"),
                        "dose": med.get("dose"),
                        "frequency": med.get("frequency"),
                        "route": med.get("route"),
                        "confidence": med.get("confidence", 0.85),
                        "flagged": float(med.get("confidence", 0.85)) < settings.CONFIDENCE_THRESHOLD_CRITICAL,
                        "reasoning": med.get("reasoning", "")
                    }
                ))

            # Process Diagnoses
            for diag in extracted_json.get("diagnoses", []):
                # Try parsing diagnosis date
                d_str = diag.get("date")
                try:
                    ev_date = datetime.datetime.strptime(d_str, "%Y-%m-%d") if d_str else doc.uploaded_at
                except Exception:
                    ev_date = doc.uploaded_at

                events_to_create.append(Event(
                    patient_id=doc.patient_id,
                    document_id=doc.id,
                    extraction_id=extraction.id,
                    event_type="diagnosis",
                    event_date=ev_date or datetime.datetime.utcnow(),
                    data_json={
                        "title": f"Diagnosis: {diag.get('condition', 'Unspecified')}",
                        "condition": diag.get("condition"),
                        "clinical_status": diag.get("status", "Active"),
                        "confidence": diag.get("confidence", 0.80),
                        "flagged": float(diag.get("confidence", 0.80)) < settings.CONFIDENCE_THRESHOLD_HIGH,
                        "reasoning": diag.get("reasoning", "")
                    }
                ))

            # Process Lab Values
            for lab in extracted_json.get("lab_values", []):
                events_to_create.append(Event(
                    patient_id=doc.patient_id,
                    document_id=doc.id,
                    extraction_id=extraction.id,
                    event_type="lab_result",
                    event_date=doc.uploaded_at or datetime.datetime.utcnow(),
                    data_json={
                        "title": f"Lab Result: {lab.get('test_name', 'Test')}",
                        "test_name": lab.get("test_name"),
                        "value": lab.get("value"),
                        "unit": lab.get("unit"),
                        "reference_range": lab.get("reference_range"),
                        "status": lab.get("status", "Normal"),
                        "confidence": lab.get("confidence", 0.85),
                        "flagged": float(lab.get("confidence", 0.85)) < settings.CONFIDENCE_THRESHOLD_HIGH,
                        "reasoning": lab.get("reasoning", "")
                    }
                ))

            # Process Allergies
            for alg in extracted_json.get("allergies", []):
                events_to_create.append(Event(
                    patient_id=doc.patient_id,
                    document_id=doc.id,
                    extraction_id=extraction.id,
                    event_type="allergy",
                    event_date=doc.uploaded_at or datetime.datetime.utcnow(),
                    data_json={
                        "title": f"Allergy Flag: {alg.get('allergen', 'Unknown')}",
                        "allergen": alg.get("allergen"),
                        "reaction": alg.get("reaction"),
                        "confidence": alg.get("confidence", 0.85),
                        "flagged": float(alg.get("confidence", 0.85)) < settings.CONFIDENCE_THRESHOLD_CRITICAL,
                        "reasoning": alg.get("reasoning", "")
                    }
                ))

            if events_to_create:
                db.add_all(events_to_create)

            doc.status = "completed"
            db.commit()
            logger.info(f"[Job Complete] Processed document_id={doc.id} with {len(events_to_create)} timeline events created.")

        except Exception as pipeline_err:
            logger.error(f"Pipeline extraction exception for doc={doc.id}: {pipeline_err}")
            doc.status = "completed_with_errors"
            extraction = Extraction(
                document_id=doc.id,
                raw_text=f"[Partial raw text extraction error: {pipeline_err}]",
                extracted_json={"error": str(pipeline_err), "raw_text_available": True},
                confidence=0.0,
                status="failed"
            )
            db.add(extraction)
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    import redis
    from rq import Worker, Queue

    redis_conn = redis.from_url(settings.REDIS_URL)
    logger.info("Starting MedTimeline Redis RQ Worker...")
    worker = Worker(['default'], connection=redis_conn)
    worker.work()
