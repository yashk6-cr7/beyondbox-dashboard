import React, { useState } from 'react';

// ─── Card 1: Tutor Feedback ────────────────────────────────────────────────
function TutorFeedbackCard() {
  const [expanded, setExpanded] = useState(false);

  const fullText = `Diya has shown encouraging and consistent progress across the completed books and simulation-based concept activities. The growth graph reflects steady improvement in multiple skill areas, especially in Creative, Practical, and Social-Emotional development. Her ability to engage with activities and apply learning from one book to the next demonstrates growing confidence and adaptability. The average skill scores indicate balanced development, with particularly strong performance in creative thinking, practical application, and cognitive understanding.

The simulation-based concept progress also highlights positive academic growth across grades and subjects. Diya demonstrates strong observation, communication, and scientific reasoning skills, especially in Science and Language-based concepts. She actively participates in interactive learning tasks and is able to connect concepts with real-world situations. Her progress from pre-assessment to post-assessment scores shows meaningful improvement in understanding and retention.

In Mathematics, Diya is developing problem-solving abilities steadily and should continue practicing logical reasoning and multi-step thinking to build stronger confidence. In Physical Education and wellbeing-related activities, she is participating well and can benefit from more regular engagement to further strengthen coordination and confidence.

Overall, Diya is an enthusiastic learner who responds positively to interactive and experiential learning methods. With continued practice, curiosity, and consistent participation in both reading and simulation activities, she is expected to achieve even greater growth across all learning domains.`;

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
        <p className="insight-text">
          {expanded ? fullText.split('\n\n').map((para, i) => (
            <span key={i}>{para}<br /><br /></span>
          )) : preview}
        </p>
        <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? '▲ Show less' : '▼ Read full feedback'}
        </button>
      </div>
    </div>
  );
}

// ─── Card 2: AI Assistant Feedback ────────────────────────────────────────
function AIFeedbackCard({ student }) {
  const xp       = student?.xp       ?? 534;
  const level    = student?.level    ?? 2;
  const badges   = (student?.badges  ?? []).filter(b => b.unlocked).length;
  const books    = student?.booksCompleted ?? 5;

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
            {student?.name?.split(' ')[0] ?? 'Diya'} is progressing well across all learning dimensions.
            With <strong>{books} books</strong> completed, <strong>{xp} XP</strong> earned, and <strong>{badges} achievement badges</strong> at Level {level},
            her engagement with the platform is consistent and growing. Her skill scores reflect a well-rounded learner
            with particular strengths in creative and practical domains, and her concept assessments show meaningful
            pre-to-post improvement in Science and Language — a strong indicator of genuine learning and retention.
          </p>
        </div>

        {/* Skill Analysis */}
        <div className="ai-section">
          <div className="ai-section-title">🧠 Skill Analysis</div>
          <div className="skill-analysis-row">
            <div className="skill-analysis-group strong">
              <div className="skill-group-label">💪 Strong Skills</div>
              <div className="skill-pills">
                {['Creative Thinking','Practical Application','Social-Emotional'].map(s => (
                  <span key={s} className="skill-pill skill-pill--strong">{s}</span>
                ))}
              </div>
            </div>
            <div className="skill-analysis-group developing">
              <div className="skill-group-label">📈 Developing Skills</div>
              <div className="skill-pills">
                {['Logical Reasoning','Math Problem Solving','Physical Coordination'].map(s => (
                  <span key={s} className="skill-pill skill-pill--developing">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Recommendations */}
        <div className="ai-section">
          <div className="ai-section-title">🎯 Activity Recommendations</div>
          <div className="rec-grid">
            <div className="rec-block">
              <div className="rec-block-title">🧩 Logical Reasoning</div>
              <ul className="rec-list">
                <li>Daily logic puzzles (Lumosity or BrainPOP)</li>
                <li>Strategy board games — chess, Blokus, Mastermind</li>
                <li>"Why does this work?" conversations after activities</li>
              </ul>
            </div>
            <div className="rec-block">
              <div className="rec-block-title">➗ Mathematical Thinking</div>
              <ul className="rec-list">
                <li>Multi-step word problems from real life</li>
                <li>Pattern-finding games and number sequences</li>
                <li>10 mins of mental math daily using Prodigy</li>
              </ul>
            </div>
            <div className="rec-block">
              <div className="rec-block-title">🏃 Physical Coordination</div>
              <ul className="rec-list">
                <li>Outdoor play with structured movement</li>
                <li>Yoga or dance sessions twice a week</li>
                <li>Group sports to build teamwork and confidence</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Concept Recommendations */}
        <div className="ai-section">
          <div className="ai-section-title">📚 Concept Recommendations</div>
          <div className="concept-rec-list">
            {[
              { subj: 'Mathematics', rec: 'Multi-step word problems, number patterns, basic fractions. Practice through real-world scenarios and visual models.' },
              { subj: 'Physical Education', rec: 'Body awareness, coordination, and consistent movement habits. Daily movement routine and mindfulness exercises.' },
              { subj: 'Science', rec: 'Continue exploring force, motion, and living systems. Extend through simple home experiments and observation journals.' },
            ].map(c => (
              <div key={c.subj} className="concept-rec-item">
                <span className="concept-rec-subj">{c.subj}</span>
                <span className="concept-rec-text">→ {c.rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Career Paths */}
        <div className="ai-section">
          <div className="ai-section-title">🚀 Career Path Suggestions</div>
          <p className="insight-text" style={{ marginBottom:'0.75rem' }}>
            Based on strongest areas — creative thinking, scientific curiosity, communication, and practical application:
          </p>
          <div className="career-cards">
            {[
              { emoji:'🎨', title:'Design & Innovation', desc:'Product design, UX, architecture, or fashion' },
              { emoji:'🔬', title:'Environmental & Life Sciences', desc:'Biology, sustainability, nature-based research' },
              { emoji:'💡', title:'Entrepreneurship & Social Impact', desc:'Problem-solving with a real-world purpose' },
            ].map(c => (
              <div key={c.title} className="career-card">
                <span className="career-emoji">{c.emoji}</span>
                <div>
                  <div className="career-title">{c.title}</div>
                  <div className="career-desc">{c.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────
export default function ParentPanel({ student }) {
  return (
    <div id="parent-panel" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <TutorFeedbackCard />
      <AIFeedbackCard student={student} />
    </div>
  );
}
