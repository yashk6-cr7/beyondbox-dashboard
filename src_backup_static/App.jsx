import React, { useState } from 'react';
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

  return (
    <div className="app-layout">
      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          id="hamburger-btn"
        >
          ☰
        </button>
        <span className="mobile-topbar-title">beyond box</span>
      </header>

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        {activePage === 'activities' ? (
          <ActivitiesPage onBack={() => setActivePage('dashboard')} />
        ) : (
          <div className="dashboard-grid">
            <div className="full-width">
              <WelcomeCard />
            </div>
            <div className="full-width">
              <SkillGrowthChart />
            </div>
            <SkillAveragesBars />
            <ConceptProgress />
            <RecentActivity onViewAll={() => setActivePage('activities')} />
            <MilestoneBadges />
            <div className="full-width">
              <ParentPanel />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
