// Handles login, logout, and UI updates for authentication state

function registerUser({ screenName, email, password, firebase }) {
  const auth = firebase.auth();
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const db = firebase.firestore();
      return db.collection('users').doc(userCredential.user.uid).set({
        screenName,
        email
      }, { merge: true });
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

    // Graceful fallback: toast.js may not be loaded in test environments
    const _toast = window.toast || { show: () => {} };

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
            _toast.show('Registration successful! You can now submit your availability.', 'success');
          })
          .catch((error) => {
            _toast.show('Registration failed: ' + error.message, 'error');
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
            _toast.show('Login successful!', 'success');
          })
          .catch((error) => {
            _toast.show('Login failed: ' + error.message, 'error');
          });
      });
    }

    // Forgot password flow using Bootstrap modal with inline validation
    (function setupForgotPasswordModal() {
      const forgotLink = document.getElementById('forgot-password-link');
      const modalEl = document.getElementById('forgotPasswordModal');
      if (!forgotLink || !modalEl) return;

      // Create Bootstrap Modal instance if available
      let bsModal = null;
      try {
        bsModal = new bootstrap.Modal(modalEl);
      } catch (err) {
        // bootstrap may be missing; fall back to prompt (rare)
        console.warn('Bootstrap Modal not available, falling back to prompt', err);
      }

      const emailInput = document.getElementById('forgot-email-input');
      const sendBtn = document.getElementById('forgot-send-btn');
      const alertContainer = document.getElementById('forgot-modal-alert');

      const isValidEmail = (val) => {
        if (!val) return false;
        // simple email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      };

      const setValidationState = () => {
        const val = emailInput.value.trim();
        if (isValidEmail(val)) {
          emailInput.classList.remove('is-invalid');
          sendBtn.disabled = false;
        } else {
          emailInput.classList.add('is-invalid');
          sendBtn.disabled = true;
        }
      };

      // Reset modal state
      const resetModal = () => {
        if (!emailInput) return;
        emailInput.value = '';
        emailInput.classList.remove('is-invalid');
        if (sendBtn) sendBtn.disabled = false;
        if (alertContainer) alertContainer.innerHTML = '';
      };

      // Show modal when link clicked
      forgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        // throttle link for 60s
        forgotLink.style.pointerEvents = 'none';
        forgotLink.style.opacity = '0.5';
        setTimeout(() => {
          forgotLink.style.pointerEvents = '';
          forgotLink.style.opacity = '';
        }, 60000);

        const prefill = (document.getElementById('login-email') || {}).value || '';
        if (emailInput) emailInput.value = prefill;
        if (emailInput) setValidationState();
        if (bsModal) bsModal.show();
        else {
          // fallback to prompt if bootstrap modal not available
          const email = window.prompt('Enter your account email for password recovery:', prefill);
          if (!email) return;
          const msg = 'If an account with that email exists, a password reset email has been sent.';

          // Helper: show message via toast if available, and always write to #login-result for test-ability
          const showResetMsg = () => {
            _toast.show(msg, 'success', 5000);
            const loginResult = document.getElementById('login-result');
            if (loginResult) loginResult.innerHTML = `<div class="alert alert-success">${msg}</div>`;
          };

          try {
            firebase.auth().sendPasswordResetEmail(email)
              .then(() => { showResetMsg(); })
              .catch((err) => {
                console.error('sendPasswordResetEmail error:', err);
                showResetMsg();
              });
          } catch (err) {
            console.error('Password reset failed (firebase missing):', err);
            showResetMsg();
          }
        }
      });

      if (!emailInput) return;

      // Validate on input
      emailInput.addEventListener('input', setValidationState);

      // Send button behavior
      sendBtn.addEventListener('click', function() {
        const email = emailInput.value.trim();
        if (!isValidEmail(email)) {
          emailInput.classList.add('is-invalid');
          return;
        }
        // disable send button while in flight
        sendBtn.disabled = true;
        // call compat API
        const msg = 'If an account with that email exists, a password reset email has been sent.';
        try {
          firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
              _toast.show(msg, 'success', 5000);
              setTimeout(() => { if (bsModal) bsModal.hide(); resetModal(); }, 800);
            })
            .catch((err) => {
              console.error('sendPasswordResetEmail error:', err);
              // Always show the same neutral message to avoid email enumeration
              _toast.show(msg, 'success', 5000);
              setTimeout(() => { if (bsModal) bsModal.hide(); resetModal(); }, 800);
            })
            .finally(() => {
              sendBtn.disabled = false;
            });
        } catch (err) {
          console.error('Password reset failed (firebase missing):', err);
          _toast.show(msg, 'success', 5000);
          setTimeout(() => { if (bsModal) bsModal.hide(); resetModal(); }, 800);
          sendBtn.disabled = false;
        }
      });

      // Move focus out of the modal before Bootstrap sets aria-hidden="true".
      // Without this, the focused button inside the modal remains focused while
      // aria-hidden is applied, triggering an accessibility violation warning.
      modalEl.addEventListener('hide.bs.modal', function () {
        if (modalEl.contains(document.activeElement)) {
          document.activeElement.blur();
          forgotLink.focus();
        }
      });

      // Reset modal content once fully hidden
      modalEl.addEventListener('hidden.bs.modal', function () {
        resetModal();
      });
    })();

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
      const matchRequestsSection = document.getElementById('match-requests-section');
      const appSidebar = document.getElementById('app-sidebar');
      const sidebarHamburger = document.getElementById('sidebar-hamburger');
      const bottomNav = document.getElementById('bottom-nav');
      const appMain = document.querySelector('.app-main');
      const loginBox = document.getElementById('login-section');
      if (user) {
        if (regForm) regForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (availSection) availSection.style.display = '';
        if (findPartnerSection) findPartnerSection.style.display = '';
        if (matchRequestsSection) matchRequestsSection.style.display = '';
        // Show navigation
        if (appSidebar) appSidebar.style.display = '';
        if (sidebarHamburger) sidebarHamburger.style.display = '';
        if (bottomNav) bottomNav.style.display = '';
        if (appMain) appMain.classList.remove('app-main--no-sidebar');
        if (loginBox) loginBox.classList.remove('login-centered');
        // Fetch and show screenName if available
        if (authStatus) {
          let displayName = user.email;
          let screenName = null;
          try {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().screenName) {
              displayName = userDoc.data().screenName;
              screenName = displayName;
            }
            // Load user's saved theme preference from Firestore
            if (window.themeManager) {
              await window.themeManager.setUser(user.uid);
            }
          } catch (err) {
            // fallback to email / current theme
          }
          // Render displayName in a span with a pencil icon for editing
          authStatus.innerHTML = `Logged in as: <span id="display-name-span">${displayName}</span> <span id="edit-screenname" style="cursor:pointer;" title="Edit screen name">✏️</span>`;
          // Add event listener for editing
          const editBtn = document.getElementById('edit-screenname');
          const displayNameSpan = document.getElementById('display-name-span');
          if (editBtn && displayNameSpan) {
            editBtn.onclick = function() {
              // Replace span with input
              displayNameSpan.innerHTML = `<input id='edit-screenname-input' type='text' value='${screenName || displayName}' style='width:120px;'> <button id='save-screenname-btn' class='btn btn-sm btn-success'>Save</button>`;
              document.getElementById('save-screenname-btn').onclick = async function() {
                const input = document.getElementById('edit-screenname-input');
                const newScreenName = input.value.trim();
                if (newScreenName && newScreenName !== displayName) {
                  try {
                    // Dynamically import accountManager.js
                    const mod = await import('./accountManager.js');
                    await mod.updateScreenName(user.uid, newScreenName);
                    displayNameSpan.textContent = newScreenName;
                    _toast.show('Screen name updated!', 'success');
                  } catch (err) {
                    _toast.show('Failed to update screen name: ' + err.message, 'error');
                  }
                } else {
                  displayNameSpan.textContent = displayName;
                }
              };
            };
          }
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
        if (matchRequestsSection) matchRequestsSection.style.display = 'none';
        // Hide navigation
        if (appSidebar) appSidebar.style.display = 'none';
        if (sidebarHamburger) sidebarHamburger.style.display = 'none';
        if (bottomNav) bottomNav.style.display = 'none';
        if (appMain) appMain.classList.add('app-main--no-sidebar');
        if (loginBox) loginBox.classList.add('login-centered');
        // Revert theme to anonymous localStorage preference on logout
        if (window.themeManager) window.themeManager.clearUser();
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

