import React from 'react';

export default function ActivitiesPage({ student, onBack }) {
  const books = student?.books ?? [];

  return (
    <div className="activities-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack} id="back-to-dashboard">
          ← Back to Dashboard
        </button>
        <h2 className="page-title">All Activities</h2>
        <p className="page-subtitle">Deep dive into every book's skill breakdown</p>
      </div>

      <div className="activities-grid">
        {books.length === 0 ? (
          <div className="card full-width">
            <p className="empty-state">No activity data found in your profile.</p>
          </div>
        ) : (
          books.map((book) => (
            <div className="card activity-card" key={book.id}>
              <div className="activity-card-header">
                <div className="activity-meta">
                  <span className="activity-book-id">Book {book.id}</span>
                  <h4 className="activity-book-title">{book.title}</h4>
                </div>
                <div className="activity-score-badge">
                  <span className="score-val">{book.avg.toFixed(2)}</span>
                  <span className="score-label">AVG</span>
                </div>
              </div>

              <div className="activity-skills-grid">
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#6366f1' }} />
                  <span className="skill-chip-label">Cog: {book.cognitive}</span>
                </div>
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#ec4899' }} />
                  <span className="skill-chip-label">Cre: {book.creative}</span>
                </div>
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#f59e0b' }} />
                  <span className="skill-chip-label">Com: {book.communication}</span>
                </div>
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#10b981' }} />
                  <span className="skill-chip-label">Soc: {book.socialEmotional}</span>
                </div>
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#ef4444' }} />
                  <span className="skill-chip-label">Phy: {book.physical}</span>
                </div>
                <div className="skill-chip">
                  <span className="skill-chip-dot" style={{ background: '#8b5cf6' }} />
                  <span className="skill-chip-label">Pra: {book.practical}</span>
                </div>
              </div>

              <div className="activity-footer">
                <span className="activity-date-label">Completed on: {book.date}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card teacher-notes-card">
        <h3 className="card-title">📝 Teacher's Notes</h3>
        <p className="teacher-note-text">
          {student?.teacherNote ?? "Great progress this session! Focus on practical applications in the next module."}
        </p>
      </div>
    </div>
  );
}
