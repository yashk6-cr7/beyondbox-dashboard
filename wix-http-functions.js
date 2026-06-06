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

    // GET CONCEPTS
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
        acc.cognitive += Number(b.cognitive || 0);
        acc.creative += Number(b.creative || 0);
        acc.communication += Number(b.communication || 0);
        acc.socialEmotional += Number(b.socialEmotional || 0);
        acc.physical += Number(b.physical || 0);
        acc.practical += Number(b.practical || 0);
        acc.averageScore += Number(b.averageScore || 0);
        return acc;
      }, { cognitive: 0, creative: 0, communication: 0, socialEmotional: 0, physical: 0, practical: 0, averageScore: 0 });

      skills = {
        cognitive: Number((totals.cognitive / booksCompleted).toFixed(2)),
        creative: Number((totals.creative / booksCompleted).toFixed(2)),
        communication: Number((totals.communication / booksCompleted).toFixed(2)),
        socialEmotional: Number((totals.socialEmotional / booksCompleted).toFixed(2)),
        physical: Number((totals.physical / booksCompleted).toFixed(2)),
        practical: Number((totals.practical / booksCompleted).toFixed(2)),
        averageScore: Number((totals.averageScore / booksCompleted).toFixed(2))
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
          studentId: student.memberId,
          name:      student.fullName || student.email || 'Student',
          grade:     student.batchName || '',
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
            cognitive: skillScores.cognitive || 0, creative: skillScores.creative || 0,
            communication: skillScores.communication || 0, socialEmotional: skillScores.socialEmotional || 0,
            physical: skillScores.physical || 0, practical: skillScores.practical || 0,
            averageScore: skillScores.averageScore || 0
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
// Uses Wix Groups backend APIs to fetch this student's posts
// and comments across ALL groups they belong to.
// IMPORTANT: Wix Groups is the SOURCE OF TRUTH — we never
// duplicate full community data into CMS.
// ─────────────────────────────────────────────────────────────
export async function get_communityFeed(request) {
  const studentId = request.query.studentId;

  if (!studentId) {
    return badRequest({ headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId' }) });
  }

  try {
    // Import Wix Groups backend APIs
    const { posts } = await import('wix-blog-backend');
    // NOTE: Wix Groups posts live under wix-groups-backend
    const wixGroupsBackend = await import('wix-groups-backend');

    // ── 1. Get all groups this member belongs to ──────────────
    let memberGroups = [];
    try {
      const groupsResult = await wixGroupsBackend.listGroupMembers({
        memberId: studentId
      });
      memberGroups = groupsResult.groupMembers || [];
    } catch (e) {
      console.warn('listGroupMembers failed, trying queryGroupMembers:', e.message);
      // Fallback: query all groups and filter
      try {
        const allGroups = await wixGroupsBackend.queryGroups().find();
        // Try to get member's groups from each
        const checks = await Promise.allSettled(
          (allGroups.items || []).map(async (g) => {
            const members = await wixGroupsBackend.queryGroupMembers(g._id)
              .eq('memberId', studentId)
              .find();
            return members.items.length > 0 ? g : null;
          })
        );
        memberGroups = checks
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => ({ groupId: r.value._id, groupName: r.value.name }));
      } catch (e2) {
        console.warn('Fallback group fetch also failed:', e2.message);
      }
    }

    // ── 2. Fetch posts by this member across all groups ────────
    let allPosts = [];
    try {
      // wix-groups-backend: query posts filtered by memberId
      const postsResult = await wixGroupsBackend.queryPosts()
        .eq('createdBy', studentId)
        .descending('_createdDate')
        .limit(50)
        .find();
      allPosts = postsResult.items || [];
    } catch (e) {
      console.warn('queryPosts failed:', e.message);
    }

    // ── 3. Build group name lookup map ─────────────────────────
    const groupNameMap = {};
    (memberGroups || []).forEach(mg => {
      const id   = mg.groupId   || mg._id   || '';
      const name = mg.groupName || mg.name  || 'Community';
      if (id) groupNameMap[id] = name;
    });

    // ── 4. Format posts into clean feed items ─────────────────
    const feedItems = allPosts.map(post => ({
      id:        post._id,
      type:      post.postType || 'discussion',
      groupId:   post.groupId || '',
      groupName: groupNameMap[post.groupId] || 'Humans of Science',
      title:     post.title || '',
      excerpt:   post.plainContent
        ? post.plainContent.slice(0, 180) + (post.plainContent.length > 180 ? '…' : '')
        : '',
      imageUrl:    post.coverImage?.url || null,
      likes:       post.likeCount    ?? 0,
      comments:    post.commentCount ?? 0,
      views:       post.viewCount    ?? 0,
      url:         post.url          || '',
      postedAt:    post._createdDate || post.createdDate || null,
    }));

    // ── 5. Aggregate stats ─────────────────────────────────────
    const totalPosts        = feedItems.length;
    const totalLikesReceived = feedItems.reduce((s, p) => s + (p.likes || 0), 0);
    const totalReplies       = feedItems.reduce((s, p) => s + (p.comments || 0), 0);

    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({
        stats: {
          posts:         totalPosts,
          likesReceived: totalLikesReceived,
          replies:       totalReplies,
        },
        feed: feedItems,
      })
    });

  } catch (error) {
    console.error('communityFeed error:', error);
    // Return empty feed gracefully — never crash the dashboard
    return ok({
      headers: CORS_HEADERS,
      body: JSON.stringify({
        stats: { posts: 0, likesReceived: 0, replies: 0 },
        feed: [],
        _warning: error.message,
      })
    });
  }
}

export function options_communityFeed(request) {
  return ok({ headers: CORS_HEADERS, body: '' });
}
