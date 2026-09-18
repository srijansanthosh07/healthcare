import random
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from sqlalchemy.orm import Session

from db import get_db
from models import User, Patient, DoctorProfile, Hospital
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str = "patient" # 'patient' or 'doctor'
    hospital_id: Optional[str] = None
    license_number: Optional[str] = None
    specialty: Optional[str] = None
    date_of_birth: str = "1988-05-14"
    blood_group: str = "O+"

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    role: str
    patient_id: Optional[str] = None
    patient_code: Optional[str] = None
    is_verified: bool = True
    hospital_name: Optional[str] = None

@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role
    )
    db.add(user)
    db.flush()

    patient_id = None
    patient_code = None
    is_verified = True
    hosp_name = None

    if req.role == "patient":
        patient_code = f"PT-{random.randint(10000, 99999)}"
        patient = Patient(
            user_id=user.id,
            patient_code=patient_code,
            profile_json={
                "full_name": req.full_name,
                "dob": req.date_of_birth,
                "blood_group": req.blood_group
            }
        )
        db.add(patient)
        db.flush()
        patient_id = patient.id
    elif req.role == "doctor":
        # FR-3: Doctor registration requires hospital affiliation and sets is_verified = False
        if not req.license_number:
            raise HTTPException(status_code=400, detail="Medical license number is required for doctor registration (FR-3).")

        # Pick default hospital if none provided
        hosp_id = req.hospital_id
        if not hosp_id:
            hosp = db.query(Hospital).first()
            if hosp:
                hosp_id = hosp.id

        doctor_prof = DoctorProfile(
            user_id=user.id,
            hospital_id=hosp_id,
            license_number=req.license_number,
            specialty=req.specialty or "General Medicine",
            is_verified=False # FR-3: Requires hospital verification before activation!
        )
        db.add(doctor_prof)
        db.flush()
        is_verified = False

        if hosp_id:
            h = db.query(Hospital).filter(Hospital.id == hosp_id).first()
            hosp_name = h.name if h else None

    db.commit()

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        patient_id=patient_id,
        patient_code=patient_code,
        is_verified=is_verified,
        hospital_name=hosp_name
    )

@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == user.id).first()
    hosp = db.query(Hospital).filter(Hospital.id == doctor.hospital_id).first() if doctor and doctor.hospital_id else None

    token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    return AuthResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        role=user.role,
        patient_id=patient.id if patient else None,
        patient_code=patient.patient_code if patient else None,
        is_verified=doctor.is_verified if doctor else True,
        hospital_name=hosp.name if hosp else None
    )

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    hosp = db.query(Hospital).filter(Hospital.id == doctor.hospital_id).first() if doctor and doctor.hospital_id else None

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_verified": doctor.is_verified if doctor else True,
        "doctor_profile": {
            "license_number": doctor.license_number,
            "specialty": doctor.specialty,
            "hospital_name": hosp.name if hosp else None
        } if doctor else None,
        "patient": {
            "id": patient.id if patient else None,
            "patient_code": patient.patient_code if patient else None,
            "profile": patient.profile_json if patient else {}
        } if patient else None
    }
