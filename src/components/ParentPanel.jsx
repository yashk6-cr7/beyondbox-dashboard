import React, { useState } from 'react';

// ─── Card 1: Tutor Feedback ────────────────────────────────────────────────
function TutorFeedbackCard({ student }) {
  const [expanded, setExpanded] = useState(false);

  const rawComment = student?.teacherNote?.trim();
  const hasComment = !!rawComment;
  const fullText = hasComment ? rawComment : 'You will see the comment when the tutor updates it.';

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

// ─── Card 2: AI Assistant Feedback (Dynamic) ──────────────────────────────────
const SKILL_NAMES = {
  cognitive: 'Cognitive Thinking',
  creative: 'Creative Problem Solving',
  communication: 'Communication',
  socialEmotional: 'Social-Emotional',
  physical: 'Physical Coordination',
  practical: 'Practical Application'
};

const SKILL_RECS = {
  cognitive: { title: '🧩 Logical Reasoning', recs: ['Daily logic puzzles', 'Strategy board games — chess, Blokus', '"Why does this work?" conversations'] },
  creative: { title: '🎨 Creative Expression', recs: ['Free drawing or design', 'Building without instructions', 'Storytelling activities'] },
  communication: { title: '🗣️ Communication', recs: ['Reading aloud', 'Debating topics', 'Journaling daily'] },
  socialEmotional: { title: '🤝 Social Collaboration', recs: ['Group projects', 'Role-playing scenarios', 'Emotion journaling'] },
  physical: { title: '🏃 Physical Coordination', recs: ['Outdoor play with structured movement', 'Yoga or dance sessions', 'Group sports'] },
  practical: { title: '🛠️ Practical Skills', recs: ['Fixing broken items safely', 'Cooking or baking math', 'Budgeting exercises'] }
};

const SKILL_CAREERS = {
  cognitive: { emoji:'💻', title:'Software & Engineering', desc:'Coding, data science, or engineering' },
  creative: { emoji:'🎨', title:'Design & Innovation', desc:'Product design, UX, architecture, or fashion' },
  communication: { emoji:'🎤', title:'Media & Writing', desc:'Journalism, public relations, or broadcasting' },
  socialEmotional: { emoji:'🤝', title:'Healthcare & Education', desc:'Counseling, medicine, or teaching' },
  physical: { emoji:'🏃', title:'Sports & Therapy', desc:'Athletics, physical therapy, or coaching' },
  practical: { emoji:'💡', title:'Entrepreneurship & Operations', desc:'Problem-solving with a real-world purpose' }
};

function AIFeedbackCard({ student }) {
  const xp       = student?.xp       ?? 0;
  const level    = student?.level    ?? 1;
  const badges   = (student?.badges  ?? []).filter(b => b.unlocked).length;
  const books    = student?.booksCompleted ?? 0;
  const name     = student?.name?.split(' ')[0] || 'The student';

  // Dynamic skill sorting
  const skillEntries = Object.entries(student?.skillAverages || {}).map(([key, val]) => ({ key, val }));
  skillEntries.sort((a, b) => b.val - a.val);
  
  const strongSkills = skillEntries.slice(0, 3).map(s => s.key).filter(k => SKILL_NAMES[k]);
  const developingSkills = skillEntries.slice(-3).map(s => s.key).filter(k => SKILL_NAMES[k]).reverse();

  // Pick top 3 concepts for recommendations
  const concepts = student?.concepts || [];
  const conceptRecs = concepts.slice(0, 3).map(c => ({
    subj: c.subject || 'General',
    rec: `Continue exploring ${c.conceptName || 'new ideas'}. Practice through real-world scenarios and visual models.`
  }));

  if (conceptRecs.length === 0) {
    conceptRecs.push({ subj: 'General Learning', rec: 'Keep reading books and participating in activities to unlock specific subject recommendations!' });
  }

  return (
    <div className="card insight-card ai-card">
      <div className="insight-card-header">
        <div className="insight-card-icon ai-icon">✨</div>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>
            Beyond Box AI Assistant <span className="ai-badge-tag">AI</span>
          </h3>
          <p className="card-subtitle" style={{ margin: 0 }}>Personalised insights powered by learning data</p>
        </div>
      </div>

      <div className="ai-sections">

        {/* Overall */}
        <div className="ai-section">
          <div className="ai-section-title">📊 Overall Performance Summary</div>
          <p className="insight-text">
            {name} is progressing well across their learning journey.
            With <strong>{books} books</strong> completed, <strong>{xp} XP</strong> earned, and <strong>{badges} achievement badges</strong> at Level {level},
            engagement with the platform is consistent. Skill scores reflect a well-rounded learner
            with particular strengths in {strongSkills.length > 0 ? strongSkills.map(k => SKILL_NAMES[k]).join(', ') : 'multiple domains'}.
          </p>
        </div>

        {/* Skill Analysis */}
        {strongSkills.length > 0 && (
          <div className="ai-section">
            <div className="ai-section-title">🧠 Skill Analysis</div>
            <div className="skill-analysis-row">
              <div className="skill-analysis-group strong">
                <div className="skill-group-label">💪 Strong Skills</div>
                <div className="skill-pills">
                  {strongSkills.map(s => (
                    <span key={s} className="skill-pill skill-pill--strong">{SKILL_NAMES[s] || s}</span>
                  ))}
                </div>
              </div>
              <div className="skill-analysis-group developing">
                <div className="skill-group-label">📈 Developing Skills</div>
                <div className="skill-pills">
                  {developingSkills.map(s => (
                    <span key={s} className="skill-pill skill-pill--developing">{SKILL_NAMES[s] || s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Recommendations */}
        {developingSkills.length > 0 && (
          <div className="ai-section">
            <div className="ai-section-title">🎯 Activity Recommendations</div>
            <div className="rec-grid">
              {developingSkills.map(s => {
                const info = SKILL_RECS[s];
                if (!info) return null;
                return (
                  <div key={s} className="rec-block">
                    <div className="rec-block-title">{info.title}</div>
                    <ul className="rec-list">
                      {info.recs.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Concept Recommendations */}
        <div className="ai-section">
          <div className="ai-section-title">📚 Concept Recommendations</div>
          <div className="concept-rec-list">
            {conceptRecs.map((c, i) => (
              <div key={i} className="concept-rec-item">
                <span className="concept-rec-subj">{c.subj}</span>
                <span className="concept-rec-text">→ {c.rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Career Paths */}
        {strongSkills.length > 0 && (
          <div className="ai-section">
            <div className="ai-section-title">🚀 Career Path Suggestions</div>
            <p className="insight-text" style={{ marginBottom:'0.75rem' }}>
              Based on strongest areas — {strongSkills.map(k => SKILL_NAMES[k].toLowerCase()).join(', ')}:
            </p>
            <div className="career-cards">
              {strongSkills.map(s => {
                const info = SKILL_CAREERS[s];
                if (!info) return null;
                return (
                  <div key={s} className="career-card">
                    <span className="career-emoji">{info.emoji}</span>
                    <div>
                      <div className="career-title">{info.title}</div>
                      <div className="career-desc">{info.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
      <AIFeedbackCard student={student} />
    </div>
  );
}

