import datetime
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from db import get_db
from models import User, Patient, DoctorProfile, AccessGrant, AuditLog

logger = logging.getLogger("medtimeline.rbac")

def write_audit_log(actor_id: str, patient_id: str, action: str, resource: str, db: Session):
    """
    Enforces mandatory audit log writing for all user data access (FR-22, FR-24).
    """
    try:
        log = AuditLog(
            actor_id=actor_id,
            patient_id=patient_id,
            action=action.upper(),
            resource=resource,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to write audit log entry: {e}")

def verify_patient_access_and_audit(
    patient_id: str,
    current_user: User,
    resource: str,
    action: str,
    db: Session
):
    """
    RBAC & Consent Verification Dependency (FR-3, FR-19, FR-20, FR-22, FR-23, FR-24).
    Enforces consent-based access grants, doctor verification, family-member scoping, emergency break-glass, and audit logging.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    # 1. Patient viewing own records
    if patient.user_id == current_user.id:
        write_audit_log(current_user.id, patient.id, action, resource, db)
        return patient

    # 2. Family Member requesting patient records (FR-23, FR-24)
    if current_user.role == "family":
        grant = db.query(AccessGrant).filter(
            AccessGrant.patient_id == patient.id,
            AccessGrant.grantee_id == current_user.id,
            AccessGrant.grantee_type == "family",
            AccessGrant.status == "approved"
        ).first()

        if not grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active family access grant found (FR-23)."
            )

        # Check expiration
        if grant.expires_at and grant.expires_at < datetime.datetime.utcnow():
            grant.status = "expired"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Family access grant has expired."
            )

        # Emergency Break-Glass Override (FR-24)
        if grant.is_emergency:
            write_audit_log(current_user.id, patient.id, "EMERGENCY_BREAK_GLASS", f"OVERRIDE: {grant.emergency_reason or 'Urgent care'}", db)
            return patient

        # Normal Scoped Access -> Write Audit Log
        write_audit_log(current_user.id, patient.id, f"FAMILY_READ_{grant.scope.upper()}", resource, db)
        return patient

    # 3. Doctor requesting patient records (FR-3, FR-19)
    if current_user.role == "doctor":
        doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
        if not doctor or not doctor.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Doctor account is pending hospital/admin verification (FR-3)."
            )

        grant = db.query(AccessGrant).filter(
            AccessGrant.patient_id == patient.id,
            AccessGrant.grantee_id == current_user.id,
            AccessGrant.status == "approved"
        ).first()

        if not grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient authorization required. No active access grant found (FR-19)."
            )

        if grant.expires_at and grant.expires_at < datetime.datetime.utcnow():
            grant.status = "expired"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Patient access grant has expired (FR-19)."
            )

        write_audit_log(current_user.id, patient.id, action, resource, db)
        return patient

    # 4. Admin access
    if current_user.role == "admin":
        write_audit_log(current_user.id, patient.id, action, resource, db)
        return patient

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient authorization to access this patient record.")
