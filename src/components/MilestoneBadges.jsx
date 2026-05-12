import React from 'react';
import { student } from '../studentData';

export default function MilestoneBadges() {
  return (
    <div className="card milestone-card" id="milestone-badges">
      <h3 className="card-title">🏅 Milestone Badges</h3>
      <div className="milestone-grid">
        {student.milestones.map((m) => (
          <div
            className={`milestone-badge ${m.unlocked ? '' : 'milestone-badge--locked'}`}
            key={m.id}
            style={{
              background: m.color,
              borderColor: m.borderColor,
              color: m.textColor,
            }}
          >
            <span className="milestone-emoji">{m.emoji}</span>
            <span className="milestone-title">{m.title}</span>
            <span className="milestone-desc">{m.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
