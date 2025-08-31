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
      expect(mockSet).toHaveBeenCalledWith({ screenName: 'Test', email: 'test@example.com' });
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
