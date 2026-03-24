const { clearDom } = require('./test-utils');
const { ToastManager } = require('../src/toast.js');

describe('ToastManager', () => {
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    clearDom();
    jest.resetModules();
    const mod = require('../src/toast.js');
    manager = new mod.ToastManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('show creates container and toast element', () => {
    manager.show('Hello', 'info', 1000);
    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container.querySelectorAll('.sl-toast').length).toBe(1);
  });

  test('auto-dismiss removes toast after duration', () => {
    manager.show('Bye', 'info', 1000);
    const toast = document.querySelector('.sl-toast');
    expect(toast).toBeTruthy();
    jest.advanceTimersByTime(1000);
    // allow removal timeout fallback
    jest.advanceTimersByTime(500);
    expect(document.querySelector('.sl-toast')).toBeNull();
  });
});
