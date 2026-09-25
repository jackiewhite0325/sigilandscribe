/**
 * Sigil & Scribe — client-side access control layer
 *
 * IMPORTANT (security reality):
 * This is UX / audience gating only. It is NOT authentication, authorization,
 * or true security. Anything stored in localStorage/sessionStorage or enforced
 * only in the browser can be inspected or bypassed. Do not put secrets,
 * API keys, credentials, or genuinely sensitive data behind this layer.
 *
 * Architecture:
 *   UI / Routes
 *        ↓
 *   Access-control interface (this file)
 *        ↓
 *   Current client-side provider (localStorage)
 *        ↓
 *   Future server/auth provider (swap here; pages keep calling the same API)
 *
 * Public API:
 *   ScribeAccess.getState()
 *   ScribeAccess.isMatureVerified()
 *   ScribeAccess.verifyMature()
 *   ScribeAccess.clearMature()
 *   ScribeAccess.requireMature({ gateEl, contentEl, onDenied })
 */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'scribe_access_v1';
  var MATURE_KEY = 'mature_verified';

  function readStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full or blocked — fail open for public content only */
    }
  }

  var Access = {
    getState: function () {
      var store = readStore();
      return {
        matureVerified: !!store[MATURE_KEY],
        /* future slots: member, client, admin */
        provider: 'client-localStorage'
      };
    },

    isMatureVerified: function () {
      return this.getState().matureVerified;
    },

    verifyMature: function () {
      var store = readStore();
      store[MATURE_KEY] = true;
      store.matureVerifiedAt = new Date().toISOString();
      writeStore(store);
      return true;
    },

    clearMature: function () {
      var store = readStore();
      delete store[MATURE_KEY];
      delete store.matureVerifiedAt;
      writeStore(store);
    },

    /**
     * Gate a mature page. Call early (before paint of protected content).
     * Options:
     *   gateEl    — element shown when not verified
     *   contentEl — element shown when verified
     *   onDenied  — optional callback
     *   onGranted — optional callback
     */
    requireMature: function (opts) {
      opts = opts || {};
      var verified = this.isMatureVerified();

      if (verified) {
        if (opts.gateEl) opts.gateEl.hidden = true;
        if (opts.contentEl) {
          opts.contentEl.hidden = false;
          opts.contentEl.removeAttribute('hidden');
        }
        document.body.classList.add('verified');
        if (typeof opts.onGranted === 'function') opts.onGranted();
        return true;
      }

      if (opts.contentEl) opts.contentEl.hidden = true;
      if (opts.gateEl) {
        opts.gateEl.hidden = false;
        opts.gateEl.removeAttribute('hidden');
      }
      document.body.classList.remove('verified');
      if (typeof opts.onDenied === 'function') opts.onDenied();
      return false;
    },

    /**
     * Inject a full-page 18+ click-through overlay when not verified.
     * Hides [data-mature-content] (or opts.contentSelector) until the visitor confirms.
     * Shared matureVerified flag across any pages that opt in. Not used by default catalogue books.
     * Client-side UX only — not security.
     */
    gateMaturePage: function (opts) {
      opts = opts || {};
      var contentSel = opts.contentSelector || '[data-mature-content]';
      var leaveHref = opts.leaveHref || 'library.html';
      var title = opts.title || 'Mature content';
      var self = this;

      function reveal() {
        document.body.classList.add('verified');
        var overlay = document.getElementById('scribe-mature-overlay');
        if (overlay) overlay.remove();
        document.querySelectorAll(contentSel).forEach(function (el) {
          el.hidden = false;
          el.removeAttribute('hidden');
          el.style.visibility = '';
        });
      }

      if (this.isMatureVerified()) {
        reveal();
        if (typeof opts.onGranted === 'function') opts.onGranted();
        return true;
      }

      // Hide content until confirmed (avoid flash of protected UI)
      document.querySelectorAll(contentSel).forEach(function (el) {
        el.hidden = true;
        el.style.visibility = 'hidden';
      });

      if (document.getElementById('scribe-mature-overlay')) return false;

      var overlay = document.createElement('div');
      overlay.id = 'scribe-mature-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'scribe-mature-title');
      overlay.innerHTML =
        '<div class="scribe-mature-panel">' +
        '<p class="scribe-mature-eyebrow">Age-restricted</p>' +
        '<h1 id="scribe-mature-title">' + title + '</h1>' +
        '<p class="scribe-mature-sub">This page contains mature fiction intended for readers 18 years of age or older. Themes may include complex relationships, strong language, and intense material.</p>' +
        '<p class="scribe-mature-note">This is a click-through acknowledgement, not secure authentication. You can leave at any time.</p>' +
        '<div class="scribe-mature-actions">' +
        '<button type="button" class="scribe-mature-enter" id="scribe-mature-enter">I am 18 or older — enter</button>' +
        '<a class="scribe-mature-leave" href="' + leaveHref + '">Leave this page</a>' +
        '</div></div>';

      // Minimal styles so pages without house.css still work
      if (!document.getElementById('scribe-mature-styles')) {
        var style = document.createElement('style');
        style.id = 'scribe-mature-styles';
        style.textContent =
          '#scribe-mature-overlay{position:fixed;inset:0;z-index:9000;background:rgba(43,33,24,0.92);display:flex;align-items:center;justify-content:center;padding:24px;}' +
          '.scribe-mature-panel{max-width:420px;width:100%;background:#FDFBF7;color:#2B2B2B;border-radius:10px;padding:28px 24px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.35);}' +
          '.scribe-mature-eyebrow{font-family:system-ui,sans-serif;font-size:0.7rem;letter-spacing:0.14em;text-transform:uppercase;color:#8A4A55;margin:0 0 10px;}' +
          '.scribe-mature-panel h1{font-family:Georgia,serif;font-size:1.5rem;font-weight:500;margin:0 0 12px;color:#38251A;line-height:1.2;}' +
          '.scribe-mature-sub,.scribe-mature-note{font-family:system-ui,sans-serif;font-size:0.9rem;line-height:1.55;color:#5a5348;margin:0 0 12px;text-align:left;}' +
          '.scribe-mature-note{font-size:0.8rem;color:#8a8272;}' +
          '.scribe-mature-actions{display:flex;flex-direction:column;gap:10px;margin-top:20px;}' +
          '.scribe-mature-enter{font-family:system-ui,sans-serif;font-size:0.95rem;padding:12px 16px;min-height:44px;border:none;border-radius:6px;background:#8A4A55;color:#FDFBF7;cursor:pointer;}' +
          '.scribe-mature-enter:hover{background:#6e3a44;}' +
          '.scribe-mature-enter:focus-visible{outline:2px solid #38251A;outline-offset:2px;}' +
          '.scribe-mature-leave{font-family:system-ui,sans-serif;font-size:0.85rem;color:#6b6255;text-decoration:underline;text-underline-offset:3px;padding:10px;min-height:44px;}';
        document.head.appendChild(style);
      }

      document.body.appendChild(overlay);
      var btn = document.getElementById('scribe-mature-enter');
      if (btn) {
        btn.focus();
        btn.addEventListener('click', function () {
          self.verifyMature();
          reveal();
          if (typeof opts.onGranted === 'function') opts.onGranted();
        });
      }
      return false;
    }
  };

  global.ScribeAccess = Access;
})(typeof window !== 'undefined' ? window : this);
