import React from 'react';
import { student } from '../studentData';

const SKILL_CHIPS = [
  { key: 'cognitive', label: 'Cognitive', color: '#6366f1' },
  { key: 'creative', label: 'Creative', color: '#ec4899' },
  { key: 'communication', label: 'Communication', color: '#f59e0b' },
  { key: 'socialEmotional', label: 'Social-Emotional', color: '#10b981' },
  { key: 'physical', label: 'Physical', color: '#ef4444' },
  { key: 'practical', label: 'Practical', color: '#8b5cf6' },
];

function avgColor(avg) {
  if (avg >= 3) return '#10b981';
  if (avg >= 2) return '#f59e0b';
  return '#ef4444';
}

export default function ActivitiesPage({ onBack }) {
  return (
    <div className="activities-page" id="activities-page">
      <button className="back-btn" onClick={onBack} id="back-to-dashboard">
        ← Back to Dashboard
      </button>
      <h2 className="activities-title">🎯 All Activities</h2>
      <p className="activities-subtitle">{student.name}'s complete learning journey</p>

      <div className="activities-grid">
        {student.books.map((b) => (
          <div className="activity-card card" key={b.id}>
            <div className="activity-card-header">
              <h4 className="activity-card-title">{b.title}</h4>
              <span className="activity-card-book-badge">Book {b.id}</span>
            </div>
            <p className="activity-card-date">{b.date}</p>
            <p className="activity-card-desc">{b.activity}</p>
            <p className="activity-card-note">
              <em>"{student.teacherNote}"</em>
            </p>
            <div className="activity-card-avg">
              <span>Average Score</span>
              <span
                className="avg-pill"
                style={{ background: avgColor(b.avg), color: '#fff' }}
              >
                {b.avg.toFixed(2)}
              </span>
            </div>
            <div className="activity-card-skills">
              {SKILL_CHIPS.map((s) => (
                <span
                  className="skill-chip"
                  key={s.key}
                  style={{ background: `${s.color}18`, color: s.color, borderColor: `${s.color}40` }}
                >
                  {s.label}: {b[s.key]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
