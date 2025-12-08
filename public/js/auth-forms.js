(function () {
  function toggleDisabled(form, disabled) {
    const fields = form.querySelectorAll('input, button, select, textarea');
    fields.forEach((field) => {
      if (disabled) {
        field.dataset.wasDisabled = field.disabled ? 'true' : 'false';
        field.disabled = true;
      } else {
        field.disabled = field.dataset.wasDisabled === 'true';
        delete field.dataset.wasDisabled;
      }
    });
  }

  function toggleIndicator(form, show) {
    const indicatorSelector = form.getAttribute('hx-indicator');
    const indicator = indicatorSelector ? document.querySelector(indicatorSelector) : form.querySelector('.htmx-indicator');
    if (!indicator) return;
    indicator.style.display = show ? 'inline-block' : '';
  }

  function handleDisable(evt) {
    const form = evt.target.closest('.auth-hx-form');
    if (!form) return;
    toggleDisabled(form, true);
    toggleIndicator(form, true);
  }

  function handleEnable(evt) {
    const form = evt.target.closest('.auth-hx-form');
    if (!form) return;
    toggleDisabled(form, false);
    toggleIndicator(form, false);
  }

  document.body.addEventListener('htmx:beforeRequest', handleDisable);
  ['htmx:afterRequest', 'htmx:responseError', 'htmx:sendError'].forEach((eventName) => {
    document.body.addEventListener(eventName, handleEnable);
  });
})();
