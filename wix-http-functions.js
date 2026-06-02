import wixData from 'wix-data';
import { mediaManager } from 'wix-media-backend';

// ── CORS Headers for HTTP Functions ──────────────────────────────────────────
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// ============================================================================
// 1. UPDATE STUDENT NAME
// ============================================================================
export async function post_updateStudentName(request) {
  try {
    const body = await request.body.json();
    const { studentId, name } = body;

    if (!studentId || !name) {
      return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId or name' }) };
    }

    // Find the student in UserRoles
    const roleResults = await wixData.query('UserRoles')
      .eq('memberId', studentId)
      .find({ suppressAuth: true });

    if (roleResults.items.length > 0) {
      const record = roleResults.items[0];
      record.fullName = name;
      // Update the name in UserRoles
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
// ============================================================================
export async function post_saveStudentPhoto(request) {
  try {
    const body = await request.body.json();
    const { studentId, base64, mimeType } = body;

    if (!studentId || !base64) {
      return { status: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing studentId or base64 data' }) };
    }

    // Strip the data:image/...;base64, prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    // 1. Upload to Wix Media Manager
    const uploadResult = await mediaManager.upload(
      '/student-photos',
      buffer,
      `student_${studentId}.jpg`,
      {
        mediaOptions: {
          mimeType: mimeType || 'image/jpeg',
          mediaType: 'image'
        },
        metadataOptions: {
          isPrivate: false,
          isVisitorUpload: true
        }
      }
    );

    const wixImageUrl = uploadResult.fileUrl;

    // 2. Save or update in StudentPhotos collection
    const queryResult = await wixData.query('StudentPhotos')
      .eq('studentId', studentId)
      .limit(1)
      .find({ suppressAuth: true });

    if (queryResult.items.length > 0) {
      // Update existing
      const record = queryResult.items[0];
      record.photoUrl = wixImageUrl;
      await wixData.update('StudentPhotos', record, { suppressAuth: true });
    } else {
      // Create new
      await wixData.insert('StudentPhotos', {
        studentId: studentId,
        photoUrl: wixImageUrl
      }, { suppressAuth: true });
    }

    return { 
      status: 200, 
      headers: CORS_HEADERS, 
      body: JSON.stringify({ success: true, url: wixImageUrl }) 
    };

  } catch (error) {
    return { status: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
}

export function options_saveStudentPhoto(request) {
  return { status: 200, headers: CORS_HEADERS, body: '' };
}
