import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../api';

export default function UploadModal({ isOpen, onClose, patientId, onUploadSuccess, token }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF or Image file to upload.');
      return;
    }

    if (!patientId) {
      setError('No patient profile is loaded. Please sign in again before uploading.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.uploadDocument(file, patientId, token);
      setSuccessMsg('Document uploaded! Extraction pipeline enqueued in Redis worker.');
      setTimeout(() => {
        setUploading(false);
        setFile(null);
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (err.response) {
        setError(`Upload failed (HTTP ${err.response.status}). Please try again.`);
      } else {
        setError('Document upload failed. Check server connection.');
      }
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={20} color="var(--primary-blue)" /> Upload Medical Document
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Select a representative medical PDF or image (lab report, discharge summary, or prescription scan up to 25MB). The OCR + NLP extraction worker will extract structured events asynchronously.
          </p>

          <div style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.2)',
            cursor: 'pointer',
            marginBottom: '1.25rem'
          }}>
            <FileText size={40} color="var(--primary-cyan)" style={{ marginBottom: '0.75rem' }} />
            <div>
              <label htmlFor="file-input" className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                Browse Medical Files
              </label>
              <input 
                id="file-input"
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
            {file && (
              <div style={{ marginTop: '0.85rem', color: 'var(--primary-cyan)', fontWeight: 600, fontSize: '0.9rem' }}>
                Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>

          {error && (
            <div style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button className="btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
            <button className="btn-primary" onClick={handleUpload} disabled={uploading || !file}>
              {uploading ? 'Uploading & Enqueuing...' : 'Upload & Start Extraction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
