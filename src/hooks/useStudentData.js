import { useState, useEffect } from 'react';
import { student as staticStudent } from '../studentData';
import diyaPhoto from '../assets/diya.jpg';

const API_URL = 'https://www.thebeyondbox.org/_functions/studentDashboard?studentId=stu_001';
const STORAGE_KEY = 'beyondbox_photo_stu_001';
const TOTAL_BOOKS = 11;
const SKILLS = ['cognitive','creative','communication','socialEmotional','physical','practical'];

// XP: each book gives up to 200 XP based on avg score (max 5)
function calcXP(books) {
  return books.reduce((sum, b) => sum + Math.round((b.avg / 5) * 200), 0);
}

// Level from XP thresholds (max 2200 XP across 11 books)
const LEVEL_THRESHOLDS = [0, 400, 800, 1200, 1600, 2200];
const LEVEL_NAMES = ['', 'Beginner Explorer', 'Junior Scientist', 'STEM Explorer', 'Science Leader', 'STEM Champion'];

function calcLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return Math.min(i + 1, 5);
  }
  return 1;
}

function calcXPTarget(level) {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)];
}

function calcBadges(books, skillAverages, booksCompleted, xp, level) {
  const first = books[0] || {};
  const latest = books[books.length - 1] || {};
  const imp = {};
  SKILLS.forEach(s => { imp[s] = (latest[s] ?? 0) - (first[s] ?? 0); });

  const overallAvg = books.length
    ? books.reduce((sum, b) => sum + b.avg, 0) / books.length
    : 0;

  let onFire = false;
  for (let i = 0; i < books.length - 2; i++) {
    if (books[i+1].avg > books[i].avg && books[i+2].avg > books[i+1].avg) {
      onFire = true; break;
    }
  }

  const skillVals = Object.values(skillAverages);
  const maxS = Math.max(...skillVals, 0);
  const minS = Math.min(...skillVals, 5);

  return [
    // ── Journey ────────────────────────────────────────────────────────────
    { id:'first_steps',       emoji:'🌱', title:'First Steps',       category:'Journey',     desc:'Completed your very first book!',                        hint:'Complete 1 book',                              unlocked: booksCompleted >= 1  },
    { id:'book_worm',         emoji:'📚', title:'Book Worm',         category:'Journey',     desc:'Dived into 3 books and kept going!',                    hint:'Complete 3 books',                             unlocked: booksCompleted >= 3  },
    { id:'mid_journey',       emoji:'🎒', title:'Mid Journey',       category:'Journey',     desc:'Halfway through the full explorer path!',               hint:'Complete 6 books',                             unlocked: booksCompleted >= 6  },
    { id:'scholar',           emoji:'🎓', title:'Scholar',           category:'Journey',     desc:'Almost a full STEM explorer!',                          hint:'Complete 9 books',                             unlocked: booksCompleted >= 9  },
    { id:'complete_explorer', emoji:'🏅', title:'Complete Explorer', category:'Journey',     desc:'Completed every book in the collection!',               hint:`Complete all ${TOTAL_BOOKS} books`,             unlocked: booksCompleted >= TOTAL_BOOKS },

    // ── Skill Growth ───────────────────────────────────────────────────────
    { id:'cognitive_climber', emoji:'🧠', title:'Cognitive Climber', category:'Skill Growth', desc:'Thinking skills improved significantly!',              hint:'Improve Cognitive by 1+ point',                unlocked: imp.cognitive >= 1      },
    { id:'creative_surge',    emoji:'🎨', title:'Creative Surge',    category:'Skill Growth', desc:'Creative thinking is blossoming!',                    hint:'Improve Creative by 1+ point',                 unlocked: imp.creative >= 1       },
    { id:'finding_voice',     emoji:'🗣️', title:'Finding My Voice',  category:'Skill Growth', desc:'Communication is growing stronger!',                  hint:'Improve Communication by 1+ point',            unlocked: imp.communication >= 1  },
    { id:'social_star',       emoji:'🤝', title:'Social Star',       category:'Skill Growth', desc:'Collaboration skills are shining!',                   hint:'Improve Social-Emotional by 1+ point',         unlocked: imp.socialEmotional >= 1},
    { id:'physical_grower',   emoji:'💪', title:'Physical Grower',   category:'Skill Growth', desc:'Physical engagement is stepping up!',                 hint:'Improve Physical by 1+ point',                 unlocked: imp.physical >= 1       },
    { id:'practical_pro',     emoji:'🔧', title:'Practical Pro',     category:'Skill Growth', desc:'Hands-on skills are getting sharp!',                  hint:'Improve Practical by 1+ point',                unlocked: imp.practical >= 1      },

    // ── Special Achievements ───────────────────────────────────────────────
    { id:'comeback_kid',      emoji:'📈', title:'Comeback Kid',      category:'Achievement', desc:'Made a massive leap in a skill!',                       hint:'Improve any skill by 2+ points',               unlocked: SKILLS.some(s => imp[s] >= 2)                      },
    { id:'on_fire',           emoji:'🔥', title:'On Fire',           category:'Achievement', desc:'3 books in a row, all getting better!',                hint:'3 consecutive books with improving avg',        unlocked: onFire                                             },
    { id:'peak_performer',    emoji:'⭐', title:'Peak Performer',    category:'Achievement', desc:'Smashed an incredible book performance!',               hint:'Average ≥ 4.0 in any single book',             unlocked: books.some(b => b.avg >= 4.0)                      },
    { id:'perfectionist',     emoji:'🎯', title:'Perfectionist',     category:'Achievement', desc:'Hit a perfect score on a skill!',                       hint:'Score 5.0 in any skill in any book',           unlocked: books.some(b => SKILLS.some(s => b[s] >= 5))       },

    // ── Balance & Overall ──────────────────────────────────────────────────
    { id:'well_rounded',      emoji:'🌈', title:'Well Rounded',      category:'Balance',     desc:'All skills growing evenly — no weak spots!',            hint:'All skills within 1 point of each other',      unlocked: skillVals.length >= 6 && (maxS - minS) <= 1.0      },
    { id:'all_rounder',       emoji:'🌟', title:'All Rounder',       category:'Balance',     desc:'Every single skill improved across books!',             hint:'All 6 skills improved from first to latest',   unlocked: SKILLS.every(s => imp[s] > 0)                      },
    { id:'stem_champion',     emoji:'👑', title:'STEM Champion',     category:'Balance',     desc:'Outstanding performance across all books!',             hint:'Overall average ≥ 4.0/5.0',                    unlocked: overallAvg >= 4.0                                  },

    // ── Progress ───────────────────────────────────────────────────────────
    { id:'level_up',          emoji:'🚀', title:'Level Up',          category:'Progress',    desc:'Climbed to Level 3 or beyond!',                         hint:'Reach Level 3+',                               unlocked: level >= 3  },
    { id:'xp_surge',          emoji:'⚡', title:'XP Surge',          category:'Progress',    desc:'Earned 500+ XP through hard work!',                     hint:'Earn 500+ XP',                                 unlocked: xp >= 500   },
  ];
}

function normalizeApiData(apiData) {
  const s    = apiData.student          || {};
  const sk   = apiData.skills           || {};
  const acts = apiData.recentActivities || [];
  const conc = apiData.concepts         || [];
  const stats= apiData.stats            || {};

  // Chart uses static per-book skill data (API has no per-book skill breakdown)
  const chartBooks = staticStudent.books.map(b => ({ ...b, shortTitle: `Book ${b.id}` }));

  const recent = [...acts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 3)
    .map((a, i) => ({
      title: a.title,
      book:  a.title,
      date:  new Date(a.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }),
      icon:  ['📘','📙','📗'][i % 3],
    }));

  const skillAverages = {
    cognitive:       sk.cognitive       ?? staticStudent.skillAverages.cognitive,
    creative:        sk.creative        ?? staticStudent.skillAverages.creative,
    communication:   sk.communication   ?? staticStudent.skillAverages.communication,
    socialEmotional: sk.socialEmotional ?? staticStudent.skillAverages.socialEmotional,
    physical:        sk.physical        ?? staticStudent.skillAverages.physical,
    practical:       sk.practical       ?? staticStudent.skillAverages.practical,
  };

  const booksCompleted = stats.booksCompleted ?? stats.totalCompleted ?? chartBooks.length;
  const completedBooks = chartBooks.slice(0, booksCompleted);
  const totalXP   = calcXP(completedBooks);
  const level     = calcLevel(totalXP);
  const xpTarget  = calcXPTarget(level);
  const badges    = calcBadges(completedBooks, skillAverages, booksCompleted, totalXP, level);

  // Photo: localStorage override → local file
  const storedPhoto = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

  return {
    name:             s.name ?? staticStudent.name,
    photo:            storedPhoto || diyaPhoto,
    grade:            s.grade ?? '',
    level,
    xp:               totalXP,
    xpTarget,
    levelName:        LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)],
    teacherNote:      staticStudent.teacherNote,
    books:            chartBooks,
    recentActivities: recent.length ? recent : staticStudent.recentActivities,
    skillAverages,
    concepts:         conc,
    stats,
    badges,
    booksCompleted,
    totalBooks:       TOTAL_BOOKS,
  };
}

export function useStudentData() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const updatePhoto = (base64) => {
    localStorage.setItem(STORAGE_KEY, base64);
    setData(prev => prev ? { ...prev, photo: base64 } : prev);
  };

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        console.log('[BeyondBox] Fetching student data...');
        const res  = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        console.log('[BeyondBox] API response:', json);
        if (!cancelled) { setData(normalizeApiData(json)); setError(null); }
      } catch (err) {
        console.warn('[BeyondBox] API failed, using fallback:', err.message);
        if (!cancelled) { setData(normalizeApiData({})); setError(err.message); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error, updatePhoto };
}
