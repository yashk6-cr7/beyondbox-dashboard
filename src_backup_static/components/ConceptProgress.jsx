import React from 'react';
import { student } from '../studentData';

const concepts = [
  { label: 'Books Completed', value: student.books.length, max: 10, color: '#6366f1' },
  { label: 'Explorer Points', value: student.explorerPoints, max: 2000, color: '#f59e0b' },
  { label: 'Current Level', value: student.level, max: 5, color: '#10b981' },
];

export default function ConceptProgress() {
  return (
    <div className="card concept-progress-card" id="concept-progress">
      <h3 className="card-title">🧠 Learning Progress</h3>
      <div className="concept-items">
        {concepts.map((c, i) => {
          const pct = Math.round((c.value / c.max) * 100);
          return (
            <div className="concept-item" key={i}>
              <div className="concept-item-header">
                <span className="concept-item-label">{c.label}</span>
                <span className="concept-item-value" style={{ color: c.color }}>{c.value}</span>
              </div>
              <div className="concept-bar-track">
                <div className="concept-bar-fill" style={{ width: `${pct}%`, background: c.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
