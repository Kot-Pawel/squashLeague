// Handles flatpickr initialization and fetching user's future availability from Firestore

// Pure functions for date calculations and filtering
function getMinDate() {
  let t = new Date();
  t.setDate(t.getDate() + 1);
  return t;
}
function getMaxDate() {
  let t = new Date();
  t.setDate(t.getDate() + 30);
  return t;
}

function filterFutureDates(dates, today = new Date()) {
  return (dates || []).filter(dateStr => {
    const d = new Date(dateStr);
    return d > today;
  });
}

// DOM logic (only run in browser)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('available-dates');
    if (!dateInput || !window.flatpickr) return;

    // Default flatpickr (no user logged in)
    function initDefaultPicker() {
      dateInput._flatpickr && dateInput._flatpickr.destroy();
      flatpickr(dateInput, {
        mode: "multiple",
        dateFormat: "Y-m-d",
        minDate: getMinDate(),
        maxDate: getMaxDate()
      });
    }

    // Fetch and display user's picked dates
    async function initUserPicker(user) {
      const db = firebase.firestore();
      const today = new Date();
      let userDates = [];
      try {
        const doc = await db.collection('availability').doc(user.uid).get();
        let dates = [];
        if (doc.exists) {
          if (Array.isArray(doc.data().datesWithTimes)) {
            // New format: [{date, times}]
            dates = doc.data().datesWithTimes.map(entry => entry.date);
          } else if (Array.isArray(doc.data().dates)) {
            // Old format: [dateStr]
            dates = doc.data().dates;
          }
        }
        userDates = filterFutureDates(dates, today);
      } catch (err) {
        console.error('Error fetching user availability:', err);
      }
      dateInput._flatpickr && dateInput._flatpickr.destroy();
      flatpickr(dateInput, {
        mode: "multiple",
        dateFormat: "Y-m-d",
        minDate: getMinDate(),
        maxDate: getMaxDate(),
        defaultDate: userDates,
        disable: userDates,
        onDayCreate: function(dObj, dStr, fp, dayElem) {
          if (dayElem.classList.contains('flatpickr-disabled')) {
            const dateStr = dayElem.dateObj && fp.formatDate(dayElem.dateObj, "Y-m-d");
            if (dateStr && userDates.includes(dateStr)) {
              dayElem.title = 'You already picked this date';
              dayElem.classList.add('picked-date');
            }
          }
        }
      });
    }

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        initUserPicker(user);
      } else {
        initDefaultPicker();
      }
    });

    // Initialize on load (in case user is already logged in)
    if (firebase.auth().currentUser) {
      initUserPicker(firebase.auth().currentUser);
    } else {
      initDefaultPicker();
    }
  });
}

// Export pure functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getMinDate, getMaxDate, filterFutureDates };
}
