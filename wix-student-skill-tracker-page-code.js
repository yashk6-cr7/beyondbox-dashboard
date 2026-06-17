// ════════════════════════════════════════════════════════════════════════════
// BEYOND BOX — Student Skill Tracker Wix Page Code
// Paste this into the Velo page code panel of your "skill-tracker" page.
// ════════════════════════════════════════════════════════════════════════════
//
// FEATURES IMPLEMENTED:
//   • Dynamic score loading on ready
//   • Real-time score saving to CMS
//   • Real-time remarks saving to CMS (UserRoles)
//   • DELETE_SCORES (Undo) handler that deletes the entry from BookScores CMS,
//     clears timeline events, and recalculates ConceptProgress.
//
// ════════════════════════════════════════════════════════════════════════════

import { currentMember } from 'wix-members';
import wixData from 'wix-data';
import {
  fetchStudentScores,
  saveBookScores,
  deleteBookScore,
  saveTutorComment
} from 'backend/tutorBridge';

$w.onReady(async function () {
  // Replace '#skillTrackerFrame' with the actual ID of your HTML iFrame component
  const frame = $w('#skillTrackerFrame');

  let member = null;
  let memberId = null;

  try {
    member = await currentMember.getMember();
    if (member) {
      memberId = member._id;
    }
  } catch (e) {
    console.warn('[SkillTracker Wix Page] Could not get current member:', e.message);
  }

  // Handle incoming messages from the React app iframe
  frame.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    console.log('[SkillTracker Wix Page] Received event:', msg.type, msg);

    // 1. Initial Handshake & Data Load
    if (msg.type === 'SKILL_TRACKER_READY') {
      if (!memberId) {
        // Not logged in → send empty init state
        frame.postMessage({
          type: 'WIX_INIT',
          canEdit: false,
          role: null,
          memberId: null,
          scores: [],
          remarks: ''
        });
        return;
      }

      try {
        // Query UserRoles to check role (home_learner can edit, tutor_student is view-only)
        const roleResult = await wixData.query('UserRoles')
          .eq('memberId', memberId)
          .limit(1)
          .find({ suppressAuth: true });

        const userRole = roleResult.items[0] || {};
        const canEdit = userRole.role === 'home_learner';
        const role = userRole.role || 'tutor_student';

        // Fetch scores + remarks from backend tutorBridge
        const data = await fetchStudentScores(memberId);

        frame.postMessage({
          type: 'WIX_INIT',
          canEdit,
          role,
          memberId,
          scores: (data.scores || []).map(s => ({
            bookId: s.bookKey,
            ratings: {
              cognitive:       s.cognitive,
              creative:        s.creative,
              communication:   s.communication,
              socialEmotional: s.socialEmotional,
              physical:        s.physical,
              practical:       s.practical
            }
          })),
          remarks: data.tutorComment || ''
        });
        console.log('[SkillTracker Wix Page] Sent WIX_INIT to iframe:', { canEdit, role, memberId });
      } catch (err) {
        console.error('[SkillTracker Wix Page] Error loading student data:', err);
      }
    }

    // 2. Real-time Score Saving (home_learner only)
    else if (msg.type === 'SAVE_SCORES') {
      if (!memberId) return;
      try {
        const payload = {
          studentId: memberId,
          bookKey:   msg.bookId,
          bookName:  msg.bookName,
          ...msg.ratings
        };
        await saveBookScores(payload);
        console.log('[SkillTracker Wix Page] Saved score for book:', msg.bookId);
      } catch (err) {
        console.error('[SkillTracker Wix Page] Error saving scores:', err);
      }
    }

    // 3. Real-time Remarks Saving (home_learner only)
    else if (msg.type === 'SAVE_REMARKS') {
      if (!memberId) return;
      try {
        await saveTutorComment(memberId, msg.remarks);
        console.log('[SkillTracker Wix Page] Saved remarks');
      } catch (err) {
        console.error('[SkillTracker Wix Page] Error saving remarks:', err);
      }
    }

    // 4. Score Deletion / Undo (home_learner only)
    else if (msg.type === 'DELETE_SCORES') {
      if (!memberId) return;
      try {
        await deleteBookScore(memberId, msg.bookId);
        console.log('[SkillTracker Wix Page] Deleted score (Undo) for book:', msg.bookId);
      } catch (err) {
        console.error('[SkillTracker Wix Page] Error deleting score:', err);
      }
    }
  });
});
