// Handles the availability form submission logic, separated from firebase.js

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // In browser, wait for DOMContentLoaded. In test (Node.js), attach immediately.
  const attachListener = function() {
    const form = document.getElementById('availability-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Read the new structure from the hidden input
        const dateTimesInput = document.querySelector('input[name="date-times-json"]');
        let selectedDateTimes = [];
        if (dateTimesInput && dateTimesInput.value) {
          try {
            selectedDateTimes = JSON.parse(dateTimesInput.value);
          } catch (e) {
            document.getElementById('result').textContent = 'Error: Invalid date/time data.';
            return;
          }
        }
        const user = firebase.auth().currentUser;
        if (!user) {
          document.getElementById('result').textContent = 'You must be logged in to submit availability.';
          return;
        }
        if (selectedDateTimes.length === 0) {
          document.getElementById('result').textContent = 'Please select at least one date and time slot.';
          return;
        }
        // Check that every date has at least one time slot
        for (const entry of selectedDateTimes) {
          if (!entry.times || !Array.isArray(entry.times) || entry.times.length === 0) {
            document.getElementById('result').textContent = `Please add at least one time slot for ${entry.date}.`;
            return;
          }
        }
        // saveAvailability is attached to window by firebase.js
        window.saveAvailability(selectedDateTimes, user.email, user.uid).then(() => {
          document.getElementById('result').textContent = 'Availability saved!';
        }).catch(err => {
          document.getElementById('result').textContent = 'Error: ' + err.message;
        });
      });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachListener);
  } else {
    attachListener();
  }
}

const db = firebase.firestore();
const auth = firebase.auth();

// datesWithTimes: [{date: 'YYYY-MM-DD', times: ['HH:mm-HH:mm', ...]}, ...]
function saveAvailability(datesWithTimes, userEmail, userUid) {
  const docRef = db.collection('availability').doc(userUid);
  return docRef.get().then(docSnap => {
    if (docSnap.exists) {
      // Merge new dates/times, avoiding duplicates
      const prev = docSnap.data().datesWithTimes || [];
      // Merge logic: for each date, merge time slots
      const merged = [...prev];
      datesWithTimes.forEach(newEntry => {
        const idx = merged.findIndex(e => e.date === newEntry.date);
        if (idx !== -1) {
          // Merge time slots, avoiding duplicates
          const prevTimes = new Set(merged[idx].times);
          newEntry.times.forEach(t => prevTimes.add(t));
          merged[idx].times = Array.from(prevTimes);
        } else {
          merged.push({ date: newEntry.date, times: [...newEntry.times] });
        }
      });
      return docRef.update({
        datesWithTimes: merged,
        email: userEmail,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create the document if it doesn't exist
      return docRef.set({
        datesWithTimes: datesWithTimes,
        email: userEmail,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).catch(err => {
    throw err;
  });
}

// Delete a single date from user's availability and related matchRequests
function deleteAvailabilityDate(dateStr) {
  const user = firebase.auth().currentUser;
  if (!user) {
    document.getElementById('result').textContent = 'You must be logged in to delete availability.';
    return;
  }
  const db = firebase.firestore();
  const docRef = db.collection('availability').doc(user.uid);

  // Remove date from availability
  docRef.get().then(docSnap => {
    if (!docSnap.exists) return;
    const prev = docSnap.data().datesWithTimes || [];
    const filtered = prev.filter(entry => entry.date !== dateStr);
    return docRef.update({ datesWithTimes: filtered });
  }).then(() => {
    // Delete related matchRequests (from or to this user, on this date)
    const matchReqs = db.collection('matchRequests');
    return Promise.all([
      matchReqs.where('fromUserId', '==', user.uid).where('date', '==', dateStr).get(),
      matchReqs.where('toUserId', '==', user.uid).where('date', '==', dateStr).get()
    ]);
  }).then(([fromSnap, toSnap]) => {
    const batch = db.batch();
    fromSnap.forEach(doc => batch.delete(doc.ref));
    toSnap.forEach(doc => batch.delete(doc.ref));
    return batch.commit();
  }).then(() => {
    document.getElementById('result').textContent = 'Date removed!';
  }).catch(err => {
    document.getElementById('result').textContent = 'Error: ' + err.message;
  });
}

// Export for browser
window.deleteAvailabilityDate = deleteAvailabilityDate;

// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { saveAvailability };
} else {
  window.saveAvailability = saveAvailability;
}