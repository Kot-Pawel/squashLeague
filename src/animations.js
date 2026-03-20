/**
 * animations.js
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. App-shell navigation controller (sidebar + bottom nav ↔ sections)
 * 2. Micro-interactions via Motion One (scroll-reveal, stagger, ripple, shake)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. Navigation controller ──────────────────────────────────────────────────

const ALL_SECTIONS = [
  'availability-section',
  'find-partner-section',
  'match-requests-section',
  'player-stats-section',
];

/**
 * Show one section, hide the rest.
 * If the section is the leaderboard, trigger a data load.
 */
function showSection(targetId) {
  ALL_SECTIONS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = id === targetId ? '' : 'none';
  });

  // Mark active link on both navs
  document.querySelectorAll('.sidebar-link, .bottom-nav__item').forEach(link => {
    link.classList.toggle('active', link.dataset.section === targetId);
  });

  // Load leaderboard data on first visit (or re-visit)
  if (targetId === 'player-stats-section' && window.loadPlayerStats) {
    window.loadPlayerStats();
  }

  // Animate newly-visible cards
  animateSectionEntrance(targetId);
}

function initNav() {
  // Wire up all nav links
  document.querySelectorAll('.sidebar-link, .bottom-nav__item').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      showSection(this.dataset.section);
      // Close sidebar on mobile if open
      document.getElementById('app-sidebar').classList.remove('sidebar--open');
    });
  });

  // Hamburger toggle (sidebar open/close on mobile)
  const hamburger = document.getElementById('sidebar-hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('app-sidebar').classList.toggle('sidebar--open');
    });
  }

  // Default: show availability section
  showSection('availability-section');
}

// ── 2. Micro-interactions with Motion One ─────────────────────────────────────

/**
 * Animate cards inside a section when it becomes visible.
 * Falls back gracefully if Motion One isn't loaded.
 */
function animateSectionEntrance(sectionId) {
  if (typeof window.Motion === 'undefined') return;
  const { animate, stagger } = window.Motion;

  const section = document.getElementById(sectionId);
  if (!section) return;

  const cards = section.querySelectorAll('.card, .stat-card');
  if (cards.length === 0) return;

  animate(
    cards,
    { opacity: [0, 1], y: [24, 0] },
    { delay: stagger(0.07), duration: 0.38, easing: [0.22, 1, 0.36, 1] }
  );
}

/**
 * Scroll-reveal for cards already in the DOM (availability & find-partner
 * cards are always present, so we reveal them on load).
 */
function initScrollReveal() {
  if (typeof window.Motion === 'undefined') return;
  const { animate } = window.Motion;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animate(
          entry.target,
          { opacity: [0, 1], y: [32, 0] },
          { duration: 0.42, easing: [0.22, 1, 0.36, 1] }
        );
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card').forEach(card => observer.observe(card));
}

/**
 * Ripple effect on every .btn click.
 */
function initRipple() {
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const rect   = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size   = Math.max(rect.width, rect.height);

    ripple.className = 'btn-ripple';
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size / 2}px;
      top:${e.clientY - rect.top  - size / 2}px;
    `;
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

/**
 * Shake the toast container when an error toast fires.
 * We monkey-patch toast.show() to add the shake.
 */
function initToastShake() {
  if (typeof window.Motion === 'undefined') return;
  const { animate } = window.Motion;

  const origShow = window.toast && window.toast.show.bind(window.toast);
  if (!origShow) return;

  window.toast.show = function(message, type, duration) {
    origShow(message, type, duration);
    if (type === 'error' || type === 'warning') {
      const container = document.getElementById('toast-container');
      if (container) {
        animate(
          container,
          { x: [0, -8, 8, -6, 6, -3, 3, 0] },
          { duration: 0.45, easing: 'ease-in-out' }
        );
      }
    }
  };
}

/**
 * Stagger-animate match-request list items whenever the list refreshes.
 * We watch #match-requests-list for DOM mutations.
 */
function initListStagger() {
  if (typeof window.Motion === 'undefined') return;
  const { animate, stagger } = window.Motion;

  const list = document.getElementById('match-requests-list');
  if (!list) return;

  const mo = new MutationObserver(() => {
    const rows = list.querySelectorAll('li');
    if (rows.length === 0) return;
    animate(
      rows,
      { opacity: [0, 1], x: [-16, 0] },
      { delay: stagger(0.05), duration: 0.3, easing: [0.22, 1, 0.36, 1] }
    );
  });

  mo.observe(list, { childList: true, subtree: true });
}

// ── Bootstrap everything on DOMContentLoaded ─────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  initNav();
  initScrollReveal();
  initRipple();
  initToastShake();
  initListStagger();
});
