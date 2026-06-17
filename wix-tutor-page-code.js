import wixUsers from 'wix-users';
import wixLocation from 'wix-location';
import wixStorage from 'wix-storage';
import { getUserRole } from 'backend/auth';
import {
  fetchStudents,
  fetchStudentScores,
  saveBookScores,
  saveTutorComment,
  deleteBookScore
} from 'backend/tutorBridge';

$w.onReady(function () {
  const tutorFrame = $w('#tutorFrame');

  // Helper to send response back to the React app iframe
  const sendResponse = (msg, data, error = null) => {
    try {
      tutorFrame.postMessage({
        requestId: msg.requestId,
        data,
        error
      });
    } catch (e) {
      console.error('Failed to postMessage back to tutorFrame:', e);
    }
  };

  // 1. REGISTER LISTENER IMMEDIATELY (SYNCHRONOUSLY) TO PREVENT RACE CONDITIONS
  tutorFrame.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    console.log('[Tutor Velo Page] Received message:', msg.type, msg);

    // Double check authentication before executing any database action
    if (!wixUsers.currentUser.loggedIn) {
      sendResponse(msg, null, 'Not authenticated');
      return;
    }

    try {
      if (msg.type === 'REACT_READY') {
        const batchName = wixStorage.session.getItem('selectedBatch');
        const tutorId   = wixStorage.session.getItem('selectedTutorId');
        
        tutorFrame.postMessage({
          type: 'WIX_SESSION',
          tutorId: tutorId || '',
          batchName: batchName || ''
        });
        console.log('[Tutor Velo Page] Sent WIX_SESSION to iframe:', { tutorId, batchName });
      } 
      
      else if (msg.type === 'FETCH_STUDENTS') {
        const data = await fetchStudents(msg.tutorId, msg.batchName);
        sendResponse(msg, data);
      } 
      
      else if (msg.type === 'FETCH_STUDENT_SCORES') {
        const data = await fetchStudentScores(msg.studentId);
        sendResponse(msg, data);
      } 
      
      else if (msg.type === 'SAVE_BOOK_SCORES') {
        const data = await saveBookScores(msg.payload);
        sendResponse(msg, data);
      } 
      
      else if (msg.type === 'SAVE_TUTOR_COMMENT') {
        const data = await saveTutorComment(msg.studentId, msg.comment);
        sendResponse(msg, data);
      } 
      
      else if (msg.type === 'DELETE_BOOK_SCORE') {
        const data = await deleteBookScore(msg.studentId, msg.bookKey);
        sendResponse(msg, data);
      }
    } catch (err) {
      console.error(`Error processing message ${msg.type}:`, err);
      sendResponse(msg, null, err.message);
    }
  });

  // 2. Perform authentication and authorization checks in background
  checkTutorAuthorization();
});

async function checkTutorAuthorization() {
  if (!wixUsers.currentUser.loggedIn) {
    wixLocation.to('/login');
    return;
  }

  const memberId = wixUsers.currentUser.id;
  const userRecord = await getUserRole(memberId);

  if (!userRecord || userRecord.role !== 'tutor') {
    wixLocation.to('/tutor-dashboard');
    return;
  }

  const batchName = wixStorage.session.getItem('selectedBatch');
  const tutorId   = wixStorage.session.getItem('selectedTutorId');

  if (!batchName || !tutorId) {
    wixLocation.to('/tutor-dashboard');
  }
}
