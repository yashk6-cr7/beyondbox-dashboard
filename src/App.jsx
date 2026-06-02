import React, { useState } from 'react';
import { useStudentData } from './hooks/useStudentData';
import Sidebar from './components/Sidebar';
import WelcomeCard from './components/WelcomeCard';
import SkillGrowthChart from './components/SkillGrowthChart';
import SkillAveragesBars from './components/SkillAveragesBars';
import ConceptProgress from './components/ConceptProgress';
import RecentActivity from './components/RecentActivity';
import MilestoneBadges from './components/MilestoneBadges';
import ActivitiesPage from './components/ActivitiesPage';
import ParentPanel from './components/ParentPanel';

export default function App() {
  const [activePage,  setActivePage]  = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: student, loading, error, waitingForId, updatePhoto, updateName } = useStudentData();

  // ── Waiting for Wix to send memberId ────────────────────────────────────
  if (waitingForId) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Connecting to Beyond Box…</p>
        <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>
          Please make sure you are logged in on thebeyondbox.org
        </p>
      </div>
    );
  }

  // ── Not logged in / timeout ──────────────────────────────────────────────
  if (error === 'NOT_LOGGED_IN') {
    return (
      <div className="loading-screen">
        <p style={{ fontSize: 40, marginBottom: 12 }}>🔒</p>
        <p className="loading-text">Please log in to view your dashboard</p>
        <a
          href="https://www.thebeyondbox.org"
          style={{
            display: 'inline-block', marginTop: 16, padding: '10px 24px',
            background: '#7c3aed', color: '#fff', borderRadius: 999,
            textDecoration: 'none', fontWeight: 600, fontSize: 14,
          }}
        >
          Go to Beyond Box →
        </a>
      </div>
    );
  }

  // ── Fetching data ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p className="loading-text">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="mobile-topbar">
        <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu" id="hamburger-btn">☰</button>
        <span className="mobile-topbar-title">beyond box</span>
      </header>

      <Sidebar
        student={student}
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        updatePhoto={updatePhoto}
        updateName={updateName}
      />

      <main className="main-content">
        {error && error !== 'NOT_LOGGED_IN' && (
          <div className="api-warning">⚠️ Using offline data — live sync unavailable</div>
        )}

        {activePage === 'activities' ? (
          <ActivitiesPage student={student} onBack={() => setActivePage('dashboard')} />
        ) : (
          <div className="dashboard-grid">
            <div className="full-width"><WelcomeCard student={student} /></div>
            <div className="full-width"><SkillGrowthChart student={student} /></div>
            <SkillAveragesBars student={student} />
            <ConceptProgress student={student} />
            <RecentActivity student={student} onViewAll={() => setActivePage('activities')} />
            <div className="full-width"><MilestoneBadges student={student} /></div>
            <div className="full-width"><ParentPanel student={student} /></div>
          </div>
        )}
      </main>
    </div>
  );
}
