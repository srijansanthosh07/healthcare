import React, { useState, useEffect } from 'react';
import { Users, UserPlus, ShieldAlert, HeartHandshake, AlertOctagon, Check, Trash2 } from 'lucide-react';
import axios from 'axios';

export default function FamilyAccessPanel() {
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Spouse');
  const [scope, setScope] = useState('read_timeline');
  const [familyGrants, setFamilyGrants] = useState([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchFamilyGrants = async () => {
    try {
      const [grantsRes, auditRes] = await Promise.all([
        axios.get('/api/access-requests'),
        axios.get('/api/audit-logs')
      ]);
      const familyOnly = (grantsRes.data || []).filter(g => g.grantee_type === 'family');
      const emergencyOnly = (auditRes.data || []).filter(a => a.is_emergency);
      setFamilyGrants(familyOnly);
      setEmergencyAlerts(emergencyOnly);
    } catch (err) {
      console.warn("Using fallback family grants:", err);
      setFamilyGrants([
        {
          id: 'fam-demo-01',
          doctor_email: 'spouse@family.com',
          relationship_label: 'Spouse',
          scope: 'read_timeline',
          status: 'approved',
          is_emergency: false,
          created_at: '2026-09-18 17:00'
        }
      ]);
    }
  };

  useEffect(() => {
    fetchFamilyGrants();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMsg('');

    try {
      const res = await axios.post('/api/family/invite', {
        email,
        relationship_label: relationship,
        scope
      });
      setMsg(res.data.message || "Family member linked successfully.");
      setEmail('');
      fetchFamilyGrants();
    } catch (err) {
      setMsg("Invite failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (grantId) => {
    try {
      await axios.post(`/api/access-requests/${grantId}/revoke`);
      fetchFamilyGrants();
    } catch (err) {
      alert("Revoke failed: " + err.message);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
        <HeartHandshake size={24} color="var(--accent-purple)" />
        <div>
          <h3 style={{ fontSize: '1.15rem' }}>Family Member Access & Emergency Scoping (FR-23, FR-24)</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Link trusted family members with defined scopes and monitor emergency break-glass triggers</span>
        </div>
      </div>

      {/* Emergency Alert Banner if Emergency Access Was Used */}
      {emergencyAlerts.length > 0 && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid #f43f5e',
          color: '#fb7185',
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
            <AlertOctagon size={18} />
            <span>🚨 Emergency Break-Glass Notification (FR-24)</span>
          </div>
          <p style={{ fontSize: '0.825rem', color: '#ffe4e6' }}>
            A linked family member activated 24-hour emergency break-glass access. Every emergency action is logged in your immutable audit trail:
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            {emergencyAlerts.map((a, i) => (
              <div key={i}>• [{a.timestamp}] {a.actor_email} triggered: {a.resource}</div>
            ))}
          </div>
        </div>
      )}

      {/* Link Family Member Form (Minimal Friction One-Tap Invite) */}
      <form onSubmit={handleInvite} style={{ background: '#111827', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <UserPlus size={16} color="var(--primary-cyan)" /> Link Family Member (One-Tap Grant - FR-23)
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Family Email</label>
            <input 
              type="email"
              required
              placeholder="spouse@family.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Relationship</label>
            <select 
              value={relationship}
              onChange={e => setRelationship(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            >
              <option value="Spouse">Spouse / Partner</option>
              <option value="Child">Son / Daughter</option>
              <option value="Parent">Mother / Father</option>
              <option value="Sibling">Brother / Sister</option>
              <option value="Caregiver">Primary Caregiver</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Granted Scope (FR-23)</label>
            <select 
              value={scope}
              onChange={e => setScope(e.target.value)}
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            >
              <option value="read_timeline">Full Timeline Access</option>
              <option value="medications_only">Medications Only</option>
              <option value="labs_only">Lab Results Only</option>
              <option value="emergency_only">Emergency Break-Glass Only</option>
            </select>
          </div>
        </div>

        {msg && (
          <div style={{ color: msg.includes('failed') ? '#f43f5e' : '#34d399', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {msg}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={loading}>
          <UserPlus size={16} /> Link & Approve Family Member Access
        </button>
      </form>

      {/* Linked Family Members List */}
      <div>
        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Linked Family Members ({familyGrants.length})</h4>
        {familyGrants.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No linked family members yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {familyGrants.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #1f2937', fontSize: '0.85rem' }}>
                <div>
                  <strong>{g.doctor_email}</strong> <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>({g.relationship_label || 'Family'})</span>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                    Granted Scope: <code>{g.scope}</code> | Status: <span style={{ color: '#34d399', fontWeight: 600 }}>{g.status.toUpperCase()}</span>
                  </div>
                </div>

                <button className="btn-secondary" onClick={() => handleRevoke(g.id)} style={{ color: '#f43f5e', borderColor: '#f43f5e', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
                  <Trash2 size={13} /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
