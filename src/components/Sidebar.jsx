import React, { useRef } from 'react';
import { navLinks } from '../studentData';

const navItems = [
  { key:'home',         label:'Home',         emoji:'🏠', action:'external', url: navLinks.home },
  { key:'shop',         label:'Shop',         emoji:'🛍️', action:'external', url: navLinks.shop },
  { key:'simLab',       label:'Sim Lab',      emoji:'🔬', action:'external', url: navLinks.simLab },
  { key:'community',    label:'Community',    emoji:'👥', action:'external', url: navLinks.community },
  { key:'skillTracker', label:'Skill Tracker',emoji:'📊', action:'external', url: navLinks.skillTracker },
  { key:'activities',   label:'Activities',   emoji:'🎯', action:'internal' },
  { key:'profile',      label:'Profile',      emoji:'👤', action:'scroll' },
];

export default function Sidebar({ student, activePage, setActivePage, isOpen, onClose, updatePhoto }) {
  const fileInputRef = useRef(null);

  const handleNav = (item) => {
    if (item.action === 'internal') {
      setActivePage('activities'); onClose();
    } else if (item.action === 'scroll') {
      setActivePage('dashboard'); onClose();
      setTimeout(() => { document.getElementById('parent-panel')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } else {
      if (item.url === '/') {
        try { window.parent.location.href = item.url; } catch { window.open(item.url, '_self'); }
      } else {
        try { window.parent.postMessage({ action: 'navigate', url: item.url }, '*'); } catch {}
        window.open(item.url, '_blank');
      }
      onClose();
    }
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updatePhoto(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const isActive = (key) =>
    (key === 'activities' && activePage === 'activities') ||
    (key === 'home' && activePage === 'dashboard');

  // Auto-calculate XP progress for next level
  const xpPct = student?.xpTarget ? Math.min(Math.round((student.xp / student.xpTarget) * 100), 100) : 0;

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="sidebar-logo-text">beyond box</span>
            <span className="sidebar-logo-sub">STEM Platform</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close sidebar">✕</button>
        </div>

        {/* Clickable avatar for photo edit */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar-wrap" onClick={handlePhotoClick} title="Click to change photo">
            <img src={student?.photo} alt={student?.name ?? 'Student'} className="sidebar-avatar" />
            <div className="avatar-edit-overlay">📷</div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
            id="photo-file-input"
          />
          <span className="sidebar-name">{student?.name ?? '—'}</span>
          {student?.grade && <span className="sidebar-grade">{student.grade}</span>}
          <span className="sidebar-badge-pill">{student?.levelName ?? 'Explorer'}</span>

          {/* XP mini bar */}
          <div className="sidebar-xp-mini">
            <div className="sidebar-xp-mini-bar" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="sidebar-xp-label">
            Lv.{student?.level ?? 1} · {student?.xp ?? 0} / {student?.xpTarget ?? 400} XP
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-link ${isActive(item.key) ? 'sidebar-link--active' : ''}`}
              onClick={() => handleNav(item)}
              id={`nav-${item.key}`}
            >
              <span className="sidebar-link-emoji">{item.emoji}</span>
              <span className="sidebar-link-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-text">
            📚 {student?.booksCompleted ?? 0} / {student?.totalBooks ?? 11} Books Completed
          </span>
        </div>
      </aside>
    </>
  );
}
