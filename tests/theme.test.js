const { mockFirebase, clearDom } = require('./test-utils');

describe('themeManager', () => {
  let themeManager;

  beforeEach(() => {
    clearDom();
    // ensure fresh module state
    jest.resetModules();
  });

  test('apply sets data-theme and localStorage', () => {
    const { firebase } = mockFirebase();
    const mod = require('../src/theme.js');
    themeManager = mod.themeManager;

    themeManager.apply('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('sl_app_mode')).toBe('light');
  });

  test('setUser applies firestore preference when present', async () => {
    const { spies } = mockFirebase();
    // make get() return a doc that exists with appMode 'light'
    spies.get.mockImplementation(() => Promise.resolve({ exists: true, data: () => ({ appMode: 'light' }) }));

    const mod = require('../src/theme.js');
    themeManager = mod.themeManager;

    await themeManager.setUser('uid-123');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  test('clearUser reverts to localStorage preference', () => {
    mockFirebase();
    localStorage.setItem('sl_app_mode', 'light');
    const mod = require('../src/theme.js');
    themeManager = mod.themeManager;

    themeManager.clearUser();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
