import React from 'react';
import { Activity, Upload, User, LogOut, Stethoscope, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function Navbar({ patientInfo, onOpenUpload, onOpenAuth, onLogout, user, activePortal, onPortalChange }) {
  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor';
  const isFamily = user?.role === 'family';

  return (
    <header className="header-nav">
      <div className="brand">
        <div className="brand-icon">
          <Activity size={22} />
        </div>
        <div>
          <span>MedTimeline</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, display: 'block', fontWeight: 400 }}>
            Intelligence & Security Platform
          </span>
        </div>
      </div>

      {/* Portal Switcher Tabs - Role-based */}
      <div className="filter-pills" style={{ margin: 0 }}>
        {isPatient && (
          <button 
            className={`pill-btn ${activePortal === 'patient' ? 'active' : ''}`}
            onClick={() => onPortalChange('patient')}
          >
            <User size={13} style={{ display: 'inline', marginRight: '4px' }} /> Patient View
          </button>
        )}

        {isDoctor && (
          <button 
            className={`pill-btn ${activePortal === 'doctor' ? 'active' : ''}`}
            onClick={() => onPortalChange('doctor')}
          >
            <Stethoscope size={13} style={{ display: 'inline', marginRight: '4px' }} /> Doctor Portal
          </button>
        )}

        {(isPatient || isDoctor) && (
          <button 
            className={`pill-btn ${activePortal === 'family' ? 'active' : ''}`}
            onClick={() => onPortalChange('family')}
          >
            <HeartHandshake size={13} style={{ display: 'inline', marginRight: '4px' }} /> Family Access
          </button>
        )}

        {isPatient && (
          <button 
            className={`pill-btn ${activePortal === 'consent' ? 'active' : ''}`}
            onClick={() => onPortalChange('consent')}
          >
            <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px' }} /> Consent & Audit
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {patientInfo && activePortal === 'patient' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Patient Code:</span>
            <span className="patient-code-badge">{patientInfo.patient_code || 'PT-88392'}</span>
          </div>
        )}

        {isPatient && activePortal === 'patient' && (
          <button className="btn-primary" onClick={onOpenUpload}>
            <Upload size={16} /> Upload Document
          </button>
        )}

        {user ? (
          <button className="btn-secondary" onClick={onLogout} title="Log out">
            <LogOut size={16} /> Sign Out ({user.role})
          </button>
        ) : (
          <button className="btn-secondary" onClick={onOpenAuth}>
            <User size={16} /> Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
