import wixData from 'wix-data';

// ── CORS Headers for HTTP Functions ──────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ============================================================================
// 1. UPDATE STUDENT NAME
// Saves the new name to UserRoles.fullName so it persists across all devices
// ============================================================================
export async function post_updateStudentName(request) {
  try {
    const body = await request.body.json();
    const { studentId, name } = body;

    if (!studentId || !name) {
      return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId or name' }) };
    }

    const roleResults = await wixData.query('UserRoles')
      .eq('memberId', studentId)
      .find({ suppressAuth: true });

    if (roleResults.items.length > 0) {
      const record = roleResults.items[0];
      record.fullName = name;
      await wixData.update('UserRoles', record, { suppressAuth: true });
      return { status: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
    } else {
      return { status: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Student not found in UserRoles' }) };
    }
  } catch (err) {
    return { status: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: err.message }) };
  }
}

export function options_updateStudentName(request) {
  return { status: 200, headers: CORS_HEADERS, body: '' };
}


// ============================================================================
// 2. SAVE STUDENT PHOTO
// Stores the base64 image string directly in the StudentPhotos CMS collection.
// This approach is reliable in Wix Velo — NO Buffer, NO mediaManager needed.
// The base64 string is stored in the `photo` field and returned as-is.
// ============================================================================
export async function post_saveStudentPhoto(request) {
  try {
    const body = await request.body.json();
    const { studentId, base64 } = body;

    if (!studentId || !base64) {
      return {
        status: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing studentId or base64 data' })
      };
    }

    // Check if a record already exists for this student
    const existing = await wixData.query('StudentPhotos')
      .eq('studentId', studentId)
      .limit(1)
      .find({ suppressAuth: true });

    if (existing.items.length > 0) {
      // UPDATE existing record
      const record = existing.items[0];
      record.photo = base64;           // store base64 string directly
      record.updatedAt = new Date();
      await wixData.update('StudentPhotos', record, { suppressAuth: true });
    } else {
      // INSERT new record
      await wixData.insert('StudentPhotos', {
        title:     studentId,
        studentId: studentId,
        photo:     base64,             // store base64 string directly
        updatedAt: new Date()
      }, { suppressAuth: true });
    }

    return {
      status: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, photoUrl: base64 })
    };

  } catch (err) {
    console.error('saveStudentPhoto error:', err);
    return {
      status: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
}

export function options_saveStudentPhoto(request) {
  return { status: 200, headers: CORS_HEADERS, body: '' };
}
