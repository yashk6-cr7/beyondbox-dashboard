import React, { useRef } from 'react';
import { navLinks } from '../studentData';

const navItems = [
  { key:'shop',         label:'Shop',         emoji:'🛍️', action:'external', url: navLinks.shop },
  { key:'simLab',       label:'Sim Lab',      emoji:'🔬', action:'external', url: navLinks.simLab },
  { key:'community',    label:'Community',    emoji:'👥', action:'external', url: navLinks.community },
  { key:'skillTracker', label:'Skill Tracker',emoji:'📊', action:'external', url: navLinks.skillTracker },
  { key:'activities',   label:'My Community', emoji:'🎯', action:'internal' },
];

export default function Sidebar({ student, activePage, setActivePage, isOpen, onClose, updatePhoto, updateName }) {
  const fileInputRef = useRef(null);

  const handleNav = (item) => {
    if (item.action === 'internal') {
      setActivePage('activities'); onClose();
    } else if (item.key === 'skillTracker') {
      // Direct redirect using _top to escape the iframe and load in the same tab
      window.open('https://www.thebeyondbox.org/skill-tracker', '_top');
      onClose();
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

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [editNameValue, setEditNameValue] = React.useState('');

  const handleEditNameClick = () => {
    setEditNameValue(student?.name ?? '');
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    if (editNameValue.trim() !== '') {
      updateName(editNameValue.trim());
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
    }
  };

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
          
          {isEditingName ? (
            <div className="sidebar-name-edit">
              <input 
                type="text" 
                value={editNameValue} 
                onChange={(e) => setEditNameValue(e.target.value)}
                onKeyDown={handleNameKeyDown}
                onBlur={handleNameSave}
                autoFocus
                className="sidebar-name-input"
              />
            </div>
          ) : (
            <div className="sidebar-name-display" onClick={handleEditNameClick} title="Click to edit name">
              <span className="sidebar-name">{student?.name ?? '—'}</span>
              <span className="sidebar-name-edit-icon">✏️</span>
            </div>
          )}
          
          {student?.grade && <span className="sidebar-grade" style={{ color:'rgba(255,255,255,0.85)', fontWeight:700 }}>{student.grade}</span>}
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
