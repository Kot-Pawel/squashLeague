// auth.js
// Handles login, logout, and UI updates for authentication state


// Pure functions for authentication logic
function registerUser({ screenName, email, password, firebase }) {
  const auth = firebase.auth();
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const db = firebase.firestore();
      return db.collection('users').doc(userCredential.user.uid).set({
        screenName,
        email
      });
    });
}

function loginUser({ email, password, firebase }) {
  const auth = firebase.auth();
  return auth.signInWithEmailAndPassword(email, password);
}

function logoutUser({ firebase }) {
  const auth = firebase.auth();
  return auth.signOut();
}

function observeAuthState({ firebase, onChange }) {
  const auth = firebase.auth();
  return auth.onAuthStateChanged(onChange);
}

// DOM logic (only run in browser)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    const auth = firebase.auth();

    // Use window-scoped functions if available (for testability)
    const regUserFn = window.registerUser || registerUser;
    const loginUserFn = window.loginUser || loginUser;
    const logoutUserFn = window.logoutUser || logoutUser;
    const observeAuthStateFn = window.observeAuthState || observeAuthState;

    // Registration form logic
    const regForm = document.getElementById('registration-form');
    if (regForm) {
      regForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const screenName = document.getElementById('reg-screenname').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        regUserFn({ screenName, email, password, firebase })
          .then(() => {
            document.getElementById('registration-result').textContent = 'Registration successful! You can now submit your availability.';
          })
          .catch((error) => {
            document.getElementById('registration-result').textContent = 'Error: ' + error.message;
          });
      });
    }

    // Login form logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        loginUserFn({ email, password, firebase })
          .then(() => {
            document.getElementById('login-result').textContent = 'Login successful!';
          })
          .catch((error) => {
            document.getElementById('login-result').textContent = 'Error: ' + error.message;
          });
      });
    }

    // Logout button logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        logoutUserFn({ firebase });
      });
    }

    // Auth state observer - this is to show proper windows depending on whether user is logged in
    observeAuthStateFn({ firebase, onChange: async function(user) {
      const regForm = document.getElementById('registration-form');
      const loginForm = document.getElementById('login-form');
      const logoutBtn = document.getElementById('logout-btn');
      const authStatus = document.getElementById('auth-status');
      const availabilityFormHeader = document.getElementById('availability-form-header');
      const availForm = document.getElementById('availability-form');
      const resultDiv = document.getElementById('result');
      const dateInput = document.getElementById('available-dates');
      const availSection = document.getElementById('availability-section');
      const findPartnerSection = document.getElementById('find-partner-section');
      if (user) {
        if (regForm) regForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (availSection) availSection.style.display = '';
        if (findPartnerSection) findPartnerSection.style.display = '';
        // Fetch and show screenName if available
        if (authStatus) {
          let displayName = user.email;
          try {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().screenName) {
              displayName = userDoc.data().screenName;
            }
          } catch (err) {
            // fallback to email
          }
          authStatus.textContent = 'Logged in as: ' + displayName;
        }
        if (availabilityFormHeader) availabilityFormHeader.style.display = 'block';
        if (availForm) availForm.style.display = 'block';
        if (resultDiv) resultDiv.style.display = 'block';

      } else {
        if (regForm) regForm.style.display = 'block';
        if (loginForm) loginForm.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (authStatus) authStatus.textContent = 'Not logged in.';
        if (availabilityFormHeader) availabilityFormHeader.style.display = 'none';
        if (availForm) availForm.style.display = 'none';
        if (resultDiv) resultDiv.style.display = 'none';
        if (availSection) availSection.style.display = 'none';
        if (findPartnerSection) findPartnerSection.style.display = 'none';
        // Reset flatpickr to default state
        if (dateInput && window.flatpickr) {
          dateInput._flatpickr && dateInput._flatpickr.destroy();
          flatpickr(dateInput, {
            mode: "multiple",
            dateFormat: "Y-m-d",
            minDate: (() => { let t = new Date(); t.setDate(t.getDate() + 1); return t; })(),
            maxDate: (() => { let t = new Date(); t.setDate(t.getDate() + 30); return t; })()
          });
        }
      }
    }});
  });
}

// Export pure functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerUser, loginUser, logoutUser, observeAuthState };
}
