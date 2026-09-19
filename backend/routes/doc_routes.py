import uuid
import os
import logging
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Response
from sqlalchemy.orm import Session

from config import settings
from db import get_db
from models import User, Patient, Document, Extraction
from auth import get_current_user
from minio_client import storage_client
from worker import process_document_job

logger = logging.getLogger("medtimeline.doc_routes")
router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate patient_id was provided (guards against empty/stale frontend state)
    if not patient_id or not patient_id.strip():
        raise HTTPException(status_code=400, detail="A valid patient_id is required to upload a document.")

    # Validate patient exists
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Authorization: only the patient themselves (or an admin) may upload to this record
    if current_user.role != "admin" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to upload documents for this patient.")

    # Validate file extension
    if not file.filename:
        raise HTTPException(status_code=400, detail="Uploaded file is missing a filename.")
    ext = os.path.splitext(file.filename)[1].lower().replace(".", "")
    if ext not in ["pdf", "png", "jpg", "jpeg"]:
        raise HTTPException(status_code=400, detail="Unsupported file format. Allowed: PDF, PNG, JPG")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum size of {settings.MAX_UPLOAD_SIZE_MB}MB")

    doc_id = str(uuid.uuid4())
    storage_key = f"patients/{patient_id}/{doc_id}_{file.filename}"

    # Step 1: Upload file to encrypted MinIO S3 object storage
    content_type = file.content_type or ("application/pdf" if ext == "pdf" else f"image/{ext}")
    try:
        storage_client.upload_file_bytes(storage_key, file_bytes, content_type=content_type)
    except Exception as e:
        logger.error(f"Storage upload failed for patient={patient_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Could not store document in object storage: {e}")

    # Step 2: Write documents row to DB
    doc = Document(
        id=doc_id,
        patient_id=patient_id,
        storage_key=storage_key,
        upload_type=ext,
        status="pending"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Step 3: Enqueue async processing job (Redis RQ with FastAPI background fallback)
    enqueued = False
    try:
        import redis
        from rq import Queue
        redis_conn = redis.from_url(settings.REDIS_URL)
        q = Queue(connection=redis_conn)
        q.enqueue(process_document_job, doc.id)
        enqueued = True
        logger.info(f"Enqueued job {doc.id} to Redis queue.")
    except Exception as e:
        logger.warning(f"Could not connect to Redis Queue ({e}). Executing via FastAPI async background task.")

    if not enqueued:
        background_tasks.add_task(process_document_job, doc.id)

    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "storage_key": doc.storage_key,
        "upload_type": doc.upload_type,
        "status": doc.status,
        "uploaded_at": doc.uploaded_at.isoformat(),
        "message": "Document uploaded successfully and extraction job enqueued."
    }

@router.get("/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    extraction = db.query(Extraction).filter(Extraction.document_id == document_id).first()
    return {
        "id": doc.id,
        "patient_id": doc.patient_id,
        "storage_key": doc.storage_key,
        "upload_type": doc.upload_type,
        "status": doc.status,
        "uploaded_at": doc.uploaded_at.isoformat(),
        "extraction": {
            "id": extraction.id if extraction else None,
            "confidence": extraction.confidence if extraction else None,
            "status": extraction.status if extraction else None,
            "raw_text": extraction.raw_text if extraction else None,
            "extracted_json": extraction.extracted_json if extraction else None
        } if extraction else None
    }

@router.get("/{document_id}/file")
def get_document_file(document_id: str, db: Session = Depends(get_db)):
    """
    Streams raw document file bytes from MinIO/Storage (FR-11).
    Ensures raw document is viewable even if extraction fails.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        file_bytes = storage_client.get_file_bytes(doc.storage_key)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"File not found in storage: {e}")

    media_type = "application/pdf" if doc.upload_type == "pdf" else f"image/{doc.upload_type}"
    return Response(content=file_bytes, media_type=media_type)
