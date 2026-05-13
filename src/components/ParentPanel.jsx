import React from 'react';

export default function ParentPanel({ student }) {
  const avgs = student?.skillAverages ?? {};

  const sortedSkills = Object.entries(avgs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => ({
      cognitive:       'Problem Solving',
      creative:        'Creative Thinking',
      communication:   'Effective Communication',
      socialEmotional: 'Collaboration',
      physical:        'Active Participation',
      practical:       'Practical Skills',
    }[key] || key));

  const unlockedBadges = (student?.badges ?? []).filter(b => b.unlocked);
  const totalXP  = student?.xp ?? 0;
  const level    = student?.level ?? 1;
  const booksCompleted = student?.booksCompleted ?? 0;

  return (
    <div className="card parent-panel-card" id="parent-panel">
      <div className="parent-panel-header">
        <div className="parent-icon">💡</div>
        <div className="parent-header-text">
          <h3 className="card-title" style={{ margin: 0 }}>Parent & Teacher Insights</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>A clear picture of {student?.name?.split(' ')[0]}'s learning journey</p>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="parent-stats-row">
        <div className="parent-stat">
          <span className="parent-stat-val">{booksCompleted}</span>
          <span className="parent-stat-lbl">Books Done</span>
        </div>
        <div className="parent-stat">
          <span className="parent-stat-val">{totalXP}</span>
          <span className="parent-stat-lbl">XP Earned</span>
        </div>
        <div className="parent-stat">
          <span className="parent-stat-val">Lv.{level}</span>
          <span className="parent-stat-lbl">Current Level</span>
        </div>
        <div className="parent-stat">
          <span className="parent-stat-val">{unlockedBadges.length}</span>
          <span className="parent-stat-lbl">Badges Won</span>
        </div>
      </div>

      <div className="parent-summary">
        <p className="summary-text">
          {student?.name?.split(' ')[0]} has shown consistent engagement across {booksCompleted} STEM {booksCompleted === 1 ? 'module' : 'modules'},
          earning {totalXP} XP and {unlockedBadges.length} achievement badges. The data indicates
          a strong foundation in inquiry-based learning and conceptual understanding.
        </p>
        <div className="insight-highlights">
          <div className="insight-label">Top Strengths:</div>
          <div className="insight-pills">
            {sortedSkills.map((skill, i) => (
              <span key={i} className="insight-pill">{skill}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="teacher-summary-section">
        <div className="teacher-avatar">👩‍🏫</div>
        <div className="teacher-message">
          <div className="teacher-name">Coach's Note</div>
          <p className="teacher-text">
            "{student?.teacherNote ?? 'Great progress this session! Keep exploring and building your skills.'}"
          </p>
        </div>
      </div>
    </div>
  );
}
