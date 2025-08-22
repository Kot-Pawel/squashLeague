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

function saveAvailability(days) {
  return db.collection('availability').add({
    days: days,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}
window.saveAvailability = saveAvailability; // Make it available globally


// Registration form logic
document.getElementById('registration-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      document.getElementById('registration-result').textContent = 'Registration successful! You can now submit your availability.';
    })
    .catch((error) => {
      document.getElementById('registration-result').textContent = 'Error: ' + error.message;
    });
});

// Availability form logic
document.getElementById('availability-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const checked = Array.from(document.querySelectorAll('input[name="days"]:checked')).map(cb => cb.value);
  saveAvailability(checked).then(() => {
    document.getElementById('result').textContent = 'Availability saved!';
  }).catch(err => {
    document.getElementById('result').textContent = 'Error: ' + err.message;
  });
});

// Export firebase/app if needed (for future modularization)
// window.firebaseApp = app;
