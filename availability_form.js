// Handles the availability form submission logic, separated from firebase.js

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // In browser, wait for DOMContentLoaded. In test (Node.js), attach immediately.
  const attachListener = function() {
    const form = document.getElementById('availability-form');
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const dateInput = document.getElementById('available-dates');
        // flatpickr stores selected dates as a comma-separated string in the input value
        const selectedDates = dateInput.value
          ? dateInput.value.split(',').map(date => date.trim()).filter(date => date)
          : [];
        const user = firebase.auth().currentUser;
        if (!user) {
          document.getElementById('result').textContent = 'You must be logged in to submit availability.';
          return;
        }
        if (selectedDates.length === 0) {
          document.getElementById('result').textContent = 'Please select at least one date.';
          return;
        }
        // saveAvailability is attached to window by firebase.js
        window.saveAvailability(selectedDates, user.email, user.uid).then(() => {
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

function saveAvailability(dates, userEmail, userUid) {
  const docRef = db.collection('availability').doc(userUid);
  return docRef.get().then(docSnap => {
    if (docSnap.exists) {
      // Append new dates to the array, avoiding duplicates
      return docRef.update({
        dates: firebase.firestore.FieldValue.arrayUnion(...dates),
        email: userEmail,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // Create the document if it doesn't exist
      return docRef.set({
        dates: dates,
        email: userEmail,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).catch(err => {
    throw err;
  });
}
// Export for Node.js (tests) and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { saveAvailability };
} else {
  window.saveAvailability = saveAvailability;
}