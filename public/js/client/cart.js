/**
 * ============================================================================
 *  Cart — state, persistence and the slide-out drawer
 * ----------------------------------------------------------------------------
 *  State lives in memory and is mirrored to localStorage ("sd-cart") so the
 *  bag survives page loads. Each line stores a snapshot of what the shopper
 *  saw (name, price, swatch…) so the drawer renders instantly; the server
 *  re-checks real prices & stock at checkout (server/routes/api.js).
 *
 *  Public API (used by product pages, cards, etc.):
 *     addToCart(line)     → adds/merges a line and opens the drawer
 *     getCart()           → current lines
 *  Events emitted: 'cart:change' with the new lines.
 * ============================================================================
 */
import { storage, emit, on, pageData, $, toast } from './core.js';
import { money, currentCurrency } from './currency.js';
import { openDialog } from './dialogs.js';
import { html, raw } from '../shared/html.js';
import { imageOrArt } from '../shared/art.js';
import { icons } from '../shared/icons.js';

const STORAGE_KEY = 'sd-cart';
const MAX_QTY = 20;

/**
 * @typedef {Object} CartLine
 * @property {string} key        productId:length
 * @property {string} productId
 * @property {string} slug
 * @property {string} name
 * @property {string} shade      Shade name
 * @property {object} swatch     Shade swatch (for placeholder art)
 * @property {string} texture
 * @property {string} image      First product image (or '')
 * @property {number} length
 * @property {number} price      Base-currency unit price
 * @property {number} qty
 * @property {number|null} max   Max orderable (stock) or null for pre-order
 */

/** @type {CartLine[]} */
let lines = sanitise(storage.get(STORAGE_KEY, []));

/** Drop anything malformed (e.g. old data from a previous version). */
function sanitise(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((l) => l && typeof l.key === 'string' && Number(l.qty) > 0 && Number.isFinite(Number(l.price)));
}

function save() {
  storage.set(STORAGE_KEY, lines);
  emit('cart:change', lines);
}

export const getCart = () => lines;
export const cartCount = () => lines.reduce((n, l) => n + l.qty, 0);
export const cartSubtotal = () => lines.reduce((n, l) => n + l.price * l.qty, 0);

/**
 * Add a line (or increase qty if it's already in the bag), then open the drawer.
 * @param {Omit<CartLine,'qty'> & { qty?: number }} line
 */
export function addToCart(line) {
  const qty = Math.max(1, Number(line.qty) || 1);
  const existing = lines.find((l) => l.key === line.key);
  const cap = (max) => Math.min(MAX_QTY, max ?? MAX_QTY);
  if (existing) {
    existing.qty = Math.min(cap(line.max), existing.qty + qty);
  } else {
    lines = [...lines, { ...line, qty: Math.min(cap(line.max), qty) }];
  }
  save();
  openDialog('cart-drawer');
}

function setQty(key, qty) {
  const line = lines.find((l) => l.key === key);
  if (!line) return;
  if (qty <= 0) {
    lines = lines.filter((l) => l.key !== key);
  } else {
    line.qty = Math.min(qty, line.max ?? MAX_QTY, MAX_QTY);
  }
  save();
}

/* ---------- Rendering ------------------------------------------------------ */

function lineTemplate(l) {
  const atMax = l.qty >= Math.min(l.max ?? MAX_QTY, MAX_QTY);
  return html`<div class="cart-line" data-key="${l.key}">
    <a class="cart-line__media media-frame" href="/products/${l.slug}" tabindex="-1" aria-hidden="true">
      <img src="${imageOrArt({ image: l.image, swatch: l.swatch, texture: l.texture, seed: l.slug })}" alt="" width="80" height="100" loading="lazy" />
    </a>
    <div>
      <div class="cart-line__top">
        <div>
          <a class="cart-line__name" href="/products/${l.slug}">${l.name}</a>
          <p class="cart-line__meta">${l.shade ? `${l.shade} · ` : ''}${l.length}"${l.max === null ? ' · Pre-order' : ''}</p>
        </div>
        <span class="cart-line__price">${money(l.price * l.qty)}</span>
      </div>
      <div class="cart-line__bottom">
        <div class="qty" role="group" aria-label="Quantity for ${l.name}">
          <button type="button" data-qty="-1" aria-label="Decrease quantity">${raw(icons.minus('icon--sm'))}</button>
          <output aria-live="polite">${l.qty}</output>
          <button type="button" data-qty="1" aria-label="Increase quantity" ${atMax ? html`disabled` : ''}>${raw(icons.plus('icon--sm'))}</button>
        </div>
        <button type="button" class="cart-line__remove" data-remove>Remove</button>
      </div>
    </div>
  </div>`;
}

/** Free-shipping progress message at the top of the drawer. */
function shippingTemplate(subtotal) {
  const threshold = Number(pageData().settings?.commerce?.freeShippingThreshold) || 0;
  if (!threshold || !lines.length) return '';
  const remaining = threshold - subtotal;
  const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
  return html`<p>${remaining > 0 ? html`You're <strong>${money(remaining)}</strong> away from free express shipping.` : html`<strong>Nice.</strong> Your order ships free.`}</p>
    <div class="progress" role="progressbar" aria-label="Progress to free shipping" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
      <div class="progress__bar" style="width:${pct}%"></div>
    </div>`;
}

function render() {
  const count = cartCount();
  const subtotal = cartSubtotal();

  // Header badge + screen-reader label
  for (const el of document.querySelectorAll('[data-cart-count]')) {
    el.textContent = String(count);
    el.hidden = count === 0;
  }
  const label = $('[data-cart-count-label]');
  if (label) label.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  const inline = $('[data-cart-count-inline]');
  if (inline) inline.textContent = count ? `(${count})` : '';

  const body = $('[data-cart-items]');
  const foot = $('[data-cart-foot]');
  if (!body || !foot) return;

  body.innerHTML = lines.length
    ? lines.map(lineTemplate).join('')
    : html`<div class="cart-drawer__empty"><p>Your bag is empty — for now.</p><a class="btn btn-primary" href="/shop">Start shopping</a></div>`.toString();
  foot.hidden = lines.length === 0;
  $('[data-cart-subtotal]').textContent = money(subtotal);
  $('[data-cart-shipping]').innerHTML = shippingTemplate(subtotal).toString();
}

/* ---------- Checkout ------------------------------------------------------- */
async function checkout(button) {
  const status = $('[data-checkout-status]');
  button.disabled = true;
  status.textContent = 'Preparing your order…';
  status.dataset.state = '';
  // Open the WhatsApp tab synchronously (inside the click) so popup blockers allow it.
  const popup = pageData().settings?.commerce?.checkoutMode === 'whatsapp' ? window.open('', '_blank') : null;
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency: currentCurrency().code,
        items: lines.map((l) => ({ productId: l.productId, length: l.length, qty: l.qty })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed.');
    if (data.mode === 'whatsapp' && data.url) {
      if (popup) popup.location.href = data.url;
      else window.location.href = data.url;
      status.textContent = 'Opening WhatsApp — send the message and we will confirm your order.';
      status.dataset.state = 'success';
    } else {
      popup?.close();
      status.textContent = data.message;
    }
    if (data.warnings?.length) toast(data.warnings[0]);
  } catch (err) {
    popup?.close();
    status.textContent = err.message || 'Something went wrong. Please try again.';
    status.dataset.state = 'error';
  } finally {
    button.disabled = false;
  }
}

/* ---------- Init ----------------------------------------------------------- */
export function initCart() {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;

  // One delegated listener handles every button inside the drawer.
  drawer.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const lineEl = target.closest('[data-key]');
    const qtyBtn = target.closest('[data-qty]');
    if (lineEl && qtyBtn) {
      const line = lines.find((l) => l.key === lineEl.dataset.key);
      if (line) setQty(line.key, line.qty + Number(qtyBtn.dataset.qty));
      // Keep keyboard focus on the same button after re-render.
      requestAnimationFrame(() => drawer.querySelector(`[data-key="${CSS.escape(lineEl.dataset.key)}"] [data-qty="${qtyBtn.dataset.qty}"]`)?.focus());
      return;
    }
    if (lineEl && target.closest('[data-remove]')) {
      setQty(lineEl.dataset.key, 0);
      drawer.querySelector('[data-dialog-close]')?.focus();
      return;
    }
    const checkoutBtn = target.closest('[data-checkout]');
    if (checkoutBtn) checkout(checkoutBtn);
  });

  on('cart:change', () => {
    render();
    const badge = $('[data-cart-count]');
    if (badge) {
      badge.dataset.bump = 'false';
      void badge.offsetWidth;
      badge.dataset.bump = 'true';
    }
  });
  on('currency:change', render);

  // Keep multiple tabs in sync: another tab changed the cart.
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      lines = sanitise(storage.get(STORAGE_KEY, []));
      render();
    }
  });

  render();
}
