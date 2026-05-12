// Custom hook: fetches student dashboard data from the Wix backend API
// Fallback to static data if API fails
import { useState, useEffect } from 'react';
import { student as staticStudent } from '../studentData';

const API_URL = 'https://www.thebeyondbox.org/_functions/studentDashboard?studentId=stu_001';

// Map API response → shape expected by existing components
function normalizeApiData(apiData) {
  const s = apiData.student || {};
  const sk = apiData.skills || {};
  const acts = apiData.recentActivities || [];
  const stats = apiData.stats || {};
  const concepts = apiData.concepts || [];

  // ── Chart books: ALWAYS use static per-book skill data ─────────────────────
  // The API only returns a single global average, not per-book skill scores.
  // The static data has the correct per-book breakdown (Book 1→5 growth curves).
  // Fix Bug 1: use staticStudent.books for the line chart.
  // Fix Bug 3: ensure shortTitle is "Book N" for clean X-axis labels.
  const chartBooks = staticStudent.books.map((b) => ({
    ...b,
    shortTitle: `Book ${b.id}`,  // clean X-axis: "Book 1", "Book 2" etc.
  }));

  // ── Recent 3 activities: from API, newest first ──────────────────────────
  const recent = [...acts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 3)
    .map((a, i) => ({
      title: a.title,
      book: a.title,
      date: new Date(a.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      icon: ['📘', '📙', '📗'][i % 3],
    }));

  // ── Skill averages: from API ─────────────────────────────────────────────
  const skillAverages = {
    cognitive:       sk.cognitive       ?? staticStudent.skillAverages.cognitive,
    creative:        sk.creative        ?? staticStudent.skillAverages.creative,
    communication:   sk.communication   ?? staticStudent.skillAverages.communication,
    socialEmotional: sk.socialEmotional ?? staticStudent.skillAverages.socialEmotional,
    physical:        sk.physical        ?? staticStudent.skillAverages.physical,
    practical:       sk.practical       ?? staticStudent.skillAverages.practical,
  };

  return {
    // Student info: from API
    name:           s.name           ?? staticStudent.name,
    photo:          staticStudent.photo,   // always local photo
    level:          s.level          ?? staticStudent.level,
    xp:             s.xp             ?? staticStudent.xp,
    xpTarget:       s.xpTarget       ?? staticStudent.xpTarget,
    explorerPoints: s.explorerPoints  ?? staticStudent.explorerPoints,
    grade:          s.grade          ?? '',
    badge:          staticStudent.badge,
    teacherNote:    staticStudent.teacherNote,

    // Chart: always static (correct per-book growth data)
    books: chartBooks,

    // Activities: from API (falls back to static if empty)
    recentActivities: recent.length ? recent : staticStudent.recentActivities,

    // Skills: from API
    skillAverages,

    // Concepts: from API
    concepts,

    // Stats: from API
    stats,

    // Milestones: static (not in API yet)
    milestones: staticStudent.milestones,
  };
}

export function useStudentData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        console.log('[BeyondBox] Fetching student data from API...');
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        console.log('[BeyondBox] API response:', json);
        if (!cancelled) {
          setData(normalizeApiData(json));
          setError(null);
        }
      } catch (err) {
        console.warn('[BeyondBox] API fetch failed, using static fallback:', err.message);
        if (!cancelled) {
          setData(normalizeApiData({})); // normalize with empty → falls back to static
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}
