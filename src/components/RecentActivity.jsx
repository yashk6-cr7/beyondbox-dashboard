import React from 'react';

// ─── Activity type → display metadata ────────────────────────────────────────
// Covers every activityType / source emitted by the StudentActivities CMS.
// The `type` field on each feed item is set to `source` from the API
// (books | simulation | community | achievement) OR to the specific
// activityType string when richer classification is available.
const ACTIVITY_META = {
  // ── Source-level keys (from StudentActivities.source) ──────────────────────
  books:                     { color: '#6366f1', bg: '#eef2ff', label: 'Book'        },
  simulation:                { color: '#10b981', bg: '#ecfdf5', label: 'Simulation'  },
  community:                 { color: '#ec4899', bg: '#fdf2f8', label: 'Community'   },
  achievement:               { color: '#f59e0b', bg: '#fffbeb', label: 'Achievement' },

  // ── Fine-grained activityType keys ─────────────────────────────────────────
  book_completed:            { color: '#6366f1', bg: '#eef2ff', label: 'Book'        },

  simulation_started:        { color: '#10b981', bg: '#ecfdf5', label: 'Simulation'  },
  simulation_pretest_completed:  { color: '#0ea5e9', bg: '#e0f2fe', label: 'Pre-Test'   },
  simulation_posttest_completed: { color: '#22c55e', bg: '#dcfce7', label: 'Post-Test'  },
  simulation_completed:      { color: '#10b981', bg: '#ecfdf5', label: 'Simulation'  },

  community_post:            { color: '#ec4899', bg: '#fdf2f8', label: 'Post'        },
  community_comment:         { color: '#a855f7', bg: '#faf5ff', label: 'Comment'     },
  community_reaction:        { color: '#f43f5e', bg: '#fff1f2', label: 'Reaction'    },
  community_group_joined:    { color: '#8b5cf6', bg: '#f5f3ff', label: 'Group'       },

  badge_unlocked:            { color: '#f59e0b', bg: '#fffbeb', label: 'Badge'       },
  xp_level_up:               { color: '#f97316', bg: '#fff7ed', label: 'Level Up'    },

  // ── Legacy / fallback ──────────────────────────────────────────────────────
  book_score:                { color: '#6366f1', bg: '#eef2ff', label: 'Book Score'  },
  default:                   { color: '#8b5cf6', bg: '#f5f3ff', label: 'Activity'    },
};

function FeedItem({ item, index }) {
  // Resolve display meta: fine-grained activityType > source-level type > default
  const meta = ACTIVITY_META[item.activityType]
             || ACTIVITY_META[item.type]
             || ACTIVITY_META.default;

  const date = item.date || (item.timestamp
    ? new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : '—');
  const time = item.time || (item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : '');

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
  // activityFeed = live feed from /studentActivities (loaded async after dashboard)
  // recentActivities = fast fallback from /studentDashboard (available immediately)
  // Prefer activityFeed if populated; fall back to recentActivities; then empty
  const liveFeed     = student?.activityFeed;
  const fallbackFeed = (student?.recentActivities || []).map(a => ({
    id:           a.id,
    type:         a.type         || 'books',
    activityType: a.activityType || '',
    icon:         a.icon         || '📘',
    title:        a.title        || 'Activity',
    detail:       a.description  || '',
    timestamp:    a.completedAt  || a.date || null,
    date:         a.date         || '',
    time:         a.time         || '',
  }));
  const feed = (liveFeed && liveFeed.length > 0) ? liveFeed : fallbackFeed;

  // Client-side dedup safety net: if the CMS has old duplicate entries (same activityKey or title),
  // only show the most recent one to prevent historical clutter from pushing other activities down.
  const seenKeys = new Set();
  const dedupedFeed = feed.filter(item => {
    // For book completions, use title to filter duplicate completion items.
    const key = (item.type === 'books' && item.title) ? item.title : (item.activityKey || item.id);
    if (!key) return true;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  const isLive = !!(liveFeed && liveFeed.length > 0);

  return (
    <div className="card recent-activity-card" id="recent-activity">
      <div className="feed-card-header">
        <div>
          <h3 className="card-title">🔔 Activity Feed</h3>
          <p className="card-subtitle">
            Real-time updates from your platform activity
          </p>
        </div>
        <span className="feed-live-badge" style={isLive ? {} : { opacity: 0.6 }}>
          {isLive ? '● LIVE' : '○ Syncing…'}
        </span>
      </div>

      <div className="feed-list">
        {dedupedFeed.length === 0 ? (
          <div className="feed-empty">
            <span className="feed-empty-icon">🌱</span>
            <p>No activity yet. Start exploring the platform!</p>
          </div>
        ) : (
          dedupedFeed.slice(0, 5).map((item, i) => <FeedItem key={item.id || `feed-${i}`} item={item} index={i} />)
        )}
      </div>

      <button className="view-all-btn" onClick={onViewAll} id="view-all-activities">
        View Community Wall →
      </button>
    </div>
  );
}
