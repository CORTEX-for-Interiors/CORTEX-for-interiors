(function () {
  var theme = 'dark';
  try { var stored = localStorage.getItem('cortex-theme'); if (stored === 'light' || stored === 'dark') theme = stored; } catch (_) {}
  document.documentElement.dataset.theme = theme;
})();
