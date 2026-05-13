import React from 'react';

export default function WelcomeCard({ student }) {
  const xp       = student?.xp       ?? 0;
  const xpTarget = student?.xpTarget ?? 400;
  const pct      = Math.min(Math.round((xp / xpTarget) * 100), 100);
  const level    = student?.level     ?? 1;
  const nextXP   = xpTarget - xp;

  return (
    <div className="card welcome-card" id="welcome-card">
      <div className="welcome-left">
        <h2 className="welcome-title">
          Welcome back, {student?.name?.split(' ')[0] ?? 'Learner'}! 👋
        </h2>
        <p className="welcome-subtitle">Keep exploring. Keep growing.</p>
        {student?.grade && <span className="grade-tag">{student.grade}</span>}
      </div>
      <div className="welcome-right">
        <div className="level-badge">
          <span className="level-badge-icon">🚀</span>
          <div>
            <span className="level-badge-text">Level {level} Explorer</span>
            <span className="level-badge-name">{student?.levelName ?? ''}</span>
          </div>
        </div>
        <div className="xp-bar-container">
          <div className="xp-bar-track">
            <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="xp-bar-label">
            {xp} / {xpTarget} XP · {nextXP > 0 ? `${nextXP} XP to next level` : 'Max level reached!'}
          </span>
        </div>
      </div>
    </div>
  );
}
