/**
 * ============================================================================
 *  Site header (+ mega-menu, mobile menu, search overlay and cart drawer shells)
 * ----------------------------------------------------------------------------
 *  Rendered on the server for every page. Interactivity is added by
 *  public/js/client/header.js, cart.js and search.js.
 *
 *  Accessibility notes:
 *   - Skip link is the first focusable element.
 *   - The mega-menu uses the disclosure pattern: "Shop" is a normal link and a
 *     separate chevron button (aria-expanded) opens the panel for keyboard and
 *     touch users. Mouse users also get it on hover.
 *   - Mobile menu, search and cart are native <dialog> elements opened with
 *     showModal(), which gives focus trapping, Esc-to-close and an inert
 *     background for free.
 *
 *  NOTE: server-only module (it imports config/site.js, which lives outside
 *  /public). Browser code must not import this file.
 * ============================================================================
 */
import { html, safeUrl } from '../shared/html.js';
import { formatMoney, findCurrency } from '../shared/money.js';
import { icon } from './icons.js';
import { logo } from './logo.js';
import { hairArt } from './hair-art.js';
import { mainNav } from '../../../config/site.js';

/** Currency <select>. `id` must be unique per page (header + mobile menu). */
export function currencySelect(settings, id) {
  const { currencies, defaultCurrency } = settings.commerce;
  if (!currencies?.length || currencies.length < 2) return '';
  return html`<div class="currency">
    <label class="sr-only" for="${id}">Currency</label>
    ${icon('globe', 'currency__icon')}
    <select class="currency__select" id="${id}" data-currency-select>
      ${currencies.map((c) => html`<option value="${c.code}" ${c.code === defaultCurrency ? html`selected` : ''}>${c.code}</option>`)}
    </select>
  </div>`;
}

/** Announcement bar above the header. "{threshold}" becomes the free-shipping amount. */
function announcement(settings) {
  const a = settings.announcement;
  if (!a?.enabled || !a.text) return '';
  const currency = findCurrency(settings.commerce.currencies, settings.commerce.defaultCurrency);
  const threshold = settings.commerce.freeShippingThreshold;
  // Split around {threshold} so the amount can be a live, currency-aware price.
  const [before, after = ''] = a.text.split('{threshold}');
  const hasAmount = a.text.includes('{threshold}');
  const content = html`${before}${hasAmount && html`<span data-price="${threshold}">${formatMoney(threshold, currency)}</span>`}${after}`;
  return html`<div class="announcement">
    <div class="container-page announcement__inner">
      ${a.link ? html`<a href="${safeUrl(a.link)}">${content}</a>` : html`<p>${content}</p>`}
    </div>
  </div>`;
}

/** The Shop mega-menu panel. */
function megaMenu({ collections, shades }) {
  const guideShades = Object.values(shades).filter((s) => s.inGuide);
  return html`<div class="mega" id="mega-shop" data-mega-panel hidden>
    <div class="container-page mega__inner">
      <div class="mega__collections">
        <p class="eyebrow mega__label">Collections</p>
        <ul class="mega__grid" role="list">
          ${collections.map(
            (c) => html`<li>
              <a class="mega__item" href="/shop/${c.slug}">
                <span class="mega__thumb">${hairArt({ swatch: shades[c.artShade]?.swatch, texture: c.artTexture, seed: c.slug })}</span>
                <span class="mega__text">
                  <span class="mega__name">${c.name}</span>
                  <span class="mega__tagline">${c.tagline}</span>
                </span>
              </a>
            </li>`,
          )}
        </ul>
        <a class="mega__all link-underline" href="/shop">Shop everything ${icon('arrow', 'icon--sm')}</a>
      </div>
      <a class="mega__feature" href="/colour-guide">
        <p class="eyebrow">The Colour Guide</p>
        <p class="mega__feature-title">Not sure which shade? <em>Find yours in 30 seconds.</em></p>
        <span class="swatch-row" aria-hidden="true">
          ${guideShades.map(
            (s) => html`<span class="swatch-dot" style="--a:${s.swatch.base};--b:${s.swatch.highlight}"></span>`,
          )}
        </span>
        <span class="mega__feature-cta">Take the quiz ${icon('arrow', 'icon--sm')}</span>
      </a>
    </div>
  </div>`;
}

/**
 * The full header.
 * @param {{ settings: object, collections: object[], shades: object, path: string }} ctx
 */
export function header(ctx) {
  const { settings, collections, path } = ctx;
  const isCurrent = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return html`<a class="skip-link" href="#main">Skip to content</a>
  ${announcement(settings)}
  <header class="site-header" data-header>
    <div class="container-page site-header__bar">
      <button type="button" class="icon-btn site-header__menu-btn" data-dialog-open="mobile-menu" aria-haspopup="dialog" aria-controls="mobile-menu">
        ${icon('menu')}<span class="sr-only">Open menu</span>
      </button>

      <a class="site-header__logo" href="/">${logo(settings)}<span class="sr-only">— home</span></a>

      <nav class="main-nav" aria-label="Main">
        <ul class="main-nav__list" role="list">
          ${mainNav.map((item) =>
            item.mega
              ? html`<li class="main-nav__item main-nav__item--mega" data-mega>
                  <a class="main-nav__link" href="${item.href}" ${isCurrent(item.href) ? html`aria-current="page"` : ''}>${item.label}</a>
                  <button type="button" class="main-nav__toggle" aria-expanded="false" aria-controls="mega-shop" data-mega-toggle>
                    ${icon('chevron', 'icon--xs')}<span class="sr-only">Show ${item.label} menu</span>
                  </button>
                  ${megaMenu(ctx)}
                </li>`
              : html`<li class="main-nav__item">
                  <a class="main-nav__link" href="${item.href}" ${isCurrent(item.href) ? html`aria-current="page"` : ''}>${item.label}</a>
                </li>`,
          )}
        </ul>
      </nav>

      <div class="site-header__actions">
        <div class="site-header__currency">${currencySelect(settings, 'currency-header')}</div>
        <button type="button" class="icon-btn" data-dialog-open="search-dialog" aria-haspopup="dialog" aria-controls="search-dialog">
          ${icon('search')}<span class="sr-only">Search</span>
        </button>
        <button type="button" class="icon-btn cart-btn" data-dialog-open="cart-drawer" aria-haspopup="dialog" aria-controls="cart-drawer">
          ${icon('bag')}
          <span class="cart-btn__count" data-cart-count hidden>0</span>
          <span class="sr-only">Open bag, <span data-cart-count-label>0 items</span></span>
        </button>
      </div>
    </div>
  </header>

  ${mobileMenu(ctx)}
  ${searchDialog(collections)}
  ${cartDrawer(settings)}`;
}

/** Slide-in navigation for small screens. */
function mobileMenu({ settings, collections, path }) {
  return html`<dialog class="drawer drawer-left mobile-menu" id="mobile-menu" aria-label="Menu">
    <div class="drawer__head">
      ${logo(settings)}
      <button type="button" class="icon-btn" data-dialog-close>${icon('close')}<span class="sr-only">Close menu</span></button>
    </div>
    <nav class="mobile-menu__nav" aria-label="Mobile">
      <ul role="list">
        ${mainNav.map((item) =>
          item.mega
            ? html`<li>
                <details class="mobile-menu__group" ${path.startsWith('/shop') ? html`open` : ''}>
                  <summary>${item.label} ${icon('chevron', 'icon--sm')}</summary>
                  <ul role="list">
                    <li><a href="/shop">Shop all</a></li>
                    ${collections.map((c) => html`<li><a href="/shop/${c.slug}">${c.name}</a></li>`)}
                  </ul>
                </details>
              </li>`
            : html`<li><a href="${item.href}" ${path === item.href ? html`aria-current="page"` : ''}>${item.label}</a></li>`,
        )}
      </ul>
    </nav>
    <div class="mobile-menu__foot">
      ${currencySelect(settings, 'currency-mobile')}
      <a class="mobile-menu__contact" href="mailto:${settings.contact.email}">${icon('mail', 'icon--sm')} ${settings.contact.email}</a>
    </div>
  </dialog>`;
}

/** Search overlay shell — results are filled in by public/js/client/search.js. */
function searchDialog(collections) {
  return html`<dialog class="fade-dialog search-dialog" id="search-dialog" aria-label="Search products">
    <div class="container-page search-dialog__inner">
      <form class="search-dialog__form" action="/shop" role="search" data-search-form>
        ${icon('search', 'search-dialog__icon')}
        <label class="sr-only" for="search-input">Search products</label>
        <input id="search-input" class="search-dialog__input" type="search" name="q" placeholder="Search shades, textures, wigs…" autocomplete="off" aria-controls="search-results" aria-describedby="search-status" />
        <button type="button" class="icon-btn" data-dialog-close>${icon('close')}<span class="sr-only">Close search</span></button>
      </form>
      <p class="sr-only" id="search-status" role="status" aria-live="polite"></p>
      <div class="search-dialog__results" id="search-results" data-search-results>
        <p class="eyebrow">Popular</p>
        <ul class="search-dialog__suggest" role="list">
          ${collections.map((c) => html`<li><a class="chip" href="/shop/${c.slug}">${c.name}</a></li>`)}
          <li><a class="chip" href="/colour-guide">Colour Guide</a></li>
        </ul>
      </div>
    </div>
  </dialog>`;
}

/** Cart drawer shell — line items are rendered by public/js/client/cart.js. */
function cartDrawer(settings) {
  return html`<dialog class="drawer cart-drawer" id="cart-drawer" aria-labelledby="cart-title">
    <div class="drawer__head">
      <h2 class="cart-drawer__title" id="cart-title">Your bag <span data-cart-count-inline></span></h2>
      <button type="button" class="icon-btn" data-dialog-close>${icon('close')}<span class="sr-only">Close bag</span></button>
    </div>
    <div class="cart-drawer__shipping" data-cart-shipping></div>
    <div class="cart-drawer__body" data-cart-items>
      <p class="cart-drawer__empty">Your bag is empty — for now.</p>
    </div>
    <div class="cart-drawer__foot" data-cart-foot hidden>
      <div class="cart-drawer__row">
        <span>Subtotal</span>
        <span class="cart-drawer__subtotal" data-cart-subtotal></span>
      </div>
      <p class="cart-drawer__note">Shipping & taxes calculated at checkout.</p>
      <button type="button" class="btn btn-primary cart-drawer__checkout" data-checkout>
        ${settings.commerce.checkoutMode === 'whatsapp' ? html`${icon('whatsapp', 'icon--sm')} Checkout via WhatsApp` : 'Checkout'}
      </button>
      <p class="form-status" data-checkout-status role="status" aria-live="polite"></p>
    </div>
  </dialog>`;
}
