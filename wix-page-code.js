// ════════════════════════════════════════════════════════════════════════════
// BEYOND BOX — Student Dashboard Wix Page Code
// Paste this into the Velo page code panel for your "student-dashboard" page.
// ════════════════════════════════════════════════════════════════════════════
//
// HOW IT WORKS:
//   • Normally: Logged-in student sees their OWN dashboard.
//   • Tutor preview: Tutor opens ?studentId=DHARA_MEMBERID → Dhara's dashboard
//     is loaded inside the iFrame. No backend role check needed — the tutor
//     is simply given a URL with the student's ID embedded.
//
// ════════════════════════════════════════════════════════════════════════════

import { currentMember } from 'wix-members';
import wixLocation from 'wix-location';

$w.onReady(async function () {

  const frame = $w('#dashboardFrame');

  // ── Determine which student ID to send to the iFrame ──────────────────────
  //
  //   Priority 1: ?studentId= in the URL  (tutor previewing a student)
  //   Priority 2: logged-in member's own ID (normal student view)
  //   Priority 3: null (not logged in — iFrame shows login prompt)

  let targetStudentId = null;

  // Check URL query param first (fastest — no async needed)
  const queryStudentId = wixLocation.query.studentId;
  if (queryStudentId) {
    targetStudentId = queryStudentId;
    console.log('[BeyondBox Wix] Tutor preview mode — loading student:', targetStudentId);
  } else {
    // No override → load the logged-in member's own dashboard
    try {
      const member = await currentMember.getMember();
      if (member && member._id) {
        targetStudentId = member._id;
        console.log('[BeyondBox Wix] Student mode — loading own dashboard:', targetStudentId);
      }
    } catch (e) {
      console.warn('[BeyondBox Wix] Could not get current member:', e.message);
    }
  }

  // ── Listen for BEYONDBOX_READY signal from the React iFrame ───────────────
  //   The React app sends this when it has mounted and is ready to receive data.
  frame.onMessage((event) => {
    const msg = event.data;
    if (msg && msg.type === 'BEYONDBOX_READY') {
      frame.postMessage({ studentId: targetStudentId });
      console.log('[BeyondBox Wix] Sent studentId on READY signal:', targetStudentId);
    }
  });

  // ── Also fire immediately after 800ms ─────────────────────────────────────
  //   Handles the case where the iFrame loaded before the parent attached
  //   the message listener (race condition on slow connections).
  setTimeout(() => {
    try {
      frame.postMessage({ studentId: targetStudentId });
      console.log('[BeyondBox Wix] Sent studentId on timeout fallback:', targetStudentId);
    } catch (_) {}
  }, 800);
});
