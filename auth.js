// auth.js
// Handles login, logout, and UI updates for authentication state

document.addEventListener('DOMContentLoaded', function() {
  const auth = firebase.auth();


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


  // Login form logic
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      auth.signInWithEmailAndPassword(email, password)
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
      auth.signOut();
    });
  }

  // Auth state observer
  auth.onAuthStateChanged(async function(user) {
    const regForm = document.getElementById('registration-form');
    const loginForm = document.getElementById('login-form');
    const logoutBtn = document.getElementById('logout-btn');
    const authStatus = document.getElementById('auth-status');
    const availabilityFormHeader = document.getElementById('availability-form-header');
    const availForm = document.getElementById('availability-form');
    const resultDiv = document.getElementById('result');
    const dateInput = document.getElementById('available-dates');
    if (user) {
      if (regForm) regForm.style.display = 'none';
      if (loginForm) loginForm.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (authStatus) authStatus.textContent = 'Logged in as: ' + user.email;
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
  });
});
