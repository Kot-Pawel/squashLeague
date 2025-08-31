// UI logic for login/registration toggle and register button visibility


// Pure functions for UI logic
function shouldShowRegisterBtn(authStatusText) {
    if (!authStatusText) return true;
    const text = authStatusText.toLowerCase();
    return !(text.indexOf('logged in') !== -1 && text.indexOf('not logged in') === -1);
}

function toggleDivs(showRegistration) {
    return {
        loginDiv: showRegistration ? 'none' : '',
        registrationDiv: showRegistration ? '' : 'none'
    };
}

// DOM logic (only run in browser)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Toggle login/registration divs visibility
        var showRegisterBtn = document.getElementById('show-register-btn');
        var loginDiv = document.getElementById('login-div');
        var registrationDiv = document.getElementById('registration-div');
        var backToLoginBtn = document.getElementById('back-to-login-btn');
        if (loginDiv) loginDiv.style.display = '';
        if (registrationDiv) registrationDiv.style.display = 'none';

        if (showRegisterBtn && registrationDiv && loginDiv) {
            showRegisterBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const { loginDiv: l, registrationDiv: r } = toggleDivs(true);
                registrationDiv.style.display = r;
                loginDiv.style.display = l;
            });
        }
        if (backToLoginBtn && registrationDiv && loginDiv) {
            backToLoginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const { loginDiv: l, registrationDiv: r } = toggleDivs(false);
                registrationDiv.style.display = r;
                loginDiv.style.display = l;
            });
        }

        // Hide/show register button based on login state
        var authStatus = document.getElementById('auth-status');
        function updateRegisterBtnVisibility() {
            if (!showRegisterBtn || !authStatus) return;
            showRegisterBtn.style.display = shouldShowRegisterBtn(authStatus.textContent) ? '' : 'none';
        }
        updateRegisterBtnVisibility();
        var observer = new MutationObserver(updateRegisterBtnVisibility);
        if (authStatus) {
            observer.observe(authStatus, { childList: true, subtree: true, characterData: true });
        }

        // Initialize flatpickr for multiple date selection with date limits
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + 30);
        if (window.flatpickr) {
            flatpickr("#available-dates", {
                mode: "multiple",
                dateFormat: "Y-m-d",
                minDate: tomorrow,
                maxDate: maxDate
            });
        }
    });
}

// Export pure functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shouldShowRegisterBtn, toggleDivs };
}
