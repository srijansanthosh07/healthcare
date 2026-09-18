import React, { useState } from 'react';
import { Pill, Activity, Stethoscope, AlertTriangle, FileText, CheckCircle, ExternalLink, GitCommit, Bot, UserCheck } from 'lucide-react';
import axios from 'axios';

export default function EventCard({ event, onViewDoc }) {
  const { id, event_type, event_date, data, confidence, needs_review, has_contradiction, relationships, source_document } = event;
  const [relList, setRelList] = useState(relationships || []);

  const handleVerifyRel = async (relId) => {
    try {
      await axios.post(`/api/relationships/${relId}/verify`);
      setRelList(prev => prev.map(r => r.relationship_id === relId ? { ...r, is_verified: true, is_ai_generated: false } : r));
    } catch (err) {
      console.error("Verification failed:", err);
    }
  };

  const getTypeBadge = () => {
    switch (event_type) {
      case 'medication':
        return <span className="event-type-badge badge-medication"><Pill size={13} /> Medication</span>;
      case 'lab_result':
        return <span className="event-type-badge badge-lab_result"><Activity size={13} /> Lab Result</span>;
      case 'diagnosis':
        return <span className="event-type-badge badge-diagnosis"><Stethoscope size={13} /> Diagnosis</span>;
      case 'allergy':
        return <span className="event-type-badge badge-allergy"><AlertTriangle size={13} /> Allergy</span>;
      default:
        return <span className="event-type-badge">{event_type}</span>;
    }
  };

  const confidencePct = Math.round((confidence || 0.85) * 100);

  return (
    <div className={`event-card ${needs_review ? 'needs-review' : ''}`} style={{
      borderRight: has_contradiction ? '4px solid #f43f5e' : undefined
    }}>
      <div className="event-node"></div>
      
      <div className="event-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {getTypeBadge()}
          <span className="event-date">📅 {event_date || 'Date N/A'}</span>
        </div>

        {/* Step 6 / FR-10 & FR-17 Flags */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {has_contradiction && (
            <span style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid #f43f5e', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              ⚠️ Contradiction Flagged (FR-17)
            </span>
          )}

          {needs_review ? (
            <span style={{ 
              background: 'rgba(245, 158, 11, 0.2)', 
              color: '#fbbf24', 
              border: '1px solid rgba(245, 158, 11, 0.4)',
              padding: '0.2rem 0.6rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <AlertTriangle size={13} /> Needs Doctor Review ({confidencePct}%)
            </span>
          ) : (
            <span style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#34d399', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <CheckCircle size={13} /> Verified ({confidencePct}%)
            </span>
          )}
        </div>
      </div>

      <div className="event-title">{data.title || `${event_type.toUpperCase()} Event`}</div>

      {/* Event Details Grid */}
      <div className="event-data-grid">
        {data.medicine && (
          <div className="data-cell">
            <div className="data-label">Drug Name</div>
            <div className="data-value">{data.medicine}</div>
          </div>
        )}
        {data.dose && (
          <div className="data-cell">
            <div className="data-label">Dosage</div>
            <div className="data-value">{data.dose}</div>
          </div>
        )}
        {data.frequency && (
          <div className="data-cell">
            <div className="data-label">Frequency</div>
            <div className="data-value">{data.frequency}</div>
          </div>
        )}

        {data.test_name && (
          <div className="data-cell">
            <div className="data-label">Lab Test</div>
            <div className="data-value">{data.test_name}</div>
          </div>
        )}
        {data.value && (
          <div className="data-cell">
            <div className="data-label">Result Value</div>
            <div className="data-value" style={{ color: data.status === 'High' ? '#f43f5e' : 'var(--text-main)' }}>
              {data.value} {data.unit || ''} ({data.status || 'Normal'})
            </div>
          </div>
        )}

        {data.condition && (
          <div className="data-cell">
            <div className="data-label">Clinical Condition</div>
            <div className="data-value">{data.condition}</div>
          </div>
        )}
        {data.allergen && (
          <div className="data-cell">
            <div className="data-label">Allergen / Reaction</div>
            <div className="data-value">{data.allergen} ({data.reaction || 'Reaction noted'})</div>
          </div>
        )}
      </div>

      {/* Rule 1 / FR-13: Cross-Event Relationships & Lineage */}
      {relList && relList.length > 0 && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: '#111827', borderRadius: '8px', border: '1px solid #1f2937' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <GitCommit size={14} color="var(--primary-purple)" /> Cross-Event Lineage & Relationships (FR-13)
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {relList.map((rel, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {/* Rule 1 Badge: AI-Inferred vs Doctor Verified */}
                  {rel.is_ai_generated ? (
                    <span style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <Bot size={11} /> 🤖 AI-Inferred Link
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <UserCheck size={11} /> 👨‍⚕️ Doctor Verified
                    </span>
                  )}
                  <span>{rel.reasoning}</span>
                </div>

                {rel.is_ai_generated && !rel.is_verified && (
                  <button 
                    onClick={() => handleVerifyRel(rel.relationship_id)}
                    style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                    title="Click to verify this AI-generated relationship link"
                  >
                    Verify Link
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Flag Bar */}
      {needs_review && (
        <div className="review-flag-bar">
          <AlertTriangle size={15} />
          <div>
            <strong>Flagged for Doctor Verification:</strong> {data.reasoning || "OCR confidence below safety threshold (0.85). Verify against raw document."}
          </div>
        </div>
      )}

      {/* Source Document Link (FR-15) */}
      <div className="event-footer">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Source Document Type: <strong>{(source_document.upload_type || 'PDF').toUpperCase()}</strong>
        </span>
        <button className="doc-link" onClick={() => onViewDoc(source_document.id)}>
          <FileText size={14} /> View Original Document <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
}
