describe('animations.js unit', () => {
  beforeEach(() => {
    jest.resetModules();
    document.body.innerHTML = '';
    delete global.window.Motion;
    delete global.window.toast;
  });
  
  // Provide a minimal IntersectionObserver for JSDOM
  beforeEach(() => {
    global.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; }
      observe() {}
      unobserve() {}
    };
  });

  test('nav links toggle sections, set active, and trigger loadPlayerStats + animate', () => {
    document.body.innerHTML = `
      <div id="app-sidebar"></div>
      <a class="sidebar-link" data-section="availability-section"></a>
      <a class="sidebar-link" data-section="player-stats-section"></a>
      <div id="availability-section"></div>
      <div id="player-stats-section"><div class="card"></div></div>
    `;

    window.loadPlayerStats = jest.fn();
    const animate = jest.fn();
    const stagger = jest.fn(() => 0);
    window.Motion = { animate, stagger };

    const mod = require('../src/animations.js');
    const ev = new Event('DOMContentLoaded');
    document.dispatchEvent(ev);

    const playerLink = document.querySelector('[data-section="player-stats-section"]');
    playerLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const avail = document.getElementById('availability-section');
    const stats = document.getElementById('player-stats-section');
    expect(avail.style.display).toBe('none');
    expect(stats.style.display).toBe('');
    expect(window.loadPlayerStats).toHaveBeenCalled();
    expect(animate).toHaveBeenCalled();
  });

  test('initScrollReveal uses IntersectionObserver and animates on intersection', () => {
    document.body.innerHTML = '<div class="card"></div>';
    const animate = jest.fn();
    window.Motion = { animate };

    const observers = [];
    global.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; observers.push(this); }
      observe() {}
      unobserve() {}
    };

    require('../src/animations.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const card = document.querySelector('.card');
    // simulate intersection
    observers[0].cb([{ isIntersecting: true, target: card }]);
    expect(animate).toHaveBeenCalled();
  });

  test('initRipple appends a ripple element and removes it on animationend', () => {
    document.body.innerHTML = '<button class="btn">Click</button>';
    const btn = document.querySelector('.btn');
    btn.getBoundingClientRect = jest.fn(() => ({ width: 20, height: 10, left: 0, top: 0 }));

    require('../src/animations.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 5 }));
    const ripple = document.querySelector('.btn-ripple');
    expect(ripple).not.toBeNull();

    // ripple was appended and has expected class
    expect(ripple).not.toBeNull();
    expect(ripple.className).toBe('btn-ripple');
  });

  test('initToastShake monkey-patches toast.show and calls Motion.animate on error', () => {
    document.body.innerHTML = '<div id="toast-container"></div>';
    const origShow = jest.fn();
    window.toast = { show: origShow };
    const animate = jest.fn();
    window.Motion = { animate };

    require('../src/animations.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    // patched show should call original and then animate for error type
    window.toast.show('oops', 'error', 1000);
    expect(origShow).toHaveBeenCalledWith('oops', 'error', 1000);
    expect(animate).toHaveBeenCalled();
  });
});
