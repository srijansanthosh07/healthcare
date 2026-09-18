import React from 'react';
import { Clock, HelpCircle } from 'lucide-react';

export default function GapMarker({ gap }) {
  const { label, gap_days, start_date, end_date } = gap;

  return (
    <div style={{
      position: 'relative',
      margin: '1.5rem 0 1.5rem 2rem',
      padding: '0.85rem 1.25rem',
      background: 'rgba(31, 41, 55, 0.4)',
      border: '1px dashed #4b5563',
      borderRadius: '12px',
      color: '#9ca3af',
      fontSize: '0.85rem',
display: 'flex',
       alignItems: 'center',
       justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Clock size={16} color="#9ca3af" />
        <div>
          <strong style={{ color: '#e5e7eb' }}>{label || `No record available for ${gap_days} days`}</strong>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>
            Period: {start_date} to {end_date} (Unrecorded clinical history)
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', background: '#111827', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #374151' }} title="Rule 3: Gaps are explicitly marked. No health status is inferred during unrecorded periods.">
        <HelpCircle size={13} color="#9ca3af" /> No Assumption Rule (FR-18)
      </div>
    </div>
  );
}
