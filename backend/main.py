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
    """Seeds hospitals only - no demo users or data."""
    db: Session = SessionLocal()
    try:
        # Seed Hospitals (FR-3)
        h1 = db.query(Hospital).filter(Hospital.code == "HOSP-STJUDE").first()
        if not h1:
            h1 = Hospital(name="St. Jude Medical Center", code="HOSP-STJUDE", address="742 Evergreen Terrace")
            h2 = Hospital(name="Metropolitan General Hospital", code="HOSP-METRO", address="100 Hospital Plaza")
            db.add_all([h1, h2])
            db.commit()
            logger.info("Hospitals seeded successfully!")
    except Exception as e:
        logger.warning(f"Error seeding hospitals: {e}")
    finally:
        db.close()

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "MedTimeline API",
        "version": "4.0.0"
    }
