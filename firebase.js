// firebase.js
// Firebase App (the core Firebase SDK) is always required and must be listed first
// These scripts are loaded via CDN in index.html, so we can use the global 'firebase' object

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDc-cnfMWL_YkpaADfI6lzsJUJXxSjyGBk",
  authDomain: "squashleague-ff916.firebaseapp.com",
  projectId: "squashleague-ff916",
  storageBucket: "squashleague-ff916.firebasestorage.app",
  messagingSenderId: "7489941410",
  appId: "1:7489941410:web:b8498e235103af346eccfb",
  measurementId: "G-WKV3GFP0X0"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
  firebase.analytics();
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
  });
}
window.saveAvailability = saveAvailability; // Make it available globally

// Availability form logic

document.getElementById('availability-form').addEventListener('submit', function(e) {
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
  saveAvailability(selectedDates, user.email, user.uid).then(() => {
    document.getElementById('result').textContent = 'Availability saved!';
  }).catch(err => {
    document.getElementById('result').textContent = 'Error: ' + err.message;
  });
});

// Export firebase/app if needed (for future modularization)
// window.firebaseApp = app;
