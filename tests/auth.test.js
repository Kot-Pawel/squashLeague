// tests/auth.test.js
// Automated tests for auth.js authentication functions

const { registerUser, loginUser, logoutUser, observeAuthState } = require('../auth');

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
