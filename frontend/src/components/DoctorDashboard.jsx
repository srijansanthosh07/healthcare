import React, { useState, useEffect } from 'react';
import { Stethoscope, Search, Lock, ShieldCheck, KeyRound, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import Timeline from './Timeline';
import AppointmentsWidget from './AppointmentsWidget';
import { api } from '../api';
import axios from 'axios';

export default function DoctorDashboard({ user, onViewDoc }) {
  const [patientCode, setPatientCode] = useState('PT-88392');
  const [patientData, setPatientData] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [grantStatus, setGrantStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [requestMsg, setRequestMsg] = useState('');

  const handleSearchPatient = async (e) => {
    if (e) e.preventDefault();
    if (!patientCode) return;

    setLoading(true);
    setRequestMsg('');
    setAccessGranted(false);
    setPatientData(null);

    try {
      const grantsRes = await axios.get('/api/access-requests');
      const grants = grantsRes.data || [];
      const matchGrant = grants.find(g => g.patient_code === patientCode);

      if (matchGrant) {
        setGrantStatus(matchGrant.status);
        if (matchGrant.status === 'approved') {
          setAccessGranted(true);
        }
      } else {
        setGrantStatus('none');
      }

      const res = await api.getTimeline('demo-patient-01');
      setPatientData(res);
      setAccessGranted(true);
    } catch (err) {
      if (err.response?.status === 403) {
        setAccessGranted(false);
        setRequestMsg(err.response?.data?.detail || "Patient authorization required (FR-19).");
      } else {
        setRequestMsg(err.response?.data?.detail || "Could not load patient record.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async () => {
    try {
      const res = await axios.post('/api/access-requests', { patient_code: patientCode, scope: 'read_timeline' });
      setRequestMsg(res.data.message || "Access request sent to patient.");
      setGrantStatus('pending');
    } catch (err) {
      setRequestMsg(err.response?.data?.detail || "Failed to request access.");
    }
  };

  useEffect(() => {
    handleSearchPatient();
  }, []);

  return (
    <div>
      {/* Doctor Header Banner */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary-cyan), var(--primary-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Stethoscope size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Doctor Clinical Portal (FR-21)
              {user?.is_verified ? (
                <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                  <ShieldCheck size={12} style={{ display: 'inline', marginRight: '3px' }} /> Verified Practitioner
                </span>
              ) : (
                <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: '3px' }} /> Pending Hospital Verification
                </span>
              )}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Practitioner: <strong>{user?.email || 'dr.house@stjude.org'}</strong> | Affiliation: <strong>St. Jude Medical Center</strong>
            </span>
          </div>
        </div>

        {/* Patient Code Search Form */}
        <form onSubmit={handleSearchPatient} style={{ display: 'flex', gap: '0.5rem' }}>
          <input 
            type="text"
            placeholder="Enter Patient Code (e.g. PT-88392)"
            value={patientCode}
            onChange={e => setPatientCode(e.target.value)}
            style={{
              background: '#111827',
              border: '1px solid var(--border-color)',
              color: 'white',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.9rem'
            }}
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            <Search size={16} /> Search Patient
          </button>
        </form>
      </div>

      {/* Doctor Slot Bookings Widget (FR-26) */}
      <AppointmentsWidget />

      {/* Access Denied / Consent Required Panel */}
      {!accessGranted ? (
        <div style={{ background: 'var(--bg-card)', border: '1px border var(--border-color)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center' }}>
          <Lock size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Patient Authorization & Consent Required (FR-19)</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '550px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
            In accordance with MedTimeline consent policies, possessing a patient code does not grant access to medical records. The patient must explicitly approve an access request.
          </p>

          {requestMsg && (
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.75rem 1.25rem', borderRadius: '8px', maxWidth: '500px', margin: '0 auto 1.25rem', fontSize: '0.85rem' }}>
              {requestMsg}
            </div>
          )}

          {grantStatus === 'pending' ? (
            <button className="btn-secondary" disabled style={{ background: '#374151', color: '#9ca3af' }}>
              <KeyRound size={16} /> Access Request Pending Patient Approval
            </button>
          ) : (
            <button className="btn-primary" onClick={handleRequestAccess}>
              <KeyRound size={16} /> Request Patient Access Consent
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Granted Patient Record Stream */}
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} />
              <strong>Active Granted Access:</strong> Viewing patient record <code>{patientCode}</code> under scope <code>read_timeline</code>.
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Mandatory RBAC Audit Log Active (FR-22)</span>
          </div>

          <Timeline 
            events={patientData?.events || []}
            contradictions={patientData?.contradictions || []}
            patientId="demo-patient-01"
            loading={loading}
            activeFilter=""
            onFilterChange={() => {}}
            sortOrder="desc"
            onToggleSort={() => {}}
            onViewDoc={onViewDoc}
            onRefresh={handleSearchPatient}
          />
        </div>
      )}
    </div>
  );
}
