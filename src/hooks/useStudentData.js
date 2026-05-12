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

  // Build books array from recentActivities (sorted oldest → newest)
  const sorted = [...acts].sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  const books = sorted.map((a, i) => ({
    id: i + 1,
    title: a.title,
    shortTitle: a.title.length > 15 ? a.title.slice(0, 14) + '...' : a.title,
    date: new Date(a.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    activity: a.title,
    cognitive: sk.cognitive ?? 2.8,
    creative: sk.creative ?? 3,
    communication: sk.communication ?? 2.2,
    socialEmotional: sk.socialEmotional ?? 2.8,
    physical: sk.physical ?? 2.2,
    practical: sk.practical ?? 3,
    avg: a.score ?? 2.5,
  }));

  // Recent 3, newest first
  const recent = [...acts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 3)
    .map((a, i) => ({
      title: a.title,
      book: a.title,
      date: new Date(a.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      icon: ['📘', '📙', '📗'][i % 3],
    }));

  const skillAverages = {
    cognitive: sk.cognitive ?? 2.8,
    creative: sk.creative ?? 3,
    communication: sk.communication ?? 2.2,
    socialEmotional: sk.socialEmotional ?? 2.8,
    physical: sk.physical ?? 2.2,
    practical: sk.practical ?? 3,
  };

  return {
    name: s.name ?? staticStudent.name,
    photo: staticStudent.photo, // keep local photo
    level: s.level ?? staticStudent.level,
    xp: s.xp ?? staticStudent.xp,
    xpTarget: s.xpTarget ?? staticStudent.xpTarget,
    explorerPoints: s.explorerPoints ?? staticStudent.explorerPoints,
    badge: staticStudent.badge,
    teacherNote: staticStudent.teacherNote,
    grade: s.grade ?? '',
    books: books.length ? books : staticStudent.books,
    recentActivities: recent.length ? recent : staticStudent.recentActivities,
    skillAverages,
    milestones: staticStudent.milestones,
    // extra API fields
    concepts,
    stats,
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
