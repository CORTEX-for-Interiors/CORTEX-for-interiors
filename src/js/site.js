// Cortex Studio site script. Two jobs, both optional: the page works fully without it.
// 1. Reveal sections that start below the fold as they enter view (IntersectionObserver,
//    no scroll listeners). Content above the fold is never hidden, so nothing flashes.
// 2. Enhance the project request form: inline errors under each field, a sending state,
//    and a plain message if the request does not go through.
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('main > section:not(.hero)');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    // Anything that receives keyboard focus is shown at once, never left mid-reveal.
    document.addEventListener('focusin', function (e) {
      var s = e.target.closest && e.target.closest('section.pre');
      if (s) { s.classList.remove('pre'); io.unobserve(s); }
    });
    // Read every position first, then write classes, so the browser lays out once.
    var fold = window.innerHeight;
    var below = Array.prototype.filter.call(targets, function (el) { return el.getBoundingClientRect().top > fold; });
    below.forEach(function (el) { el.classList.add('reveal', 'pre'); io.observe(el); });
  }

  var form = document.getElementById('request-form');
  if (!form || !window.fetch) return;
  var status = document.getElementById('form-status');
  var messages = {
    valueMissing: 'Please fill this in.',
    typeMismatch: 'Please check this address.',
    tooLong: 'This is too long.'
  };

  function setError(field, text) {
    var slot = document.getElementById(field.id + '-err');
    field.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (slot) slot.textContent = text || '';
  }

  function check(field) {
    if (field.validity.valid) { setError(field, ''); return true; }
    var key = Object.keys(messages).filter(function (k) { return field.validity[k]; })[0];
    if (field.type === 'checkbox') { status.className = 'form-status error'; status.textContent = 'Please tick the consent box so we can reply.'; return false; }
    setError(field, messages[key] || 'Please check this answer.');
    return false;
  }

  form.addEventListener('blur', function (e) {
    if (e.target.id && e.target.getAttribute('aria-invalid') === 'true') check(e.target);
  }, true);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.className = 'form-status';
    status.textContent = '';
    var fields = Array.prototype.slice.call(form.querySelectorAll('input:not([name="company_url"]), select'));
    var invalid = fields.filter(function (f) { return !check(f); });
    if (invalid.length) { invalid[0].focus(); return; }

    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Sending';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (r) {
        if (r.ok) { window.location.assign('/thanks'); return; }
        status.className = 'form-status error';
        status.textContent = (r.body && r.body.error) || 'That did not go through. Please try again.';
        button.disabled = false; button.textContent = 'Send a project';
      })
      .catch(function () {
        status.className = 'form-status error';
        status.textContent = 'That did not go through. Check your connection and try again.';
        button.disabled = false; button.textContent = 'Send a project';
      });
  });
})();
