import React from 'react';
import { student, navLinks } from '../studentData';

const navItems = [
  { key: 'home', label: 'Home', emoji: '🏠', action: 'external', url: navLinks.home },
  { key: 'shop', label: 'Shop', emoji: '🛍️', action: 'external', url: navLinks.shop },
  { key: 'simLab', label: 'Sim Lab', emoji: '🔬', action: 'external', url: navLinks.simLab },
  { key: 'community', label: 'Community', emoji: '👥', action: 'external', url: navLinks.community },
  { key: 'skillTracker', label: 'Skill Tracker', emoji: '📊', action: 'external', url: navLinks.skillTracker },
  { key: 'activities', label: 'Activities', emoji: '🎯', action: 'internal' },
  { key: 'profile', label: 'Profile', emoji: '👤', action: 'scroll' },
];

export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const handleNav = (item) => {
    if (item.action === 'internal') {
      setActivePage('activities');
      onClose();
    } else if (item.action === 'scroll') {
      setActivePage('dashboard');
      onClose();
      setTimeout(() => {
        const el = document.getElementById('parent-panel');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (item.action === 'external') {
      if (item.url === '/') {
        try { window.parent.location.href = item.url; } catch (e) { window.open(item.url, '_self'); }
      } else {
        try { window.parent.postMessage({ action: 'navigate', url: item.url }, '*'); } catch (e) { /* ignore */ }
        window.open(item.url, '_blank');
      }
      onClose();
    }
  };

  const isActive = (key) => {
    if (key === 'activities' && activePage === 'activities') return true;
    if (key === 'home' && activePage === 'dashboard') return true;
    return false;
  };

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

        <div className="sidebar-profile">
          <img src={student.photo} alt={student.name} className="sidebar-avatar" />
          <span className="sidebar-name">{student.name}</span>
          <span className="sidebar-badge-pill">{student.badge}</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
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
          <span className="sidebar-xp-star">⭐</span>
          <span className="sidebar-xp-text">{student.explorerPoints} Explorer Points</span>
        </div>
      </aside>
    </>
  );
}
