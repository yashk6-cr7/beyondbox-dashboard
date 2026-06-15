async function testLog() {
  const url = 'https://www.thebeyondbox.org/_functions/logStudentActivity';
  const payload = {
    studentId: '75f7ca18-4b80-426b-aaa3-cc3307d48365',
    studentName: 'Dhara',
    source: 'achievement',
    activityType: 'badge_unlocked',
    activityKey: 'test_badge_' + Date.now(),
    title: '🏆 Test Badge Unlocked',
    description: 'This is a test badge to verify API permissions.',
    metadata: { badgeId: 'test_badge', category: 'Testing' }
  };

  console.log('Posting to:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLog();
