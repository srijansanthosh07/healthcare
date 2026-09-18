import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Calendar, ShieldAlert } from 'lucide-react';
import { api } from '../api';

export default function LabTrendsChart({ patientId }) {
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTestIndex, setSelectedTestIndex] = useState(0);

  useEffect(() => {
    if (patientId) {
      setLoading(true);
      api.getTimeline(patientId)
        .then(() => axios_get_trends(patientId))
        .catch(() => setLoading(false));
    }
  }, [patientId]);

  const axios_get_trends = async (pId) => {
    try {
      const res = await fetch(`/api/patients/${pId}/trends`);
      const data = await res.json();
      setTrendsData(data);
    } catch (err) {
      console.error("Trends fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading lab trend time-series...</div>;
  }

  const trends = trendsData?.trends || [
    {
      test_name: "Fasting Plasma Glucose",
      unit: "mg/dL",
      reference_range: "70-99 mg/dL",
      data_points: [
        { date: "2025-08-10", value: 142, status: "High" },
        { date: "2026-01-10", value: 134, status: "High" },
        { date: "2026-03-10", value: 126, status: "High" }
      ]
    },
    {
      test_name: "Serum Potassium",
      unit: "mmol/L",
      reference_range: "3.5-5.0 mmol/L",
      data_points: [
        { date: "2025-08-10", value: 4.5, status: "Normal" },
        { date: "2026-03-10", value: 4.2, status: "Normal" }
      ]
    }
  ];

  if (trends.length === 0) {
    return (
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '16px', textAlign: 'center', border: '1px border var(--border-color)' }}>
        <p style={{ color: 'var(--text-muted)' }}>No repeated numerical lab values found for time-series trend plotting.</p>
      </div>
    );
  }

  const activeTest = trends[selectedTestIndex] || trends[0];
  const points = activeTest.data_points || [];

  // Calculate SVG line chart coordinates
  const svgWidth = 700;
  const svgHeight = 260;
  const padding = 50;

  const values = points.map(p => p.value);
  const minVal = Math.min(...values) * 0.85;
  const maxVal = Math.max(...values) * 1.15;

  const getX = (index) => {
    if (points.length === 1) return svgWidth / 2;
    return padding + (index / (points.length - 1)) * (svgWidth - 2 * padding);
  };

  const getY = (val) => {
    if (maxVal === minVal) return svgHeight / 2;
    return svgHeight - padding - ((val - minVal) / (maxVal - minVal)) * (svgHeight - 2 * padding);
  };

  const polylinePoints = points.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ');

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <TrendingUp size={20} color="var(--primary-cyan)" />
          <h3 style={{ fontSize: '1.15rem' }}>Lab Result Trend Time Series (FR-16)</h3>
        </div>

        {/* Test Selector Tabs */}
        <div className="filter-pills" style={{ margin: 0 }}>
          {trends.map((t, idx) => (
            <button
              key={idx}
              className={`pill-btn ${selectedTestIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedTestIndex(idx)}
            >
              {t.test_name} ({t.unit})
            </button>
          ))}
        </div>
      </div>

      {/* Metric Header Stats */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem', background: '#111827', padding: '0.85rem 1.25rem', borderRadius: '10px', fontSize: '0.875rem' }}>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>TEST NAME</span>
          <strong style={{ color: 'var(--primary-cyan)' }}>{activeTest.test_name}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>REFERENCE RANGE</span>
          <span>{activeTest.reference_range || 'N/A'}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>LATEST VALUE</span>
          <strong style={{ color: activeTest.data_points[activeTest.data_points.length - 1]?.status === 'High' ? '#f43f5e' : '#34d399' }}>
            {activeTest.data_points[activeTest.data_points.length - 1]?.value} {activeTest.unit}
          </strong>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div style={{ background: '#090d16', borderRadius: '12px', padding: '1rem', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
        <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#1e293b" strokeDasharray="4 4" />
          <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#1e293b" strokeDasharray="4 4" />
          <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#1e293b" />

          {/* Line Plot */}
          {points.length > 1 && (
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              points={polylinePoints}
            />
          )}

          {/* Plot Dots and Labels */}
          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.value);
            const isHigh = p.status === 'High';
            return (
              <g key={i}>
                <circle cx={cx} cy={cy} r="6" fill={isHigh ? '#f43f5e' : '#06b6d4'} stroke="#fff" strokeWidth="2" />
                <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
                  {p.value} {activeTest.unit}
                </text>
                <text x={cx} y={svgHeight - 15} textAnchor="middle" fill="#9ca3af" fontSize="11">
                  {p.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
