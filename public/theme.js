(function () {
  // First visit follows the device setting; after that, the visitor's own choice (the lamp) wins.
  var theme = 'light';
  try { if (matchMedia('(prefers-color-scheme: dark)').matches) theme = 'dark'; } catch (_) {}
  try { var stored = localStorage.getItem('cortex-theme'); if (stored === 'light' || stored === 'dark') theme = stored; } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
