/**
 * The few icons the browser-side templates need (cart drawer, quiz result).
 * Server-rendered pages get their icons from app/art.py.
 */
const svg = (paths, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const icons = {
  plus: (cls) => svg('<path d="M12 5v14M5 12h14"/>', cls),
  minus: (cls) => svg('<path d="M5 12h14"/>', cls),
  arrow: (cls) => svg('<path d="M4 12h15M13 6l6 6-6 6"/>', cls),
};
