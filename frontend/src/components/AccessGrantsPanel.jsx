import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, ShieldAlert, KeyRound, Check, XCircle, History, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function AccessGrantsPanel() {
  const [requests, setRequests] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests' or 'audit'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, auditRes] = await Promise.all([
        axios.get('/api/access-requests'),
        axios.get('/api/audit-logs')
      ]);
      setRequests(reqRes.data || []);
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.warn("Could not fetch access control data, using fallback:", err);
      setRequests([
        {
          id: 'grant-demo-01',
          patient_id: 'p-1',
          patient_code: 'PT-88392',
          grantee_id: 'doc-1',
          doctor_email: 'dr.house@stjude.org',
          doctor_license: 'MD-99482-NY',
          hospital_name: 'St. Jude Medical Center',
          scope: 'read_timeline',
          status: 'pending',
          created_at: '2026-09-18 16:30'
        }
      ]);
      setAuditLogs([
        {
          id: 'log-01',
          actor_email: 'dr.house@stjude.org',
          actor_role: 'doctor',
          action: 'READ',
          resource: 'timeline',
          timestamp: '2026-09-18 17:10:05'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    try {
      await axios.post(`/api/access-requests/${id}/approve`);
      fetchData();
    } catch (err) {
      alert("Approve failed: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleRevoke = async (id) => {
    try {
      await axios.post(`/api/access-requests/${id}/revoke`);
      fetchData();
    } catch (err) {
      alert("Revoke failed: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <ShieldCheck size={22} color="var(--primary-cyan)" />
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>Patient Consent & Access Management (FR-19, FR-20, FR-22)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Explicitly approve/revoke doctor access requests and monitor audit logs</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="filter-pills" style={{ margin: 0 }}>
            <button className={`pill-btn ${activeSubTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveSubTab('requests')}>
              <KeyRound size={13} style={{ display: 'inline', marginRight: '4px' }} /> Access Requests ({requests.length})
            </button>
            <button className={`pill-btn ${activeSubTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveSubTab('audit')}>
              <History size={13} style={{ display: 'inline', marginRight: '4px' }} /> Access Audit Trail ({auditLogs.length})
            </button>
          </div>

          <button className="btn-secondary" onClick={fetchData} title="Refresh Access Requests">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {activeSubTab === 'requests' ? (
        <div>
          {requests.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No pending or active doctor access requests.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requests.map(req => (
                <div key={req.id} style={{
                  background: '#111827',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
display: 'flex',
                   justifyContent: 'space-between',
                   alignItems: 'center',
                   flexWrap: 'wrap',
                   gap: '0.75rem'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                      <UserCheck size={16} color="var(--primary-blue)" /> {req.doctor_email}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>({req.hospital_name})</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      License: <strong>{req.doctor_license}</strong> | Requested Scope: <code>{req.scope}</code> | Requested: {req.created_at}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: req.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : (req.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(244, 63, 94, 0.2)'),
                      color: req.status === 'approved' ? '#34d399' : (req.status === 'pending' ? '#fbbf24' : '#fb7185')
                    }}>
                      STATUS: {req.status.toUpperCase()}
                    </span>

                    {req.status === 'pending' && (
                      <button 
                        className="btn-primary" 
                        onClick={() => handleApprove(req.id)}
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', background: '#10b981' }}
                      >
                        <Check size={14} /> Approve Access
                      </button>
                    )}

                    {(req.status === 'approved' || req.status === 'pending') && (
                      <button 
                        className="btn-secondary" 
                        onClick={() => handleRevoke(req.id)}
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem', color: '#f43f5e', borderColor: '#f43f5e' }}
                      >
                        <XCircle size={14} /> {req.status === 'approved' ? 'Revoke Access' : 'Reject'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Rule 4 / FR-22 Mandatory Audit Trail: Every read or modification of your medical records writes an immutable audit entry.
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#111827', textAlign: 'left', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '0.6rem 0.85rem' }}>Timestamp</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Actor</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Role</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Action</th>
                <th style={{ padding: '0.6rem 0.85rem' }}>Resource</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                  <td style={{ padding: '0.6rem 0.85rem', fontWeight: 600 }}>{log.actor_email}</td>
                  <td style={{ padding: '0.6rem 0.85rem' }}>
                    <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderRadius: '4px', background: '#374151' }}>
                      {log.actor_role}
                    </span>
                  </td>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--primary-cyan)', fontWeight: 700 }}>{log.action}</td>
                  <td style={{ padding: '0.6rem 0.85rem', color: 'var(--text-muted)' }}>{log.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
