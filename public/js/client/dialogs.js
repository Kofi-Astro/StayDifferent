/**
 * Dialogs (mobile menu, search overlay, cart drawer) use the native <dialog>
 * element. showModal() gives us, for free:
 *   - a focus trap (Tab stays inside the dialog)
 *   - Esc to close
 *   - an inert page behind it (screen readers ignore the background)
 *
 * Wiring:
 *   <button data-dialog-open="cart-drawer">   opens #cart-drawer
 *   <button data-dialog-close>                 closes the dialog it's inside
 *   Clicking the dark backdrop also closes it.
 */
import { emit } from './core.js';

/** Element that had focus before the dialog opened (focus returns there). */
const returnFocus = new WeakMap();

export function openDialog(id) {
  const dialog = /** @type {HTMLDialogElement|null} */ (document.getElementById(id));
  if (!dialog || dialog.open) return;
  returnFocus.set(dialog, document.activeElement);
  // Close any other open dialog first (only one at a time).
  document.querySelectorAll('dialog[open]').forEach((d) => /** @type {HTMLDialogElement} */ (d).close());
  dialog.showModal();
  emit('dialog:open', id);
}

export function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

export function initDialogs() {
  document.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);

    const opener = target.closest('[data-dialog-open]');
    if (opener) {
      e.preventDefault();
      openDialog(opener.getAttribute('data-dialog-open'));
      return;
    }

    const closer = target.closest('[data-dialog-close]');
    if (closer) {
      closeDialog(closer.closest('dialog'));
      return;
    }

    // A click directly on the <dialog> element (not its content) = backdrop click.
    if (target instanceof HTMLDialogElement && target.open) {
      const rect = target.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) target.close();
    }
  });

  // Restore focus to whatever opened the dialog.
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('close', () => {
      const el = returnFocus.get(dialog);
      if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
    });
  }

  // Close the mobile menu when a link inside it is followed (same-page anchors).
  document.getElementById('mobile-menu')?.addEventListener('click', (e) => {
    if (/** @type {HTMLElement} */ (e.target).closest('a')) closeDialog(/** @type {HTMLDialogElement} */ (e.currentTarget));
  });
}
