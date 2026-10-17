/**
 * Newsletter & contact forms.
 *
 * Forms are real <form>s that POST to /api/… so they work without JavaScript.
 * With JavaScript we validate first (instant, friendly messages), then submit
 * with fetch() and show the result inline — no page reload.
 * The server validates again; the browser checks are only for convenience.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field rules for client-side validation, keyed by input name. */
const RULES = {
  email: (v) => (EMAIL_RE.test(v) ? '' : 'Please enter a valid email address.'),
  name: (v) => (v.trim() ? '' : 'Please tell us your name.'),
  message: (v) => (v.trim().length >= 10 ? '' : 'Your message needs at least 10 characters.'),
};

/** Show/clear an error under a field and flag it for screen readers. */
function setFieldError(form, name, message) {
  const input = form.elements.namedItem(name);
  if (!(input instanceof HTMLElement)) return;
  const errId = `${input.id}-error`;
  let err = document.getElementById(errId);
  if (message) {
    if (!err) {
      err = document.createElement('p');
      err.id = errId;
      err.className = 'form-error';
      // Newsletter rows are flex rows — put the message after the row instead.
      (input.closest('.newsletter__row') || input).after(err);
    }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errId);
  } else {
    err?.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function validate(form) {
  let firstInvalid = null;
  for (const [name, rule] of Object.entries(RULES)) {
    const input = form.elements.namedItem(name);
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) continue;
    const message = rule(input.value);
    setFieldError(form, name, message);
    if (message && !firstInvalid) firstInvalid = input;
  }
  firstInvalid?.focus();
  return !firstInvalid;
}

export function initForms() {
  for (const form of document.querySelectorAll('form[data-form]')) {
    const f = /** @type {HTMLFormElement} */ (form);
    const status = f.querySelector('.form-status');
    const button = f.querySelector('[type="submit"]');

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validate(f)) return;

      button.disabled = true;
      status.textContent = 'Sending…';
      status.dataset.state = '';
      try {
        const res = await fetch(f.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(f))),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          for (const [name, msg] of Object.entries(data.errors || {})) setFieldError(f, name, msg);
          throw new Error(data.error || 'Something went wrong. Please try again.');
        }
        status.textContent = data.message || 'Thank you!';
        status.dataset.state = 'success';
        f.reset();
      } catch (err) {
        status.textContent = err.message;
        status.dataset.state = 'error';
      } finally {
        button.disabled = false;
      }
    });

    // Clear a field's error as soon as the user fixes it.
    f.addEventListener('input', (e) => {
      const input = /** @type {HTMLInputElement} */ (e.target);
      if (input.getAttribute('aria-invalid') === 'true' && RULES[input.name] && !RULES[input.name](input.value)) {
        setFieldError(f, input.name, '');
      }
    });
  }
}
