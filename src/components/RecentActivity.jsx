import React from 'react';

const ACTIVITY_META = {
  book_score:  { color: '#6366f1', bg: '#eef2ff', label: 'Book Score'  },
  simulation:  { color: '#10b981', bg: '#ecfdf5', label: 'Simulation'  },
  purchase:    { color: '#f59e0b', bg: '#fffbeb', label: 'Purchase'     },
  community:   { color: '#ec4899', bg: '#fdf2f8', label: 'Community'   },
  default:     { color: '#8b5cf6', bg: '#f5f3ff', label: 'Activity'    },
};

function FeedItem({ item, index }) {
  const meta = ACTIVITY_META[item.type] || ACTIVITY_META.default;
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : item.date || '—';
  const time = item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="feed-item">
      <div className="feed-dot-col">
        <div className="feed-icon" style={{ background: meta.bg, color: meta.color }}>
          {item.icon || '📌'}
        </div>
        <div className="feed-line" />
      </div>
      <div className="feed-content">
        <div className="feed-header">
          <span className="feed-title">{item.title}</span>
          <span className="feed-type-tag" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        </div>
        {item.detail && <p className="feed-detail">{item.detail}</p>}
        <span className="feed-time">{date}{time ? ` · ${time}` : ''}</span>
      </div>
    </div>
  );
}

export default function RecentActivity({ student, onViewAll }) {
  const feed   = student?.activityFeed ?? [];
  const isLive = feed.length > 0;

  // Fallback: build basic feed from book activities if API feed not ready
  const fallbackFeed = (student?.recentActivities ?? []).map(a => ({
    type:   'book_score',
    icon:   a.icon ?? '📘',
    title:  a.title,
    detail: a.book,
    date:   a.date,
  }));

  const displayFeed = isLive ? feed.slice(0, 5) : fallbackFeed;

  return (
    <div className="card recent-activity-card" id="recent-activity">
      <div className="feed-card-header">
        <div>
          <h3 className="card-title">🔔 Activity Feed</h3>
          <p className="card-subtitle">
            {isLive ? 'Live updates from your platform activity' : 'Showing book activity — live feed connecting soon'}
          </p>
        </div>
        {!isLive && (
          <span className="feed-status-dot" title="Waiting for live feed">⏳</span>
        )}
        {isLive && (
          <span className="feed-live-badge">● LIVE</span>
        )}
      </div>

      <div className="feed-list">
        {displayFeed.length === 0 ? (
          <div className="feed-empty">
            <span className="feed-empty-icon">🌱</span>
            <p>No activity yet. Start exploring the platform!</p>
          </div>
        ) : (
          displayFeed.map((item, i) => <FeedItem key={i} item={item} index={i} />)
        )}
      </div>

      <button className="view-all-btn" onClick={onViewAll} id="view-all-activities">
        View Community Wall →
      </button>
    </div>
  );
}
