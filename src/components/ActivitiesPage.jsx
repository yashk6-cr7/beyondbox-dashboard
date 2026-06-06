import React from 'react';

const COMMUNITY_URL = 'https://www.thebeyondbox.org/group/humans-of-science-1/discussion';

// Post type color map
const POST_TYPE_META = {
  discussion: { label: 'Discussion', color: '#6366f1', emoji: '💬' },
  question:   { label: 'Question',   color: '#f59e0b', emoji: '❓' },
  project:    { label: 'Project',    color: '#10b981', emoji: '🔬' },
  media:      { label: 'Media',      color: '#ec4899', emoji: '🖼️' },
  default:    { label: 'Post',       color: '#8b5cf6', emoji: '📝' },
};

function PostCard({ post }) {
  const meta = POST_TYPE_META[post.type] || POST_TYPE_META.default;
  const date = post.postedAt
    ? new Date(post.postedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : post.date || '—';

  return (
    <div className="community-post-card">
      {post.imageUrl && (
        <div className="post-image-wrap">
          <img src={post.imageUrl} alt={post.title} className="post-image" />
        </div>
      )}
      <div className="post-card-body">
        <div className="post-type-tag" style={{ background: meta.color }}>
          {meta.emoji} {meta.label}
        </div>
        <h4 className="post-title">{post.title}</h4>
        {post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}
        <div className="post-footer">
          <span className="post-date">📅 {date}</span>
          <div className="post-stats">
            {post.likes    != null && <span>❤️ {post.likes}</span>}
            {post.comments != null && <span>💬 {post.comments}</span>}
            {post.views    != null && <span>👁️ {post.views}</span>}
          </div>
        </div>
        {post.url && (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className="post-read-btn">
            View Post →
          </a>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesPage({ student, onBack }) {
  const posts      = student?.communityPosts ?? [];
  const stats      = student?.communityStats;

  // Use backend-provided stats if available (more accurate — includes comments from other posts)
  // Fall back to calculating from the feed array
  const postCount     = stats?.posts         ?? posts.length;
  const totalLikes    = stats?.likesReceived ?? posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalComments = stats?.replies       ?? posts.reduce((s, p) => s + (p.comments || 0), 0);
  const isLive        = posts.length > 0;

  return (
    <div className="activities-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack} id="back-to-dashboard">← Dashboard</button>
        <div>
          <h2 className="page-title">🧑‍🚀 My Community Wall</h2>
          <p className="page-subtitle">Your posts and contributions in the Humans of Science community</p>
        </div>
      </div>

      {/* Community stats bar */}
      <div className="community-stats-bar">
        <div className="comm-stat">
          <span className="comm-stat-val">{postCount}</span>
          <span className="comm-stat-lbl">Posts</span>
        </div>
        <div className="comm-stat">
          <span className="comm-stat-val">{totalLikes}</span>
          <span className="comm-stat-lbl">Likes Received</span>
        </div>
        <div className="comm-stat">
          <span className="comm-stat-val">{totalComments}</span>
          <span className="comm-stat-lbl">Replies</span>
        </div>
        <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="community-link-btn">
          Open Community →
        </a>
      </div>

      {/* Posts grid or empty state */}
      {isLive ? (
        <div className="community-posts-grid">
          {posts.map((post, i) => <PostCard key={post.id || i} post={post} />)}
        </div>
      ) : (
        <div className="community-empty-state">
          <div className="empty-icon">🌍</div>
          <h3 className="empty-title">Your posts will appear here</h3>
          <p className="empty-desc">
            When you contribute to the <strong>Humans of Science</strong> community — asking questions,
            sharing projects, or starting discussions — your posts will show up on this wall automatically.
          </p>
          <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer" className="community-cta-btn">
            Visit Community Page →
          </a>
          <div className="api-pending-note">
            🔌 Connected to live Wix community — posts will appear here once you start contributing.
          </div>
        </div>
      )}
    </div>
  );
}
