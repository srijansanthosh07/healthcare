# MedTimeline — Medical Document Intelligence & Security Platform

**MedTimeline** is an enterprise medical-document intelligence, cross-event lineage, and consent-governed security platform. It ingests unstructured clinical documents (lab reports, discharge summaries, handwritten prescriptions), extracts structured clinical entities (medications, doses, diagnoses, lab values, dates, allergies), builds chronological timelines with cross-event lineage and contradiction flags, and enforces patient-consent access control (Doctor RBAC, Family Scopes, Emergency Break-Glass, Medication Reminders, Doctor Appointment Booking, & Immutable Audit Logging).

---

## Medication Reminders & Doctor Appointments (FR-25, FR-26)

### 1. Automatic Prescription Medication Reminders (FR-25)
- **Schema**: `reminders(id, patient_id, medicine, dose, schedule_json, status, created_at)`
- **Auto-Generation**: When a prescription document is extracted, the system automatically creates `reminders` detailing medicine name, dose, frequency, and time.
- **Patient Adherence States**: Patients can toggle adherence states (`taken`, `snoozed`, `skipped`) directly from the patient dashboard (`POST /api/reminders/:id/status`).

### 2. Verified Doctor Appointment Booking & Slot Management (FR-26)
- **Schema**: `appointments(id, patient_id, doctor_id, slot_time, status, notes, created_at)`
- **Platform-Restricted Booking**: Patients can book appointment slots (`POST /api/appointments`) **strictly with verified doctors and hospitals registered on the MedTimeline platform** (`GET /api/doctors`).
- **Doctor Slot Management**: Doctors view upcoming patient bookings and manage appointment statuses (`scheduled`, `completed`, `cancelled`) on their clinical dashboard.

---

## Family-Member Access & Emergency Break-Glass (FR-23, FR-24)

- **Family Link & Scope (FR-23)**: One-tap patient invite (`POST /api/family/invite`) with relationship labels (`Spouse`, `Child`, `Parent`, `Caregiver`) and custom scopes (`full`, `read_timeline`, `medications_only`, `labs_only`).
- **24-Hour Emergency Break-Glass (FR-24)**: Linked family members can trigger emergency override (`POST /api/family/emergency-access`) with mandatory text justification, logging `EMERGENCY_BREAK_GLASS` in `audit_logs` and notifying the patient consent panel.

---

## Doctor Access & Hospital Verification (FR-3, FR-19 to FR-22)

- **Hospital Verification (FR-3)**: Doctors register with hospital affiliation and license credentials (`is_verified = False`). Unverified accounts cannot view patient records until approved by a hospital administrator.
- **Patient Authorization Grants (FR-19/20)**: Possessing a `patient_code` does not grant data access. Doctors submit requests (`POST /api/access-requests`), which patients explicitly approve or revoke.
- **Mandatory API-Layer RBAC & Audit Trail (`audit_logs`) — FR-22**: Every data access writes an audit log entry (`actor_id`, `patient_id`, `action`, `resource`, `timestamp`).

---

## Intelligence & Lineage Features (FR-13, FR-16, FR-17, FR-18)

- **Cross-Event Lineage (`event_relationships`)**: Automatically infers connections across events (e.g. `Diagnosis` → `Lab` → `Medication`). Tagged `is_ai_generated = True` until doctor-verified.
- **Contradiction Detection (FR-17)**: Flags conflicting clinical statements across events (e.g. conflicting allergy records) on both events.
- **Gap Detection (FR-18)**: Identifies unrecorded intervals (>60 days) and inserts explicit gap bridge cards **`📅 No record available for X days`**.
- **Lab Trend Analytics (FR-16)**: Time-series line chart plotting numerical lab values over time.

---

## Technology Stack & Architecture

```
                                  ┌────────────────────────┐
                                  │   React Frontend (Vite)│
                                  │(Patient, Doctor, Family)│
                                  └───────────┬────────────┘
                                              │ REST API (RBAC & Consent Check)
                                              ▼
┌──────────────────┐  Enqueues Job  ┌──────────────────────┐  Read/Write  ┌──────────────────┐
│  Redis Queue (7) │◄───────────────┤   FastAPI API Backend│──────────────►│ PostgreSQL 16 DB │
│   (Port 6379)    │                │      (Port 8000)     │              │   (Port 5432)    │
└────────┬─────────┘                └───────────┬──────────┘              └──────────────────┘
         │ Dequeue                              │ Stream Files
         ▼                                      ▼
┌──────────────────┐  Fetch Bytes   ┌──────────────────────┐
│  Redis RQ Worker │───────────────►│  MinIO S3 Object Store│
│ (OCR + NLP LLM)  │                │    (Ports 9000/9001) │
└──────────────────┘                └──────────────────────┘
```

---

## Quickstart Setup & Running

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone repository and set up environment credentials
cp .env.example .env

# 2. Build and launch containers
docker-compose up -d --build
```

- **Frontend Dashboard**: `http://localhost:3000`
- **FastAPI OpenAPI Docs**: `http://localhost:8000/docs`
- **MinIO Console**: `http://localhost:9001` (`minioadmin` / `minioadmin_secret`)

### Option B: Local Standalone Development (Without Docker)

```bash
# 1. Install Python dependencies
py -m pip install -r backend/requirements.txt

# 2. Start FastAPI Backend (Terminal 1)
cd backend
py -m uvicorn main:app --host 0.0.0.0 --port 8000

# 3. Start Frontend (Terminal 2)
cd frontend
npm install
npm run dev
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register patient, doctor, or family account |
| `POST` | `/api/auth/login` | Password authentication & JWT issuance |
| `POST` | `/api/documents` | Upload PDF/PNG/JPG up to 25MB, store in MinIO, enqueue extraction job |
| `GET` | `/api/documents/:id/file` | Stream raw document file from storage (FR-11 viewability) |
| `GET` | `/api/patients/:id/timeline` | Fetch chronological medical timeline (RBAC consent-enforced) |
| `GET` | `/api/patients/:id/trends` | Fetch numerical lab value time series for line chart plotting (FR-16) |
| `GET` | `/api/reminders` | Fetch patient's active medication reminders (FR-25) |
| `POST` | `/api/reminders/:id/status` | Update reminder adherence state: `taken`, `snoozed`, `skipped` (FR-25) |
| `GET` | `/api/doctors` | Directory of registered, verified doctors on platform (FR-26) |
| `POST` | `/api/appointments` | Book appointment slot with verified platform doctor (FR-26) |
| `GET` | `/api/appointments` | Fetch appointments for patient or doctor (FR-26) |
| `POST` | `/api/family/invite` | Patient links family member with defined scope (FR-23) |
| `POST` | `/api/family/emergency-access` | Family member triggers 24-hour Emergency Break-Glass access (FR-24) |
| `POST` | `/api/access-requests` | Doctor submits access request for a patient code (FR-19) |
| `POST` | `/api/access-requests/:id/approve` | Patient explicitly approves access request (FR-20) |
| `POST` | `/api/access-requests/:id/revoke` | Patient revokes access grant (FR-20) |
| `GET` | `/api/audit-logs` | Fetch mandatory RBAC access audit trail logs (FR-22, FR-24) |
