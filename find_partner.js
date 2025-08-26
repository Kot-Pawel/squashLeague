// Handles the 'Find a Partner' calendar and fetching users available on a selected date

// Pure functions for partner finding and summary building
function filterDatesInRange(dates, from, to) {
  return (dates || []).filter(dateStr => {
    const d = new Date(dateStr);
    return d >= from && d <= to;
  }).sort();
}

function buildPartnerListHtml(partners) {
  if (!partners || partners.length === 0) {
    return 'No partners available';
  }
  return partners.join(', ');
}

// DOM logic (only run in browser)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
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

    // Helper: check if two time slots overlap ("HH:mm-HH:mm")
    function timeSlotsOverlap(slotsA, slotsB) {
      function parseSlot(slot) {
        const [start, end] = slot.split('-');
        return [start, end];
      }
      for (const a of slotsA) {
        const [aStart, aEnd] = parseSlot(a);
        for (const b of slotsB) {
          const [bStart, bEnd] = parseSlot(b);
          if (aStart < bEnd && bStart < aEnd) {
            // Overlap exists
            // Return the overlapping range
            const overlapStart = aStart > bStart ? aStart : bStart;
            const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
            if (overlapStart < overlapEnd) {
              return `${overlapStart}-${overlapEnd}`;
            }
          }
        }
      }
      return null;
    }

    async function fetchPartners(dateStr) {
      resultsDiv.textContent = 'Loading...';
      const db = firebase.firestore();
      const auth = firebase.auth();
      const currentUser = auth.currentUser;
      let partners = [];
      let mySlots = [];
      try {
        // Get current user's slots for this date
        if (currentUser) {
          const myDoc = await db.collection('availability').doc(currentUser.uid).get();
          if (myDoc.exists && Array.isArray(myDoc.data().datesWithTimes)) {
            const entry = myDoc.data().datesWithTimes.find(e => e.date === dateStr);
            if (entry && Array.isArray(entry.times)) {
              mySlots = entry.times;
            }
          }
        }
        const snapshot = await db.collection('availability').get();
        for (const doc of snapshot.docs) {
          if (currentUser && doc.id === currentUser.uid) continue;
          const data = doc.data();
          if (!Array.isArray(data.datesWithTimes)) continue;
          const entry = data.datesWithTimes.find(e => e.date === dateStr);
          if (entry && Array.isArray(entry.times)) {
            const overlap = timeSlotsOverlap(mySlots, entry.times);
            if (overlap) {
              // Fetch screenName from users collection
              let screenName = data.email;
              try {
                const userDoc = await db.collection('users').doc(doc.id).get();
                if (userDoc.exists && userDoc.data().screenName) {
                  screenName = userDoc.data().screenName;
                }
              } catch {}
              partners.push(`${screenName} <span style='color:green'>(overlap: ${overlap})</span>`);
            }
          }
        }
      } catch (err) {
        resultsDiv.textContent = 'Error fetching partners: ' + err.message;
        return;
      }
      if (partners.length === 0) {
        resultsDiv.textContent = 'No other users are available on this date and time.';
      } else {
        resultsDiv.innerHTML = '<b>Available users with overlapping hours:</b><ul>' + partners.map(name => `<li>${name}</li>`).join('') + '</ul>';
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
      // Get user's picked dates and times (new format)
      let myDatesWithTimes = [];
      try {
        const doc = await db.collection('availability').doc(currentUser.uid).get();
        if (doc.exists && Array.isArray(doc.data().datesWithTimes)) {
          myDatesWithTimes = doc.data().datesWithTimes;
        }
      } catch (err) {
        summaryDiv.innerHTML = 'Error loading your availability.';
        return;
      }
      // Filter to next 14 days
      const today = new Date();
      const in14 = new Date();
      in14.setDate(today.getDate() + 14);
      const next14 = (myDatesWithTimes || []).filter(entry => {
        const d = new Date(entry.date);
        return d >= today && d <= in14;
      });
      if (next14.length === 0) {
        summaryDiv.innerHTML = '<b>You have not picked any dates in the next 14 days.</b>';
        return;
      }
      // For each date, find partners with overlapping hours
      let html = '<b>Your upcoming dates and potential partners:</b><ul>';
      for (const entry of next14) {
        const dateStr = entry.date;
        const mySlots = entry.times || [];
        let partners = [];
        try {
          const snapshot = await db.collection('availability').get();
          for (const doc of snapshot.docs) {
            if (doc.id === currentUser.uid) continue;
            const data = doc.data();
            if (!Array.isArray(data.datesWithTimes)) continue;
            const theirEntry = data.datesWithTimes.find(e => e.date === dateStr);
            if (theirEntry && Array.isArray(theirEntry.times)) {
              const overlap = timeSlotsOverlap(mySlots, theirEntry.times);
              if (overlap) {
                // Fetch screenName from users collection
                let screenName = data.email;
                try {
                  const userDoc = await db.collection('users').doc(doc.id).get();
                  if (userDoc.exists && userDoc.data().screenName) {
                    screenName = userDoc.data().screenName;
                  }
                } catch {}
                partners.push(`${screenName} <span style='color:green'>(overlap: ${overlap})</span>`);
              }
            }
          }
        } catch (err) {
          partners = ['Error fetching partners'];
        }
        html += `<li><b>${dateStr}</b> (your hours: ${mySlots.join(', ')}): `;
        html += buildPartnerListHtml(partners);
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
}

// Export pure functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { filterDatesInRange, buildPartnerListHtml };
}
