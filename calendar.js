// calendar.js
// Handles flatpickr initialization and fetching user's future availability from Firestore

document.addEventListener('DOMContentLoaded', function() {
  const dateInput = document.getElementById('available-dates');
  if (!dateInput || !window.flatpickr) return;

  // Helper to get tomorrow and 30 days from today
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
      const dates = (doc.exists && doc.data().dates) ? doc.data().dates : [];
      dates.forEach(dateStr => {
        const d = new Date(dateStr);
        if (d > today) userDates.push(dateStr);
      });
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
