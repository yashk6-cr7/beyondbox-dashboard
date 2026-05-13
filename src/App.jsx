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
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: student, loading, error, updatePhoto } = useStudentData();

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
      />

      <main className="main-content">
        {error && <div className="api-warning">⚠️ Using offline data — live sync unavailable</div>}

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
