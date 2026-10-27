(function () {
  // First visit follows the device setting; after that, the visitor's own choice (the lamp) wins.
  var theme = 'light';
  try { if (matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'; } catch (_) {}
  try { var stored = localStorage.getItem('cortex-theme'); if (stored === 'light' || stored === 'dark') theme = stored; } catch (_) {}
  document.documentElement.dataset.theme = theme;
  // Brain journey pages: pin the header and hold the page back until brain.js (deferred) has laid it out,
  // so the first paint never jumps (CLS). DOMContentLoaded fires after deferred scripts, so the release
  // always follows brain.js, and it fails open if brain.js breaks. No JS, reduced motion and /read/ skip it.
  var root = document.documentElement, path = location.pathname.replace(/\/$/, '');
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
  if (!reduce && ['', '/services', '/how-it-works', '/about', '/project-map'].indexOf(path) >= 0) {
    root.classList.add('journey-boot');
    document.addEventListener('DOMContentLoaded', function () { root.classList.remove('journey-boot'); });
  }
})();
