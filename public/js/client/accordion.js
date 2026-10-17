/**
 * Accordions — any [data-accordion] block rendered by components/ui.js.
 * Toggles aria-expanded on the button and data-open/inert on the panel
 * (inert hides collapsed content from keyboard & screen readers).
 * CSS animates the height (see .accordion-panel in styles.css).
 */
export function initAccordions(root = document) {
  for (const acc of root.querySelectorAll('[data-accordion]')) {
    if (acc.dataset.ready) continue; // don't double-bind
    acc.dataset.ready = 'true';
    acc.addEventListener('click', (e) => {
      const btn = /** @type {HTMLElement} */ (e.target).closest('.accordion__trigger');
      if (!btn || !acc.contains(btn)) return;
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel.dataset.open = String(open);
      panel.inert = !open;
    });
  }
}
