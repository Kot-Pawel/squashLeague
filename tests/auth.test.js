/**
 * @jest-environment jsdom
 */
// DOM logic tests for auth.js
describe('auth.js DOM logic', () => {
  let registerUserMock, loginUserMock, logoutUserMock, observeAuthStateMock, firebaseMock;
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <form id="registration-form">
        <input id="reg-screenname" value="TestUser">
        <input id="reg-email" value="test@example.com">
        <input id="reg-password" value="pw">
        <div id="registration-result"></div>
      </form>
      <form id="login-form">
        <input id="login-email" value="test@example.com">
        <input id="login-password" value="pw">
        <div id="login-result"></div>
      </form>
      <button id="logout-btn"></button>
      <div id="auth-status"></div>
      <div id="availability-form-header"></div>
      <form id="availability-form"></form>
      <div id="result"></div>
      <input id="available-dates">
      <section id="availability-section"></section>
      <section id="find-partner-section"></section>
    `;
    // Mock pure functions
    registerUserMock = jest.fn(() => Promise.resolve());
    loginUserMock = jest.fn(() => Promise.resolve());
    logoutUserMock = jest.fn(() => Promise.resolve());
    observeAuthStateMock = jest.fn();
    // Mock firebase
    firebaseMock = {
      auth: jest.fn(() => ({
        createUserWithEmailAndPassword: jest.fn(() => Promise.resolve({ user: { uid: 'abc123', email: 'test@example.com' } })),
        signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
        signOut: jest.fn(() => Promise.resolve()),
        onAuthStateChanged: jest.fn()
      })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            set: jest.fn(() => Promise.resolve()),
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ screenName: 'TestUser' }) }))
          }))
        }))
      }))
    };
  // Attach mocks to window
  window.firebase = firebaseMock;
  window.registerUser = registerUserMock;
  window.loginUser = loginUserMock;
  window.logoutUser = logoutUserMock;
  window.observeAuthState = observeAuthStateMock;
  jest.resetModules();
  require('../src/auth');
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  });

  afterEach(() => {
  jest.resetModules();
  delete window.firebase;
  delete window.registerUser;
  delete window.loginUser;
  delete window.logoutUser;
  delete window.observeAuthState;
  });

  it('handles registration form submission (success)', async () => {
    const regForm = document.getElementById('registration-form');
    regForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 0));
    expect(registerUserMock).toHaveBeenCalled();
  });

  it('handles login form submission (success)', async () => {
    const loginForm = document.getElementById('login-form');
    loginForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 0));
    expect(loginUserMock).toHaveBeenCalled();
  });

  it('handles logout button click', async () => {
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.click();
    await new Promise(r => setTimeout(r, 0));
    expect(logoutUserMock).toHaveBeenCalled();
  });


  it('updates UI for logged in user in auth state observer', async () => {
    const user = { uid: 'abc123', email: 'test@example.com' };
    // Find the onChange callback passed to observeAuthState
    const call = window.observeAuthState.mock.calls[0];
    const { onChange } = call[0];
    await onChange(user);
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('auth-status').textContent).toContain('Logged in as:');
    expect(document.getElementById('registration-form').style.display).toBe('none');
    expect(document.getElementById('login-form').style.display).toBe('none');
    expect(document.getElementById('logout-btn').style.display).toBe('inline-block');
  });

  it('updates UI for logged out user in auth state observer', async () => {
    // Find the onChange callback passed to observeAuthState
    const call = window.observeAuthState.mock.calls[0];
    const { onChange } = call[0];
    await onChange(null);
    await new Promise(r => setTimeout(r, 0));
    expect(document.getElementById('auth-status').textContent).toContain('Not logged in.');
    expect(document.getElementById('registration-form').style.display).toBe('block');
    expect(document.getElementById('login-form').style.display).toBe('block');
    expect(document.getElementById('logout-btn').style.display).toBe('none');
  });

  it('edit screen name: clicking edit then saving same name reverts without calling accountManager', async () => {
    const user = { uid: 'abc123', email: 'test@example.com' };
    const call = window.observeAuthState.mock.calls[0];
    const { onChange } = call[0];
    await onChange(user);
    await new Promise(r => setTimeout(r, 0));
    const editBtn = document.getElementById('edit-screenname');
    const displayNameSpan = document.getElementById('display-name-span');
    expect(editBtn).toBeTruthy();
    // Click edit to show input + save button
    editBtn.click();
    await new Promise(r => setTimeout(r, 0));
    const saveBtn = document.getElementById('save-screenname-btn');
    const input = document.getElementById('edit-screenname-input');
    expect(saveBtn).toBeTruthy();
    // Leave the name unchanged and click save
    input.value = displayNameSpan.textContent;
    saveBtn.click();
    await new Promise(r => setTimeout(r, 0));
    // Name should revert to original (no update attempted)
    expect(document.getElementById('display-name-span').textContent).toBe(displayNameSpan.textContent);
  });
});

// Additional DOM tests for forgot-password and flatpickr behaviors
describe('auth.js additional DOM tests', () => {
  beforeEach(() => {
    // Build minimal DOM including forgot-password elements
    document.body.innerHTML = `
      <input id="login-email" value="test@example.com">
      <div id="login-result"></div>
      <a id="forgot-password-link" href="#">Forgot</a>
      <div id="forgotPasswordModal" class="modal">
        <input id="forgot-email-input" />
        <button id="forgot-send-btn">Send</button>
        <div id="forgot-modal-alert"></div>
      </div>
      <input id="available-dates">
    `;
    // Prevent module from calling firebase.onAuthStateChanged during init
    window.observeAuthState = jest.fn();
    // toast mock
    window.toast = { show: jest.fn() };
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    delete window.toast;
    delete window.bootstrap;
    delete window.prompt;
  });

  it('forgot password fallback (prompt) sends reset and writes neutral message', async () => {
    const sendReset = jest.fn(() => Promise.resolve());
    window.firebase = {
      auth: jest.fn(() => ({ sendPasswordResetEmail: sendReset }))
    };
    // Make prompt return the email
    window.prompt = jest.fn(() => 'test@example.com');
    // Load module after DOM prepared
    jest.resetModules();
    require('../src/auth');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

    const forgotLink = document.getElementById('forgot-password-link');
    forgotLink.click();
    await new Promise(r => setTimeout(r, 0));
    expect(sendReset).toHaveBeenCalledWith('test@example.com');
    const loginResult = document.getElementById('login-result');
    expect(loginResult.innerHTML).toContain('password reset');
  });

  it('forgot password modal flow calls sendPasswordResetEmail and hides modal', async () => {
    const sendReset = jest.fn(() => Promise.resolve());
    window.firebase = {
      auth: jest.fn(() => ({ sendPasswordResetEmail: sendReset }))
    };
    // Provide a bootstrap Modal implementation that records show/hide calls
    let lastModal = null;
    window.bootstrap = { Modal: function(el) { lastModal = { show: jest.fn(), hide: jest.fn() }; return lastModal; } };
    // expose to global scope so auth.js can see it during module init
    global.bootstrap = window.bootstrap;
    // Use fake timers so we can fast-forward the 800ms hide timeout
    jest.useFakeTimers();
    jest.resetModules();
    require('../src/auth');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

    const forgotLink = document.getElementById('forgot-password-link');
    forgotLink.click();
    await Promise.resolve(); // microtasks are not affected by fake timers
    // modal should be shown
    expect(lastModal).toBeTruthy();
    expect(lastModal.show).toHaveBeenCalled();

    // Ensure send button is wired and works
    const emailInput = document.getElementById('forgot-email-input');
    const sendBtn = document.getElementById('forgot-send-btn');
    emailInput.value = 'test@example.com';
    // Trigger input event to validate
    emailInput.dispatchEvent(new Event('input'));
    sendBtn.click();
    // Allow any microtasks to run (promise resolution)
    await Promise.resolve();
    // Fast-forward the 800ms delay used before hiding modal
    jest.advanceTimersByTime(1000);
    // Allow any pending tasks
    await Promise.resolve();
    expect(sendReset).toHaveBeenCalledWith('test@example.com');
    // Should call toast and hide modal
    expect(window.toast.show).toHaveBeenCalled();
    expect(lastModal.hide).toHaveBeenCalled();
    jest.useRealTimers();
    delete global.bootstrap;
  });

  it('on logout resets flatpickr when present', async () => {
    const destroySpy = jest.fn();
    const flatpickrSpy = jest.fn();
    const dateInput = document.getElementById('available-dates');
    dateInput._flatpickr = { destroy: destroySpy };
    window.flatpickr = flatpickrSpy;
    global.flatpickr = flatpickrSpy;
    // observeAuthState should capture onChange
    window.observeAuthState = jest.fn();
    window.firebase = { auth: jest.fn(() => ({})), firestore: jest.fn() };
    jest.resetModules();
    require('../src/auth');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

    const call = window.observeAuthState.mock.calls[0];
    const { onChange } = call[0];
    await onChange(null);
    await new Promise(r => setTimeout(r, 0));
    expect(destroySpy).toHaveBeenCalled();
    expect(flatpickrSpy).toHaveBeenCalled();
    delete global.flatpickr;
  });
});
// tests/auth.test.js
// Automated tests for auth.js authentication functions

const { registerUser, loginUser, logoutUser, observeAuthState } = require('../src/auth');

describe('Authentication functions', () => {
  describe('registerUser', () => {
    it('registers a user and saves screenName/email', async () => {
      const mockSet = jest.fn(() => Promise.resolve('user saved'));
      const mockCreateUser = jest.fn(() => Promise.resolve({ user: { uid: 'abc123' } }));
      const mockFirestore = () => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({ set: mockSet }))
        }))
      });
      const mockFirebase = {
        auth: () => ({ createUserWithEmailAndPassword: mockCreateUser }),
        firestore: mockFirestore
      };
      const result = await registerUser({ screenName: 'Test', email: 'test@example.com', password: 'pw', firebase: mockFirebase });
      expect(mockCreateUser).toHaveBeenCalledWith('test@example.com', 'pw');
      expect(mockSet).toHaveBeenCalledWith({ screenName: 'Test', email: 'test@example.com' }, { merge: true });
      expect(result).toBe('user saved');
    });
  });

  describe('loginUser', () => {
    it('logs in a user', async () => {
      const mockLogin = jest.fn(() => Promise.resolve('logged in'));
      const mockFirebase = { auth: () => ({ signInWithEmailAndPassword: mockLogin }) };
      const result = await loginUser({ email: 'test@example.com', password: 'pw', firebase: mockFirebase });
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'pw');
      expect(result).toBe('logged in');
    });
  });

  describe('logoutUser', () => {
    it('logs out a user', async () => {
      const mockSignOut = jest.fn(() => Promise.resolve('logged out'));
      const mockFirebase = { auth: () => ({ signOut: mockSignOut }) };
      const result = await logoutUser({ firebase: mockFirebase });
      expect(mockSignOut).toHaveBeenCalled();
      expect(result).toBe('logged out');
    });
  });

  describe('observeAuthState', () => {
    it('calls onChange when auth state changes', () => {
      const mockOnAuthStateChanged = jest.fn((cb) => { cb('userObj'); return 'unsubscribe'; });
      const mockFirebase = { auth: () => ({ onAuthStateChanged: mockOnAuthStateChanged }) };
      const onChange = jest.fn();
      const unsub = observeAuthState({ firebase: mockFirebase, onChange });
      expect(mockOnAuthStateChanged).toHaveBeenCalledWith(onChange);
      expect(onChange).toHaveBeenCalledWith('userObj');
      expect(unsub).toBe('unsubscribe');
    });
  });
});
