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
import { User, Activity, AlertCircle, FileText, Calendar, Stethoscope, Shield, Heart, ArrowRight } from 'lucide-react';

function LandingPage({ onSelectRole }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.1) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%\' height=\'100%\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")' }} />
      
      <header style={{ 
        padding: '1.5rem 2rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 12, 
            background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(14, 165, 233, 0.3)'
          }}>
            <Heart size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>MedTimeline</h1>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Medical Intelligence Platform</p>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', zIndex: 10 }}>
        <div style={{ 
          maxWidth: 900, 
          width: '100%',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={{ 
              fontSize: 'clamp(2.5rem, 6vw, 4rem)', 
              fontWeight: 800, 
              color: 'white', 
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              background: 'linear-gradient(135deg, #ffffff 0%, #0ea5e9 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Your Health Journey,<br />
              <span style={{ fontWeight: 800 }}>Intelligently Mapped</span>
            </h2>
            <p style={{ 
              fontSize: '1.25rem', 
              color: '#94a3b8', 
              maxWidth: '600px', 
              margin: '0 auto',
              lineHeight: 1.6
            }}>
              Transform medical documents into an interactive timeline. 
              AI-powered extraction, contradiction detection, and secure access control for patients and doctors.
            </p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '3rem'
          }}>
            <RoleCard
              icon={<Heart size={32} />}
              title="Patient Portal"
              description="Upload prescriptions, lab reports, and discharge summaries. View your medical timeline with AI-extracted events, medication reminders, and appointment booking."
              features={[
                'AI Document Processing (OCR + LLM)',
                'Interactive Medical Timeline',
                'Medication Reminders (FR-25)',
                'Doctor Appointment Booking (FR-26)',
                'Family Access Management'
              ]}
              onClick={() => onSelectRole('patient')}
            />
            <RoleCard
              icon={<Stethoscope size={32} />}
              title="Doctor Dashboard"
              description="Verified medical practitioners can access patient timelines with consent. Review documents, add clinical notes, and manage appointments."
              features={[
                'Verified Doctor Access (FR-3)',
                'Patient Timeline Review',
                'Consent-Based Access (FR-19/20)',
                'Clinical Notes & Annotations',
                'Appointment Management (FR-26)'
              ]}
              onClick={() => onSelectRole('doctor')}
            />
          </div>

          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            gap: '0.75rem',
            marginBottom: '2rem'
          }}>
            <FeatureBadge icon={<Shield size={14} />}>RBAC & Audit Logging</FeatureBadge>
            <FeatureBadge icon={<Activity size={14} />}>Real-time Contradiction Alerts</FeatureBadge>
            <FeatureBadge icon={<FileText size={14} />}>Multi-format Document Support</FeatureBadge>
            <FeatureBadge icon={<ArrowRight size={14} />}>FHIR-compliant Data</FeatureBadge>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            background: 'rgba(30, 41, 59, 0.5)', 
            border: '1px solid rgba(14, 165, 233, 0.2)',
            borderRadius: '12px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Register a new patient or doctor account to get started. Patient accounts have immediate access; doctor accounts require hospital admin verification (FR-3).
            </p>
          </div>
        </div>
      </main>

      <footer style={{ 
        padding: '1.5rem 2rem', 
        textAlign: 'center', 
        color: '#475569', 
        fontSize: '0.85rem',
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        position: 'relative',
        zIndex: 10
      }}>
        MedTimeline Platform • HIPAA-Compliant • Built with React, FastAPI, PostgreSQL, Redis, MinIO
      </footer>
    </div>
  );
}

function RoleCard({ icon, title, description, features, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(30, 41, 59, 0.7)',
        border: '1px solid rgba(148, 163, 184, 0.15)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.5)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(14, 165, 233, 0.15)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.15)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ 
        width: 56, 
        height: 56, 
        borderRadius: 14, 
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        marginBottom: '1.25rem',
        color: '#0ea5e9'
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'white', margin: '0 0 0.75rem 0' }}>
        {title}
      </h3>
      <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1.5rem 0', flex: 1 }}>
        {description}
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {features.map((feature, i) => (
          <li key={i} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            fontSize: '0.85rem', 
            color: '#cbd5e1' 
          }}>
            <span style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              flexShrink: 0
            }} />
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}

function FeatureBadge({ icon, children }) {
  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.35rem', 
      padding: '0.5rem 1rem', 
      background: 'rgba(30, 41, 59, 0.7)', 
      border: '1px solid rgba(148, 163, 184, 0.15)', 
      borderRadius: '20px', 
      fontSize: '0.8rem', 
      color: '#94a3b8' 
    }}>
      {icon}
      {children}
    </span>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('medtimeline_token') || '');
  const [activePortal, setActivePortal] = useState('patient');
  const [patientId, setPatientId] = useState('');
  const [patientInfo, setPatientInfo] = useState({
    patient_code: '',
    name: '',
    dob: '',
    blood_group: ''
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
  
  const [showLanding, setShowLanding] = useState(!localStorage.getItem('medtimeline_token'));
  const [selectedRole, setSelectedRole] = useState('patient');

  // Load patient timeline. Accepts an optional explicit patient id to avoid
  // React state staleness (e.g. immediately after login/registration, before
  // the `user`/`patientId` state has propagated).
  const loadTimeline = async (explicitPatientId, filterArg, sortArg) => {
    // Guard against React passing an event object as the first argument
    // (e.g. `onClick={onRefresh}`), which is not a valid patient id.
    const explicitId = typeof explicitPatientId === 'string' ? explicitPatientId : '';
    const pId = explicitId || patientId || (user && user.patient && user.patient.id) || '';
    if (!pId) {
      setEvents([]);
      setContradictions([]);
      setLoadingTimeline(false);
      return;
    }

    const filter = filterArg !== undefined ? filterArg : activeFilter;
    const sort = sortArg !== undefined ? sortArg : sortOrder;

    setLoadingTimeline(true);
    try {
      setPatientId(pId);
      const data = await api.getTimeline(pId, filter, sort);
      setEvents(data.events || []);
      setContradictions(data.contradictions || []);
      if (data.patient_code) {
        setPatientInfo(prev => ({ ...prev, patient_code: data.patient_code }));
      }
    } catch (err) {
      console.warn("Could not load timeline from API:", err);
      setEvents([]);
      setContradictions([]);
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
            setShowLanding(false);
          } else if (u.role === 'family') {
            setActivePortal('family');
            setShowLanding(false);
          } else if (u.patient && u.patient.id) {
            setPatientId(u.patient.id);
            setPatientInfo({
              patient_code: u.patient.patient_code,
              name: u.patient.profile?.full_name || 'Registered Patient',
              dob: u.patient.profile?.dob || '1990-01-01',
              blood_group: u.patient.profile?.blood_group || 'O+'
            });
            setShowLanding(false);
            // Pass the resolved id explicitly to dodge stale `user` state.
            loadTimeline(u.patient.id, activeFilter, sortOrder);
          } else {
            setShowLanding(false);
            loadTimeline();
          }
        })
        .catch(() => {
          localStorage.removeItem('medtimeline_token');
          setToken('');
          setShowLanding(true);
        });
    } else {
      setShowLanding(true);
    }
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
      if (res.patient_id) {
        setPatientId(res.patient_id);
        setPatientInfo(prev => ({ ...prev, patient_code: res.patient_code }));
        // Immediately load using the id from the auth response (no stale state).
        loadTimeline(res.patient_id, activeFilter, sortOrder);
      }
    }
    setShowLanding(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('medtimeline_token');
    setToken('');
    setUser(null);
    setPatientId('');
    setPatientInfo({ patient_code: '', name: '', dob: '', blood_group: '' });
    setActivePortal('patient');
    setShowLanding(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {showLanding ? (
        <LandingPage 
          onSelectRole={(role) => { setSelectedRole(role); setIsAuthOpen(true); }}
        />
      ) : (
        <>
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
              patientId ? (
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

                  {/* Medical Timeline Section Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Activity size={22} color="var(--primary-blue)" />
                      <h2 style={{ fontSize: '1.3rem' }}>Medical History Timeline</h2>
                      {events.filter(e => !e.is_gap_marker).length > 0 && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary-blue)', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 600 }}>
                          {events.filter(e => !e.is_gap_marker).length} events
                        </span>
                      )}
                    </div>
                  </div>

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
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                  <User size={64} color="#475569" style={{ marginBottom: '1rem' }} />
                  <h3 style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>Welcome to Your Medical Timeline</h3>
                  <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
                    Upload your first medical document (lab report, prescription, or discharge summary) to start building your intelligent health timeline.
                  </p>
                  <button className="btn-primary" onClick={() => setIsUploadOpen(true)}>
                    <FileText size={16} /> Add Your First Document
                  </button>
                </div>
              )
            )}
          </main>
        </>
      )}

      {/* Upload Modal */}
      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        patientId={patientId}
        onUploadSuccess={loadTimeline}
        token={token}
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
        initialRole={selectedRole}
      />

      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        MedTimeline Platform • Prescription Reminders (FR-25), Verified Doctor Appointments (FR-26), RBAC & Audit Logging
      </footer>
    </div>
  );
}
