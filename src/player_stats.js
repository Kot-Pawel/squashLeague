document.addEventListener('DOMContentLoaded', function() {
  const showBtn = document.getElementById('show-player-stats-btn');
  const backBtn = document.getElementById('back-to-main-btn');
  const statsSection = document.getElementById('player-stats-section');
  const statsList = document.getElementById('player-stats-list');
  const mainSections = [
    document.getElementById('availability-section'),
    document.getElementById('find-partner-section'),
    document.getElementById('match-requests-section')
  ];

  // Show stats section, hide main sections
  showBtn.addEventListener('click', async function() {
    mainSections.forEach(sec => sec.style.display = 'none');
    statsSection.style.display = '';
    statsList.textContent = 'Loading...';
    const db = firebase.firestore();
    try {
      // Fetch all users
      const usersSnap = await db.collection('users').get();
      // Fetch all accepted matchRequests
      const matchSnap = await db.collection('matchRequests').where('status', '==', 'accepted').get();
      const gameCount = {};
      matchSnap.forEach(doc => {
        const data = doc.data();
        [data.fromUserId, data.toUserId].forEach(uid => {
          gameCount[uid] = (gameCount[uid] || 0) + 1;
        });
      });
      let html = '<ul>';
      usersSnap.forEach(doc => {
        const screenName = doc.data().screenName || doc.data().email;
        const games = gameCount[doc.id] || 0;
        html += `<li><b>${screenName}</b>: ${games} games played</li>`;
      });
      html += '</ul>';
      statsList.innerHTML = html;
    } catch (err) {
      statsList.textContent = 'Error loading stats: ' + err.message;
    }
  });

  // Back to main sections
  backBtn.addEventListener('click', function() {
    statsSection.style.display = 'none';
    mainSections.forEach(sec => sec.style.display = '');
  });
});