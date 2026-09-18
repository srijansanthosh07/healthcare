import React, { useEffect, useState } from 'react';
import { X, FileText, Download, Code, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../api';

export default function DocumentViewer({ documentId, isOpen, onClose }) {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview', 'json', 'raw_text'

  useEffect(() => {
    if (documentId && isOpen) {
      setLoading(true);
      api.getDocumentDetails(documentId)
        .then(data => {
          setDocData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [documentId, isOpen]);

  if (!isOpen) return null;

  const fileUrl = `/api/documents/${documentId}/file`;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '1000px', height: '85vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={22} color="var(--primary-cyan)" />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Source Document Inspection (FR-11 / FR-15)</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {documentId}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="filter-pills" style={{ margin: 0 }}>
              <button 
                className={`pill-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Document Preview
              </button>
              <button 
                className={`pill-btn ${activeTab === 'json' ? 'active' : ''}`}
                onClick={() => setActiveTab('json')}
              >
                Extracted JSON
              </button>
              <button 
                className={`pill-btn ${activeTab === 'raw_text' ? 'active' : ''}`}
                onClick={() => setActiveTab('raw_text')}
              >
                Raw OCR Text
              </button>
            </div>

            <a className="btn-secondary" href={fileUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <Download size={14} /> Open File
            </a>
            <button className="close-btn" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading document details...</p>
          ) : docData ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Status Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#111827', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                <div>
                  Upload Type: <strong style={{ textTransform: 'uppercase' }}>{docData.upload_type}</strong> | Status: <span style={{ color: docData.status === 'completed' ? '#34d399' : '#f59e0b', fontWeight: 600 }}>{docData.status}</span>
                </div>
                {docData.extraction && (
                  <div>
                    Extraction Confidence: <strong>{Math.round((docData.extraction.confidence || 0.85) * 100)}%</strong> | Status: <span style={{ color: docData.extraction.status === 'needs_review' ? '#f59e0b' : '#34d399', fontWeight: 600 }}>{docData.extraction.status}</span>
                  </div>
                )}
              </div>

              {/* Tab 1: Preview Document */}
              {activeTab === 'preview' && (
                <div style={{ flex: 1, background: '#000', borderRadius: '8px', overflow: 'hidden', minHeight: '400px' }}>
                  {docData.upload_type === 'pdf' ? (
                    <iframe src={fileUrl} width="100%" height="100%" style={{ border: 'none', minHeight: '450px' }} title="PDF Preview" />
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '1rem' }}>
                      <img src={fileUrl} alt="Medical Document Scan" style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '8px' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Extracted Structured JSON */}
              {activeTab === 'json' && (
                <pre style={{
                  flex: 1,
                  background: '#090d16',
                  color: '#38bdf8',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }}>
                  {JSON.stringify(docData.extraction?.extracted_json || { note: "Extraction pending or unavailable" }, null, 2)}
                </pre>
              )}

              {/* Tab 3: Raw OCR Text */}
              {activeTab === 'raw_text' && (
                <pre style={{
                  flex: 1,
                  background: '#090d16',
                  color: '#e2e8f0',
                  padding: '1.25rem',
                  borderRadius: '8px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap'
                }}>
                  {docData.extraction?.raw_text || "Raw OCR text not extracted."}
                </pre>
              )}
            </div>
          ) : (
            <p style={{ color: '#f43f5e', textAlign: 'center' }}>Error loading document viewer.</p>
          )}
        </div>
      </div>
    </div>
  );
}
