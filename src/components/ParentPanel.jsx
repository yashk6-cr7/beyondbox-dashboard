import React from 'react';
import { student } from '../studentData';

export default function ParentPanel() {
  const avgs = student.skillAverages;
  const sorted = Object.entries(avgs).sort((a, b) => b[1] - a[1]);
  const top2 = sorted.slice(0, 2);
  const bottom = sorted[sorted.length - 1];

  const skillLabel = (key) => {
    const map = {
      cognitive: 'Cognitive',
      creative: 'Creative',
      communication: 'Communication',
      socialEmotional: 'Social-Emotional',
      physical: 'Physical',
      practical: 'Practical',
    };
    return map[key] || key;
  };

  const lastBook = student.books[student.books.length - 1];

  return (
    <div className="parent-panel" id="parent-panel">
      <h3 className="card-title">👨‍👩‍👧 Parent & Teacher Summary</h3>

      <blockquote className="teacher-quote">
        "{student.teacherNote}"
      </blockquote>

      <p className="parent-summary">
        {student.name} has completed <strong>{student.books.length} books</strong>. Her strongest skills are{' '}
        <strong>{skillLabel(top2[0][0])}</strong> and <strong>{skillLabel(top2[1][0])}</strong> (avg {top2[0][1].toFixed(1)}/4).
        She is currently an <strong>{student.badge}</strong>. Her most recent activity was{' '}
        <strong>{lastBook.title}</strong> on {lastBook.date}.
      </p>

      <div className="parent-pills">
        <span className="parent-pill parent-pill--badge">
          {student.badge} ⭐
        </span>
        {top2.map(([key, val]) => (
          <span className="parent-pill parent-pill--top" key={key}>
            {skillLabel(key)}: {val.toFixed(1)}
          </span>
        ))}
        <span className="parent-pill parent-pill--bottom">
          {skillLabel(bottom[0])}: {bottom[1].toFixed(1)}
        </span>
      </div>
    </div>
  );
}
