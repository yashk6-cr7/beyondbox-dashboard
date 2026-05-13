import React from 'react';

const SKILL_META = [
  { key:'cognitive',       label:'Cognitive',        color:'#6366f1' },
  { key:'creative',        label:'Creative',         color:'#ec4899' },
  { key:'communication',   label:'Communication',    color:'#f59e0b' },
  { key:'socialEmotional', label:'Social-Emotional', color:'#10b981' },
  { key:'physical',        label:'Physical',         color:'#ef4444' },
  { key:'practical',       label:'Practical',        color:'#8b5cf6' },
];

export default function SkillAveragesBars({ student }) {
  const avgs = student?.skillAverages ?? {};

  return (
    <div className="card skill-averages-card" id="skill-averages">
      <h3 className="card-title">📊 Average Skill Scores</h3>
      <p className="card-subtitle">Scores out of 5.0</p>
      <div className="skill-bars">
        {SKILL_META.map(s => {
          const val = avgs[s.key] ?? 0;
          const pct = (val / 5) * 100;   // ← fixed: max is 5
          return (
            <div className="skill-bar-row" key={s.key}>
              <span className="skill-bar-label">{s.label}</span>
              <div className="skill-bar-track">
                <div className="skill-bar-fill" style={{ width:`${pct}%`, background: s.color }} />
              </div>
              <span className="skill-bar-value">{val.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
