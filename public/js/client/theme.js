/**
 * Light / dark theme toggle.
 *
 * - First visit: the site follows the device setting (prefers-color-scheme).
 * - Clicking the header button saves an explicit choice in localStorage
 *   ("sd-theme" = "dark" | "light"). A tiny inline script in
 *   templates/base.html re-applies it before paint on every page load, so
 *   there's no flash of the wrong theme.
 * - <html data-theme="…"> is what the CSS keys off (see styles.css tokens).
 * - The button is a toggle (aria-pressed = dark theme on) for screen readers.
 */
import { $$ } from './core.js';

const KEY = 'sd-theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: dark)');

/** The visitor's saved choice, or null if they haven't picked one. */
function saved() {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null; // storage blocked (private mode etc.) — just follow the device
  }
}

function save(theme) {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* choice still applies for this page view */
  }
}

/** Apply a theme to the page and update the toggle buttons. */
function apply(theme) {
  root.dataset.theme = theme;
  const dark = theme === 'dark';
  for (const btn of $$('[data-theme-toggle]')) {
    btn.setAttribute('aria-pressed', String(dark));
    btn.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
  }
  // Match the mobile browser's toolbar colour to the page.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15110e' : '#1e1612');
}

export function initTheme() {
  apply(saved() || (media.matches ? 'dark' : 'light'));

  for (const btn of $$('[data-theme-toggle]')) {
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      save(next);
      apply(next);
    });
  }

  // Until the visitor makes a choice, follow live changes to the device setting.
  media.addEventListener('change', () => {
    if (!saved()) apply(media.matches ? 'dark' : 'light');
  });
}
