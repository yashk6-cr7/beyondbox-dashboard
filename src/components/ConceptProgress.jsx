import React from 'react';

// Must match SKILL_COLORS in SkillGrowthChart and SKILL_META in SkillAveragesBars exactly
const SUBJECT_COLOR_MAP = {
  'Cognitive':        '#6366f1',  // indigo  — matches chart/bars
  'Creative':         '#ec4899',  // pink
  'Communication':    '#f59e0b',  // amber
  'Social Emotional': '#10b981',  // green
  'Social-Emotional': '#10b981',
  'Physical':         '#ef4444',  // red
  'Practical':        '#8b5cf6',  // purple
};
const FALLBACK_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#ef4444','#8b5cf6'];

export default function ConceptProgress({ student }) {
  const concepts = student?.concepts;
  const stats = student?.stats;

  // If API returns concepts array, render those
  if (concepts?.length) {
    return (
      <div className="card concept-progress-card" id="concept-progress">
        <h3 className="card-title">🧠 Concept Progress</h3>
        <div className="concept-items">
          {concepts.map((c, i) => {
            const color = SUBJECT_COLOR_MAP[c.subject] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            return (
            <div className="concept-item" key={i}>
              <div className="concept-item-header">
                <span className="concept-item-label">{c.subject} — {c.conceptName}</span>
                <span className="concept-item-value" style={{ color }}>
                  {c.progressPercent}%
                </span>
              </div>
              <div className="concept-bar-track">
                <div
                  className="concept-bar-fill"
                  style={{ width: `${c.progressPercent}%`, background: color }}
                />
              </div>
              {c.masteryLevel && (
                <span className="mastery-tag">{c.masteryLevel}</span>
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback: show stats from API
  const items = [
    { label: 'Books Completed', value: stats?.booksCompleted ?? stats?.totalCompleted ?? 0, max: 10, color: '#6366f1' },
    { label: 'Explorer Points', value: student?.explorerPoints ?? 0, max: 2000, color: '#f59e0b' },
    { label: 'Current Level', value: student?.level ?? 1, max: 5, color: '#10b981' },
  ];

  return (
    <div className="card concept-progress-card" id="concept-progress">
      <h3 className="card-title">🧠 Learning Progress</h3>
      <div className="concept-items">
        {items.map((c, i) => {
          const pct = Math.min(Math.round((c.value / c.max) * 100), 100);
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
