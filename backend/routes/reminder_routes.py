import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from models import User, Patient, Reminder
from auth import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["Reminders"])

class StatusUpdateRequest(BaseModel):
    status: str # taken, snoozed, skipped, pending

@router.get("")
def get_patient_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns active medication reminders for the current patient (FR-25).
    """
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []

    reminders = db.query(Reminder).filter(Reminder.patient_id == patient.id).order_by(Reminder.created_at.desc()).all()
    return [{
        "id": r.id,
        "medicine": r.medicine,
        "dose": r.dose,
        "schedule": r.schedule_json or {"time": "08:00 AM", "frequency": "Daily"},
        "status": r.status,
        "created_at": r.created_at.strftime("%Y-%m-%d %H:%M")
    } for r in reminders]

@router.post("/{reminder_id}/status")
def update_reminder_status(
    reminder_id: str,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates medication adherence state: taken, snoozed, skipped (FR-25).
    """
    rem = db.query(Reminder).filter(Reminder.id == reminder_id).first()
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")

    if req.status not in ["taken", "snoozed", "skipped", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed: taken, snoozed, skipped, pending")

    rem.status = req.status
    db.commit()

    return {
        "id": rem.id,
        "medicine": rem.medicine,
        "status": rem.status,
        "message": f"Medication reminder status updated to '{rem.status}' (FR-25)."
    }

def auto_generate_reminders_from_extraction(patient_id: str, extracted_json: dict, db: Session):
    """
    Helper function automatically generating reminder rows from prescription extractions (FR-25).
    """
    medicines = extracted_json.get("medicines", [])
    created = []

    for med in medicines:
        name = med.get("name")
        if not name:
            continue

        dose = med.get("dose", "As prescribed")
        freq = med.get("frequency", "Once daily")

        existing = db.query(Reminder).filter(
            Reminder.patient_id == patient_id,
            Reminder.medicine == name,
            Reminder.status == "pending"
        ).first()

        if not existing:
            rem = Reminder(
                patient_id=patient_id,
                medicine=name,
                dose=dose,
                schedule_json={"time": "08:00 AM", "frequency": freq},
                status="pending"
            )
            db.add(rem)
            created.append(rem)

    if created:
        db.commit()
    return created
