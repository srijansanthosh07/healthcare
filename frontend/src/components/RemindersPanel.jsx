import React, { useState, useEffect } from 'react';
import { Bell, Pill, Check, Clock, X, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function RemindersPanel() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/reminders');
      setReminders(res.data || []);
    } catch (err) {
      console.warn("Could not fetch reminders, using fallback:", err);
      setReminders([
        {
          id: 'rem-1',
          medicine: 'Metformin',
          dose: '500 mg',
          schedule: { time: '08:00 AM', frequency: 'Twice daily' },
          status: 'pending'
        },
        {
          id: 'rem-2',
          medicine: 'Atorvastatin',
          dose: '40 mg',
          schedule: { time: '09:00 PM', frequency: 'Once daily at bedtime' },
          status: 'taken'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await axios.post(`/api/reminders/${id}/status`, { status: newStatus });
      setReminders(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bell size={20} color="var(--accent-amber)" />
          <h3 style={{ fontSize: '1.1rem' }}>Daily Medication Reminders (FR-25)</h3>
        </div>

        <button className="btn-secondary" onClick={fetchReminders} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {reminders.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No active medication reminders. Reminders are auto-generated from prescription extractions.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
          {reminders.map(r => (
            <div key={r.id} style={{
              background: '#111827',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Pill size={15} color="#f59e0b" /> {r.medicine} {r.dose}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    background: r.status === 'taken' ? 'rgba(16, 185, 129, 0.2)' : (r.status === 'snoozed' ? 'rgba(245, 158, 11, 0.2)' : (r.status === 'skipped' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)')),
                    color: r.status === 'taken' ? '#34d399' : (r.status === 'snoozed' ? '#fbbf24' : (r.status === 'skipped' ? '#fb7185' : '#60a5fa'))
                  }}>
                    {r.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Schedule: <strong>{r.schedule?.time || '08:00 AM'}</strong> ({r.schedule?.frequency || 'Daily'})
                </div>
              </div>

              {/* State Action Buttons: Taken, Snooze, Skip */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <button 
                  onClick={() => handleUpdateStatus(r.id, 'taken')}
                  style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '0.3rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                >
                  <Check size={12} /> Taken
                </button>
                <button 
                  onClick={() => handleUpdateStatus(r.id, 'snoozed')}
                  style={{ flex: 1, background: '#374151', color: '#fbbf24', border: '1px solid #4b5563', padding: '0.3rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                >
                  <Clock size={12} /> Snooze 1h
                </button>
                <button 
                  onClick={() => handleUpdateStatus(r.id, 'skipped')}
                  style={{ flex: 1, background: '#1f2937', color: '#f43f5e', border: '1px solid #4b5563', padding: '0.3rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                >
                  <X size={12} /> Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
