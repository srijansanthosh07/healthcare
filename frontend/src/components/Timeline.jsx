import React, { useState } from 'react';
import EventCard from './EventCard';
import GapMarker from './GapMarker';
import ContradictionAlert from './ContradictionAlert';
import LabTrendsChart from './LabTrendsChart';
import { Filter, AlertTriangle, ArrowUpDown, RefreshCw, TrendingUp, List } from 'lucide-react';

export default function Timeline({ events, contradictions, patientId, loading, activeFilter, onFilterChange, sortOrder, onToggleSort, onViewDoc, onRefresh }) {
  const [showNeedsReviewOnly, setShowNeedsReviewOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'trends'

  const filteredEvents = (events || []).filter(ev => {
    if (ev.is_gap_marker) return true; // Always show gaps
    if (activeFilter && ev.event_type !== activeFilter) return false;
    if (showNeedsReviewOnly && !ev.needs_review) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = (ev.data?.title || '').toLowerCase();
      const med = (ev.data?.medicine || '').toLowerCase();
      const cond = (ev.data?.condition || '').toLowerCase();
      const test = (ev.data?.test_name || '').toLowerCase();
      return title.includes(q) || med.includes(q) || cond.includes(q) || test.includes(q);
    }
    return true;
  });

  const realEvents = (events || []).filter(e => !e.is_gap_marker);
  const flaggedCount = realEvents.filter(e => e.needs_review).length;

  return (
    <div>
      {/* View Mode Switcher Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="filter-pills" style={{ margin: 0 }}>
          <button 
            className={`pill-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.5rem 1.1rem' }}
          >
            <List size={16} /> Chronological Timeline & Lineage
          </button>
          <button 
            className={`pill-btn ${viewMode === 'trends' ? 'active' : ''}`}
            onClick={() => setViewMode('trends')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.5rem 1.1rem' }}
          >
            <TrendingUp size={16} color="var(--primary-cyan)" /> Lab Value Trends Chart (FR-16)
          </button>
        </div>
      </div>

      {viewMode === 'trends' ? (
        <LabTrendsChart patientId={patientId} />
      ) : (
        <>
          {/* FR-17 Contradictions Alert Banner */}
          {contradictions && contradictions.length > 0 && (
            <ContradictionAlert contradictions={contradictions} />
          )}

          {/* Timeline Controls & Filter Toolbar */}
          <div className="timeline-controls">
            <div className="filter-pills">
              <button 
                className={`pill-btn ${!activeFilter ? 'active' : ''}`}
                onClick={() => onFilterChange('')}
              >
                All Events ({realEvents.length})
              </button>
              <button 
                className={`pill-btn ${activeFilter === 'medication' ? 'active' : ''}`}
                onClick={() => onFilterChange('medication')}
              >
                💊 Medications
              </button>
              <button 
                className={`pill-btn ${activeFilter === 'lab_result' ? 'active' : ''}`}
                onClick={() => onFilterChange('lab_result')}
              >
                🧪 Lab Results
              </button>
              <button 
                className={`pill-btn ${activeFilter === 'diagnosis' ? 'active' : ''}`}
                onClick={() => onFilterChange('diagnosis')}
              >
                🩺 Diagnoses
              </button>
              <button 
                className={`pill-btn ${activeFilter === 'allergy' ? 'active' : ''}`}
                onClick={() => onFilterChange('allergy')}
              >
                ⚠️ Allergies
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Search timeline..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: '#1f2937',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}
              />

              <button 
                className={`pill-btn ${showNeedsReviewOnly ? 'active' : ''}`}
                style={{ borderColor: showNeedsReviewOnly ? '#f59e0b' : 'transparent' }}
                onClick={() => setShowNeedsReviewOnly(!showNeedsReviewOnly)}
              >
                <AlertTriangle size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Needs Review ({flaggedCount})
              </button>

              <button className="btn-secondary" onClick={onToggleSort} title="Toggle Sort Order">
                <ArrowUpDown size={14} /> {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
              </button>

              <button className="btn-secondary" onClick={onRefresh} title="Refresh Timeline">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Timeline Stream Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '0.5rem' }}>Loading medical timeline events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>No medical timeline events found matching your criteria.</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>Upload a new medical PDF or image to extract timeline events.</p>
            </div>
          ) : (
            <div className="timeline-stream">
              {filteredEvents.map(item => {
                if (item.is_gap_marker) {
                  return <GapMarker key={item.id} gap={item} />;
                }
                return <EventCard key={item.id} event={item} onViewDoc={onViewDoc} />;
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
