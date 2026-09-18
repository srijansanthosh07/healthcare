import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Timeline from './components/Timeline';
import DoctorDashboard from './components/DoctorDashboard';
import FamilyPortal from './components/FamilyPortal';
import AccessGrantsPanel from './components/AccessGrantsPanel';
import FamilyAccessPanel from './components/FamilyAccessPanel';
import RemindersPanel from './components/RemindersPanel';
import AppointmentsWidget from './components/AppointmentsWidget';
import AppointmentBookingModal from './components/AppointmentBookingModal';
import UploadModal from './components/UploadModal';
import DocumentViewer from './components/DocumentViewer';
import LoginRegisterModal from './components/LoginRegisterModal';
import { api } from './api';
import { User, Activity, AlertCircle, FileText, Calendar } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('medtimeline_token') || '');
  const [activePortal, setActivePortal] = useState('patient'); // 'patient', 'doctor', 'family', 'consent'
  const [patientId, setPatientId] = useState('demo-patient-01');
  const [patientInfo, setPatientInfo] = useState({
    patient_code: 'PT-88392',
    name: 'Eleanor Vance',
    dob: '1985-04-12',
    blood_group: 'A+'
  });

  const [events, setEvents] = useState([]);
  const [contradictions, setContradictions] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Load patient timeline
  const loadTimeline = async () => {
    setLoadingTimeline(true);
    try {
      const pId = (user && user.patient && user.patient.id) ? user.patient.id : 'demo-patient-01';
      const data = await api.getTimeline(pId, activeFilter, sortOrder);
      setEvents(data.events || []);
      setContradictions(data.contradictions || []);
      setPatientId(pId);
      if (data.patient_code) {
        setPatientInfo(prev => ({ ...prev, patient_code: data.patient_code }));
      }
    } catch (err) {
      console.warn("Could not load timeline from API, using fallback data:", err);
      setContradictions([
        {
          event_id_1: 'ev-1003',
          event_id_2: 'ev-1005',
          field: 'allergies',
          conflict_type: 'Conflicting Allergy Record',
          description: "Document on 2026-01-10 records 'NKDA (No Known Drug Allergies)', but document on 2026-03-10 records 'Penicillin Allergy (Hives)'.",
          severity: 'danger'
        }
      ]);
      setEvents([
        {
          id: 'ev-1001',
          event_type: 'lab_result',
          event_date: '2025-08-10',
          data: {
            title: 'Lab Result: Fasting Plasma Glucose',
            test_name: 'Fasting Plasma Glucose',
            value: '142',
            unit: 'mg/dL',
            status: 'High',
            confidence: 0.92
          },
          confidence: 0.92,
          needs_review: false,
          source_document: { id: 'doc-demo-01', upload_type: 'pdf' }
        },
        {
          is_gap_marker: true,
          id: 'gap-1001',
          start_date: '2025-08-10',
          end_date: '2026-01-10',
          gap_days: 153,
          label: 'No record available for 153 days (5.0 months)'
        },
        {
          id: 'ev-1002',
          event_type: 'diagnosis',
          event_date: '2026-01-10',
          data: {
            title: 'Diagnosis: Type 2 Diabetes Mellitus',
            condition: 'Type 2 Diabetes Mellitus',
            clinical_status: 'Active',
            confidence: 0.94
          },
          confidence: 0.94,
          needs_review: false,
          source_document: { id: 'doc-demo-02', upload_type: 'pdf' }
        },
        {
          id: 'ev-1003',
          event_type: 'allergy',
          event_date: '2026-01-10',
          has_contradiction: true,
          data: {
            title: 'Allergy Note: NKDA (No Known Drug Allergies)',
            allergen: 'No Known Drug Allergies (NKDA)',
            confidence: 0.95
          },
          confidence: 0.95,
          needs_review: false,
          source_document: { id: 'doc-demo-02', upload_type: 'pdf' }
        },
        {
          id: 'ev-1004',
          event_type: 'lab_result',
          event_date: '2026-03-10',
          data: {
            title: 'Lab Result: Fasting Plasma Glucose',
            test_name: 'Fasting Plasma Glucose',
            value: '126',
            unit: 'mg/dL',
            status: 'High',
            confidence: 0.94
          },
          confidence: 0.94,
          needs_review: false,
          relationships: [
            {
              relationship_id: 'rel-101',
              direction: 'incoming',
              related_event_id: 'ev-1002',
              relationship_type: 'diagnosis_to_lab',
              is_ai_generated: true,
              is_verified: false,
              reasoning: "AI Inferred: Diagnosis 'Type 2 Diabetes' prompts monitoring lab 'Fasting Plasma Glucose'."
            }
          ],
          source_document: { id: 'doc-demo-03', upload_type: 'pdf' }
        },
        {
          id: 'ev-1005',
          event_type: 'allergy',
          event_date: '2026-03-10',
          has_contradiction: true,
          data: {
            title: 'Allergy Alert: Penicillin (Hives)',
            allergen: 'Penicillin',
            reaction: 'Skin Hives',
            confidence: 0.88
          },
          confidence: 0.88,
          needs_review: false,
          source_document: { id: 'doc-demo-03', upload_type: 'png' }
        },
        {
          id: 'ev-1006',
          event_type: 'medication',
          event_date: '2026-03-10',
          data: {
            title: 'Medication: Metformin 500mg',
            medicine: 'Metformin',
            dose: '500 mg',
            frequency: 'Twice daily',
            confidence: 0.95
          },
          confidence: 0.95,
          needs_review: false,
          relationships: [
            {
              relationship_id: 'rel-102',
              direction: 'incoming',
              related_event_id: 'ev-1002',
              relationship_type: 'diagnosis_to_medication',
              is_ai_generated: true,
              is_verified: false,
              reasoning: "AI Inferred: Diagnosis 'Type 2 Diabetes' indicates prescription of 'Metformin'."
            }
          ],
          source_document: { id: 'doc-demo-03', upload_type: 'pdf' }
        }
      ]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (token) {
      api.getMe(token)
        .then(u => {
          setUser(u);
          if (u.role === 'doctor') {
            setActivePortal('doctor');
          } else if (u.role === 'family') {
            setActivePortal('family');
          } else if (u.patient && u.patient.id) {
            setPatientId(u.patient.id);
            setPatientInfo({
              patient_code: u.patient.patient_code,
              name: u.patient.profile?.full_name || 'Registered Patient',
              dob: u.patient.profile?.dob || '1990-01-01',
              blood_group: u.patient.profile?.blood_group || 'O+'
            });
          }
        })
        .catch(() => {
          localStorage.removeItem('medtimeline_token');
          setToken('');
        });
    }
    loadTimeline();
  }, [token, activeFilter, sortOrder]);

  const handleAuthSuccess = (res) => {
    localStorage.setItem('medtimeline_token', res.access_token);
    setToken(res.access_token);
    setUser({ id: res.user_id, email: res.email, role: res.role, is_verified: res.is_verified, patient: { id: res.patient_id, patient_code: res.patient_code } });
    if (res.role === 'doctor') {
      setActivePortal('doctor');
    } else if (res.role === 'family') {
      setActivePortal('family');
    } else {
      setActivePortal('patient');
      if (res.patient_id) setPatientId(res.patient_id);
    }
    loadTimeline();
  };

  const handleLogout = () => {
    localStorage.removeItem('medtimeline_token');
    setToken('');
    setUser(null);
    setPatientId('demo-patient-01');
    setActivePortal('patient');
    loadTimeline();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar 
        patientInfo={patientInfo}
        user={user}
        activePortal={activePortal}
        onPortalChange={setActivePortal}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main className="container" style={{ flex: 1 }}>
        {/* Render Active Portal View */}
        {activePortal === 'doctor' ? (
          <DoctorDashboard user={user} onViewDoc={(docId) => setSelectedDocId(docId)} />
        ) : activePortal === 'family' ? (
          <FamilyPortal user={user} onViewDoc={(docId) => setSelectedDocId(docId)} />
        ) : activePortal === 'consent' ? (
          <div>
            <FamilyAccessPanel />
            <AccessGrantsPanel />
          </div>
        ) : (
          <>
            {/* Patient Hero Card */}
            <div className="patient-card">
              <div className="patient-info">
                <div className="patient-avatar">
                  <User size={28} />
                </div>
                <div className="patient-details">
                  <h2>{patientInfo.name}</h2>
                  <div className="patient-meta">
                    <span>DOB: <strong>{patientInfo.dob}</strong></span>
                    <span>•</span>
                    <span>Blood Group: <strong>{patientInfo.blood_group}</strong></span>
                    <span>•</span>
                    <span>Patient Code: <span className="patient-code-badge">{patientInfo.patient_code}</span></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-primary" onClick={() => setIsBookModalOpen(true)}>
                  <Calendar size={16} /> Book Appointment
                </button>
                <button className="btn-secondary" onClick={() => setIsUploadOpen(true)}>
                  <FileText size={16} /> Add Document
                </button>
              </div>
            </div>

            {/* FR-25 Medication Reminders Panel */}
            <RemindersPanel />

            {/* FR-26 Appointments Widget */}
            <AppointmentsWidget onOpenBookModal={() => setIsBookModalOpen(true)} />

            {/* Timeline Stream View */}
            <Timeline 
              events={events}
              contradictions={contradictions}
              patientId={patientId}
              loading={loadingTimeline}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              sortOrder={sortOrder}
              onToggleSort={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              onViewDoc={(docId) => setSelectedDocId(docId)}
              onRefresh={loadTimeline}
            />
          </>
        )}
      </main>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        patientId={patientId}
        onUploadSuccess={loadTimeline}
      />

      {/* Appointment Booking Modal (FR-26) */}
      <AppointmentBookingModal 
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onBookingSuccess={loadTimeline}
      />

      {/* Document Viewer Modal */}
      <DocumentViewer 
        documentId={selectedDocId}
        isOpen={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
      />

      {/* Authentication Modal */}
      <LoginRegisterModal 
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        MedTimeline Platform • Prescription Reminders (FR-25), Verified Doctor Appointments (FR-26), RBAC & Audit Logging
      </footer>
    </div>
  );
}
