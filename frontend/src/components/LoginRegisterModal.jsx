import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Building, ShieldAlert } from 'lucide-react';
import { api } from '../api';
import axios from 'axios';

export default function LoginRegisterModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('patient'); // 'patient' or 'doctor'
  const [hospitalId, setHospitalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/hospitals')
        .then(res => setHospitals(res.data || []))
        .catch(() => setHospitals([
          { id: 'hosp-1', name: 'St. Jude Medical Center' },
          { id: 'hosp-2', name: 'Metropolitan General Hospital' }
        ]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let res;
      if (isLogin) {
        res = await api.login(email, password);
      } else {
        const payload = {
          email,
          password,
          full_name: fullName,
          role,
          hospital_id: hospitalId || (hospitals[0]?.id),
          license_number: licenseNumber,
          specialty
        };
        res = await axios.post('/api/auth/register', payload);
        res = res.data;
      }
      onAuthSuccess(res);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3>{isLogin ? 'Sign In to MedTimeline' : 'Create Account'}</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {!isLogin && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Full Name</label>
              <input 
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Eleanor Vance or Dr. Arthur Pendelton"
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Email Address</label>
            <input 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@medtimeline.com"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Password</label>
            <input 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white' }}
            />
          </div>

          {!isLogin && (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Account Role</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1f2937', border: '1px solid var(--border-color)', color: 'white' }}
                >
                  <option value="patient">Patient Account (FR-1)</option>
                  <option value="doctor">Medical Doctor Practitioner (FR-3)</option>
                </select>
              </div>

              {/* FR-3 Doctor Registration Requirements */}
              {role === 'doctor' && (
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-cyan)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Building size={15} /> Hospital Affiliation & Credentials (FR-3)
                  </div>

                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Affiliated Hospital</label>
                    <select 
                      value={hospitalId}
                      onChange={e => setHospitalId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#111827', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '0.85rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Medical License Number</label>
                    <input 
                      type="text"
                      required
                      value={licenseNumber}
                      onChange={e => setLicenseNumber(e.target.value)}
                      placeholder="MD-99482-NY"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#111827', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Clinical Specialty</label>
                    <input 
                      type="text"
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      placeholder="Cardiology / Internal Medicine"
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', background: '#111827', border: '1px solid var(--border-color)', color: 'white', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <ShieldAlert size={14} /> Doctor accounts require hospital admin verification before activation.
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '0.6rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register Account')}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account? " : "Already registered? "}
            <span 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              style={{ color: 'var(--primary-cyan)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isLogin ? 'Register Here' : 'Sign In'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
