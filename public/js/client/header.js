/**
 * Header behaviour:
 *   - adds a hairline border once the page scrolls
 *   - Shop mega-menu: opens on hover (mouse) or via the chevron button
 *     (keyboard/touch), closes on Esc, outside click or focus leaving it.
 */
import { $ } from './core.js';

export function initHeader() {
  const header = $('[data-header]');
  if (!header) return;

  /* Scrolled state — an IntersectionObserver on a 1px sentinel at the top of
     the page is cheaper than listening to every scroll event. */
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'position:absolute;top:0;height:1px;width:1px;';
  document.body.prepend(sentinel);
  new IntersectionObserver(([entry]) => {
    header.dataset.scrolled = String(!entry.isIntersecting);
  }).observe(sentinel);

  initMegaMenu(header);
}

function initMegaMenu(header) {
  const item = $('[data-mega]', header);
  const toggle = $('[data-mega-toggle]', header);
  const panel = $('[data-mega-panel]', header);
  if (!item || !toggle || !panel) return;

  let closeTimer;
  const setOpen = (open) => {
    clearTimeout(closeTimer);
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    item.dataset.open = String(open);
  };
  const isOpen = () => !panel.hidden;

  // Keyboard / touch: the chevron button toggles the panel.
  toggle.addEventListener('click', () => setOpen(!isOpen()));

  // Mouse: open on hover, close shortly after leaving (forgiving diagonal moves).
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
  item.addEventListener('mouseenter', () => hoverCapable.matches && setOpen(true));
  item.addEventListener('mouseleave', () => {
    if (!hoverCapable.matches) return;
    closeTimer = setTimeout(() => setOpen(false), 180);
  });

  // Esc closes and returns focus to the toggle.
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Close when focus moves outside the menu (e.g. tabbing past it).
  item.addEventListener('focusout', (e) => {
    if (!item.contains(/** @type {Node} */ (e.relatedTarget))) setOpen(false);
  });

  // Close on outside click.
  document.addEventListener('click', (e) => {
    if (isOpen() && !item.contains(/** @type {Node} */ (e.target))) setOpen(false);
  });
}
