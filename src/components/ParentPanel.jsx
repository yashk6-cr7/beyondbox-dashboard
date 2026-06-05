import React, { useState } from 'react';

// ─── Card 1: Tutor Feedback ────────────────────────────────────────────────
function TutorFeedbackCard({ student }) {
  const [expanded, setExpanded] = useState(false);

  const rawComment = student?.teacherNote?.trim();
  const hasComment = !!rawComment;
  const fullText = hasComment ? rawComment : 'No comment from your tutor yet.';

  const preview = fullText.split('\n\n')[0];

  return (
    <div className="card insight-card tutor-card">
      <div className="insight-card-header">
        <div className="insight-card-icon tutor-icon">👩‍🏫</div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>Tutor Feedback</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Written by your STEM tutor</p>
        </div>
      </div>
      <div className="insight-body">
        <p className="insight-text" style={{ fontStyle: hasComment ? 'normal' : 'italic', color: hasComment ? 'inherit' : '#9ca3af' }}>
          {expanded ? fullText.split('\n').map((para, i) => (
            <span key={i}>{para}<br /></span>
          )) : preview}
        </p>
        {hasComment && fullText.includes('\n') && (
          <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? '▲ Show less' : '▼ Read full feedback'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────
export default function ParentPanel({ student }) {
  return (
    <div id="parent-panel" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <TutorFeedbackCard student={student} />
    </div>
  );
}

