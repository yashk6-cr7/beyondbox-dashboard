import React, { useState, useEffect } from 'react';

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
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(false);

  const xp     = student?.xp    ?? 0;
  const level  = student?.level ?? 1;
  const badges = (student?.badges ?? []).filter(b => b.unlocked).length;
  const books  = student?.booksCompleted ?? 0;
  const name   = student?.name?.split(' ')[0] || 'The student';

  // Fallback: skill sorting from existing data
  const skillEntries = Object.entries(student?.skillAverages || {}).map(([key, val]) => ({ key, val }));
  skillEntries.sort((a, b) => b.val - a.val);
  const fallbackStrong     = skillEntries.slice(0, 3).map(s => s.key).filter(k => SKILL_NAMES[k]);
  const fallbackDeveloping = skillEntries.slice(-3).map(s => s.key).filter(k => SKILL_NAMES[k]).reverse();
  const fallbackConcepts   = (student?.concepts || []).slice(0, 3).map(c => ({
    subj: c.subject || 'General',
    rec: `Continue exploring ${c.conceptName || 'new ideas'}. Practice through real-world scenarios and visual models.`
  }));

  useEffect(() => {
    const studentId = student?.studentId;
    if (!studentId) {
      setAiLoading(false);
      setAiError(true);
      return;
    }

    const baseUrl = 'https://www.thebeyondbox.org';

    fetch(`${baseUrl}/_functions/getAIInsights?studentId=${studentId}`)
      .then(res => {
        if (!res.ok) throw new Error('API error: ' + res.status);
        return res.json();
      })
      .then(data => {
        const parse = (val, fallback) => {
          if (!val) return fallback;
          if (typeof val !== 'string') return val;
          try { return JSON.parse(val); } catch { return fallback; }
        };

        setAiData({
          overallSummary:          data.overallSummary || '',
          strongSkills:            parse(data.strongSkills,            []),
          developingSkills:        parse(data.developingSkills,        []),
          activityRecommendations: parse(data.activityRecommendations, {}),
          conceptRecommendations:  parse(data.conceptRecommendations,  []),
          careerSuggestions:       parse(data.careerSuggestions,       [])
        });
        setAiLoading(false);
      })
      .catch(err => {
        console.error('[AIFeedbackCard] Failed to fetch AI insights:', err);
        setAiLoading(false);
        setAiError(true);
      });
  }, [student?.studentId]);

  // ── LOADING STATE ──
  if (aiLoading) {
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
          <p className="insight-text" style={{ fontStyle: 'italic', color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>
            Generating your personalised insights...
          </p>
        </div>
      </div>
    );
  }

  // ── DETERMINE WHAT TO RENDER: AI data or fallback ──
  const useAI = aiData && !aiError;

  const strongSkills     = useAI ? aiData.strongSkills     : fallbackStrong;
  const developingSkills = useAI ? aiData.developingSkills : fallbackDeveloping;

  const renderActivityRecs = () => {
    if (useAI && aiData.activityRecommendations && Object.keys(aiData.activityRecommendations).length > 0) {
      return Object.entries(aiData.activityRecommendations).map(([skillName, activities]) => (
        <div key={skillName} className="rec-block">
          <div className="rec-block-title">{skillName}</div>
          <ul className="rec-list">
            {(activities || []).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      ));
    }
    return developingSkills.map(s => {
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
    });
  };

  const conceptRecs = useAI && aiData.conceptRecommendations?.length > 0
    ? aiData.conceptRecommendations.map(c => ({ subj: c.subject, rec: c.recommendation }))
    : (fallbackConcepts.length > 0 ? fallbackConcepts : [{ subj: 'General Learning', rec: 'Keep reading books and participating in activities to unlock specific subject recommendations!' }]);

  const renderCareerCards = () => {
    if (useAI && aiData.careerSuggestions?.length > 0) {
      const emojis = ['🎨','💻','🤝','🏃','💡','🎤','🚀','🌍'];
      return aiData.careerSuggestions.map((c, i) => (
        <div key={i} className="career-card">
          <span className="career-emoji">{emojis[i] || '⭐'}</span>
          <div>
            <div className="career-title">{c.title}</div>
            <div className="career-desc">{c.description}</div>
          </div>
        </div>
      ));
    }
    return fallbackStrong.map(s => {
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
    });
  };

  const overallSummaryText = useAI && aiData.overallSummary
    ? aiData.overallSummary
    : `${name} is progressing well across their learning journey. With ${books} books completed, ${xp} XP earned, and ${badges} achievement badges at Level ${level}, engagement with the platform is consistent. Skill scores reflect a well-rounded learner with particular strengths in ${strongSkills.length > 0 ? strongSkills.join(', ') : 'multiple domains'}.`;

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

        {/* Overall Performance Summary */}
        <div className="ai-section">
          <div className="ai-section-title">📊 Overall Performance Summary</div>
          <p className="insight-text">
            {useAI
              ? overallSummaryText
              : (
                <>
                  {name} is progressing well across their learning journey.
                  With <strong>{books} books</strong> completed, <strong>{xp} XP</strong> earned,
                  and <strong>{badges} achievement badges</strong> at Level {level},
                  engagement with the platform is consistent. Skill scores reflect a well-rounded learner
                  with particular strengths in {strongSkills.length > 0 ? strongSkills.join(', ') : 'multiple domains'}.
                </>
              )
            }
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
                  {strongSkills.map((s, i) => (
                    <span key={i} className="skill-pill skill-pill--strong">{s}</span>
                  ))}
                </div>
              </div>
              <div className="skill-analysis-group developing">
                <div className="skill-group-label">📈 Developing Skills</div>
                <div className="skill-pills">
                  {developingSkills.map((s, i) => (
                    <span key={i} className="skill-pill skill-pill--developing">{s}</span>
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
              {renderActivityRecs()}
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

        {/* Career Path Suggestions */}
        {strongSkills.length > 0 && (
          <div className="ai-section">
            <div className="ai-section-title">🚀 Career Path Suggestions</div>
            <p className="insight-text" style={{ marginBottom: '0.75rem' }}>
              Based on strongest areas — {strongSkills.map(s => s.toLowerCase()).join(', ')}:
            </p>
            <div className="career-cards">
              {renderCareerCards()}
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

