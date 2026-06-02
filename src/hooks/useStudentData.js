import { useState, useEffect, useRef } from 'react';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WIX_BASE     = 'https://www.thebeyondbox.org/_functions';
const TOTAL_BOOKS  = 11;
const SKILLS       = ['cognitive','creative','communication','socialEmotional','physical','practical'];

// ─── XP & LEVEL CALC ─────────────────────────────────────────────────────────
function calcXP(books) {
  if (!books?.length) return 100;
  return books.reduce((sum, b) => sum + Math.round((b.avg / 4) * 200), 100);
}

const LEVEL_THRESHOLDS = [0, 400, 800, 1200, 1600, 2200];
const LEVEL_NAMES      = ['', 'Beginner Explorer', 'Junior Scientist', 'STEM Explorer', 'Science Leader', 'STEM Champion'];

function calcLevel(xp) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return Math.min(i + 1, 5);
  }
  return 1;
}

function calcXPTarget(level) {
  return LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)];
}

// ─── BADGE CALC ───────────────────────────────────────────────────────────────
function calcBadges(books, skillAverages, booksCompleted, xp, level) {
  const first  = books[0] || {};
  const latest = books[books.length - 1] || {};
  const imp    = {};
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
  const minS = Math.min(...skillVals, 4);

  return [
    { id:'first_steps',       emoji:'🌱', title:'First Steps',       category:'Journey',     desc:'Completed your very first book!',               hint:'Complete 1 book',                              unlocked: booksCompleted >= 1  },
    { id:'book_worm',         emoji:'📚', title:'Book Worm',         category:'Journey',     desc:'Dived into 3 books and kept going!',            hint:'Complete 3 books',                             unlocked: booksCompleted >= 3  },
    { id:'mid_journey',       emoji:'🎒', title:'Mid Journey',       category:'Journey',     desc:'Halfway through the full explorer path!',       hint:'Complete 6 books',                             unlocked: booksCompleted >= 6  },
    { id:'scholar',           emoji:'🎓', title:'Scholar',           category:'Journey',     desc:'Almost a full STEM explorer!',                  hint:'Complete 9 books',                             unlocked: booksCompleted >= 9  },
    { id:'complete_explorer', emoji:'🏅', title:'Complete Explorer', category:'Journey',     desc:'Completed every book in the collection!',       hint:`Complete all ${TOTAL_BOOKS} books`,            unlocked: booksCompleted >= TOTAL_BOOKS },
    { id:'cognitive_climber', emoji:'🧠', title:'Cognitive Climber', category:'Skill Growth', desc:'Thinking skills improved significantly!',      hint:'Improve Cognitive by 1+ point',                unlocked: imp.cognitive >= 1      },
    { id:'creative_surge',    emoji:'🎨', title:'Creative Surge',    category:'Skill Growth', desc:'Creative thinking is blossoming!',             hint:'Improve Creative by 1+ point',                 unlocked: imp.creative >= 1       },
    { id:'finding_voice',     emoji:'🗣️', title:'Finding My Voice',  category:'Skill Growth', desc:'Communication is growing stronger!',           hint:'Improve Communication by 1+ point',            unlocked: imp.communication >= 1  },
    { id:'social_star',       emoji:'🤝', title:'Social Star',       category:'Skill Growth', desc:'Collaboration skills are shining!',            hint:'Improve Social-Emotional by 1+ point',         unlocked: imp.socialEmotional >= 1},
    { id:'physical_grower',   emoji:'💪', title:'Physical Grower',   category:'Skill Growth', desc:'Physical engagement is stepping up!',          hint:'Improve Physical by 1+ point',                 unlocked: imp.physical >= 1       },
    { id:'practical_pro',     emoji:'🔧', title:'Practical Pro',     category:'Skill Growth', desc:'Hands-on skills are getting sharp!',           hint:'Improve Practical by 1+ point',                unlocked: imp.practical >= 1      },
    { id:'comeback_kid',      emoji:'📈', title:'Comeback Kid',      category:'Achievement', desc:'Made a massive leap in a skill!',               hint:'Improve any skill by 2+ points',               unlocked: SKILLS.some(s => imp[s] >= 2)                },
    { id:'on_fire',           emoji:'🔥', title:'On Fire',           category:'Achievement', desc:'3 books in a row, all getting better!',        hint:'3 consecutive books with improving avg',        unlocked: onFire                                       },
    { id:'peak_performer',    emoji:'⭐', title:'Peak Performer',    category:'Achievement', desc:'Smashed an incredible book performance!',      hint:'Average ≥ 4.0 in any single book',             unlocked: books.some(b => b.avg >= 4.0)               },
    { id:'perfectionist',     emoji:'🎯', title:'Perfectionist',     category:'Achievement', desc:'Hit a perfect score on a skill!',               hint:'Score 5.0 in any skill in any book',           unlocked: books.some(b => SKILLS.some(s => b[s] >= 5))},
    { id:'well_rounded',      emoji:'🌈', title:'Well Rounded',      category:'Balance',     desc:'All skills growing evenly!',                    hint:'All skills within 1 point of each other',      unlocked: skillVals.length >= 6 && (maxS - minS) <= 1.0},
    { id:'all_rounder',       emoji:'🌟', title:'All Rounder',       category:'Balance',     desc:'Every single skill improved across books!',     hint:'All 6 skills improved from first to latest',   unlocked: SKILLS.every(s => imp[s] > 0)               },
    { id:'stem_champion',     emoji:'👑', title:'STEM Champion',     category:'Balance',     desc:'Outstanding performance across all books!',     hint:'Overall average ≥ 4.0/5.0',                    unlocked: overallAvg >= 4.0                           },
    { id:'level_up',          emoji:'🚀', title:'Level Up',          category:'Progress',    desc:'Climbed to Level 3 or beyond!',                 hint:'Reach Level 3+',                               unlocked: level >= 3  },
    { id:'xp_surge',          emoji:'⚡', title:'XP Surge',          category:'Progress',    desc:'Earned 500+ XP through hard work!',             hint:'Earn 500+ XP',                                 unlocked: xp >= 500   },
  ];
}

// ─── NORMALIZE LIVE API RESPONSE ──────────────────────────────────────────────
function normalizeApiData(apiData, memberId) {
  const s    = apiData.student          || {};
  const sk   = apiData.skills           || {};
  const acts = apiData.recentActivities || [];
  const conc = apiData.concepts         || [];
  const stats= apiData.stats            || {};
  const apiBk= apiData.books            || [];   // ← REAL per-book skill data from CMS

  // ── Build chart books from real CMS data ─────────────────────────────────
  const books = apiBk.map((item, i) => ({
    id:             i + 1,
    title:          item.title          || `Book ${i + 1}`,
    shortTitle:     item.shortTitle     || `Book ${i + 1}`,
    date:           item.date           || '',
    activity:       item.activity       || '',
    cognitive:      Number(item.cognitive      || 0),
    creative:       Number(item.creative       || 0),
    communication:  Number(item.communication  || 0),
    socialEmotional:Number(item.socialEmotional|| 0),
    physical:       Number(item.physical       || 0),
    practical:      Number(item.practical      || 0),
    avg:            Number(item.avg            || 0),
  }));

  // ── Skill averages from CMS SkillScores ──────────────────────────────────
  const skillAverages = {
    cognitive:       Number(sk.cognitive       || 0),
    creative:        Number(sk.creative        || 0),
    communication:   Number(sk.communication   || 0),
    socialEmotional: Number(sk.socialEmotional || 0),
    physical:        Number(sk.physical        || 0),
    practical:       Number(sk.practical       || 0),
  };

  // ── Recent activities ─────────────────────────────────────────────────────
  const recent = [...acts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 3)
    .map((a, i) => ({
      title: a.title || 'Untitled Activity',
      book:  a.title || '',
      date:  a.completedAt
        ? new Date(a.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '',
      icon: ['📘','📙','📗'][i % 3],
    }));

  // ── XP + level (calculated from real completed books) ────────────────────
  const booksCompleted = stats.booksCompleted ?? books.length;
  const completedBooks = books.slice(0, booksCompleted);
  const totalXP        = calcXP(completedBooks);
  const level          = calcLevel(totalXP);
  const xpTarget       = calcXPTarget(level);
  const badges         = calcBadges(completedBooks, skillAverages, booksCompleted, totalXP, level);

  // ── Photo: CMS → localStorage cache → fallback placeholder ───────────────
  const STORAGE_KEY = `beyondbox_photo_${memberId}`;
  const storedPhoto  = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  const avatarUrl    = s.avatarUrl || storedPhoto || `https://api.dicebear.com/7.x/thumbs/svg?seed=${memberId}`;

  return {
    studentId:        memberId,
    name:             s.name     || 'Student',
    photo:            avatarUrl,
    grade:            s.grade    || '',
    level,
    xp:               totalXP,
    xpTarget,
    levelName:        LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)],
    teacherNote:      apiData.teacherNote || '',
    books,
    recentActivities: recent,
    skillAverages,
    concepts:         conc,
    stats,
    badges,
    booksCompleted,
    totalBooks:       TOTAL_BOOKS,
    explorerPoints:   s.explorerPoints ?? Math.round(Number(sk.averageScore || 0) * 25),
  };
}

// ─── EMPTY / LOADING PLACEHOLDER ─────────────────────────────────────────────
function emptyStudent(memberId) {
  return {
    studentId:        memberId,
    name:             'Loading…',
    photo:            `https://api.dicebear.com/7.x/thumbs/svg?seed=${memberId}`,
    grade:            '',
    level:            1,
    xp:               0,
    xpTarget:         400,
    levelName:        'Beginner Explorer',
    teacherNote:      '',
    books:            [],
    recentActivities: [],
    skillAverages:    { cognitive:0, creative:0, communication:0, socialEmotional:0, physical:0, practical:0 },
    concepts:         [],
    stats:            {},
    badges:           [],
    booksCompleted:   0,
    totalBooks:       TOTAL_BOOKS,
    explorerPoints:   0,
  };
}

// ─── MAIN HOOK ────────────────────────────────────────────────────────────────
export function useStudentData() {
  const [memberId, setMemberId] = useState(null);      // Wix memberId, received via postMessage
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [waitingForId, setWaitingForId] = useState(true);  // true until Wix sends memberId
  const fetchedRef = useRef(false);

  // ── Step 1: Listen for memberId from Wix parent page ─────────────────────
  useEffect(() => {
    // In dev mode (no parent Wix page) auto-use URL param or default
    const urlParams  = new URLSearchParams(window.location.search);
    const paramId    = urlParams.get('studentId') || urlParams.get('memberId');

    if (paramId) {
      console.log('[BeyondBox] Dev mode: using URL param studentId =', paramId);
      setMemberId(paramId);
      setWaitingForId(false);
      return;
    }

    // Tell the parent Wix page we are ready
    try {
      window.parent.postMessage({ type: 'BEYONDBOX_READY' }, '*');
    } catch (_) {}

    const handler = (event) => {
      const msg = event.data;
      // Accept: { type:'BEYONDBOX_MEMBER', memberId:'...' }  OR  { memberId:'...' }
      if (msg && (msg.type === 'BEYONDBOX_MEMBER' || msg.memberId)) {
        const id = msg.memberId;
        if (id) {
          console.log('[BeyondBox] Received memberId from Wix:', id);
          setMemberId(id);
          setWaitingForId(false);
        }
      }
    };

    window.addEventListener('message', handler);

    // Safety timeout — if Wix doesn't respond in 5 s, show a "please log in" state
    const timeout = setTimeout(() => {
      setWaitingForId(false);
      setLoading(false);
      setError('NOT_LOGGED_IN');
    }, 5000);

    return () => {
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
    };
  }, []);

  // ── Step 2: Fetch data once memberId is known ─────────────────────────────
  useEffect(() => {
    if (!memberId || fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function fetchData() {
      setData(emptyStudent(memberId));
      setLoading(true);
      setError(null);

      try {
        const url = `${WIX_BASE}/studentDashboard?studentId=${encodeURIComponent(memberId)}`;
        console.log('[BeyondBox] Fetching:', url);
        const res  = await fetch(url);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        console.log('[BeyondBox] API response:', json);
        if (!cancelled) {
          setData(normalizeApiData(json, memberId));
          setError(null);
        }
      } catch (err) {
        console.warn('[BeyondBox] API failed:', err.message);
        if (!cancelled) {
          setData(emptyStudent(memberId));
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [memberId]);

  // ── Photo update — also saves to Wix CMS via backend ─────────────────────
  const updatePhoto = async (base64) => {
    if (!memberId) return;
    const STORAGE_KEY = `beyondbox_photo_${memberId}`;
    localStorage.setItem(STORAGE_KEY, base64);
    setData(prev => prev ? { ...prev, photo: base64 } : prev);

    try {
      const mimeMatch = base64.match(/^data:(image\/\w+);base64,/);
      const mimeType  = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      await fetch(`${WIX_BASE}/saveStudentPhoto`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ studentId: memberId, base64, mimeType }),
      });
      console.log('[BeyondBox] Photo uploaded to CMS.');
    } catch (err) {
      console.warn('[BeyondBox] Photo upload failed (kept in localStorage):', err.message);
    }
  };

  // ── Name update ────────────────────────────────────────────────────────────
  const updateName = async (newName) => {
    if (!memberId) return;
    
    // Optimistic UI update
    setData(prev => prev ? { ...prev, name: newName } : prev);

    try {
      await fetch(`${WIX_BASE}/updateStudentName`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ studentId: memberId, name: newName }),
      });
      console.log('[BeyondBox] Name updated in CMS.');
    } catch (err) {
      console.warn('[BeyondBox] Name update failed:', err.message);
    }
  };

  return { data, loading, error, waitingForId, updatePhoto, updateName };
}
