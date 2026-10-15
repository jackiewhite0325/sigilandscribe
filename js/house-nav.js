/**
 * Compact house nav + CSS fallback if house.css failed to load (404).
 */
(function () {
  var FALLBACK_CSS = [
    '.house-nav{position:relative;z-index:600;border-bottom:1px solid #e4dcc9;background:#faf7f2}',
    '.house-nav .nav-inner{max-width:1100px;margin:0 auto;padding:4px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px}',
    '.house-nav .brand{font-family:Georgia,serif;font-size:.9rem;font-weight:600;color:#2b2620;text-decoration:none;white-space:nowrap}',
    '.house-nav .brand span{color:#b08d57}',
    '.house-nav .nav-toggle{display:inline-block;background:transparent;border:1px solid #e4dcc9;color:#6b6255;font:0.68rem system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:4px;cursor:pointer;min-height:30px}',
    '.house-nav .nav-links{display:none!important;list-style:none!important;margin:0!important;padding:8px!important;position:absolute;top:100%;right:12px;width:min(240px,calc(100vw - 24px));background:#fffdf9;border:1px solid #e4dcc9;border-radius:8px;box-shadow:0 12px 28px rgba(43,38,32,.12);flex-direction:column;gap:2px;z-index:620}',
    '.house-nav.is-open .nav-links{display:flex!important}',
    '.house-nav .nav-links li{display:block!important;margin:0!important;padding:0!important;list-style:none!important}',
    '.house-nav .nav-links a{display:block;font:0.88rem system-ui,sans-serif;color:#6b6255;text-decoration:none;padding:10px 12px;border-radius:5px}',
    '.house-nav .nav-links a:hover{color:#2b2620;background:rgba(176,141,87,.12)}',
    '.house-nav .nav-links a[aria-current=page]{color:#b08d57}'
  ].join('');

  function ensureCss() {
    var probe = document.querySelector('.house-nav .nav-links');
    if (!probe) return;
    var display = window.getComputedStyle(probe).display;
    // Unstyled list is typically "block"; our CSS forces none or flex
    var likelyUnstyled = display === 'block' && !document.getElementById('house-nav-fallback');
    if (likelyUnstyled) {
      var s = document.createElement('style');
      s.id = 'house-nav-fallback';
      s.textContent = FALLBACK_CSS;
      document.head.appendChild(s);
    }
  }

  function init() {
    ensureCss();
    var nav = document.querySelector('.house-nav');
    if (!nav) return;
    var toggle = nav.querySelector('.nav-toggle');
    var links = nav.querySelector('.nav-links');
    if (!toggle || !links) return;

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!nav.classList.contains('is-open'));
    });
    document.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


/**
 * External link redirect notice.
 * Any link leaving sigilandscribe shows "You are now being redirected"
 * and opens in a new tab.
 */
(function () {
  var SITE_HOST = 'jackiewhite0325.github.io';
  function isExternal(href) {
    if (!href) return false;
    if (href.charAt(0) === '#' || href.charAt(0) === '/') return false;
    if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 || href.indexOf('sms:') === 0) return false;
    try {
      var url = new URL(href, window.location.href);
      return url.hostname !== window.location.hostname && url.hostname !== '';
    } catch (e) {
      return href.indexOf('http') === 0;
    }
  }
  function showNotice() {
    var existing = document.getElementById('redirect-notice');
    if (existing) existing.remove();
    var notice = document.createElement('div');
    notice.id = 'redirect-notice';
    notice.setAttribute('role', 'status');
    notice.textContent = 'You are now being redirected.';
    notice.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);background:#5a3827;color:#fbf6e9;padding:12px 22px;border-radius:10px;font-family:Nunito,system-ui,sans-serif;font-size:15px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.25);';
    document.body.appendChild(notice);
    setTimeout(function () { if (notice.parentNode) notice.parentNode.removeChild(notice); }, 2500);
  }
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!isExternal(href)) return;
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
    showNotice();
  }, true);
})();
