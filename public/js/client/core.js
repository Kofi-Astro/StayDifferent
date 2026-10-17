/**
 * ============================================================================
 *  Browser core utilities
 * ----------------------------------------------------------------------------
 *  - pageData(): the JSON the server embedded in <script id="sd-data">
 *  - storage:    localStorage wrapped in try/catch (it can throw in private
 *                mode or when storage is full/blocked — the site must still work)
 *  - on()/emit(): a tiny event bus so modules can react to each other
 *                 (e.g. the cart re-renders prices when the currency changes)
 *  - $ / $$:     querySelector shorthands
 * ============================================================================
 */

let cachedData;

/** Data embedded by the server for this page (settings, products, …). */
export function pageData() {
  if (cachedData) return cachedData;
  try {
    cachedData = JSON.parse(document.getElementById('sd-data')?.textContent || '{}');
  } catch {
    cachedData = {};
  }
  return cachedData;
}

/** Safe localStorage access — every call is wrapped so failures never break the page. */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — the in-memory state still works */
    }
  },
};

/* ---------- Event bus (built on a DOM EventTarget) ----------------------- */
const bus = new EventTarget();

/** Subscribe to an app event. Returns an unsubscribe function. */
export function on(name, handler) {
  const listener = (e) => handler(e.detail);
  bus.addEventListener(name, listener);
  return () => bus.removeEventListener(name, listener);
}

/** Broadcast an app event with optional data. */
export function emit(name, detail) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

/* ---------- DOM helpers ---------------------------------------------------- */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/** Does the visitor prefer reduced motion? */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smooth-scroll an element into view (instant if reduced motion is on). */
export function scrollToEl(el, block = 'start') {
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
}

/* ---------- Toast notifications ------------------------------------------- */
let toastTimer;
/** Show a short message at the bottom of the screen (announced to screen readers). */
export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = message;
  // Force a reflow so the slide-in transition replays every time.
  void el.offsetWidth;
  el.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.dataset.show = 'false'), 3200);
}
