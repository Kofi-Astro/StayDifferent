/**
 * Minimal DOM helpers for the admin UI.
 *
 *   h('button', { class: 'btn', onclick: save }, 'Save')
 *
 * h() creates an element, sets attributes/properties/listeners and appends
 * children (strings become text nodes — so admin content is never parsed as
 * HTML, which keeps it safe).
 */

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') Object.assign(el.style, value);
    else if (['value', 'checked', 'selected', 'disabled', 'hidden', 'multiple'].includes(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Inline SVG icons used in the admin (trusted, static markup). */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};

export function icon(name) {
  const span = document.createElement('span');
  span.className = 'a-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  return span;
}

/** Placeholder art URL (same format as app/art.py). */
export function artUrl(swatch, texture = 'straight', seed = 'x') {
  const s = swatch || { base: '#3a2b22', mid: '#5d4636', highlight: '#a07c5c' };
  const colours = [s.base, s.mid, s.highlight].map((c) => String(c || '#888888').replace('#', '')).join('-');
  return `/art/${texture || 'straight'}/${colours}/${String(seed).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'x'}.svg`;
}

/** Turn "Honey Rebel Bundle" into "honey-rebel-bundle". */
export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
