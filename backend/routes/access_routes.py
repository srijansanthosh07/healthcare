import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from db import get_db
from models import User, Patient, DoctorProfile, Hospital, AccessGrant, AuditLog
from auth import get_current_user, hash_password
from access_control import write_audit_log

router = APIRouter(prefix="/api", tags=["Access, Consent & Family"])

class CreateAccessRequest(BaseModel):
    patient_code: str
    scope: str = "read_timeline"

class FamilyInviteRequest(BaseModel):
    email: str
    full_name: str
    relationship_label: str = "Spouse" # Spouse, Child, Parent, Sibling, Caregiver
    scope: str = "read_timeline" # read_timeline, medications_only, labs_only, full

class EmergencyAccessRequest(BaseModel):
    patient_id: str
    emergency_reason: str

@router.get("/hospitals")
def get_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).filter(Hospital.is_active == True).all()
    return [{"id": h.id, "name": h.name, "code": h.code, "address": h.address} for h in hospitals]

@router.post("/access-requests")
def create_access_request(
    req: CreateAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can submit access requests.")

    doctor = db.query(DoctorProfile).filter(DoctorProfile.user_id == current_user.id).first()
    if not doctor or not doctor.is_verified:
        raise HTTPException(status_code=403, detail="Doctor account pending hospital verification (FR-3).")

    patient = db.query(Patient).filter(Patient.patient_code == req.patient_code).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient code '{req.patient_code}' not found.")

    existing = db.query(AccessGrant).filter(
        AccessGrant.patient_id == patient.id,
        AccessGrant.grantee_id == current_user.id,
        AccessGrant.status.in_(["pending", "approved"])
    ).first()

    if existing:
        return {"id": existing.id, "status": existing.status, "message": f"Access request exists in status '{existing.status}'."}

    grant = AccessGrant(
        patient_id=patient.id,
        grantee_id=current_user.id,
        grantee_type="doctor",
        scope=req.scope,
        status="pending"
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)

    write_audit_log(current_user.id, patient.id, "REQUEST_ACCESS", "access_grant", db)

    return {
        "id": grant.id,
        "patient_id": patient.id,
        "patient_code": patient.patient_code,
        "scope": grant.scope,
        "status": grant.status,
        "message": "Access request created. Pending explicit patient approval (FR-19)."
    }

@router.get("/access-requests")
def list_access_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        grants = db.query(AccessGrant).filter(AccessGrant.patient_id == patient.id).order_by(AccessGrant.created_at.desc()).all()
    else:
        grants = db.query(AccessGrant).filter(AccessGrant.grantee_id == current_user.id).order_by(AccessGrant.created_at.desc()).all()

    res = []
    for g in grants:
        doc_user = db.query(User).filter(User.id == g.grantee_id).first()
        doc_prof = db.query(DoctorProfile).filter(DoctorProfile.user_id == g.grantee_id).first() if doc_user else None
        hosp = db.query(Hospital).filter(Hospital.id == doc_prof.hospital_id).first() if doc_prof and doc_prof.hospital_id else None
        patient_rec = db.query(Patient).filter(Patient.id == g.patient_id).first()

        res.append({
            "id": g.id,
            "patient_id": g.patient_id,
            "patient_code": patient_rec.patient_code if patient_rec else "N/A",
            "patient_name": patient_rec.profile_json.get("full_name") if patient_rec and patient_rec.profile_json else "Patient",
            "grantee_id": g.grantee_id,
            "grantee_type": g.grantee_type,
            "doctor_email": doc_user.email if doc_user else "User",
            "relationship_label": g.relationship_label,
            "is_emergency": g.is_emergency,
            "emergency_reason": g.emergency_reason,
            "hospital_name": hosp.name if hosp else "Family / Hospital",
            "scope": g.scope,
            "status": g.status,
            "expires_at": g.expires_at.strftime("%Y-%m-%d %H:%M") if g.expires_at else None,
            "created_at": g.created_at.strftime("%Y-%m-%d %H:%M")
        })
    return res

@router.post("/access-requests/{grant_id}/approve")
def approve_access_request(
    grant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    grant = db.query(AccessGrant).filter(AccessGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Access request not found")

    patient = db.query(Patient).filter(Patient.id == grant.patient_id).first()
    if not patient or patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the patient can approve their access request.")

    grant.status = "approved"
    grant.expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    db.commit()

    write_audit_log(current_user.id, patient.id, "APPROVE_ACCESS", "access_grant", db)

    return {"id": grant.id, "status": "approved", "message": "Access request approved."}

@router.post("/access-requests/{grant_id}/revoke")
def revoke_access_request(
    grant_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    grant = db.query(AccessGrant).filter(AccessGrant.id == grant_id).first()
    if not grant:
        raise HTTPException(status_code=404, detail="Access grant not found")

    patient = db.query(Patient).filter(Patient.id == grant.patient_id).first()
    if not patient or patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the patient can revoke access grants.")

    grant.status = "revoked"
    grant.is_emergency = False
    db.commit()

    write_audit_log(current_user.id, patient.id, "REVOKE_ACCESS", "access_grant", db)

    return {"id": grant.id, "status": "revoked", "message": "Access grant revoked immediately."}

# ==================== FAMILY MEMBER ACCESS ENDPOINTS (FR-23, FR-24) ====================

@router.post("/family/invite")
def invite_family_member(
    req: FamilyInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Patient links a family member with minimal approval friction (one tap invite + auto-approval) (FR-23).
    """
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=400, detail="Current user must have a patient profile to invite family.")

    # Find or create family user account
    family_user = db.query(User).filter(User.email == req.email).first()
    if not family_user:
        family_user = User(
            email=req.email,
            password_hash=hash_password("family1234"),
            role="family"
        )
        db.add(family_user)
        db.flush()

    # Reuse access_grants with grantee_type='family' (FR-23)
    existing_grant = db.query(AccessGrant).filter(
        AccessGrant.patient_id == patient.id,
        AccessGrant.grantee_id == family_user.id,
        AccessGrant.grantee_type == "family"
    ).first()

    if existing_grant:
        existing_grant.scope = req.scope
        existing_grant.relationship_label = req.relationship_label
        existing_grant.status = "approved" # One-tap auto approval for patient invites!
        grant = existing_grant
    else:
        grant = AccessGrant(
            patient_id=patient.id,
            grantee_id=family_user.id,
            grantee_type="family",
            relationship_label=req.relationship_label,
            scope=req.scope,
            status="approved", # Minimal friction auto-approved by patient invite
            expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=365)
        )
        db.add(grant)

    db.commit()
    write_audit_log(current_user.id, patient.id, "LINK_FAMILY_MEMBER", f"family_grant:{req.relationship_label}", db)

    return {
        "grant_id": grant.id,
        "family_email": req.email,
        "relationship_label": req.relationship_label,
        "scope": grant.scope,
        "status": "approved",
        "message": f"Family member '{req.email}' ({req.relationship_label}) linked with scope '{req.scope}' (FR-23)."
    }

@router.post("/family/emergency-access")
def trigger_emergency_access(
    req: EmergencyAccessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Family member triggers 24-hour Emergency Break-Glass Access (FR-24).
    Logs EMERGENCY_BREAK_GLASS in audit_logs and opens full timeline scope.
    """
    grant = db.query(AccessGrant).filter(
        AccessGrant.patient_id == req.patient_id,
        AccessGrant.grantee_id == current_user.id,
        AccessGrant.grantee_type == "family"
    ).first()

    if not grant:
        raise HTTPException(status_code=403, detail="You must be a linked family member to trigger emergency break-glass access.")

    grant.is_emergency = True
    grant.emergency_reason = req.emergency_reason
    grant.expires_at = datetime.datetime.utcnow() + datetime.timedelta(hours=24) # 24-hour emergency window
    db.commit()

    # Log mandatory Emergency Audit Trail (FR-24)
    write_audit_log(
        current_user.id,
        req.patient_id,
        "EMERGENCY_BREAK_GLASS",
        f"EMERGENCY: {req.emergency_reason}",
        db
    )

    return {
        "grant_id": grant.id,
        "is_emergency": True,
        "expires_at": grant.expires_at.strftime("%Y-%m-%d %H:%M"),
        "message": "Emergency Break-Glass Access activated for 24 hours. Action recorded in mandatory patient audit log (FR-24)."
    }

@router.get("/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient:
            return []
        logs = db.query(AuditLog).filter(AuditLog.patient_id == patient.id).order_by(AuditLog.timestamp.desc()).all()
    else:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()

    res = []
    for l in logs:
        actor = db.query(User).filter(User.id == l.actor_id).first()
        res.append({
            "id": l.id,
            "actor_id": l.actor_id,
            "actor_email": actor.email if actor else "System",
            "actor_role": actor.role if actor else "system",
            "patient_id": l.patient_id,
            "action": l.action,
            "is_emergency": "EMERGENCY" in l.action,
            "resource": l.resource,
            "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })
    return res
