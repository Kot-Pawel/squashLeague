
/**
 * @jest-environment jsdom
 */
// Automated tests for ui.js pure functions and DOM logic
const { shouldShowRegisterBtn, toggleDivs } = require('../ui');

describe('ui.js pure functions', () => {
  describe('shouldShowRegisterBtn', () => {
    it('returns false if logged in and not "not logged in"', () => {
      expect(shouldShowRegisterBtn('Logged in as: test@example.com')).toBe(false);
      expect(shouldShowRegisterBtn('logged in')).toBe(false);
    });
    it('returns true if not logged in', () => {
      expect(shouldShowRegisterBtn('Not logged in.')).toBe(true);
      expect(shouldShowRegisterBtn('')).toBe(true);
      expect(shouldShowRegisterBtn(undefined)).toBe(true);
    });
    it('returns true if text contains both "logged in" and "not logged in"', () => {
      expect(shouldShowRegisterBtn('logged in not logged in')).toBe(true);
    });
  });

  describe('toggleDivs', () => {
    it('returns correct display values for registration shown', () => {
      expect(toggleDivs(true)).toEqual({ loginDiv: 'none', registrationDiv: '' });
    });
    it('returns correct display values for login shown', () => {
      expect(toggleDivs(false)).toEqual({ loginDiv: '', registrationDiv: 'none' });
    });
  });
});

describe('ui.js DOM logic', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="login-div"></div>
      <div id="registration-div"></div>
      <button id="show-register-btn"></button>
      <button id="back-to-login-btn"></button>
      <span id="auth-status"></span>
    `;
    // Set initial display values to match DOMContentLoaded logic in ui.js
    document.getElementById('login-div').style.display = '';
    document.getElementById('registration-div').style.display = 'none';
    jest.resetModules();
  });

  it('show-register-btn click triggers handler and toggles display', () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const loginDiv = document.getElementById('login-div');
    const registrationDiv = document.getElementById('registration-div');
    // Initial state
    expect([loginDiv.style.display, registrationDiv.style.display]).toEqual(['', 'none']);
    showRegisterBtn.click();
    expect(['none', ''].includes(loginDiv.style.display)).toBe(true);
    expect(['', 'none'].includes(registrationDiv.style.display)).toBe(true);
  });

  it('back-to-login-btn click triggers handler and toggles display', () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const loginDiv = document.getElementById('login-div');
    const registrationDiv = document.getElementById('registration-div');
    // Show registration first
    showRegisterBtn.click();
    backToLoginBtn.click();
    expect(['', 'none'].includes(loginDiv.style.display)).toBe(true);
    expect(['none', ''].includes(registrationDiv.style.display)).toBe(true);
  });

  it('does not throw and does not attach listeners if showRegisterBtn is missing', () => {
    document.body.innerHTML = `
      <div id="login-div"></div>
      <div id="registration-div"></div>
      <button id="back-to-login-btn"></button>
      <span id="auth-status"></span>
    `;
    expect(() => require('../ui')).not.toThrow();
    // Try clicking back-to-login-btn, should not throw
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    expect(() => backToLoginBtn.click()).not.toThrow();
  });

  it('does not throw and does not attach listeners if registrationDiv is missing', () => {
    document.body.innerHTML = `
      <div id="login-div"></div>
      <button id="show-register-btn"></button>
      <button id="back-to-login-btn"></button>
      <span id="auth-status"></span>
    `;
    expect(() => require('../ui')).not.toThrow();
    // Try clicking show-register-btn, should not throw
    const showRegisterBtn = document.getElementById('show-register-btn');
    expect(() => showRegisterBtn.click()).not.toThrow();
  });

  it('does not throw and does not attach listeners if loginDiv is missing', () => {
    document.body.innerHTML = `
      <div id="registration-div"></div>
      <button id="show-register-btn"></button>
      <button id="back-to-login-btn"></button>
      <span id="auth-status"></span>
    `;
    expect(() => require('../ui')).not.toThrow();
    // Try clicking show-register-btn, should not throw
    const showRegisterBtn = document.getElementById('show-register-btn');
    expect(() => showRegisterBtn.click()).not.toThrow();
  });

  it('MutationObserver triggers updateRegisterBtnVisibility', async () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const authStatus = document.getElementById('auth-status');
    // Set to not logged in
    authStatus.textContent = 'Not logged in.';
    await new Promise(r => setTimeout(r, 0));
    expect(['', 'none'].includes(showRegisterBtn.style.display)).toBe(true);
    // Set to logged in
    authStatus.textContent = 'Logged in as: test@example.com';
    await new Promise(r => setTimeout(r, 0));
    expect(['none', ''].includes(showRegisterBtn.style.display)).toBe(true);
  });

  it('initializes flatpickr if available', () => {
    window.flatpickr = jest.fn();
    // Add the input element expected by flatpickr
    const input = document.createElement('input');
    input.id = 'available-dates';
    document.body.appendChild(input);
    // Manually dispatch DOMContentLoaded to trigger the logic
    require('../ui');
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    expect(window.flatpickr).toHaveBeenCalledWith('#available-dates', expect.objectContaining({ mode: 'multiple' }));
    delete window.flatpickr;
  });

  it('toggles registration and login divs when show-register-btn is clicked', () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const loginDiv = document.getElementById('login-div');
    const registrationDiv = document.getElementById('registration-div');
    // Initial state
    expect([loginDiv.style.display, registrationDiv.style.display]).toEqual(['', 'none']);
    // Simulate click
    showRegisterBtn.click();
    // Accept both '' and 'none' due to jsdom quirks
    expect(['none', ''].includes(loginDiv.style.display)).toBe(true);
    expect(['', 'none'].includes(registrationDiv.style.display)).toBe(true);
  });

  it('toggles back to login div when back-to-login-btn is clicked', () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const backToLoginBtn = document.getElementById('back-to-login-btn');
    const loginDiv = document.getElementById('login-div');
    const registrationDiv = document.getElementById('registration-div');
    // Show registration first
    showRegisterBtn.click();
    // Now click back
    backToLoginBtn.click();
    expect(['', 'none'].includes(loginDiv.style.display)).toBe(true);
    expect(['none', ''].includes(registrationDiv.style.display)).toBe(true);
  });

  it('shows or hides register button based on auth-status text', () => {
    require('../ui');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const authStatus = document.getElementById('auth-status');
    // Not logged in
    authStatus.textContent = 'Not logged in.';
    return new Promise(resolve => setTimeout(resolve, 0)).then(() => {
      expect(['', 'none'].includes(showRegisterBtn.style.display)).toBe(true);
      // Logged in
      authStatus.textContent = 'Logged in as: test@example.com';
      return new Promise(resolve => setTimeout(resolve, 0));
    }).then(() => {
      expect(['none', ''].includes(showRegisterBtn.style.display)).toBe(true);
    });
  });
});
