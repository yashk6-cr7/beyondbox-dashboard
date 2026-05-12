import React from 'react';

export default function RecentActivity({ student, onViewAll }) {
  const activities = student?.recentActivities ?? [];

  return (
    <div className="card recent-activity-card" id="recent-activity">
      <h3 className="card-title">📚 Recent Activity</h3>
      <div className="activity-list">
        {activities.length === 0 ? (
          <p className="empty-state">No recent activities yet.</p>
        ) : (
          activities.map((a, i) => (
            <div className="activity-row" key={i}>
              <span className="activity-icon">{a.icon ?? '📘'}</span>
              <div className="activity-info">
                <span className="activity-title">{a.title}</span>
                <span className="activity-book">{a.book}</span>
              </div>
              <span className="activity-date">{a.date}</span>
            </div>
          ))
        )}
      </div>
      <button className="view-all-btn" onClick={onViewAll} id="view-all-activities">
        View All Activities →
      </button>
    </div>
  );
}
