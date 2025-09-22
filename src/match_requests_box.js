/**
 * @jest-environment jsdom
 */

document.addEventListener('DOMContentLoaded', function() {
  const listDiv = document.getElementById('match-requests-list');
  if (!listDiv) return;

  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) {
      listDiv.innerHTML = 'Please log in to see your match requests.';
      return;
    }
    const db = firebase.firestore();
    const uid = user.uid;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    try {
      const snapshot = await db.collection('matchRequests')
        .where('fromUserId', 'in', [uid])
        .where('date', '>=', todayStr)
        .get();
      const snapshot2 = await db.collection('matchRequests')
        .where('toUserId', '==', uid)
        .where('date', '>=', todayStr)
        .get();

      // Merge and deduplicate
      const requests = {};
      snapshot.forEach(doc => requests[doc.id] = {id: doc.id, ...doc.data()});
      snapshot2.forEach(doc => requests[doc.id] = {id: doc.id, ...doc.data()});
      let allRequests = Object.values(requests);

      // Filter to only future dates
      const today = new Date();
      allRequests = allRequests.filter(req => {
        // req.date is assumed to be "YYYY-MM-DD"
        const reqDate = new Date(req.date);
        // Only show requests for today or later
        return reqDate >= today;
      });

      if (allRequests.length === 0) {
        listDiv.innerHTML = 'No match requests yet.';
        return;
      }

      // Sort by date ascending (soonest first)
      allRequests.sort((a, b) => {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
      });

      // Collect unique user IDs to fetch screenNames
      const userIds = new Set();
      allRequests.forEach(req => {
        if (req.fromUserId !== uid) userIds.add(req.fromUserId);
        if (req.toUserId !== uid) userIds.add(req.toUserId);
      });

      // Fetch screenNames in parallel
      const userIdToScreenName = {};
      await Promise.all(Array.from(userIds).map(async userId => {
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          userIdToScreenName[userId] = userDoc.exists && userDoc.data().screenName
            ? userDoc.data().screenName
            : userId;
        } catch {
          userIdToScreenName[userId] = userId;
        }
      }));

      // Group by status
      const grouped = {pending: [], accepted: [], rejected: []};
      allRequests.forEach(req => {
        grouped[req.status || 'pending'].push(req);
      });

      let html = '';
      for (const status of ['pending', 'accepted', 'rejected']) {
        if (grouped[status].length) {
          html += `<b class="text-capitalize">${status}:</b><ul>`;
          grouped[status].forEach(req => {
            const otherUserId = req.fromUserId === uid ? req.toUserId : req.fromUserId;
            const otherUserName = userIdToScreenName[otherUserId] || otherUserId;
            html += `<li>
              With: <b>${otherUserName}</b> 
              on <b>${req.date}</b> at <b>${req.timeSlot}</b>
              ${status === 'pending' && req.toUserId === uid ? 
                `<button class="btn btn-sm btn-success accept-match-btn" data-id="${req.id}">Accept</button>
                 <button class="btn btn-sm btn-danger reject-match-btn" data-id="${req.id}">Reject</button>` : ''}
            </li>`;
          });
          html += '</ul>';
        }
      }
      listDiv.innerHTML = html;
    } catch (err) {
      listDiv.innerHTML = 'Error loading match requests: ' + err.message;
    }

    

      // Add event listeners for accept/reject buttons
      listDiv.querySelectorAll('.accept-match-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          btn.disabled = true;
          btn.textContent = 'Accepting...';
          try {
            await db.collection('matchRequests').doc(btn.dataset.id).update({
              status: 'accepted'
            });
            btn.textContent = 'Accepted';
            // Optionally, refresh the list:
            setTimeout(() => window.location.reload(), 500);
          } catch (err) {
            btn.textContent = 'Error';
            btn.disabled = false;
            alert('Failed to accept: ' + err.message);
          }
        });
      });

      listDiv.querySelectorAll('.reject-match-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          btn.disabled = true;
          btn.textContent = 'Rejecting...';
          try {
            await db.collection('matchRequests').doc(btn.dataset.id).update({
              status: 'rejected'
            });
            btn.textContent = 'Rejected';
            setTimeout(() => window.location.reload(), 500);
          } catch (err) {
            btn.textContent = 'Error';
            btn.disabled = false;
            alert('Failed to reject: ' + err.message);
          }
        });
      });

  });
});