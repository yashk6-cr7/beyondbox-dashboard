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
// Called automatically whenever a BookScore is saved or updated.
// Architecture: BookScores → Backend Aggregation → ConceptProgress CMS → Dashboard UI
//
// Flow:
//   1. Read studentId from current BookScore entry
//   2. Fetch ALL BookScores for that student
//   3. For each of 6 skills: sum totalScore, calculate progressPercent, determine masteryLevel
//   4. Upsert one ConceptProgress entry per skill (keyed by studentId + subject)
// ─────────────────────────────────────────────────────────────
async function updateConceptProgress(studentId) {
  try {
    // STEP 1 + 2: Fetch ALL book scores for this student
    const bookResult = await wixData.query('BookScores')
      .eq('studentId', studentId)
      .limit(1000)
      .find({ suppressAuth: true });

    const books = bookResult.items || [];
    const totalBooksCompleted = books.length;

    if (totalBooksCompleted === 0) {
      console.log(`[ConceptProgress] No books found for student ${studentId} — skipping.`);
      return;
    }

    // Max possible score per skill per book is 4
    const maxPossibleScore = totalBooksCompleted * 4;

    // STEP 3: For each skill, calculate totals and upsert ConceptProgress
    const skills = Object.keys(CONCEPT_MAP);

    await Promise.all(skills.map(async (skillKey) => {
      const { subject, conceptName } = CONCEPT_MAP[skillKey];

      // Sum all scores for this skill across all books
      const totalScore = books.reduce((sum, book) => {
        return sum + Number(book[skillKey] || 0);
      }, 0);

      // Calculate percentage, rounded to 2 decimal places
      const progressPercent = maxPossibleScore > 0
        ? Math.round((totalScore / maxPossibleScore) * 10000) / 100
        : 0;

      const masteryLevel = getMasteryLevel(progressPercent);

      const entryData = {
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

      // STEP 7: Upsert — find existing entry by studentId + subject
      const existing = await wixData.query('ConceptProgress')
        .eq('studentId', studentId)
        .eq('subject', subject)
        .limit(1)
        .find({ suppressAuth: true });

      if (existing.items.length > 0) {
        // Update existing entry
        await wixData.update('ConceptProgress', {
          ...existing.items[0],
          ...entryData,
          _id: existing.items[0]._id
        }, { suppressAuth: true });
      } else {
        // Insert new entry
        await wixData.insert('ConceptProgress', entryData, { suppressAuth: true });
      }
    }));

    console.log(`[ConceptProgress] Updated 6 concept entries for student ${studentId}`);
  } catch (err) {
    // Non-fatal: log error but don't break the parent request
    console.error('[ConceptProgress] updateConceptProgress error:', err.message);
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
  return { status: 200, headers: CORS_HEADERS, body: JSON.stringify({ userId: member._id, name: member.profile.nickname }) };
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
        recentActivities: [...books].reverse().map(item => ({
          id:              item.bookKey || item._id,
          title:           item.bookName || 'Untitled Book',
          type:            'Book',
          status:          'Completed',
          score:           Number(item.averageScore    || 0),
          completedAt:     item.updatedAt,
          cognitive:       Number(item.cognitive       || 0),
          creative:        Number(item.creative        || 0),
          communication:   Number(item.communication   || 0),
          socialEmotional: Number(item.socialEmotional || 0),
          physical:        Number(item.physical        || 0),
          practical:       Number(item.practical       || 0)
        })),
        teacherNote: student.tutorComment || '',
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
    await updateConceptProgress(memberId);

    return ok({ headers: CORS_HEADERS, body: JSON.stringify({ success: true, action, averageScore }) });

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
