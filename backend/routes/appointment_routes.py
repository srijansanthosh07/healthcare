import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import get_db
from models import User, Patient, DoctorProfile, Hospital, Appointment
from auth import get_current_user
from access_control import write_audit_log

router = APIRouter(prefix="/api", tags=["Appointments"])

class BookAppointmentRequest(BaseModel):
    doctor_id: str # User ID of doctor
    slot_time: str # e.g. "2026-09-22 10:00"
    notes: Optional[str] = None

@router.get("/doctors")
def get_verified_doctors(db: Session = Depends(get_db)):
    """
    Returns platform directory of registered and verified doctors (FR-26).
    Restricts booking to verified platform practitioners only.
    """
    doc_profiles = db.query(DoctorProfile).filter(DoctorProfile.is_verified == True).all()
    res = []
    for dp in doc_profiles:
        doc_user = db.query(User).filter(User.id == dp.user_id).first()
        hosp = db.query(Hospital).filter(Hospital.id == dp.hospital_id).first() if dp.hospital_id else None
        res.append({
            "doctor_user_id": dp.user_id,
            "email": doc_user.email if doc_user else "Doctor",
            "license_number": dp.license_number,
            "specialty": dp.specialty or "General Medicine",
            "hospital_name": hosp.name if hosp else "Affiliated Clinic",
            "hospital_address": hosp.address if hosp else ""
        })
    return res

@router.post("/appointments")
def book_appointment(
    req: BookAppointmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Patient books an appointment with a verified platform doctor (FR-26).
    """
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    patient_id = patient.id if patient else "demo-patient-01"

    # Verify target doctor is registered and verified on platform (FR-26 Rule)
    doctor_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == req.doctor_id).first()
    if not doctor_prof or not doctor_prof.is_verified:
        raise HTTPException(
            status_code=400,
            detail="Appointments can only be booked with verified doctors registered on the MedTimeline platform (FR-26)."
        )

    try:
        s_time = datetime.datetime.strptime(req.slot_time, "%Y-%m-%d %H:%M")
    except Exception:
        s_time = datetime.datetime.utcnow() + datetime.timedelta(days=2)

    appt = Appointment(
        patient_id=patient_id,
        doctor_id=req.doctor_id,
        slot_time=s_time,
        status="scheduled",
        notes=req.notes
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    write_audit_log(current_user.id, patient_id, "BOOK_APPOINTMENT", "appointment", db)

    return {
        "id": appt.id,
        "doctor_id": req.doctor_id,
        "slot_time": appt.slot_time.strftime("%Y-%m-%d %H:%M"),
        "status": appt.status,
        "message": "Appointment booked successfully with verified practitioner (FR-26)."
    }

@router.get("/appointments")
def get_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists booked appointments for patient or doctor (FR-26).
    """
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        p_id = patient.id if patient else "demo-patient-01"
        appts = db.query(Appointment).filter(Appointment.patient_id == p_id).order_by(Appointment.slot_time.asc()).all()
    elif current_user.role == "doctor":
        appts = db.query(Appointment).filter(Appointment.doctor_id == current_user.id).order_by(Appointment.slot_time.asc()).all()
    else:
        appts = db.query(Appointment).order_by(Appointment.slot_time.asc()).all()

    res = []
    for a in appts:
        doc_user = db.query(User).filter(User.id == a.doctor_id).first()
        doc_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == a.doctor_id).first()
        hosp = db.query(Hospital).filter(Hospital.id == doc_prof.hospital_id).first() if doc_prof and doc_prof.hospital_id else None
        patient_rec = db.query(Patient).filter(Patient.id == a.patient_id).first()

        res.append({
            "id": a.id,
            "patient_name": patient_rec.profile_json.get("full_name") if patient_rec and patient_rec.profile_json else "Patient",
            "patient_code": patient_rec.patient_code if patient_rec else "N/A",
            "doctor_email": doc_user.email if doc_user else "Doctor",
            "hospital_name": hosp.name if hosp else "Clinic",
            "slot_time": a.slot_time.strftime("%Y-%m-%d %H:%M"),
            "status": a.status,
            "notes": a.notes
        })
    return res

@router.post("/appointments/{appointment_id}/cancel")
def cancel_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    appt.status = "cancelled"
    db.commit()

    write_audit_log(current_user.id, appt.patient_id, "CANCEL_APPOINTMENT", "appointment", db)

    return {"id": appt.id, "status": "cancelled", "message": "Appointment cancelled."}
