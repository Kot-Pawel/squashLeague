// Theme manager — handles dark/light mode switching, persistence in
// localStorage (anonymous) and Firestore users.appMode (logged-in users).
//
// Public API (available as window.themeManager):
//   themeManager.apply(mode)           — apply 'dark' | 'light' immediately
//   themeManager.toggle()              — flip current mode and persist
//   themeManager.current()             — returns 'dark' | 'light'
//   themeManager.setUser(uid)          — call on login: loads Firestore pref
//   themeManager.clearUser()           — call on logout: revert to localStorage pref

(function (global) {
    'use strict';

    const STORAGE_KEY = 'sl_app_mode';
    const DEFAULT_MODE = 'dark';
    const ICONS = { dark: '🌙', light: '☀️' };

    let _currentMode = DEFAULT_MODE;
    let _currentUid = null;

    // ── Core apply ──────────────────────────────────────────────────────────────

    function apply(mode) {
        const validated = (mode === 'light') ? 'light' : 'dark';
        _currentMode = validated;
        document.documentElement.setAttribute('data-theme', validated);
        _updateToggleIcon(validated);
        // Persist to localStorage as fallback / anonymous preference
        try { localStorage.setItem(STORAGE_KEY, validated); } catch (_) {}
    }

    function current() {
        return _currentMode;
    }

    // ── Toggle ──────────────────────────────────────────────────────────────────

    function toggle() {
        const next = _currentMode === 'dark' ? 'light' : 'dark';
        apply(next);
        _saveToFirestore(next);
    }

    // ── Icon update ─────────────────────────────────────────────────────────────

    function _updateToggleIcon(mode) {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.textContent = ICONS[mode];
        btn.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }

    // ── Firestore persistence ───────────────────────────────────────────────────

    function _saveToFirestore(mode) {
        if (!_currentUid) return;
        try {
            firebase.firestore()
                .collection('users')
                .doc(_currentUid)
                .set({ appMode: mode }, { merge: true })
                .catch(err => console.warn('theme: Firestore save failed', err));
        } catch (err) {
            console.warn('theme: Firestore not available', err);
        }
    }

    async function _loadFromFirestore(uid) {
        try {
            const doc = await firebase.firestore().collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.appMode === 'light' || data.appMode === 'dark') {
                    return data.appMode;
                }
            }
        } catch (err) {
            console.warn('theme: Firestore load failed', err);
        }
        return null;
    }

    // ── User session integration ────────────────────────────────────────────────

    /**
     * Called when a user logs in.
     * Loads their Firestore appMode preference; falls back to localStorage.
     * @param {string} uid
     */
    async function setUser(uid) {
        _currentUid = uid;
        const firestoreMode = await _loadFromFirestore(uid);
        if (firestoreMode) {
            // User has a saved preference — apply it
            apply(firestoreMode);
        } else {
            // No Firestore preference yet — write the current mode to bootstrap the field
            _saveToFirestore(_currentMode);
        }
    }

    /**
     * Called when the user logs out.
     * Clears the user reference and reverts to the localStorage preference.
     */
    function clearUser() {
        _currentUid = null;
        // Revert to stored anonymous preference
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            apply(stored || DEFAULT_MODE);
        } catch (_) {
            apply(DEFAULT_MODE);
        }
    }

    // ── Initialisation ──────────────────────────────────────────────────────────

    function _init() {
        // Apply stored preference immediately (page already has data-theme="dark"
        // from the HTML attribute, so dark is the FOUC-safe default)
        let initial = DEFAULT_MODE;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'light' || stored === 'dark') initial = stored;
        } catch (_) {}
        apply(initial);

        // Wire the toggle button once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', _wireButton);
        } else {
            _wireButton();
        }
    }

    function _wireButton() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', function () {
            toggle();
        });
        // Make sure icon reflects current state
        _updateToggleIcon(_currentMode);
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    const themeManager = { apply, toggle, current, setUser, clearUser };

    if (typeof window !== 'undefined') {
        window.themeManager = themeManager;
        _init();
    }

    // Export for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { themeManager };
    }

}(typeof window !== 'undefined' ? window : global));
