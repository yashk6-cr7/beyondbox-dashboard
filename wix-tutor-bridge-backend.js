import wixData from 'wix-data';

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

function getMasteryLevel(percent) {
  if (percent >= 75) return 'Strong';
  if (percent >= 50) return 'Developing';
  return 'Needs Support';
}

async function updateConceptProgress(studentId) {
  try {
    const bookResult = await wixData.query('BookScores')
      .eq('studentId', studentId)
      .limit(1000)
      .find({ suppressAuth: true });

    const books = bookResult.items || [];
    const totalBooksCompleted = books.length;

    if (totalBooksCompleted === 0) {
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
        title: `${subject} - ${conceptName}`,
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
      } else {
        await wixData.insert('ConceptProgress', entryData, { suppressAuth: true });
      }
    }));

    return { success: true };
  } catch (err) {
    console.error('[ConceptProgress] updateConceptProgress error:', err.message);
    throw new Error(`ConceptProgress Aggregation Error: ${err.message}`);
  }
}

async function createStudentActivity({
  studentId,
  studentName,
  source,
  activityType,
  activityKey,
  title,
  description,
  metadata
}) {
  try {
    const entry = {
      title:        title        || activityType,
      studentId,
      studentName:  studentName  || '',
      source:       source       || 'unknown',
      activityType: activityType || 'unknown',
      activityKey:  activityKey  || '',
      description:  description  || '',
      metadata:     metadata ? JSON.stringify(metadata) : '',
      createdAt:    new Date()
    };
    await wixData.insert('StudentActivities', entry, { suppressAuth: true });
  } catch (err) {
    console.error('[StudentActivities] createStudentActivity error:', err.message);
  }
}

// ── 1. Fetch Students in Batch
export async function fetchStudents(tutorId, batchName) {
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
        memberId,
        fullName: student.fullName || student.email || '',
        email: student.email,
        batchName: student.batchName,
        tutorComment: student.tutorComment || '',
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

  return { students: studentsWithScores };
}

// ── 2. Fetch Student Scores + Remarks + Name
export async function fetchStudentScores(studentId) {
  const [scoresResult, roleResult] = await Promise.all([
    wixData.query('BookScores')
      .eq('studentId', studentId)
      .find({ suppressAuth: true }),
    wixData.query('UserRoles')
      .eq('memberId', studentId)
      .limit(1)
      .find({ suppressAuth: true })
  ]);

  const userRole = roleResult.items[0] || null;

  return {
    scores:       scoresResult.items || [],
    tutorComment: userRole?.tutorComment || '',
    studentName:  userRole?.fullName || userRole?.email || ''
  };
}

// ── 3. Save Book Scores (with concepts + activity logging)
export async function saveBookScores(payload) {
  const { studentId, bookKey, bookName, cognitive, creative, communication, socialEmotional, physical, practical, averageScore } = payload;

  const scoreData = {
    studentId,
    tutorId:         payload.tutorId || '',
    batchName:       payload.batchName || '',
    bookKey,
    bookName:        bookName || bookKey,
    cognitive:       Number(cognitive || 0),
    creative:        Number(creative || 0),
    communication:   Number(communication || 0),
    socialEmotional: Number(socialEmotional || 0),
    physical:        Number(physical || 0),
    practical:       Number(practical || 0),
    averageScore:    Number(averageScore || 0),
    updatedAt:       new Date()
  };

  const existing = await wixData.query('BookScores')
    .eq('studentId', studentId)
    .eq('bookKey',   bookKey)
    .limit(1)
    .find({ suppressAuth: true });

  let action = 'inserted';
  if (existing.items.length > 0) {
    await wixData.update('BookScores', { ...existing.items[0], ...scoreData, _id: existing.items[0]._id }, { suppressAuth: true });
    action = 'updated';
  } else {
    await wixData.insert('BookScores', scoreData, { suppressAuth: true });
  }

  // Recalculate concept progress
  await updateConceptProgress(studentId);

  // Log activity on new completion
  if (action === 'inserted') {
    const roleResult = await wixData.query('UserRoles').eq('memberId', studentId).limit(1).find({ suppressAuth: true });
    const userRole = roleResult.items[0] || {};
    await createStudentActivity({
      studentId,
      studentName:  userRole.fullName || userRole.email || '',
      source:       'books',
      activityType: 'book_completed',
      activityKey:  bookKey,
      title:        `Completed ${bookName || bookKey}`,
      description:  `Average score: ${averageScore}`,
      metadata:     { bookId: bookKey, bookName, averageScore }
    });
  }

  return { success: true };
}

// ── 4. Save Tutor Comment (Remarks)
export async function saveTutorComment(studentId, comment) {
  const roleResults = await wixData.query('UserRoles')
    .eq('memberId', studentId)
    .find({ suppressAuth: true });

  if (roleResults.items.length === 0) {
    throw new Error('Student not found in UserRoles');
  }

  const record = roleResults.items[0];
  record.tutorComment = comment || '';
  await wixData.update('UserRoles', record, { suppressAuth: true });

  return { success: true };
}

// ── 5. Delete Book Score (Undo action)
export async function deleteBookScore(studentId, bookKey) {
  const result = await wixData.query('BookScores')
    .eq('studentId', studentId)
    .eq('bookKey',   bookKey)
    .find({ suppressAuth: true });

  if (result.items.length > 0) {
    await wixData.remove('BookScores', result.items[0]._id, { suppressAuth: true });
  }

  // Recalculate ConceptProgress
  await updateConceptProgress(studentId);

  // Clean up any matching completion activity from the timeline
  const activityResult = await wixData.query('StudentActivities')
    .eq('studentId',    studentId)
    .eq('activityType', 'book_completed')
    .eq('activityKey',  bookKey)
    .find({ suppressAuth: true });

  for (const act of activityResult.items) {
    await wixData.remove('StudentActivities', act._id, { suppressAuth: true });
  }

  return { success: true };
}
