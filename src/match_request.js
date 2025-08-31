// Handles sending match requests to other users

document.addEventListener('DOMContentLoaded', function() {
  // Delegate click events for dynamically created buttons
  document.body.addEventListener('click', async function(e) {
    // Support clicks on the icon inside the button
    let btn = e.target;
    if (btn.classList.contains('send-match-btn')) {
      // ok
    } else if (btn.closest('.send-match-btn')) {
      btn = btn.closest('.send-match-btn');
    } else {
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

    const toUserId = btn.dataset.userid;
    const date = btn.dataset.date;
    const timeSlot = btn.dataset.slot;
    const auth = firebase.auth();
    const db = firebase.firestore();
    const fromUserId = auth.currentUser ? auth.currentUser.uid : null;

    if (!fromUserId) {
      btn.innerHTML = '<i class="bi bi-exclamation-circle"></i> Login required';
      return;
    }

    try {
      // Optional: Check for existing request to prevent duplicates
      const existing = await db.collection('matchRequests')
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .where('date', '==', date)
        .where('timeSlot', '==', timeSlot)
        .get();

      if (!existing.empty) {
        btn.innerHTML = '<i class="bi bi-check2"></i> Already Requested';
        return;
      }

      await db.collection('matchRequests').add({
        fromUserId, toUserId, date, timeSlot,
        status: 'pending',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      btn.innerHTML = '<i class="bi bi-check2"></i> Request Sent';
    } catch (err) {
      btn.innerHTML = '<i class="bi bi-x-circle"></i> Error';
      btn.disabled = false;
      alert('Failed to send request: ' + err.message);
    }
  });
});