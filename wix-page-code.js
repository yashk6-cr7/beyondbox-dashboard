// ════════════════════════════════════════════════════════════════════════════
// BEYOND BOX — Wix Page Velo Code
// ════════════════════════════════════════════════════════════════════════════
//
// HOW TO USE:
//   1. In your Wix Editor, open the page that contains the student dashboard.
//   2. Click the "Dev Mode" toggle (top bar) → "Turn on Dev Mode".
//   3. Click the {} icon (Page Code) at the bottom left.
//   4. Paste THIS ENTIRE FILE into the page code panel.
//   5. Make sure your iFrame element is named "dashboardFrame" in the Wix
//      Properties panel (select the iFrame → Properties → Element ID).
//   6. Publish and test.
//
// ════════════════════════════════════════════════════════════════════════════

import { currentMember } from 'wix-members';

$w.onReady(async function () {

  // ── 1. Get the iFrame element ─────────────────────────────────────────────
  const frame = $w('#dashboardFrame');

  // ── 2. Get the logged-in member ───────────────────────────────────────────
  let member = null;
  try {
    member = await currentMember.getMember();
  } catch (e) {
    console.warn('[BeyondBox] Could not get member:', e.message);
  }

  // ── 3. Listen for the iFrame "ready" signal, then send the memberId ───────
  frame.onMessage((event) => {
    const msg = event.data;

    // React app sends { type: 'BEYONDBOX_READY' } when it has mounted
    if (msg && msg.type === 'BEYONDBOX_READY') {
      if (member) {
        frame.postMessage({
          type:     'BEYONDBOX_MEMBER',
          memberId: member._id,
        });
        console.log('[BeyondBox Wix] Sent memberId to iFrame:', member._id);
      } else {
        // Not logged in — send null so the React app shows login prompt
        frame.postMessage({
          type:     'BEYONDBOX_MEMBER',
          memberId: null,
        });
      }
    }
  });

  // ── 4. Also send memberId immediately (in case the iFrame loaded first) ───
  //    The React hook handles duplicate messages gracefully.
  if (member) {
    setTimeout(() => {
      try {
        frame.postMessage({
          type:     'BEYONDBOX_MEMBER',
          memberId: member._id,
        });
      } catch (_) {}
    }, 800);
  }
});
