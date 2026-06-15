import { useState, useEffect, useRef } from 'react';

// ─── ACTIVITY ICON RESOLVER ───────────────────────────────────────────────────
// Maps activityType → the correct emoji for the timeline.
// Used in both normalizeApiData and the activityFeed normaliser.
function getActivityIcon(activityType, source) {
  const t = (activityType || '').toLowerCase();
  const s = (source      || '').toLowerCase();
  if (t === 'book_completed')                return '📚';
  if (t === 'simulation_started')            return '🚀';
  if (t === 'simulation_pretest_completed')  return '📋';
  if (t === 'simulation_posttest_completed') return '✅';
  if (t === 'simulation_completed')          return '🧪';
  if (t === 'community_post')                return '📝';
  if (t === 'community_comment')             return '💬';
  if (t === 'community_reaction')            return '❤️';
  if (t === 'community_group_joined')        return '👥';
  if (t === 'badge_unlocked')                return '🏆';
  if (t === 'xp_level_up')                   return '🚀';
  // Source-level fallbacks
  if (s === 'simulation')                    return '🧪';
  if (s === 'community')                     return '📝';
  if (s === 'achievement')                   return '🏆';
  return '📘';
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WIX_BASE     = 'https://www.thebeyondbox.org/_functions';
const TOTAL_BOOKS  = 11;
const SKILLS       = ['cognitive','creative','communication','socialEmotional','physical','practical'];

// ─── XP & LEVEL CALC ─────────────────────────────────────────────────────────
// Level and XP calculation moved to the backend to ensure consistency.

const LEVEL_THRESHOLDS = [0, 400, 800, 1200, 1600, 2200];
const LEVEL_NAMES      = ['', 'Beginner Explorer', 'Junior Scientist', 'STEM Explorer', 'Science Leader', 'STEM Champion'];

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

  // ── Recent activities (backward-compat list from API dashboard response) ────
  // The live activityFeed is fetched separately via /studentActivities;
  // this list acts as a graceful fallback in RecentActivity.jsx.
  const recent = [...acts]
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    .slice(0, 5)
    .map((a) => ({
      title:        a.title        || 'Untitled Activity',
      book:         a.title        || '',
      activityType: a.activityType || '',
      type:         a.type         || 'books',
      date:  a.completedAt
        ? new Date(a.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
        : '',
      icon: getActivityIcon(a.activityType, a.type),
    }));

  // ── XP + level (from CMS) ────────────────────────────────────────────────
  const booksCompleted = stats.booksCompleted ?? books.length;
  const completedBooks = books.slice(0, booksCompleted);
  const totalXP        = s.xp ?? 100;
  const level          = s.level ?? 1;
  const xpTarget       = s.xpTarget ?? 400;
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
      // Accept ALL formats the Wix bridge might send:
      // { studentId: '...' }  ← HTML bridge sends this
      // { memberId: '...' }   ← Velo page code sends this
      // { type:'BEYONDBOX_MEMBER', memberId:'...' }
      const id = msg?.studentId || msg?.memberId;
      if (msg && typeof msg === 'object' && id) {
        console.log('[BeyondBox] Received memberId from Wix:', id);
        setMemberId(id);
        setWaitingForId(false);
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
          // Capture normalized data so we can use it for badge logging below
          const normalizedData = normalizeApiData(json, memberId);
          setData(normalizedData);
          setError(null);

          // ── BADGE + XP LEVEL-UP: Log once per student per device ────────────────
          // Strategy:
          //   1. Read localStorage to find already-logged badge/level IDs.
          //   2. Find newly unlocked items not yet in that list.
          //   3. Call backend logStudentActivity for each new one.
          //   4. Backend ALSO deduplicates by (studentId + activityKey + activityType)
          //      so if localStorage is ever cleared, no duplicates appear in CMS.
          try {
            const BADGE_LOG_KEY = `beyondbox_logged_badges_${memberId}`;
            const LEVEL_LOG_KEY = `beyondbox_logged_level_${memberId}`;

            // — Badges —
            const unlockedBadges = (normalizedData.badges || []).filter(b => b.unlocked);
            if (unlockedBadges.length > 0) {
              const alreadyLogged = JSON.parse(localStorage.getItem(BADGE_LOG_KEY) || '[]');
              const newBadges = unlockedBadges.filter(b => !alreadyLogged.includes(b.id));

              if (newBadges.length > 0) {
                // Update localStorage FIRST to prevent re-logging on rapid page reloads
                localStorage.setItem(BADGE_LOG_KEY,
                  JSON.stringify([...alreadyLogged, ...newBadges.map(b => b.id)])
                );

                // Log each new badge non-blocking
                for (const badge of newBadges) {
                  fetch(`${WIX_BASE}/logStudentActivity`, {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      studentId:    memberId,
                      studentName:  normalizedData.name,
                      source:       'achievement',
                      activityType: 'badge_unlocked',
                      activityKey:  badge.id,          // ← dedup key in backend
                      title:        `${badge.emoji} Unlocked ${badge.title}`,
                      description:  badge.desc || '',
                      metadata:     { badgeId: badge.id, category: badge.category }
                    })
                  }).catch(() => {}); // fully non-fatal
                }

                console.log(`[BeyondBox] Logged ${newBadges.length} new badge(s) to StudentActivities`);
              }
            }

            // — XP Level Up —
            const currentLevel = normalizedData.level || 1;
            const lastLoggedLevel = parseInt(localStorage.getItem(LEVEL_LOG_KEY) || '0', 10);

            if (currentLevel > 1 && currentLevel > lastLoggedLevel) {
              // Update localStorage first
              localStorage.setItem(LEVEL_LOG_KEY, String(currentLevel));

              // Log each new level (handles multi-level jumps)
              for (let lvl = Math.max(lastLoggedLevel + 1, 2); lvl <= currentLevel; lvl++) {
                const levelName = LEVEL_NAMES[Math.min(lvl, LEVEL_NAMES.length - 1)] || `Level ${lvl}`;
                fetch(`${WIX_BASE}/logStudentActivity`, {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    studentId:    memberId,
                    studentName:  normalizedData.name,
                    source:       'achievement',
                    activityType: 'xp_level_up',
                    activityKey:  `level-${lvl}`,     // ← dedup key in backend
                    title:        `🚀 Reached ${levelName}`,
                    description:  `Now at Level ${lvl}`,
                    metadata:     { level: lvl, xp: normalizedData.xp }
                  })
                }).catch(() => {});
              }

              console.log(`[BeyondBox] Logged XP level-up to ${currentLevel}`);
            }
          } catch (badgeLogErr) {
            console.warn('[BeyondBox] Badge/level logging failed (non-fatal):', badgeLogErr.message);
          }
        }

        // ── Non-blocking: fetch community feed separately ─────────
        // Dashboard is already shown above; community wall loads in bg
        if (!cancelled) {
          try {
            const commUrl = `${WIX_BASE}/communityFeed?studentId=${encodeURIComponent(memberId)}`;
            console.log('[BeyondBox] Fetching community feed:', commUrl);
            const commRes = await fetch(commUrl);
            if (commRes.ok) {
              const commJson = await commRes.json();
              console.log('[BeyondBox] Community feed:', commJson);
              if (!cancelled) {
                setData(prev => prev ? {
                  ...prev,
                  communityPosts:  commJson.feed  || [],
                  communityStats:  commJson.stats || { posts: 0, likesReceived: 0, replies: 0 },
                } : prev);
              }
            }
          } catch (commErr) {
            console.warn('[BeyondBox] Community feed fetch failed (non-fatal):', commErr.message);
          }
        }

        // ── Non-blocking: fetch StudentActivities timeline ─────────
        // Populates activityFeed — the live feed shown in RecentActivity.jsx.
        // Fires after main dashboard data is shown so there is zero delay.
        if (!cancelled) {
          try {
            const actUrl = `${WIX_BASE}/studentActivities?studentId=${encodeURIComponent(memberId)}&limit=5`;
            console.log('[BeyondBox] Fetching student activities:', actUrl);
            const actRes = await fetch(actUrl);
            if (actRes.ok) {
              const actJson = await actRes.json();
              console.log('[BeyondBox] Student activities:', actJson);
              const activities = (actJson.activities || []).map(a => ({
                id:           a.id,
                type:         a.source       || 'books',
                activityType: a.activityType || '',
                icon:         getActivityIcon(a.activityType, a.source),
                title:        a.title        || 'Activity',
                detail:       a.description  || '',
                timestamp:    a.createdAt,
              }));
              if (!cancelled) {
                setData(prev => prev ? { ...prev, activityFeed: activities } : prev);
              }
            }
          } catch (actErr) {
            console.warn('[BeyondBox] Student activities fetch failed (non-fatal):', actErr.message);
          }
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

  // ── Photo update — saves base64 directly to Wix CMS (no mediaManager needed) ─
  const updatePhoto = async (base64) => {
    if (!memberId) return;

    // 1. Instantly update UI
    setData(prev => prev ? { ...prev, photo: base64 } : prev);

    // 2. Cache in localStorage as fallback for same device
    try {
      const STORAGE_KEY = `beyondbox_photo_${memberId}`;
      localStorage.setItem(STORAGE_KEY, base64);
    } catch (_) {}

    // 3. Save base64 directly to Wix CMS via backend
    try {
      const res = await fetch(`${WIX_BASE}/saveStudentPhoto`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ studentId: memberId, base64 }),
      });
      if (res.ok) {
        const json = await res.json();
        console.log('[BeyondBox] Photo saved to CMS:', json);
        // Update photo in state with the URL returned from CMS if available
        if (json.photoUrl) {
          setData(prev => prev ? { ...prev, photo: json.photoUrl } : prev);
        }
      } else {
        console.warn('[BeyondBox] Photo save returned status:', res.status);
      }
    } catch (err) {
      console.warn('[BeyondBox] Photo save failed (kept in localStorage):', err.message);
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
