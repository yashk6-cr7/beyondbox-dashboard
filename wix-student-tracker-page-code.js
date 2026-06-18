// ════════════════════════════════════════════════════════════════════════════
// BEYOND BOX — Student Skill Tracker Velo Page Code
// Paste this into the Velo page code panel for your "skill-tracker" page.
// ════════════════════════════════════════════════════════════════════════════

import wixUsers from 'wix-users';
import { fetch } from 'wix-fetch';

const BASE_URL = 'https://www.thebeyondbox.org/_functions';

$w.onReady(async function () {

  const user = wixUsers.currentUser;

  if (!user.loggedIn) {
    console.warn('Skill Tracker: user is not logged in.');
    return;
  }

  const memberId = user.id;

  // Fetch role + existing scores + remarks from backend
  let initData = null;
  try {
    const res = await fetch(`${BASE_URL}/skillTrackerInit?memberId=${memberId}`, {
      method: 'GET'
    });
    if (!res.ok) {
      console.error('skillTrackerInit failed:', res.status);
      return;
    }
    initData = await res.json();
  } catch (err) {
    console.error('Error calling skillTrackerInit:', err);
    return;
  }

  const { role, canEdit, tutorId, batchName, remarks, scores } = initData;

  // Build the payload to send to the React iframe
  const initPayload = {
    type:      'WIX_INIT',
    canEdit,            // true = home_learner, false = tutor_student
    role,
    memberId,
    tutorId:   tutorId   || null,
    batchName: batchName || '',
    remarks:   remarks   || '',
    scores:    scores    || []
  };

  // Send to iframe immediately (React may already be loaded)
  try { $w('#html1').postMessage(initPayload); } catch (e) {}

  // Listen for messages from the React iframe
  $w('#html1').onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    // React signals it is ready → re-send WIX_INIT (handles race condition)
    if (msg.type === 'SKILL_TRACKER_READY') {
      $w('#html1').postMessage(initPayload);
      return;
    }

    // React wants to save book scores
    if (msg.type === 'SAVE_SCORES') {
      if (!canEdit) return;
      const { bookId, bookName, ratings } = msg;
      try {
        const res = await fetch(`${BASE_URL}/saveBookScore`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId, bookId, bookName,
            cognitive:       ratings.cognitive       || 0,
            creative:        ratings.creative        || 0,
            communication:   ratings.communication   || 0,
            socialEmotional: ratings.socialEmotional || 0,
            physical:        ratings.physical        || 0,
            practical:       ratings.practical       || 0
          })
        });
        const result = await res.json();
        console.log('Book score saved:', result);
        $w('#html1').postMessage({ type: 'SAVE_SUCCESS', bookId });
      } catch (err) {
        console.error('saveBookScore error:', err);
        $w('#html1').postMessage({ type: 'SAVE_ERROR', bookId, error: String(err) });
      }
    }

    // React wants to delete book scores (undo)
    if (msg.type === 'DELETE_SCORES') {
      if (!canEdit) return;
      const { bookId } = msg;
      try {
        const res = await fetch(`${BASE_URL}/deleteBookScore`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, bookId })
        });
        const result = await res.json();
        console.log('Book score deleted:', result);
        $w('#html1').postMessage({ type: 'DELETE_SUCCESS', bookId });
      } catch (err) {
        console.error('deleteBookScore error:', err);
        $w('#html1').postMessage({ type: 'DELETE_ERROR', bookId, error: String(err) });
      }
    }

    // React wants to save remarks
    if (msg.type === 'SAVE_REMARKS') {
      if (!canEdit) return;
      const { remarks: newRemarks } = msg;
      try {
        const res = await fetch(`${BASE_URL}/saveHomeLearnerRemarks`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, remarks: newRemarks })
        });
        const result = await res.json();
        console.log('Remarks saved:', result);
      } catch (err) {
        console.error('saveHomeLearnerRemarks error:', err);
      }
    }
  });
});
