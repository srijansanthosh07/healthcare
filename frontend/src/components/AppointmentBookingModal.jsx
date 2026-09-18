import React, { useState, useEffect } from 'react';
import { Calendar, X, Stethoscope, Building, Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function AppointmentBookingModal({ isOpen, onClose, onBookingSuccess }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [slotDate, setSlotDate] = useState('2026-09-22');
  const [slotTime, setSlotTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/doctors')
        .then(res => {
          setDoctors(res.data || []);
          if (res.data && res.data.length > 0) {
            setSelectedDoctorId(res.data[0].doctor_user_id);
          }
        })
        .catch(() => setDoctors([
          { doctor_user_id: 'doc-user-1', email: 'dr.house@stjude.org', specialty: 'Cardiology', hospital_name: 'St. Jude Medical Center' }
        ]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) return;

    setLoading(true);
    setMsg('');

    try {
      const fullTime = `${slotDate} ${slotTime}`;
      const res = await axios.post('/api/appointments', {
        doctor_id: selectedDoctorId,
        slot_time: fullTime,
        notes
      });
      setMsg(res.data.message || "Appointment booked successfully!");
      setTimeout(() => {
        onBookingSuccess();
        onClose();
      }, 1200);
    } catch (err) {
      setMsg("Booking failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} color="var(--primary-cyan)" /> Book Practitioner Appointment (FR-26)
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Book a clinical appointment slot restricted strictly to verified practitioners registered on the MedTimeline platform.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Select Verified Doctor</label>
            <select 
              value={selectedDoctorId}
              onChange={e => setSelectedDoctorId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.875rem' }}
            >
              {doctors.map(d => (
                <option key={d.doctor_user_id} value={d.doctor_user_id}>
                  {d.email} ({d.specialty}) — {d.hospital_name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Date</label>
              <input 
                type="date"
                required
                value={slotDate}
                onChange={e => setSlotDate(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Time Slot</label>
              <input 
                type="time"
                required
                value={slotTime}
                onChange={e => setSlotTime(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Clinical Notes for Practitioner</label>
            <textarea 
              rows="3"
              placeholder="e.g. Follow-up on lab report glucose results and medication dosage review."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
            />
          </div>

          {msg && (
            <div style={{ color: msg.includes('failed') ? '#f43f5e' : '#34d399', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn-secondary" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Booking Slot...' : 'Confirm Appointment Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
