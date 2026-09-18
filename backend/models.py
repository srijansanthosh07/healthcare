import uuid
import datetime
from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, Index, JSON, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    role = Column(String(20), nullable=False, default="patient") # patient, doctor, admin
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient_profile = relationship("Patient", back_populates="user", uselist=False)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    patient_code = Column(String(50), nullable=False, unique=True, index=True)
    profile_json = Column(JSON, nullable=True) # { full_name, dob, gender, blood_group }

    user = relationship("User", back_populates="patient_profile")
    documents = relationship("Document", back_populates="patient")
    events = relationship("Event", back_populates="patient")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    storage_key = Column(String(255), nullable=False)
    upload_type = Column(String(10), nullable=False) # pdf, png, jpg
    status = Column(String(20), nullable=False, default="pending") # pending, processing, completed, failed
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="documents")
    extractions = relationship("Extraction", back_populates="document", uselist=False)
    events = relationship("Event", back_populates="document")

class Extraction(Base):
    __tablename__ = "extractions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False, unique=True)
    raw_text = Column(Text, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default="completed") # completed, needs_review, failed

    document = relationship("Document", back_populates="extractions")
    events = relationship("Event", back_populates="extraction")

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id"), nullable=False)
    extraction_id = Column(String(36), ForeignKey("extractions.id"), nullable=True)
    event_type = Column(String(50), nullable=False) # medication, lab_result, diagnosis, allergy
    event_date = Column(DateTime, nullable=False)
    data_json = Column(JSON, nullable=False)

    patient = relationship("Patient", back_populates="events")
    document = relationship("Document", back_populates="events")
    extraction = relationship("Extraction", back_populates="events")

    __table_args__ = (
        Index("idx_events_patient_date", "patient_id", "event_date"),
    )

class EventRelationship(Base):
    __tablename__ = "event_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    from_event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    to_event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    relationship_type = Column(String(50), nullable=False) # e.g. diagnosis_to_medication, diagnosis_to_lab, symptom_to_diagnosis
    is_ai_generated = Column(Boolean, nullable=False, default=True) # Rule 1: Always tag AI vs Doctor
    is_verified = Column(Boolean, nullable=False, default=False)
    confidence = Column(Float, nullable=False, default=0.85)
    reasoning = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    from_event = relationship("Event", foreign_keys=[from_event_id])
    to_event = relationship("Event", foreign_keys=[to_event_id])

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    address = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    doctors = relationship("DoctorProfile", back_populates="hospital")

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id"), nullable=True)
    license_number = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=True)
    is_verified = Column(Boolean, nullable=False, default=False) # FR-3: Hospital verification required!

    user = relationship("User")
    hospital = relationship("Hospital", back_populates="doctors")

class AccessGrant(Base):
    __tablename__ = "access_grants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    grantee_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True) # Doctor / Family User ID
    grantee_type = Column(String(20), nullable=False, default="doctor") # doctor, family, hospital
    scope = Column(String(50), nullable=False, default="read_timeline") # read_timeline, medications_only, labs_only, full
    status = Column(String(20), nullable=False, default="pending") # pending, approved, revoked, expired
    relationship_label = Column(String(50), nullable=True) # e.g. Spouse, Child, Parent
    is_emergency = Column(Boolean, nullable=False, default=False) # FR-24: Emergency break-glass flag
    emergency_reason = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient")
    grantee = relationship("User")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False) # READ, WRITE, APPROVE, REVOKE
    resource = Column(String(100), nullable=False) # timeline, document, extraction, access_grant
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    actor = relationship("User")

class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    medicine = Column(String(255), nullable=False)
    dose = Column(String(100), nullable=True)
    schedule_json = Column(JSON, nullable=True) # { time: "08:00 AM", frequency: "Twice daily" }
    status = Column(String(20), nullable=False, default="pending") # pending, taken, snoozed, skipped
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    patient_id = Column(String(36), ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True) # Doctor User ID
    slot_time = Column(DateTime, nullable=False)
    status = Column(String(20), nullable=False, default="scheduled") # scheduled, completed, cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient")
    doctor = relationship("User")



