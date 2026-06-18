// @ts-nocheck
/* eslint-disable */
// ─────────────────────────────────────────────────────────────
// WIX BACKEND FILE — paste into: backend/http-functions.js
// This file runs inside Wix Velo (server-side) only.
// Red underlines in VS Code are expected — wix-* packages
// exist only on the Wix platform and are NOT npm packages.
// ─────────────────────────────────────────────────────────────

// backend/http-functions.js

import { currentMember } from 'wix-members-backend';
import wixData from 'wix-data';
import { ok, badRequest, serverError, notFound } from 'wix-http-functions';
// NOTE: No Buffer import needed — it's a global in Wix Velo
// NOTE: No mediaManager import needed — we store base64 directly

// ─────────────────────────────────────────────────────────────
// SHARED CORS HEADERS
// ─────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ─────────────────────────────────────────────────────────────
// SKILL → SUBJECT + CONCEPT MAPPING
// Used by updateConceptProgress to generate one CMS entry per skill.
// ─────────────────────────────────────────────────────────────
const CONCEPT_MAP = {
  physical: {
    subject:     'Physical',
    conceptName: 'Motor Skills & Participation'
  },
  practical: {
    subject:     'Practical',
    conceptName: 'Hands-on Application'
  },
  socialEmotional: {
    subject:     'Social Emotional',
    conceptName: 'Collaboration'
  },
  communication: {
    subject:     'Communication',
    conceptName: 'Expression'
  },
  creative: {
    subject:     'Creative',
    conceptName: 'Idea Generation'
  },
  cognitive: {
    subject:     'Cognitive',
    conceptName: 'Problem Solving'
  }
};

// ─────────────────────────────────────────────────────────────
// INTERNAL: Determine mastery level from percentage
// ─────────────────────────────────────────────────────────────
function getMasteryLevel(percent) {
  if (percent >= 75) return 'Strong';
  if (percent >= 50) return 'Developing';
  return 'Needs Support';
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Aggregate BookScores → update ConceptProgress CMS
// ─────────────────────────────────────────────────────────────
async function updateConceptProgress(studentId) {
  try {
    const bookResult = await wixData.query('BookScores')
      .eq('studentId', studentId)
      .limit(1000)
      .find({ suppressAuth: true });

    const books = bookResult.items || [];
    const totalBooksCompleted = books.length;

    if (totalBooksCompleted === 0) {
      console.log(`[ConceptProgress] No books found for student ${studentId} — clearing ConceptProgress.`);
      const existing = await wixData.query('ConceptProgress')
        .eq('studentId', studentId)
        .limit(100)
        .find({ suppressAuth: true });
        
      for (const item of existing.items) {
        await wixData.remove('ConceptProgress', item._id, { suppressAuth: true });
      }
      return { success: true, message: 'Cleared all concept progress' };
    }

    const maxPossibleScore = totalBooksCompleted * 4;
    const skills = Object.keys(CONCEPT_MAP);

    let inserted = 0;
    let updated = 0;

    await Promise.all(skills.map(async (skillKey) => {
      const { subject, conceptName } = CONCEPT_MAP[skillKey];

      const totalScore = books.reduce((sum, book) => {
        return sum + Number(book[skillKey] || 0);
      }, 0);

      const progressPercent = maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 10000) / 100
        : 0;

      const masteryLevel = getMasteryLevel(progressPercent);

      const entryData = {
        title: `${subject} - ${conceptName}`, // Often required by Wix CMS
        studentId,
        subject,
        conceptName,
        progressPercent,
        masteryLevel,
        totalBooksCompleted,
        totalScore,
        maxPossibleScore,
        lastUpdated: new Date()
      };

      const existing = await wixData.query('ConceptProgress')
        .eq('studentId', studentId)
        .eq('subject', subject)
        .limit(1)
        .find({ suppressAuth: true });

      if (existing.items.length > 0) {
        await wixData.update('ConceptProgress', {
          ...existing.items[0],
          ...entryData,
          _id: existing.items[0]._id
        }, { suppressAuth: true });
        updated++;
      } else {
        await wixData.insert('ConceptProgress', entryData, { suppressAuth: true });
        inserted++;
      }
    }));

    return { success: true, inserted, updated };
  } catch (err) {
    console.error('[ConceptProgress] updateConceptProgress error:', err.message);
    throw new Error(`ConceptProgress Aggregation Error: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Insert a lightweight entry into StudentActivities CMS
//
// This is the ONLY write path for the timeline engine.
// All systems (books, simulation, community, achievements) call
// this helper — StudentActivities itself NEVER calculates anything.
//
// Parameters:
//   studentId    – Wix memberId
//   studentName  – display name (string)
//   source       – 'books' | 'simulation' | 'community' | 'achievement'
//   activityType – e.g. 'book_completed', 'community_post', 'badge_unlocked'
//   activityKey  – machine-readable identifier (e.g. 'marie-mysterious-rock')
//   title        – human-readable timeline message
//   description  – optional details string
//   metadata     – optional plain object for future analytics
// ─────────────────────────────────────────────────────────────
async function createStudentActivity({
  studentId,
  studentName,
  source,
  activityType,
  activityKey,
  title,
  description,
  metadata,
  createdAt
}) {
  try {
    const origCreatedAt = createdAt || new Date();
    const entry = {
      title:        title        || activityType,
      studentId,
      studentName:  studentName  || '',
      source:       source       || 'unknown',
      activityType: activityType || 'unknown',
      activityKey:  activityKey  || '',
      description:  description  || '',
      metadata:     metadata ? JSON.stringify(metadata) : '',
      createdAt:    origCreatedAt
    };
    await wixData.insert('StudentActivities', entry, { suppressAuth: true });
    console.log(`[StudentActivities] Logged: ${activityType} for ${studentId}`);
  } catch (err) {
    // Non-fatal — never block parent operations
    console.error('[StudentActivities] createStudentActivity error:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// GET USER ID
// ─────────────────────────────────────────────────────────────
export async function get_userid(request) {
  const member = await currentMember.getMember();
  if (!member) {
    return { status: 401, headers: CORS_HEADERS, body: JSON.stringify({ error: 'User not logged in' }) };
  }
  const name = member.contactDetails?.firstName || member.profile?.nickname || '';
  return { status: 200, headers: CORS_HEADERS, body: JSON.stringify({ userId: member._id, name }) };
}

// ─────────────────────────────────────────────────────────────
// GET STUDENT DASHBOARD
// URL: /_functions/studentDashboard?studentId=MEMBERID
// ─────────────────────────────────────────────────────────────
export async function get_studentDashboard(request) {
  const studentId = request.query.studentId;

  if (!studentId) {
    return badRequest({ headers: CORS_HEADERS, body: { error: 'Missing studentId' } });
  }

  try {
    // GET USER FROM USERROLES
    const roleResult = await wixData.query('UserRoles')
      .eq('memberId', studentId)
      .limit(1)
      .find({ suppressAuth: true });

    if (roleResult.items.length === 0) {
      return badRequest({ headers: CORS_HEADERS, body: { error: 'Student not found in UserRoles' } });
    }

    const student = roleResult.items[0];

    // GET BOOK SCORES
    const bookResult = await wixData.query('BookScores')
      .eq('studentId', studentId)
      .ascending('_createdDate')
      .find({ suppressAuth: true });

    // GET CONCEPTS (pre-aggregated by updateConceptProgress)
    const conceptResult = await wixData.query('ConceptProgress')
      .eq('studentId', studentId)
      .find({ suppressAuth: true });

    // GET RECENT ACTIVITIES from StudentActivities CMS (the central timeline engine)
    const activityResult = await wixData.query('StudentActivities')
      .eq('studentId', studentId)
      .descending('_createdDate')
      .limit(5)
      .find({ suppressAuth: true });

    // GET LOGGED ACHIEVEMENTS (to sync frontend localStorage and prevent badge double-trigger)
    const achievementsResult = await wixData.query('StudentActivities')
      .eq('studentId', studentId)
      .eq('source', 'achievement')
      .limit(1000)
      .find({ suppressAuth: true });
    const loggedAchievements = (achievementsResult.items || []).map(item => item.activityKey);

    // GET PHOTO — supports both base64 strings and wix:image:// URLs
    const photoResult = await wixData.query('StudentPhotos')
      .eq('studentId', studentId)
      .limit(1)
      .find({ suppressAuth: true });

    let avatarUrl = '';
    if (photoResult.items.length > 0 && photoResult.items[0].photo) {
      const stored = photoResult.items[0].photo;
      if (stored.startsWith('wix:image://')) {
        // Convert Wix internal format to real HTTPS URL
        const withoutProtocol = stored.replace('wix:image://v1/', '');
        const fileId = withoutProtocol.split('/')[0];
        const fileName = withoutProtocol.split('/')[1]?.split('#')[0] || 'photo.jpg';
        avatarUrl = `https://static.wixstatic.com/media/${fileId}/${fileName}`;
      } else {
        // base64 string or regular https URL — use as-is
        avatarUrl = stored;
      }
    }

    const books = bookResult.items || [];
    const booksCompleted = books.length;

    // CALCULATE SKILL AVERAGES
    let skills = {
      cognitive: 0, creative: 0, communication: 0,
      socialEmotional: 0, physical: 0, practical: 0, averageScore: 0
    };

    if (booksCompleted > 0) {
      const totals = books.reduce((acc, b) => {
        acc.cognitive       += Number(b.cognitive       || 0);
        acc.creative        += Number(b.creative        || 0);
        acc.communication   += Number(b.communication   || 0);
        acc.socialEmotional += Number(b.socialEmotional || 0);
        acc.physical        += Number(b.physical        || 0);
        acc.practical       += Number(b.practical       || 0);
        acc.averageScore    += Number(b.averageScore    || 0);
        return acc;
      }, { cognitive: 0, creative: 0, communication: 0, socialEmotional: 0, physical: 0, practical: 0, averageScore: 0 });

      skills = {
        cognitive:       Number((totals.cognitive       / booksCompleted).toFixed(2)),
        creative:        Number((totals.creative        / booksCompleted).toFixed(2)),
        communication:   Number((totals.communication   / booksCompleted).toFixed(2)),
        socialEmotional: Number((totals.socialEmotional / booksCompleted).toFixed(2)),
        physical:        Number((totals.physical        / booksCompleted).toFixed(2)),
        practical:       Number((totals.practical       / booksCompleted).toFixed(2)),
        averageScore:    Number((totals.averageScore    / booksCompleted).toFixed(2))
      };
    }

    // AUTO XP CALCULATION (Each book max 200 XP based on score out of 4.0)
    const xp = books.reduce((sum, b) => sum + Math.round((Number(b.averageScore || 0) / 4) * 200), 100);
    const LEVEL_THRESHOLDS = [0, 400, 800, 1200, 1600, 2200];
    let level = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        level = Math.min(i + 1, 5);
        break;
      }
    }
    const xpTarget = LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] || 2200;
    const explorerPoints = Math.round(skills.averageScore * 25);

    return ok({
      headers: CORS_HEADERS,
      body: {
        student: {
          studentId:     student.memberId,
          name:          student.fullName || student.email || 'Student',
          grade:         student.batchName || '',
          level,
          xp,
          xpTarget,
          explorerPoints,
          avatarUrl
        },
        skills,
        books: books.map((item, i) => ({
          id:              i + 1,
          title:           item.bookName || `Book ${i + 1}`,
          shortTitle:      item.bookName || `Book ${i + 1}`,
          date:            item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          activity:        item.bookName || '',
          cognitive:       Number(item.cognitive       || 0),
          creative:        Number(item.creative        || 0),
          communication:   Number(item.communication   || 0),
          socialEmotional: Number(item.socialEmotional || 0),
          physical:        Number(item.physical        || 0),
          practical:       Number(item.practical       || 0),
          avg:             Number(item.averageScore    || 0)
        })),
        // Frontend reads ConceptProgress data as-is — no recalculation needed
        concepts: conceptResult.items.map(item => ({
          subject:         item.subject,
          conceptName:     item.conceptName,
          progressPercent: Number(item.progressPercent || 0),
          masteryLevel:    item.masteryLevel
        })),
        // ── recentActivities: sourced from StudentActivities CMS (timeline engine) ──
        // Falls back gracefully to book-derived list if StudentActivities is empty.
        recentActivities: (() => {
          const timelineItems = activityResult.items || [];
          if (timelineItems.length > 0) {
            return timelineItems.map(item => ({
              id:           item._id,
              title:        item.title        || 'Activity',
              type:         item.source       || 'books',
              activityType: item.activityType || '',
              description:  item.description  || '',
              completedAt:  item.createdAt    || item._createdDate
            }));
          }
          // Fallback: derive from books (backward compat)
          return [...books].reverse().map(item => ({
            id:          item.bookKey || item._id,
            title:       item.bookName || 'Untitled Book',
            type:        'books',
            activityType:'book_completed',
            description: '',
            completedAt: item.updatedAt
          }));
        })(),
        teacherNote: student.tutorComment || '',
        loggedAchievements: loggedAchievements || [],
        stats: {
          totalCompleted: booksCompleted,
          booksCompleted,
          explorerPoints,
          averageScore: skills.averageScore
        }
      }
    });

  } catch (error) {
    console.error('studentDashboard error:', error);
    return serverError({ headers: CORS_HEADERS, body: { error: error.message } });
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Recalculate and save SkillScores for a student
// ─────────────────────────────────────────────────────────────
async function updateSkillScores(studentId) {
  const result = await wixData.query('StudentActivityProgress')
    .eq('studentId', studentId)
    .limit(1000)
    .find({ suppressAuth: true });

  const items = result.items || [];
  if (items.length === 0) return;

  const totals = items.reduce((acc, item) => {
    acc.cognitive       += Number(item.cognitive       || 0);
    acc.creative        += Number(item.creative        || 0);
    acc.communication   += Number(item.communication   || 0);
    acc.socialEmotional += Number(item.socialEmotional || 0);
    acc.physical        += Number(item.physical        || 0);
    acc.practical       += Number(item.practical       || 0);
    acc.averageScore    += Number(item.score           || 0);
    return acc;
  }, { cognitive: 0, creative: 0, communication: 0, socialEmotional: 0, physical: 0, practical: 0, averageScore: 0 });

  const count = items.length;
  const skillData = {
    studentId,
    cognitive:       Number((totals.cognitive       / count).toFixed(2)),
    creative:        Number((totals.creative        / count).toFixed(2)),
    communication:   Number((totals.communication   / count).toFixed(2)),
    socialEmotional: Number((totals.socialEmotional / count).toFixed(2)),
    physical:        Number((totals.physical        / count).toFixed(2)),
    practical:       Number((totals.practical       / count).toFixed(2)),
    averageScore:    Number((totals.averageScore    / count).toFixed(2)),
    updatedAt: new Date()
  };

  const existing = await wixData.query('SkillScores')
    .eq('studentId', studentId)
    .limit(1)
    .find({ suppressAuth: true });

  if (existing.items.length > 0) {
    await wixData.update('SkillScores', { ...existing.items[0], ...skillData, _id: existing.items[0]._id }, { suppressAuth: true });
  } else {
    await wixData.insert('SkillScores', skillData, { suppressAuth: true });
  }
}

// ─────────────────────────────────────────────────────────────
// UPDATE STUDENT PROGRESS
// POST /_functions/updateStudentProgress
// ─────────────────────────────────────────────────────────────
export async function post_updateStudentProgress(request) {
  try {
    const body = await request.body.json();
    const { studentId, activityId, activityTitle, activityType, status, score, completedAt, cognitive, creative, communication, socialEmotional, physical, practical } = body;

    if (!studentId || !activityId) {
      return badRequest({ headers: CORS_HEADERS, body: { success: false, error: 'Missing studentId or activityId' } });
    }

    const itemData = {
      studentId,
      activityId,
      activityTitle:   activityTitle || 'Untitled Activity',
      activityType:    activityType  || 'Book',
      status:          status        || 'Completed',
      score:           Number(score           || 0),
      completedAt:     completedAt ? new Date(completedAt) : new Date(),
      cognitive:       Number(cognitive       || 0),
      creative:        Number(creative        || 0),
      communication:   Number(communication   || 0),
      socialEmotional: Number(socialEmotional || 0),
      physical:        Number(physical        || 0),
      practical:       Number(practical       || 0)
    };

    const existingResult = await wixData.query('StudentActivityProgress')
      .eq('studentId', studentId)
      .eq('activityId', activityId)
      .limit(1)
      .find({ suppressAuth: true });

    let action = 'inserted';
    if (existingResult.items.length > 0) {
      const existingItem = existingResult.items[0];
      await wixData.update('StudentActivityProgress', { ...existingItem, ...itemData, _id: existingItem._id }, { suppressAuth: true });
      action = 'updated';
    } else {
      await wixData.insert('StudentActivityProgress', itemData, { suppressAuth: true });
    }

    await updateSkillScores(studentId);

    return ok({ headers: CORS_HEADERS, body: { success: true, action, message: action === 'updated' ? 'Progress updated' : 'Progress created' } });
  } catch (error) {
    return serverError({ headers: CORS_HEADERS, body: { success: false, error: error.message } });
  }
}

export function options_updateStudentProgress(request) {
  return ok({ headers: CORS_HEADERS, body: {} });
}

// ─────────────────────────────────────────────────────────────
// GET ALL STUDENTS IN A BATCH (for tutor dashboard)
// URL: /_functions/getBatchStudents?tutorId=MEMBERID&batchName=Batch1
// ─────────────────────────────────────────────────────────────
export async function get_getBatchStudents(request) {
  try {
    const { tutorId, batchName } = request.query;
    if (!tutorId || !batchName) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'tutorId and batchName are required' }) });
    }

    const studentRoles = await wixData.query('UserRoles')
      .eq('tutorId', tutorId)
      .eq('batchName', batchName)
      .eq('role', 'tutor_student')
      .eq('isActive', true)
      .find({ suppressAuth: true });

    const studentsWithScores = await Promise.all(
      studentRoles.items.map(async (student) => {
        const memberId = student.memberId;
        const [skillResults, activityResults] = await Promise.all([
          wixData.query('SkillScores').eq('studentId', memberId).find({ suppressAuth: true }),
          wixData.query('StudentActivityProgress').eq('studentId', memberId).find({ suppressAuth: true })
        ]);
        const skillScores = skillResults.items[0] || null;
        return {
          memberId, name: student.fullName || student.email, email: student.email,
          batchName: student.batchName, tutorComment: student.tutorComment || '',
          skillScores: skillScores ? {
            cognitive:       skillScores.cognitive       || 0,
            creative:        skillScores.creative        || 0,
            communication:   skillScores.communication   || 0,
            socialEmotional: skillScores.socialEmotional || 0,
            physical:        skillScores.physical        || 0,
            practical:       skillScores.practical       || 0,
            averageScore:    skillScores.averageScore    || 0
          } : null,
          activitiesCount: activityResults.items.length
        };
      })
    );

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ students: studentsWithScores }) });
  } catch (err) {
    console.error('getBatchStudents error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_getBatchStudents(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// GET SINGLE STUDENT SCORES (for tutor view)
// URL: /_functions/getStudentScores?studentId=MEMBERID
// ─────────────────────────────────────────────────────────────
export async function get_getStudentScores(request) {
  try {
    const { studentId } = request.query;
    if (!studentId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'studentId is required' }) });
    }

    const [skillResults, activityResults, roleResult] = await Promise.all([
      wixData.query('SkillScores').eq('studentId', studentId).find({ suppressAuth: true }),
      wixData.query('StudentActivityProgress').eq('studentId', studentId).descending('_createdDate').find({ suppressAuth: true }),
      wixData.query('UserRoles').eq('memberId', studentId).find({ suppressAuth: true })
    ]);

    const userRole = roleResult.items[0] || null;
    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({
        studentId, name: userRole?.fullName || '', batchName: userRole?.batchName || '',
        tutorComment: userRole?.tutorComment || '', skillScores: skillResults.items[0] || null,
        activities: activityResults.items
      })
    });
  } catch (err) {
    console.error('getStudentScores error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_getStudentScores(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// SAVE TUTOR COMMENT
// POST /_functions/saveTutorComment
// Body: { studentId, comment }
// ─────────────────────────────────────────────────────────────
export async function post_saveTutorComment(request) {
  try {
    const body = await request.body.json();
    const { studentId, comment } = body;
    if (!studentId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'studentId is required' }) });
    }

    const roleResults = await wixData.query('UserRoles').eq('memberId', studentId).find({ suppressAuth: true });
    if (roleResults.items.length === 0) {
      return notFound({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Student not found' }) });
    }

    const record = roleResults.items[0];
    record.tutorComment = comment;
    await wixData.update('UserRoles', record, { suppressAuth: true });
    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true }) });
  } catch (err) {
    console.error('saveTutorComment error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_saveTutorComment(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// GET STUDENT PHOTO
// URL: /_functions/getStudentPhoto?studentId=MEMBERID
// ─────────────────────────────────────────────────────────────
export async function get_getStudentPhoto(request) {
  try {
    const { studentId } = request.query;
    if (!studentId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'studentId required' }) });
    }

    const results = await wixData.query('StudentPhotos').eq('studentId', studentId).find({ suppressAuth: true });
    if (results.items.length === 0 || !results.items[0].photo) {
      return ok({ headers: CORS_HEADERS, body: JSON.stringify({ photoUrl: null }) });
    }

    const stored = results.items[0].photo;
    let realUrl = stored;
    if (stored.startsWith('wix:image://')) {
      const withoutProtocol = stored.replace('wix:image://v1/', '');
      const fileId = withoutProtocol.split('/')[0];
      const fileName = withoutProtocol.split('/')[1]?.split('#')[0] || 'photo.jpg';
      realUrl = `https://static.wixstatic.com/media/${fileId}/${fileName}`;
    }

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ photoUrl: realUrl }) });
  } catch (err) {
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_getStudentPhoto(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// SAVE STUDENT PHOTO
// Stores base64 directly in StudentPhotos CMS — no mediaManager needed.
// Works reliably on all devices. Photo persists across sessions.
// POST /_functions/saveStudentPhoto
// Body: { studentId, base64 }
// ─────────────────────────────────────────────────────────────
export async function post_saveStudentPhoto(request) {
  try {
    const body = await request.body.json();
    const { studentId, base64 } = body;

    if (!studentId || !base64) {
      return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId or base64 data' }) };
    }

    const existing = await wixData.query('StudentPhotos')
      .eq('studentId', studentId)
      .limit(1)
      .find({ suppressAuth: true });

    if (existing.items.length > 0) {
      const record = existing.items[0];
      record.photo = base64;
      record.updatedAt = new Date();
      await wixData.update('StudentPhotos', record, { suppressAuth: true });
    } else {
      await wixData.insert('StudentPhotos', {
        title: studentId, studentId, photo: base64, updatedAt: new Date()
      }, { suppressAuth: true });
    }

    return { status: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true, photoUrl: base64 }) };

  } catch (err) {
    console.error('saveStudentPhoto error:', err);
    return { status: 500, headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: err.message }) };
  }
}

export function options_saveStudentPhoto(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// UPDATE STUDENT NAME
// POST /_functions/updateStudentName
// Body: { studentId, name }
// ─────────────────────────────────────────────────────────────
export async function post_updateStudentName(request) {
  try {
    const body = await request.body.json();
    const { studentId, name } = body;

    if (!studentId || !name) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId or name' }) });
    }

    const roleResults = await wixData.query('UserRoles').eq('memberId', studentId).find({ suppressAuth: true });
    if (roleResults.items.length > 0) {
      const record = roleResults.items[0];
      record.fullName = name;
      await wixData.update('UserRoles', record, { suppressAuth: true });
      return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true }) });
    } else {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Student not found in UserRoles' }) });
    }
  } catch (err) {
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_updateStudentName(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// GET COMMUNITY FEED
// URL: /_functions/communityFeed?studentId=MEMBERID
//
// Architecture:
//   Wix Groups → Wix Automations → CommunityActivity CMS
//   → This endpoint → React dashboard
//
// Reads CommunityActivity CMS (populated by Automations).
// React dashboard NEVER queries Wix Groups directly.
// ─────────────────────────────────────────────────────────────
export async function get_communityFeed(request) {
  const studentId = request.query.studentId;

  if (!studentId) {
    return badRequest({
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Missing studentId' })
    });
  }

  try {

    const result = await wixData.query('CommunityActivity')
      .eq('memberId', studentId)
      .descending('_createdDate')
      .limit(100)
      .find({ suppressAuth: true });

    const items = result.items || [];

    // ── Helper: normalise activityType so Automation spelling
    //    variations all resolve correctly.
    //    e.g. "Group Joined", "groupJoined", "group_joined" → "group_joined"
    function normalise(raw) {
      return (raw || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')   // spaces → underscores
        .replace(/-/g, '_');    // hyphens → underscores
    }

    const feed = items.map(item => {

      const at = normalise(item.activityType);

      let title   = '';
      let excerpt = '';
      let type    = 'default';

      // ── POST ─────────────────────────────────────────────────
      if (at === 'post_created' || at === 'postcreated') {
        type    = 'discussion';
        title   = `Posted in ${item.groupName || 'Community'}`;
        excerpt = item.postContent || 'Created a community post';
      }

      // ── COMMENT ───────────────────────────────────────────────
      else if (at === 'comment_created' || at === 'commentcreated') {
        type    = 'comment';
        title   = 'Commented on a post';
        excerpt = item.commentContent || 'Added a comment';
      }

      // ── POST REACTION ─────────────────────────────────────────
      else if (at === 'post_reaction' || at === 'postreaction') {
        type    = 'reaction';
        title   = 'Reacted to a post';
        excerpt = item.reactionType
          ? `Reaction: ${item.reactionType}`
          : 'Reacted to a community post';
      }

      // ── COMMENT REACTION ──────────────────────────────────────
      else if (at === 'comment_reaction' || at === 'commentreaction') {
        type    = 'reaction';
        title   = 'Reacted to a comment';
        excerpt = item.reactionType
          ? `Reaction: ${item.reactionType}`
          : 'Reacted to a comment';
      }

      // ── GROUP JOIN ────────────────────────────────────────────
      //    Catches: "group_joined", "Group Joined", "groupJoined",
      //             "joined_group", "group_join", etc.
      else if (
        at === 'group_joined'  ||
        at === 'groupjoined'   ||
        at === 'joined_group'  ||
        at === 'group_join'    ||
        at.includes('join')    ||
        at.startsWith('group')
      ) {
        type    = 'group';
        title   = `Joined ${item.groupName || 'a group'}`;
        excerpt = item.groupName
          ? `You are now part of the ${item.groupName} community`
          : 'Became part of the community';
      }

      // ── UNKNOWN ───────────────────────────────────────────────
      else {
        type    = 'default';
        title   = item.groupName ? `Activity in ${item.groupName}` : 'Community activity';
        excerpt = item.postContent || item.commentContent || '';
      }

      // imageUrl: use any mediaUrl that exists (media type field is unreliable)
      const imageUrl = item.mediaUrl || null;

      // url: for posts/reactions use postUrl; for groups use groupLink; fallback to community
      const url =
        item.postUrl    ||
        item.groupLink  ||
        'https://www.thebeyondbox.org/group/humans-of-science-1/discussion';

      return {
        id:       item._id,
        type,
        title,
        excerpt,
        imageUrl,
        url,
        postedAt: item.activityDate || item._createdDate,
        // likes / comments / views intentionally omitted — not available from CMS
      };
    });

    // ── Stats (use normalised matching so counts are accurate) ──
    const totalPosts   = items.filter(i => {
      const at = normalise(i.activityType);
      return at === 'post_created' || at === 'postcreated';
    }).length;

    const totalReplies = items.filter(i => {
      const at = normalise(i.activityType);
      return at === 'comment_created' || at === 'commentcreated';
    }).length;

    const totalLikes = items.filter(i => {
      const at = normalise(i.activityType);
      return (
        at === 'post_reaction'    || at === 'postreaction'    ||
        at === 'comment_reaction' || at === 'commentreaction'
      );
    }).length;

    // ── MIRROR CommunityActivity → StudentActivities timeline ──
    // For each community event that doesn't already have a
    // StudentActivities entry (keyed by activityKey = item._id),
    // create a lightweight timeline summary.
    // This runs non-blocking — never delays the community feed response.
    (async () => {
      try {
        // Fetch existing StudentActivities keys for this student so we
        // don't create duplicates on repeated communityFeed calls.
        const existingKeys = await wixData.query('StudentActivities')
          .eq('studentId', studentId)
          .eq('source', 'community')
          .limit(1000)
          .find({ suppressAuth: true });
        const knownKeys = new Set((existingKeys.items || []).map(e => e.activityKey));

        // Fetch student name once
        const roleRes = await wixData.query('UserRoles')
          .eq('memberId', studentId)
          .limit(1)
          .find({ suppressAuth: true });
        const studentName = roleRes.items[0]?.fullName || roleRes.items[0]?.email || '';

        for (const item of items) {
          if (knownKeys.has(item._id)) continue; // already logged

          const at = normalise(item.activityType);
          let activityType = '';
          let title        = '';

          if (at === 'post_created' || at === 'postcreated') {
            activityType = 'community_post';
            title        = `📝 Posted in ${item.groupName || 'Community'}`;
          } else if (at === 'comment_created' || at === 'commentcreated') {
            activityType = 'community_comment';
            title        = `💬 Commented in ${item.groupName || 'Community'}`;
          } else if (at === 'post_reaction' || at === 'postreaction') {
            activityType = 'community_reaction';
            title        = '❤️ Reacted to a post';
          } else if (at === 'comment_reaction' || at === 'commentreaction') {
            activityType = 'community_reaction';
            title        = '❤️ Reacted to a comment';
          } else if (at.includes('join') || at.startsWith('group')) {
            activityType = 'community_group_joined';
            title        = `👥 Joined ${item.groupName || 'a group'}`;
          } else {
            continue; // skip unknown types
          }

          await createStudentActivity({
            studentId,
            studentName,
            source:       'community',
            activityType,
            activityKey:  item._id,
            title,
            description:  item.groupName || '',
            metadata:     { groupName: item.groupName, groupId: item.groupId }
          });
        }
      } catch (mirrorErr) {
        console.warn('[StudentActivities] Community mirror error (non-fatal):', mirrorErr.message);
      }
    })();

    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({
        stats: {
          posts:         totalPosts,
          likesReceived: totalLikes,
          replies:       totalReplies,
        },
        feed,
      })
    });

  } catch (error) {
    console.error('communityFeed error:', error);
    return serverError({
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    });
  }
}

export function options_communityFeed(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// GET STUDENT ACTIVITIES (dedicated timeline endpoint)
// URL: /_functions/studentActivities?studentId=MEMBERID&limit=5
//
// Returns the latest N StudentActivities entries for a student.
// The React dashboard calls this separately after loading the
// main dashboard data so the feed appears with no delay.
// ─────────────────────────────────────────────────────────────
export async function get_studentActivities(request) {
  const { studentId, limit } = request.query;

  if (!studentId) {
    return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId' }) });
  }

  try {
    // ── Fetch shared data: UserRoles (used by both mirrors) ──────────────────
    const roleRes = await wixData.query('UserRoles')
      .eq('memberId', studentId)
      .limit(1)
      .find({ suppressAuth: true });
    const studentName = roleRes.items[0]?.fullName || roleRes.items[0]?.email || '';
    const email       = roleRes.items[0]?.email || '';

    // ── Run BOTH mirrors in parallel and AWAIT them ──────────────────────────
    // Using Promise.allSettled so a failure in one doesn't block the other.
    await Promise.allSettled([

      // ── Mirror 1: PHQuizResults → StudentActivities (pre/post tests) ────────
      (async () => {
        try {
          // Get already-mirrored simulation keys for this student
          const existingSimKeys = await wixData.query('StudentActivities')
            .eq('studentId', studentId)
            .eq('source', 'simulation')
            .limit(1000)
            .find({ suppressAuth: true });
          const knownKeys = new Set((existingSimKeys.items || []).map(e => e.activityKey));

          // Query PHQuizResults using studentId, memberId, _owner, or email in parallel
          const [res1, res2, res3, res4] = await Promise.all([
            wixData.query('PHQuizResults').eq('studentId', studentId).descending('_createdDate').find({ suppressAuth: true }).catch(() => ({ items: [] })),
            wixData.query('PHQuizResults').eq('memberId', studentId).descending('_createdDate').find({ suppressAuth: true }).catch(() => ({ items: [] })),
            wixData.query('PHQuizResults').eq('_owner', studentId).descending('_createdDate').find({ suppressAuth: true }).catch(() => ({ items: [] })),
            email ? wixData.query('PHQuizResults').eq('email', email).descending('_createdDate').find({ suppressAuth: true }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] })
          ]);

          // Deduplicate across all four queries (same item may appear in multiple)
          const quizItemsMap = new Map();
          [...(res1.items || []), ...(res2.items || []), ...(res3.items || []), ...(res4.items || [])].forEach(item => {
            if (item && item._id) quizItemsMap.set(item._id, item);
          });

          for (const result of quizItemsMap.values()) {
            if (knownKeys.has(result._id)) continue; // already mirrored

            const rawType   = (result.testType || result.type || '').toLowerCase();
            const rawTitle  = (result.title || result.simulationTitle || result.bookName || 'Simulation').toLowerCase();
            const isPreTest = rawType === 'pre' || rawTitle.includes('pre-test') || rawTitle.includes('pretest') || rawTitle.includes('pre test');

            const activityType = isPreTest ? 'simulation_pretest_completed' : 'simulation_posttest_completed';
            const emoji        = isPreTest ? '📋' : '✅';
            const label        = isPreTest ? 'Pre-Test' : 'Post-Test';
            const simTitle     = result.title || result.simulationTitle || result.bookName || 'Simulation';
            const scoreText    = result.percentage != null
              ? `${result.percentage}%`
              : (result.score != null ? String(result.score) : '');
            const origDate     = result._createdDate || result.createdAt || new Date();

            await createStudentActivity({
              studentId,
              studentName,
              source:       'simulation',
              activityType,
              activityKey:  result._id,
              title:        `${emoji} Completed ${simTitle} ${label}`,
              description:  scoreText ? `Score: ${scoreText}` : '',
              metadata:     {
                testType:   result.testType || rawType,
                score:      result.score,
                percentage: result.percentage,
                testOrder:  result.testOrder
              },
              createdAt:    origDate
            });

            knownKeys.add(result._id);
          }

          console.log(`[StudentActivities] PHQuizResults mirror complete for ${studentId}: ${quizItemsMap.size} total, added ${[...quizItemsMap.values()].filter(r => !knownKeys.has(r._id)).length} new`);
        } catch (quizErr) {
          console.warn('[StudentActivities] PHQuizResults mirror error:', quizErr.message);
        }
      })(),

      // ── Mirror 2: BookScores → StudentActivities (completed books) ──────────
      (async () => {
        try {
          const existingBookKeys = await wixData.query('StudentActivities')
            .eq('studentId', studentId)
            .eq('source', 'books')
            .limit(1000)
            .find({ suppressAuth: true });
          const knownKeys = new Set((existingBookKeys.items || []).map(e => e.activityKey));

          const bookRes = await wixData.query('BookScores')
            .eq('studentId', studentId)
            .descending('_createdDate')
            .limit(100)
            .find({ suppressAuth: true });

          for (const score of bookRes.items || []) {
            const key = score.bookKey || score.bookName || score._id;
            if (knownKeys.has(key)) continue;

            const bookTitle = score.bookName || score.bookKey || 'Book';
            const avgScore  = score.averageScore != null ? score.averageScore : '';
            const origDate  = score._createdDate || score.createdAt || score.updatedAt || new Date();

            await createStudentActivity({
              studentId,
              studentName,
              source:       'books',
              activityType: 'book_completed',
              activityKey:  key,
              title:        `📚 Completed ${bookTitle}`,
              description:  avgScore !== '' ? `Average score: ${avgScore}` : '',
              metadata:     { bookId: key, bookName: bookTitle, averageScore: avgScore },
              createdAt:    origDate
            });

            knownKeys.add(key);
          }

          console.log(`[StudentActivities] BookScores mirror complete for ${studentId}`);
        } catch (bookErr) {
          console.warn('[StudentActivities] BookScores mirror error:', bookErr.message);
        }
      })()

    ]); // ← both mirrors are now AWAITED before the query below runs

    // ── Query StudentActivities — mirrors are complete so data is ready ───────
    const maxItems = Math.min(parseInt(limit || '10', 10), 50);

    const result = await wixData.query('StudentActivities')
      .eq('studentId', studentId)
      .descending('_createdDate')
      .limit(maxItems)
      .find({ suppressAuth: true });

    const activities = (result.items || []).map(item => ({
      id:           item._id,
      title:        item.title        || 'Activity',
      studentId:    item.studentId,
      studentName:  item.studentName  || '',
      source:       item.source       || 'unknown',
      activityType: item.activityType || '',
      activityKey:  item.activityKey  || '',
      description:  item.description  || '',
      metadata: (() => {
        if (!item.metadata) return null;
        try { return typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata; }
        catch (e) { return item.metadata; }
      })(),
      createdAt: item.createdAt || item._createdDate
    }));

    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({ activities, total: activities.length })
    });

  } catch (err) {
    console.error('studentActivities error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_studentActivities(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// LOG STUDENT ACTIVITY (general-purpose endpoint)
// POST /_functions/logStudentActivity
//
// Called by: Simulation pages, Badge/XP engine, any Wix page
// that needs to record a timeline event.
//
// Body: {
//   studentId, studentName,
//   source, activityType, activityKey,
//   title, description, metadata
// }
// ─────────────────────────────────────────────────────────────
export async function post_logStudentActivity(request) {
  try {
    const body = await request.body.json();
    const {
      studentId, studentName,
      source, activityType, activityKey,
      title, description, metadata
    } = body;

    if (!studentId || !activityType) {
      return badRequest({
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'studentId and activityType are required' })
      });
    }

    // Validate source
    const validSources = ['books', 'simulation', 'community', 'achievement'];
    if (source && !validSources.includes(source)) {
      return badRequest({
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `Invalid source. Must be one of: ${validSources.join(', ')}` })
      });
    }

    // Deduplicate any event that has an activityKey to prevent duplicate timeline entries
    if (activityKey) {
      const existing = await wixData.query('StudentActivities')
        .eq('studentId', studentId)
        .eq('activityType', activityType)
        .eq('activityKey', activityKey)
        .limit(1)
        .find({ suppressAuth: true });

      if (existing.items.length > 0) {
        return ok({
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, message: 'Activity already logged (deduplicated)' })
        });
      }
    }

    await createStudentActivity({
      studentId,
      studentName: studentName || '',
      source:      source      || 'achievement',
      activityType,
      activityKey: activityKey || '',
      title:       title       || activityType,
      description: description || '',
      metadata:    metadata    || null
    });

    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, message: 'Activity logged to StudentActivities' })
    });

  } catch (err) {
    console.error('logStudentActivity error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ success: false, error: err.message }) });
  }
}

export function options_logStudentActivity(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// SKILL TRACKER INIT
// URL: /_functions/skillTrackerInit?memberId=MEMBERID
// ─────────────────────────────────────────────────────────────
export async function get_skillTrackerInit(request) {
  try {
    const { memberId } = request.query;
    if (!memberId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'memberId required' }) });
    }

    const roleResult = await wixData.query('UserRoles')
      .eq('memberId', memberId)
      .limit(1)
      .find({ suppressAuth: true });

    if (roleResult.items.length === 0) {
      return notFound({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'User not found in UserRoles' }) });
    }

    const userRole = roleResult.items[0];
    const role     = userRole.role;
    const canEdit  = role === 'home_learner';

    const scoresResult = await wixData.query('BookScores')
      .eq('studentId', memberId)
      .find({ suppressAuth: true });

    const scores = scoresResult.items.map(item => ({
      bookId: item.bookKey,
      ratings: {
        cognitive:       Number(item.cognitive       || 0),
        creative:        Number(item.creative        || 0),
        communication:   Number(item.communication   || 0),
        socialEmotional: Number(item.socialEmotional || 0),
        physical:        Number(item.physical        || 0),
        practical:       Number(item.practical       || 0)
      },
      averageScore: Number(item.averageScore || 0),
      completedAt:  item.updatedAt ? new Date(item.updatedAt).toISOString() : new Date().toISOString()
    }));

    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({
        role, canEdit, memberId,
        tutorId:   userRole.tutorId   || null,
        batchName: userRole.batchName || '',
        fullName:  userRole.fullName  || '',
        remarks:   userRole.tutorComment || '',
        scores
      })
    });

  } catch (err) {
    console.error('skillTrackerInit error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_skillTrackerInit(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}


// ─────────────────────────────────────────────────────────────
// SAVE BOOK SCORE (home_learner only)
// POST /_functions/saveBookScore
//
// After saving the BookScore, automatically:
//   → triggers updateConceptProgress(studentId)
//   → aggregates all BookScores for that student
//   → upserts 6 ConceptProgress entries (one per skill)
//
// Architecture: BookScores → Backend → ConceptProgress CMS → Dashboard
// ─────────────────────────────────────────────────────────────
export async function post_saveBookScore(request) {
  try {
    const body = await request.body.json();
    const {
      memberId, bookId, bookName,
      cognitive, creative, communication,
      socialEmotional, physical, practical
    } = body;

    if (!memberId || !bookId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'memberId and bookId required' }) });
    }

    const roleResult = await wixData.query('UserRoles')
      .eq('memberId', memberId)
      .limit(1)
      .find({ suppressAuth: true });

    if (roleResult.items.length === 0) {
      return notFound({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'User not found' }) });
    }

    const userRole = roleResult.items[0];

    if (userRole.role !== 'home_learner') {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Only home_learner can save scores' }) });
    }

    const skillValues  = [cognitive, creative, communication, socialEmotional, physical, practical].map(Number);
    const averageScore = Number((skillValues.reduce((a, b) => a + b, 0) / skillValues.length).toFixed(2));

    const scoreData = {
      // NOTE: 'title' field is intentionally omitted — ConceptProgress does not use it
      studentId:       memberId,
      tutorId:         userRole.tutorId   || '',
      batchName:       userRole.batchName || '',
      bookKey:         bookId,
      bookName:        bookName || bookId,
      cognitive:       Number(cognitive       || 0),
      creative:        Number(creative        || 0),
      communication:   Number(communication   || 0),
      socialEmotional: Number(socialEmotional || 0),
      physical:        Number(physical        || 0),
      practical:       Number(practical       || 0),
      averageScore,
      updatedAt: new Date()
    };

    const existing = await wixData.query('BookScores')
      .eq('studentId', memberId)
      .eq('bookKey',   bookId)
      .limit(1)
      .find({ suppressAuth: true });

    let action = 'inserted';
    if (existing.items.length > 0) {
      await wixData.update('BookScores',
        { ...existing.items[0], ...scoreData, _id: existing.items[0]._id },
        { suppressAuth: true }
      );
      action = 'updated';
    } else {
      await wixData.insert('BookScores', scoreData, { suppressAuth: true });
    }

    // ── DYNAMIC CONCEPT PROGRESS AGGREGATION ──────────────────
    // Automatically recalculate and store all 6 skill-wise
    // ConceptProgress entries for this student.
    // studentId is always read from the BookScore — never hardcoded.
    let conceptUpdateResult = null;
    try {
      conceptUpdateResult = await updateConceptProgress(memberId);
    } catch (conceptErr) {
      conceptUpdateResult = { success: false, error: conceptErr.message };
    }

    // ── STUDENTACTIVITIES TIMELINE: log book_completed ─────────
    // Only log on INSERT (first completion). On UPDATE, skip to avoid
    // duplicate timeline entries for the same book.
    if (action === 'inserted') {
      await createStudentActivity({
        studentId:    memberId,
        studentName:  userRole.fullName || userRole.email || '',
        source:       'books',
        activityType: 'book_completed',
        activityKey:  bookId,
        title:        `Completed ${bookName || bookId}`,
        description:  `Average score: ${averageScore}`,
        metadata:     { bookId, bookName, averageScore }
      });
    }

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true, action, averageScore, conceptUpdateResult }) });

  } catch (err) {
    console.error('saveBookScore error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_saveBookScore(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}


// ─────────────────────────────────────────────────────────────
// SAVE HOME LEARNER REMARKS (home_learner only)
// POST /_functions/saveHomeLearnerRemarks
// ─────────────────────────────────────────────────────────────
export async function post_saveHomeLearnerRemarks(request) {
  try {
    const body = await request.body.json();
    const { memberId, remarks } = body;

    if (!memberId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'memberId required' }) });
    }

    const roleResult = await wixData.query('UserRoles')
      .eq('memberId', memberId)
      .limit(1)
      .find({ suppressAuth: true });

    if (roleResult.items.length === 0) {
      return notFound({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'User not found' }) });
    }

    const userRole = roleResult.items[0];

    if (userRole.role !== 'home_learner') {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Only home_learner can save remarks' }) });
    }

    userRole.tutorComment = remarks || '';
    await wixData.update('UserRoles', userRole, { suppressAuth: true });

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true }) });

  } catch (err) {
    console.error('saveHomeLearnerRemarks error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_saveHomeLearnerRemarks(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

// ─────────────────────────────────────────────────────────────
// DEBUG ENDPOINT — REMOVE LATER
// ─────────────────────────────────────────────────────────────
export async function get_debugPH(request) {
  try {
    const studentId = request.query.studentId;
    if (!studentId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId' }) });
    }
    const [res1, res2, res3, res4] = await Promise.all([
      wixData.query('PHQuizResults').eq('studentId', studentId).find({ suppressAuth: true }).catch(() => ({ items: [] })),
      wixData.query('PHQuizResults').eq('memberId', studentId).find({ suppressAuth: true }).catch(() => ({ items: [] })),
      wixData.query('PHQuizResults').eq('_owner', studentId).find({ suppressAuth: true }).catch(() => ({ items: [] })),
      wixData.query('PHQuizResults').eq('email', studentId).find({ suppressAuth: true }).catch(() => ({ items: [] }))
    ]);
    const quizItemsMap = new Map();
    [...(res1.items || []), ...(res2.items || []), ...(res3.items || []), ...(res4.items || [])].forEach(item => {
      if (item && item._id) {
        quizItemsMap.set(item._id, item);
      }
    });
    return ok({ headers: CORS_HEADERS, body: JSON.stringify(Array.from(quizItemsMap.values())) });
  } catch (err) {
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_debugPH(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}


// ─────────────────────────────────────────────────────────────
// DELETE BOOK SCORE (home_learner only)
// POST /_functions/deleteBookScore
// Body: { memberId, bookId }
// ─────────────────────────────────────────────────────────────
export async function post_deleteBookScore(request) {
  try {
    const body = await request.body.json();
    const { memberId, bookId } = body;

    if (!memberId || !bookId) {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'memberId and bookId required' }) });
    }

    const roleResult = await wixData.query('UserRoles')
      .eq('memberId', memberId)
      .limit(1)
      .find({ suppressAuth: true });

    if (roleResult.items.length === 0) {
      return notFound({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'User not found in UserRoles' }) });
    }

    const userRole = roleResult.items[0];

    if (userRole.role !== 'home_learner') {
      return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Only home_learner can delete scores' }) });
    }

    // Delete from BookScores CMS
    const existingResult = await wixData.query('BookScores')
      .eq('studentId', memberId)
      .eq('bookKey',   bookId)
      .find({ suppressAuth: true });

    if (existingResult.items.length > 0) {
      await wixData.remove('BookScores', existingResult.items[0]._id, { suppressAuth: true });
    }

    // Recalculate ConceptProgress
    let conceptUpdateResult = null;
    try {
      conceptUpdateResult = await updateConceptProgress(memberId);
    } catch (conceptErr) {
      conceptUpdateResult = { success: false, error: conceptErr.message };
    }

    // Clean up any completion activity from the StudentActivities timeline
    const activityResult = await wixData.query('StudentActivities')
      .eq('studentId',    memberId)
      .eq('activityType', 'book_completed')
      .eq('activityKey',  bookId)
      .find({ suppressAuth: true });

    for (const act of activityResult.items) {
      await wixData.remove('StudentActivities', act._id, { suppressAuth: true });
    }

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true, conceptUpdateResult }) });

  } catch (err) {
    console.error('deleteBookScore error:', err);
    return serverError({ headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_deleteBookScore(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}

