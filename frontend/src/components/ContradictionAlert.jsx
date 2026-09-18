import React from 'react';
import { AlertOctagon, ArrowRight } from 'lucide-react';

export default function ContradictionAlert({ contradictions }) {
  if (!contradictions || contradictions.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(244, 63, 94, 0.12)',
      border: '1px solid rgba(244, 63, 94, 0.4)',
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      marginBottom: '1.5rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fb7185', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
        <AlertOctagon size={18} />
        <span>Clinical Contradiction Warning ({contradictions.length} Conflict(s) Detected)</span>
      </div>

      <p style={{ fontSize: '0.825rem', color: '#fda4af', marginBottom: '0.75rem' }}>
        Rule 2 (FR-17): When two events contain conflicting structured facts, both events are flagged rather than auto-resolved. Clinicians must manually review and reconcile these records.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {contradictions.map((c, idx) => (
          <div key={idx} style={{
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '0.6rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.825rem',
            color: '#ffe4e6',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ background: '#f43f5e', color: 'white', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
              {c.conflict_type || 'Conflict'}
            </span>
            <span>{c.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
