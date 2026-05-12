import React from 'react';
import { student } from '../studentData';

export default function WelcomeCard() {
  const pct = Math.round((student.xp / student.xpTarget) * 100);

  return (
    <div className="card welcome-card" id="welcome-card">
      <div className="welcome-left">
        <h2 className="welcome-title">Welcome back, {student.name.split(' ')[0]}! 👋</h2>
        <p className="welcome-subtitle">Keep exploring. Keep growing.</p>
      </div>
      <div className="welcome-right">
        <div className="level-badge">
          <span className="level-badge-icon">🚀</span>
          <span className="level-badge-text">Level {student.level} Explorer</span>
        </div>
        <div className="xp-bar-container">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="xp-bar-label">{student.xp} / {student.xpTarget} XP</span>
        </div>
      </div>
    </div>
  );
}
