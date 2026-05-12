import React from 'react';

export default function ParentPanel({ student }) {
  const avgs = student?.skillAverages ?? {};
  
  // Find top 3 skills dynamically
  const sortedSkills = Object.entries(avgs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key]) => {
      const labels = {
        cognitive: 'Problem Solving',
        creative: 'Creative Thinking',
        communication: 'Effective Communication',
        socialEmotional: 'Collaboration',
        physical: 'Active Participation',
        practical: 'Practical Skills'
      };
      return labels[key] || key;
    });

  return (
    <div className="card parent-panel-card" id="parent-panel">
      <div className="parent-panel-header">
        <div className="parent-icon">💡</div>
        <div className="parent-header-text">
          <h3 className="card-title" style={{ margin: 0 }}>Parent & Teacher Insights</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Understand the impact of the learning journey</p>
        </div>
      </div>

      <div className="parent-summary">
        <p className="summary-text">
          {student?.name?.split(' ')[0]} has shown consistent engagement across all STEM modules. 
          The data indicates a strong foundation in inquiry-based learning and conceptual understanding.
        </p>
        
        <div className="insight-highlights">
          <div className="insight-label">Key Strengths:</div>
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
          <div className="teacher-name">Coach Summary</div>
          <p className="teacher-text">
            "{student?.teacherNote ?? "Great progress this session! Focus on practical applications in the next module."}"
          </p>
        </div>
      </div>
    </div>
  );
}
