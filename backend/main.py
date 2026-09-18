import logging
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from config import settings
from db import init_db, SessionLocal
from models import User, Patient, Document, Extraction, Event, Hospital, DoctorProfile, AccessGrant, Reminder, Appointment
from auth import hash_password

from routes.auth_routes import router as auth_router
from routes.doc_routes import router as doc_router
from routes.timeline_routes import router as timeline_router
from routes.access_routes import router as access_router
from routes.reminder_routes import router as reminder_router
from routes.appointment_routes import router as appointment_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medtimeline.main")

app = FastAPI(
    title="MedTimeline Complete Platform API",
    description="Medical Intelligence Platform with OCR/LLM Extraction, Consent Access, Audit Logging, Reminders & Appointments",
    version="4.0.0"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(doc_router)
app.include_router(timeline_router)
app.include_router(access_router)
app.include_router(reminder_router)
app.include_router(appointment_router)

@app.on_event("startup")
def on_startup():
    init_db()
    seed_demo_data()

def seed_demo_data():
    """Seeds hospitals, verified/unverified doctors, access grants, reminders, appointments, demo patient, and events."""
    db: Session = SessionLocal()
    try:
        # 1. Seed Hospitals (FR-3)
        h1 = db.query(Hospital).filter(Hospital.code == "HOSP-STJUDE").first()
        if not h1:
            h1 = Hospital(name="St. Jude Medical Center", code="HOSP-STJUDE", address="742 Evergreen Terrace")
            h2 = Hospital(name="Metropolitan General Hospital", code="HOSP-METRO", address="100 Hospital Plaza")
            db.add_all([h1, h2])
            db.flush()

        # 2. Seed Demo Patient (FR-1)
        user = db.query(User).filter(User.email == "demo@medtimeline.com").first()
        if not user:
            logger.info("Seeding demo patient, doctors, hospitals, reminders, and appointments...")
            user = User(
                email="demo@medtimeline.com",
                password_hash=hash_password("demo1234"),
                role="patient"
            )
            db.add(user)
            db.flush()

            patient = Patient(
                user_id=user.id,
                patient_code="PT-88392",
                profile_json={
                    "full_name": "Eleanor Vance",
                    "dob": "1985-04-12",
                    "gender": "Female",
                    "blood_group": "A+"
                }
            )
            db.add(patient)
            db.flush()

            # 3. Seed Verified Doctor (FR-3, FR-26)
            doc_user = User(
                email="dr.house@stjude.org",
                password_hash=hash_password("doc1234"),
                role="doctor"
            )
            db.add(doc_user)
            db.flush()

            doc_prof = DoctorProfile(
                user_id=doc_user.id,
                hospital_id=h1.id,
                license_number="MD-99482-NY",
                specialty="Cardiology & Internal Medicine",
                is_verified=True # Verified doctor
            )
            db.add(doc_prof)
            db.flush()

            # 4. Seed Approved Access Grant (FR-19, FR-20)
            grant = AccessGrant(
                patient_id=patient.id,
                grantee_id=doc_user.id,
                grantee_type="doctor",
                scope="read_timeline",
                status="approved",
                expires_at=datetime.datetime.utcnow() + datetime.timedelta(days=30)
            )
            db.add(grant)
            db.flush()

            # 5. Seed Medication Reminders (FR-25)
            r1 = Reminder(patient_id=patient.id, medicine="Metformin", dose="500 mg", schedule_json={"time": "08:00 AM", "frequency": "Twice daily"}, status="pending")
            r2 = Reminder(patient_id=patient.id, medicine="Atorvastatin", dose="40 mg", schedule_json={"time": "09:00 PM", "frequency": "Once daily at bedtime"}, status="taken")
            db.add_all([r1, r2])

            # 6. Seed Doctor Appointments (FR-26)
            appt1 = Appointment(patient_id=patient.id, doctor_id=doc_user.id, slot_time=datetime.datetime.utcnow() + datetime.timedelta(days=3, hours=2), status="scheduled", notes="Routine quarterly cardiology checkup")
            db.add(appt1)

            # 7. Seed Documents, Extractions, and Events
            doc1 = Document(id="doc-demo-01", patient_id=patient.id, storage_key="lab_2025_08.pdf", upload_type="pdf", status="completed", uploaded_at=datetime.datetime(2025, 8, 10))
            doc2 = Document(id="doc-demo-02", patient_id=patient.id, storage_key="visit_2026_01.pdf", upload_type="pdf", status="completed", uploaded_at=datetime.datetime(2026, 1, 10))
            doc3 = Document(id="doc-demo-03", patient_id=patient.id, storage_key="rx_2026_03.png", upload_type="png", status="completed", uploaded_at=datetime.datetime(2026, 3, 10))
            db.add_all([doc1, doc2, doc3])
            db.flush()

            ext1 = Extraction(id="ext-demo-01", document_id=doc1.id, raw_text="Glucose: 142 mg/dL", extracted_json={}, confidence=0.92, status="completed")
            ext2 = Extraction(id="ext-demo-02", document_id=doc2.id, raw_text="No known drug allergies", extracted_json={}, confidence=0.95, status="completed")
            ext3 = Extraction(id="ext-demo-03", document_id=doc3.id, raw_text="Penicillin Allergy - Hives", extracted_json={}, confidence=0.62, status="needs_review")
            db.add_all([ext1, ext2, ext3])
            db.flush()

            events = [
                Event(id="ev-1001", patient_id=patient.id, document_id=doc1.id, extraction_id=ext1.id, event_type="lab_result", event_date=datetime.datetime(2025, 8, 10), data_json={"title": "Lab Result: Fasting Plasma Glucose", "test_name": "Fasting Plasma Glucose", "value": "142", "unit": "mg/dL", "status": "High", "confidence": 0.92}),
                Event(id="ev-1002", patient_id=patient.id, document_id=doc2.id, extraction_id=ext2.id, event_type="diagnosis", event_date=datetime.datetime(2026, 1, 10), data_json={"title": "Diagnosis: Type 2 Diabetes Mellitus", "condition": "Type 2 Diabetes Mellitus", "clinical_status": "Active", "confidence": 0.94}),
                Event(id="ev-1003", patient_id=patient.id, document_id=doc2.id, extraction_id=ext2.id, event_type="allergy", event_date=datetime.datetime(2026, 1, 10), data_json={"title": "Allergy Note: NKDA (No Known Drug Allergies)", "allergen": "No Known Drug Allergies (NKDA)", "confidence": 0.95}),
                Event(id="ev-1004", patient_id=patient.id, document_id=doc3.id, extraction_id=ext3.id, event_type="lab_result", event_date=datetime.datetime(2026, 3, 10), data_json={"title": "Lab Result: Fasting Plasma Glucose", "test_name": "Fasting Plasma Glucose", "value": "126", "unit": "mg/dL", "status": "High", "confidence": 0.94}),
                Event(id="ev-1005", patient_id=patient.id, document_id=doc3.id, extraction_id=ext3.id, event_type="allergy", event_date=datetime.datetime(2026, 3, 10), data_json={"title": "Allergy Alert: Penicillin (Hives)", "allergen": "Penicillin", "reaction": "Skin Hives", "confidence": 0.88}),
                Event(id="ev-1006", patient_id=patient.id, document_id=doc3.id, extraction_id=ext3.id, event_type="medication", event_date=datetime.datetime(2026, 3, 10), data_json={"title": "Medication: Metformin 500mg", "medicine": "Metformin", "dose": "500 mg", "frequency": "Twice daily", "confidence": 0.95})
            ]
            db.add_all(events)
            db.commit()
            logger.info("Demo patient, doctor, reminders, and appointments seeded successfully!")
    except Exception as e:
        logger.warning(f"Error seeding demo platform data: {e}")
    finally:
        db.close()

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "MedTimeline API",
        "version": "4.0.0"
    }
