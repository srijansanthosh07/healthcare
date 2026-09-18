import React, { useState, useEffect } from 'react';
import { HeartHandshake, AlertOctagon, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import Timeline from './Timeline';
import axios from 'axios';

export default function FamilyPortal({ user, onViewDoc }) {
  const [patientData, setPatientData] = useState(null);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const fetchFamilyTimeline = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/patients/demo-patient-01/timeline');
      setPatientData(res.data);
    } catch (err) {
      console.warn("Could not fetch family timeline:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyTimeline();
  }, []);

  const handleTriggerEmergency = async (e) => {
    e.preventDefault();
    if (!emergencyReason) return;

    try {
      const res = await axios.post('/api/family/emergency-access', {
        patient_id: 'demo-patient-01',
        emergency_reason: emergencyReason
      });
      setMsg(res.data.message || "24-hour emergency break-glass access activated.");
      setIsEmergencyActive(true);
      setShowEmergencyModal(false);
      fetchFamilyTimeline();
    } catch (err) {
      setMsg("Emergency trigger failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      {/* Family Portal Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--accent-purple), var(--primary-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <HeartHandshake size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Family Member Care Portal (FR-23)
              {isEmergencyActive && (
                <span style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid #f43f5e', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
                  🚨 Emergency Break-Glass Active (24h)
                </span>
              )}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Logged in as: <strong>{user?.email || 'spouse@family.com'}</strong> | Linked to Patient: <strong>Eleanor Vance (PT-88392)</strong>
            </span>
          </div>
        </div>

        <button 
          className="btn-primary" 
          onClick={() => setShowEmergencyModal(true)}
          style={{ background: '#f43f5e', borderColor: '#f43f5e' }}
        >
          <AlertOctagon size={16} /> Trigger Emergency Break-Glass Access (FR-24)
        </button>
      </div>

      {msg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.75rem 1.25rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '6px' }} /> {msg}
        </div>
      )}

      {/* Scoped Patient Timeline */}
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
        onRefresh={fetchFamilyTimeline}
      />

      {/* Emergency Break-Glass Modal */}
      {showEmergencyModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertOctagon size={20} /> Emergency Break-Glass Access (FR-24)
              </h3>
              <button className="close-btn" onClick={() => setShowEmergencyModal(false)}>×</button>
            </div>

            <form onSubmit={handleTriggerEmergency} className="modal-body">
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Rule 5 / FR-24: Emergency break-glass access expands your view to the full patient timeline for 24 hours in urgent care situations. Mandatory justification is required and recorded in the patient audit log.
              </p>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Reason for Emergency Access</label>
                <textarea 
                  required
                  rows="3"
                  placeholder="e.g. Patient admitted to Emergency Room; urgent medication history required."
                  value={emergencyReason}
                  onChange={e => setEmergencyReason(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn-secondary" type="button" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
                <button className="btn-primary" type="submit" style={{ background: '#f43f5e', borderColor: '#f43f5e' }}>
                  Activate 24-Hour Emergency Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
