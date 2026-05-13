import React, { useState } from 'react';

const CATEGORY_ORDER = ['Journey', 'Skill Growth', 'Achievement', 'Balance', 'Progress'];

const CATEGORY_COLORS = {
  Journey:       '#6366f1',
  'Skill Growth':'#10b981',
  Achievement:   '#f59e0b',
  Balance:       '#ec4899',
  Progress:      '#8b5cf6',
};

export default function MilestoneBadges({ student }) {
  const [filter, setFilter] = useState('All');
  const badges = student?.badges ?? [];

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const categories    = ['All', ...CATEGORY_ORDER];

  const visible = filter === 'All'
    ? badges
    : badges.filter(b => b.category === filter);

  return (
    <div className="card milestone-card" id="milestone-badges">
      <div className="milestone-header">
        <div>
          <h3 className="card-title">🏅 Achievement Badges</h3>
          <p className="card-subtitle">{unlockedCount} of {badges.length} badges unlocked</p>
        </div>
        <div className="badge-progress-ring">
          <svg viewBox="0 0 40 40" width="52" height="52">
            <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="#7c3aed" strokeWidth="4"
              strokeDasharray={`${badges.length ? (unlockedCount / badges.length) * 100.5 : 0} 100.5`}
              strokeLinecap="round" transform="rotate(-90 20 20)" />
          </svg>
          <span className="ring-label">{badges.length ? Math.round((unlockedCount / badges.length) * 100) : 0}%</span>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="badge-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`badge-filter-pill ${filter === cat ? 'badge-filter-pill--active' : ''}`}
            onClick={() => setFilter(cat)}
            style={filter === cat ? { background: cat === 'All' ? '#7c3aed' : CATEGORY_COLORS[cat] } : {}}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Badge grid */}
      <div className="badge-grid">
        {visible.map(badge => (
          <div
            key={badge.id}
            className={`badge-card ${badge.unlocked ? 'badge-card--unlocked' : 'badge-card--locked'}`}
            style={badge.unlocked ? { borderColor: CATEGORY_COLORS[badge.category] } : {}}
            title={badge.unlocked ? badge.desc : `🔒 ${badge.hint}`}
          >
            <span className="badge-emoji" style={badge.unlocked ? {} : { filter: 'grayscale(1) opacity(0.4)' }}>
              {badge.unlocked ? badge.emoji : '🔒'}
            </span>
            <span className="badge-title" style={badge.unlocked ? { color: CATEGORY_COLORS[badge.category] } : {}}>
              {badge.title}
            </span>
            <span className="badge-desc">
              {badge.unlocked ? badge.desc : badge.hint}
            </span>
            {badge.unlocked && (
              <span className="badge-cat-tag" style={{ background: CATEGORY_COLORS[badge.category] }}>
                {badge.category}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
