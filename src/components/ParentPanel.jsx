import React, { useState, useEffect } from 'react';

const WIX_BASE = 'https://www.thebeyondbox.org/_functions';

// Helper to determine career emoji based on keywords
function getCareerEmoji(title) {
  const t = (title || '').toLowerCase();
  if (t.includes('code') || t.includes('software') || t.includes('developer') || t.includes('computer') || t.includes('tech') || t.includes('data') || t.includes('analyst')) return '💻';
  if (t.includes('design') || t.includes('art') || t.includes('creative') || t.includes('media') || t.includes('writer') || t.includes('architect') || t.includes('illustrator')) return '🎨';
  if (t.includes('science') || t.includes('scientist') || t.includes('engineer') || t.includes('bio') || t.includes('chemist') || t.includes('research') || t.includes('physicist')) return '🔬';
  if (t.includes('business') || t.includes('manager') || t.includes('operat') || t.includes('entrepreneur') || t.includes('lead') || t.includes('marketing')) return '💼';
  if (t.includes('health') || t.includes('doctor') || t.includes('therapist') || t.includes('nurse') || t.includes('counsel') || t.includes('social worker')) return '🤝';
  if (t.includes('teach') || t.includes('educat') || t.includes('professor') || t.includes('instructor')) return '🎓';
  return '🚀';
}

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
function AIFeedbackCard({ student }) {
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState(null);
  const [aiData, setAiData] = useState(null);

  const studentId = student?.studentId;

  useEffect(() => {
    if (!studentId) return;

    let active = true;
    setAiLoading(true);
    setAiError(null);

    const url = `${WIX_BASE}/getAIInsights?studentId=${encodeURIComponent(studentId)}`;

    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (!active) return;
        try {
          const parsed = {
            overallSummary: data.overallSummary || '',
            strongSkills: JSON.parse(data.strongSkills || '[]'),
            developingSkills: JSON.parse(data.developingSkills || '[]'),
            activityRecommendations: JSON.parse(data.activityRecommendations || '{}'),
            conceptRecommendations: JSON.parse(data.conceptRecommendations || '[]'),
            careerSuggestions: JSON.parse(data.careerSuggestions || '[]')
          };
          setAiData(parsed);
          setAiLoading(false);
        } catch (e) {
          console.error('[ParentPanel] Failed to parse AI insights:', e);
          setAiError('Insights are being prepared. Please check back soon.');
          setAiLoading(false);
        }
      })
      .catch(err => {
        if (!active) return;
        console.error('[ParentPanel] Failed to fetch AI insights:', err);
        setAiError('Insights are being prepared. Please check back soon.');
        setAiLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId]);

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
        {aiLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="loading-spinner" />
            <p style={{ color: '#4b5563', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.75rem', fontFamily: "'Nunito', sans-serif" }}>
              Analyzing learning insights...
            </p>
          </div>
        )}

        {!aiLoading && aiError && (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic', fontSize: '0.92rem', fontFamily: "'Nunito', sans-serif" }}>
            {aiError}
          </div>
        )}

        {!aiLoading && !aiError && aiData && (
          <>
            {/* Overall Summary */}
            <div className="ai-section">
              <div className="ai-section-title">📊 Overall Performance Summary</div>
              <p className="insight-text">
                {aiData.overallSummary}
              </p>
            </div>

            {/* Skill Analysis */}
            {((aiData.strongSkills && aiData.strongSkills.length > 0) || 
              (aiData.developingSkills && aiData.developingSkills.length > 0)) && (
              <div className="ai-section">
                <div className="ai-section-title">🧠 Skill Analysis</div>
                <div className="skill-analysis-row">
                  {aiData.strongSkills && aiData.strongSkills.length > 0 && (
                    <div className="skill-analysis-group strong">
                      <div className="skill-group-label">💪 Strong Skills</div>
                      <div className="skill-pills">
                        {aiData.strongSkills.map(s => (
                          <span key={s} className="skill-pill skill-pill--strong">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiData.developingSkills && aiData.developingSkills.length > 0 && (
                    <div className="skill-analysis-group developing">
                      <div className="skill-group-label">📈 Developing Skills</div>
                      <div className="skill-pills">
                        {aiData.developingSkills.map(s => (
                          <span key={s} className="skill-pill skill-pill--developing">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Recommendations */}
            {aiData.activityRecommendations && Object.keys(aiData.activityRecommendations).length > 0 && (
              <div className="ai-section">
                <div className="ai-section-title">🎯 Activity Recommendations</div>
                <div className="rec-grid">
                  {Object.entries(aiData.activityRecommendations).map(([skill, recs]) => (
                    <div key={skill} className="rec-block">
                      <div className="rec-block-title">{skill}</div>
                      <ul className="rec-list">
                        {(recs || []).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Concept Recommendations */}
            {aiData.conceptRecommendations && aiData.conceptRecommendations.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-title">📚 Concept Recommendations</div>
                <div className="concept-rec-list">
                  {aiData.conceptRecommendations.map((c, i) => (
                    <div key={i} className="concept-rec-item">
                      <span className="concept-rec-subj">{c.subject}</span>
                      <span className="concept-rec-text">→ {c.recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Career Suggestions */}
            {aiData.careerSuggestions && aiData.careerSuggestions.length > 0 && (
              <div className="ai-section">
                <div className="ai-section-title">🚀 Career Path Suggestions</div>
                <div className="career-cards">
                  {aiData.careerSuggestions.map((c, i) => (
                    <div key={i} className="career-card">
                      <span className="career-emoji">{getCareerEmoji(c.title)}</span>
                      <div>
                        <div className="career-title">{c.title}</div>
                        <div className="career-desc">{c.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
