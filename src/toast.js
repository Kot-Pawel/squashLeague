// Toast notification manager — provides a global `toast` singleton
// Usage: toast.show('Message', 'success' | 'error' | 'warning' | 'info', durationMs)

(function (global) {
    'use strict';

    const ICONS = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
        error:   '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>',
        info:    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>',
    };

    const COLORS = {
        success: 'var(--success)',
        error:   'var(--secondary)',
        warning: 'var(--warning)',
        info:    'var(--primary)',
    };

    class ToastManager {
        constructor() {
            if (typeof document === 'undefined') return; // guard for non-browser (tests)
            this._container = this._createContainer();
        }

        _createContainer() {
            const el = document.createElement('div');
            el.id = 'toast-container';
            el.setAttribute('aria-live', 'polite');
            el.setAttribute('aria-atomic', 'false');
            document.body.appendChild(el);
            return el;
        }

        /**
         * Show a toast notification.
         * @param {string} message  - The message to display.
         * @param {'success'|'error'|'warning'|'info'} type - Toast type (default: 'info').
         * @param {number} duration - Auto-dismiss delay in ms (default: 3800).
         */
        show(message, type = 'info', duration = 3800) {
            if (!this._container) return;

            const color = COLORS[type] || COLORS.info;
            const icon  = ICONS[type]  || ICONS.info;

            const toast = document.createElement('div');
            toast.className = 'sl-toast sl-toast--' + type;
            toast.setAttribute('role', 'alert');
            toast.innerHTML = `
                <span class="sl-toast__icon" style="color:${color}">${icon}</span>
                <span class="sl-toast__message">${message}</span>
                <button class="sl-toast__close" aria-label="Dismiss">&times;</button>
                <div class="sl-toast__progress" style="background:${color}"></div>
            `;

            // Dismiss on close button click
            toast.querySelector('.sl-toast__close').addEventListener('click', () => this._dismiss(toast));

            this._container.appendChild(toast);

            // Trigger enter animation on next frame
            requestAnimationFrame(() => toast.classList.add('sl-toast--visible'));

            // Auto-dismiss
            const timer = setTimeout(() => this._dismiss(toast), duration);
            toast._dismissTimer = timer;

            // Pause timer on hover
            toast.addEventListener('mouseenter', () => clearTimeout(toast._dismissTimer));
            toast.addEventListener('mouseleave', () => {
                toast._dismissTimer = setTimeout(() => this._dismiss(toast), 1500);
            });
        }

        _dismiss(toast) {
            if (!toast || toast._dismissed) return;
            toast._dismissed = true;
            clearTimeout(toast._dismissTimer);
            toast.classList.remove('sl-toast--visible');
            toast.classList.add('sl-toast--hiding');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
            // Fallback removal in case transitionend doesn't fire
            setTimeout(() => toast.remove(), 400);
        }
    }

    // Expose singleton on window for all scripts to share
    if (typeof window !== 'undefined') {
        window.toast = new ToastManager();
    }

    // Export class for testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { ToastManager };
    }

}(typeof window !== 'undefined' ? window : global));
