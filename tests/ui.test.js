// tests/ui.test.js
// Automated tests for ui.js pure functions

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
