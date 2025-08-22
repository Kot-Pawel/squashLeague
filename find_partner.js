// find_partner.js
// Handles the 'Find a Partner' calendar and fetching users available on a selected date

document.addEventListener('DOMContentLoaded', function() {
  const dateInput = document.getElementById('find-partner-date');
  const resultsDiv = document.getElementById('partner-results');
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

  // Initialize flatpickr for single date selection
  flatpickr(dateInput, {
    mode: "single",
    dateFormat: "Y-m-d",
    minDate: getMinDate(),
    maxDate: getMaxDate(),
    onChange: function(selectedDates, dateStr, instance) {
      if (!dateStr) {
        resultsDiv.textContent = '';
        return;
      }
      // Fetch users who picked this date
      fetchPartners(dateStr);
    }
  });

  async function fetchPartners(dateStr) {
    resultsDiv.textContent = 'Loading...';
    const db = firebase.firestore();
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    let partners = [];
    try {
      const snapshot = await db.collection('availability').get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.dates || !Array.isArray(data.dates)) continue;
        if (data.dates.includes(dateStr)) {
          // Exclude current user
          if (!currentUser || doc.id !== currentUser.uid) {
            // Fetch screenName from users collection
            let screenName = data.email;
            try {
              const userDoc = await db.collection('users').doc(doc.id).get();
              if (userDoc.exists && userDoc.data().screenName) {
                screenName = userDoc.data().screenName;
              }
            } catch {}
            partners.push(screenName);
          }
        }
      }
    } catch (err) {
      resultsDiv.textContent = 'Error fetching partners: ' + err.message;
      return;
    }
    if (partners.length === 0) {
      resultsDiv.textContent = 'No other users are available on this date.';
    } else {
      resultsDiv.innerHTML = '<b>Available users:</b><ul>' + partners.map(name => `<li>${name}</li>`).join('') + '</ul>';
    }
  }
  // Show user's picked dates and partners for next 14 days
  async function showMyPartnerSummary() {
    const summaryDiv = document.getElementById('my-partner-summary');
    const db = firebase.firestore();
    const auth = firebase.auth();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      summaryDiv.innerHTML = '';
      return;
    }
    // Get user's picked dates
    let myDates = [];
    try {
      const doc = await db.collection('availability').doc(currentUser.uid).get();
      if (doc.exists && Array.isArray(doc.data().dates)) {
        myDates = doc.data().dates;
      }
    } catch (err) {
      summaryDiv.innerHTML = 'Error loading your availability.';
      return;
    }
    // Filter to next 14 days
    const today = new Date();
    const in14 = new Date();
    in14.setDate(today.getDate() + 14);
    const next14 = myDates.filter(dateStr => {
      const d = new Date(dateStr);
      return d >= today && d <= in14;
    }).sort();
    if (next14.length === 0) {
      summaryDiv.innerHTML = '<b>You have not picked any dates in the next 14 days.</b>';
      return;
    }
    // For each date, find partners
    let html = '<b>Your upcoming dates and potential partners:</b><ul>';
    for (const dateStr of next14) {
      let partners = [];
      try {
        const snapshot = await db.collection('availability').get();
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (!data.dates || !Array.isArray(data.dates)) continue;
          if (data.dates.includes(dateStr) && doc.id !== currentUser.uid) {
            // Fetch screenName from users collection
            let screenName = data.email;
            try {
              const userDoc = await db.collection('users').doc(doc.id).get();
              if (userDoc.exists && userDoc.data().screenName) {
                screenName = userDoc.data().screenName;
              }
            } catch {}
            partners.push(screenName);
          }
        }
      } catch (err) {
        partners = ['Error fetching partners'];
      }
      html += `<li><b>${dateStr}</b>: `;
      if (partners.length === 0) {
        html += 'No partners available';
      } else {
        html += partners.join(', ');
      }
      html += '</li>';
    }
    html += '</ul>';
    summaryDiv.innerHTML = html;
  }

  // Listen for auth state changes to update summary
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      showMyPartnerSummary();
    } else {
      document.getElementById('my-partner-summary').innerHTML = '';
    }
  });

  // Also update summary after picking a new date
  document.getElementById('find-partner-date').addEventListener('change', showMyPartnerSummary);
});
