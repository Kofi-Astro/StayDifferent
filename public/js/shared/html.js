/**
 * ============================================================================
 *  html`` — a tiny, safe HTML templating helper (no dependencies)
 * ----------------------------------------------------------------------------
 *  Used by BOTH the server (to render full pages) and the browser (to re-render
 *  bits like the cart drawer or filtered product grids). Because the same
 *  functions run in both places, the markup is always identical.
 *
 *  Usage:
 *      import { html, raw } from '../shared/html.js';
 *      const card = (p) => html`<h3 class="title">${p.name}</h3>`;
 *
 *  SAFETY: every ${value} is HTML-escaped automatically. That matters because
 *  much of the content is typed into the admin panel — a product name like
 *  `<script>` will be shown as text, never executed.
 *
 *  - Nested html`` results are inserted as-is (they are already safe).
 *  - Arrays are joined, so you can write ${items.map((i) => html`<li>${i}</li>`)}.
 *  - null / undefined / false / true render as nothing (handy for conditionals:
 *    ${isNew && html`<span>New</span>`}).
 *  - raw(string) opts OUT of escaping. Only use it for markup you wrote yourself
 *    (e.g. inline SVG icons), never for user/admin content.
 * ============================================================================
 */

/** Wrapper marking a string as already-safe HTML. */
export class SafeHTML {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for safe use in HTML text or attribute values. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Mark trusted markup as safe (skips escaping). */
export function raw(markup) {
  return new SafeHTML(String(markup ?? ''));
}

/** Convert any interpolated value into an HTML string. */
function toHtml(value) {
  if (value === null || value === undefined || value === false || value === true) return '';
  if (value instanceof SafeHTML) return value.value;
  if (Array.isArray(value)) return value.map(toHtml).join('');
  return escapeHtml(value);
}

/**
 * Tagged template literal that escapes interpolations.
 * @returns {SafeHTML}
 */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    out += toHtml(values[i]) + strings[i + 1];
  }
  return new SafeHTML(out);
}

/**
 * Make an admin-supplied URL safe for an href/src attribute.
 * Allows relative paths, #anchors, http(s), mailto:, tel: and WhatsApp links.
 * Anything else (e.g. `javascript:`) becomes "#".
 */
export function safeUrl(url) {
  const value = String(url ?? '').trim();
  if (!value) return '#';
  if (/^(\/(?!\/)|#|\?)/.test(value)) return value; // site-relative
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  return '#';
}

/**
 * Turn plain text from the admin into paragraphs.
 * A blank line in the admin textarea starts a new paragraph.
 * @param {string} text
 * @param {string} [className]
 */
export function paragraphs(text, className = '') {
  const parts = String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return html`${parts.map((p) => html`<p class="${className}">${p}</p>`)}`;
}

/**
 * Render "line one|line two" style headings: the part after the `|` is shown
 * on a second line in italic accent (the brand's signature heading rhythm).
 * Admins type headings like "Know your|undertone".
 */
export function splitHeading(text) {
  const [first, ...rest] = String(text ?? '').split('|');
  const second = rest.join('|').trim();
  return second
    ? html`<span class="h-line">${first.trim()}</span> <em class="h-line h-accent">${second}</em>`
    : html`${first.trim()}`;
}

/** Join class names, skipping falsy values. */
export function cx(...names) {
  return names.filter(Boolean).join(' ');
}
