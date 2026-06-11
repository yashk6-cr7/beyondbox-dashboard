import React from 'react';

// ── Colour palette — mirrors SkillAveragesBars + SkillGrowthChart ─────────────
const SUBJECT_COLOR_MAP = {
  'Cognitive':        '#6366f1',
  'Creative':         '#ec4899',
  'Communication':    '#f59e0b',
  'Social Emotional': '#10b981',
  'Social-Emotional': '#10b981',
  'Physical':         '#ef4444',
  'Practical':        '#8b5cf6',
};
const FALLBACK_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#ef4444','#8b5cf6'];

// ── Mastery badge colour ──────────────────────────────────────────────────────
function masteryClass(level) {
  if (!level) return '';
  const l = level.toLowerCase();
  if (l === 'strong')         return 'mastery-tag mastery-tag--strong';
  if (l === 'developing')     return 'mastery-tag mastery-tag--developing';
  if (l === 'needs support')  return 'mastery-tag mastery-tag--needs-support';
  return 'mastery-tag';
}

// ── ConceptProgress card (driven 100% from ConceptProgress CMS via API) ───────
export default function ConceptProgress({ student }) {
  const concepts = student?.concepts ?? [];

  if (concepts.length === 0) {
    return (
      <div className="card concept-progress-card" id="concept-progress">
        <h3 className="card-title">🧠 Concept Progress</h3>
        <p className="card-subtitle">Skill mastery across all books</p>
        <div className="concept-empty">
          <span className="concept-empty-icon">📖</span>
          <p>Complete books to see your concept progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card concept-progress-card" id="concept-progress">
      <h3 className="card-title">🧠 Concept Progress</h3>
      <p className="card-subtitle">Skill mastery across all books</p>
      <div className="concept-items">
        {concepts.map((c, i) => {
          const color = SUBJECT_COLOR_MAP[c.subject] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
          const pct   = Math.min(Math.max(Number(c.progressPercent) || 0, 0), 100);
          return (
            <div className="concept-item" key={c.subject ?? i}>
              <div className="concept-item-header">
                <span className="concept-item-label">
                  {c.subject} — {c.conceptName}
                </span>
                <span className="concept-item-value" style={{ color }}>
                  {pct}%
                </span>
              </div>
              <div className="concept-bar-track">
                <div
                  className="concept-bar-fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              {c.masteryLevel && (
                <span className={masteryClass(c.masteryLevel)}>
                  {c.masteryLevel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LearningProgress card (Books / XP / Level stats) ─────────────────────────
export function LearningProgress({ student }) {
  const stats  = student?.stats  ?? {};
  const s      = student         ?? {};

  const items = [
    {
      label: 'Books Completed',
      value: stats.booksCompleted ?? stats.totalCompleted ?? 0,
      max:   10,
      color: '#6366f1',
    },
    {
      label: 'Explorer Points',
      value: s.explorerPoints ?? 0,
      max:   2000,
      color: '#f59e0b',
    },
    {
      label: 'Current Level',
      value: s.level ?? 1,
      max:   5,
      color: '#10b981',
    },
  ];

  return (
    <div className="card concept-progress-card" id="learning-progress">
      <h3 className="card-title">📈 Learning Progress</h3>
      <p className="card-subtitle">Your journey at a glance</p>
      <div className="concept-items">
        {items.map((c) => {
          const pct = Math.min(Math.round((c.value / c.max) * 100), 100);
          return (
            <div className="concept-item" key={c.label}>
              <div className="concept-item-header">
                <span className="concept-item-label">{c.label}</span>
                <span className="concept-item-value" style={{ color: c.color }}>
                  {c.value}
                </span>
              </div>
              <div className="concept-bar-track">
                <div
                  className="concept-bar-fill"
                  style={{ width: `${pct}%`, background: c.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
