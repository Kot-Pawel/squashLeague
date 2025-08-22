// UI logic for login/registration toggle and register button visibility

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
            registrationDiv.style.display = '';
            loginDiv.style.display = 'none';
        });
    }
    if (backToLoginBtn && registrationDiv && loginDiv) {
        backToLoginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            registrationDiv.style.display = 'none';
            loginDiv.style.display = '';
        });
    }

    // Hide/show register button based on login state
    var authStatus = document.getElementById('auth-status');
    function updateRegisterBtnVisibility() {
        if (!showRegisterBtn || !authStatus) return;
        var isLoggedIn = authStatus.textContent && authStatus.textContent.toLowerCase().indexOf('logged in') !== -1 && authStatus.textContent.toLowerCase().indexOf('not logged in') === -1;
        showRegisterBtn.style.display = isLoggedIn ? 'none' : '';
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
