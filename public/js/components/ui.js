/**
 * Small UI building blocks used across pages:
 *   sectionHeading()  eyebrow + two-line display heading (+ optional intro)
 *   accordion()       accessible disclosure list (FAQ, product details…)
 *   price()           a currency-aware price the browser can re-format
 *   newsletter()      email sign-up form
 *   pageHero()        simple hero for content pages
 */
import { html, raw, splitHeading, paragraphs, cx, escapeHtml } from '../shared/html.js';
import { formatMoney } from '../shared/money.js';
import { icon } from './icons.js';

/**
 * SectionHeading — the signature "EYEBROW / Two-line heading" combo.
 *
 * @param {object} o
 * @param {string} [o.eyebrow]   Small uppercase label.
 * @param {string} o.heading     "Line one|line two" (second line in italic accent).
 * @param {string} [o.body]      Optional intro paragraph(s).
 * @param {'h1'|'h2'|'h3'} [o.as] Heading level (keep the outline logical!).
 * @param {'left'|'center'} [o.align]
 * @param {string} [o.id]        id for the heading (for aria-labelledby).
 * @param {string} [o.className]
 */
export function sectionHeading({ eyebrow, heading, body, as = 'h2', align = 'left', id, className = '' }) {
  const H = ['h1', 'h2', 'h3'].includes(as) ? as : 'h2';
  // The tag name comes from a fixed list above, so it is safe to build as raw markup.
  const open = raw(`<${H} class="section-heading__title"${id ? ` id="${escapeHtml(id)}"` : ''}>`);
  const close = raw(`</${H}>`);
  return html`<header class="${cx('section-heading', `section-heading--${align}`, className)}">
    ${eyebrow && html`<p class="eyebrow section-heading__eyebrow">${eyebrow}</p>`}
    ${open}${splitHeading(heading)}${close}
    ${body && html`<div class="section-heading__body">${paragraphs(body)}</div>`}
  </header>`;
}

/**
 * Accordion — a list of buttons that expand panels.
 * Markup follows the WAI-ARIA disclosure pattern: each button has
 * aria-expanded + aria-controls, panels have role="region".
 * Behaviour is wired up in public/js/client/app.js (initAccordions).
 *
 * @param {{ title: string, body?: string, content?: any }[]} items
 * @param {{ id: string, openFirst?: boolean }} opts
 */
export function accordion(items, { id, openFirst = false }) {
  return html`<div class="accordion" data-accordion>
    ${items.map((item, i) => {
      const open = openFirst && i === 0;
      const btnId = `${id}-btn-${i}`;
      const panelId = `${id}-panel-${i}`;
      return html`<div class="accordion__item">
        <h3 class="accordion__heading">
          <button type="button" class="accordion__trigger" id="${btnId}" aria-expanded="${String(open)}" aria-controls="${panelId}">
            <span>${item.title}</span>
            <span class="accordion__icon" aria-hidden="true">${icon('plus')}</span>
          </button>
        </h3>
        <div class="accordion-panel" id="${panelId}" role="region" aria-labelledby="${btnId}" data-open="${String(open)}" ${open ? '' : html`inert`}>
          <div><div class="accordion__content">${item.content ?? paragraphs(item.body)}</div></div>
        </div>
      </div>`;
    })}
  </div>`;
}

/**
 * Price — rendered in the default currency on the server; the browser
 * re-formats every [data-price] element when the shopper picks a currency.
 * @param {number} amount   Base-currency amount.
 * @param {object} currency Currency object for the initial render.
 * @param {string} [className]
 */
export function price(amount, currency, className = '') {
  return html`<span class="${cx('price', className)}" data-price="${amount}">${formatMoney(amount, currency)}</span>`;
}

/**
 * Newsletter sign-up form. Submits to /api/newsletter (handled in
 * public/js/client/forms.js). Works without JS as a normal form POST too.
 * @param {{ heading?: string, text?: string, idPrefix: string, tone?: 'light'|'dark' }} o
 */
export function newsletter({ heading, text, idPrefix, tone = 'light' }) {
  const inputId = `${idPrefix}-email`;
  return html`<form class="${cx('newsletter', `newsletter--${tone}`)}" action="/api/newsletter" method="post" data-form="newsletter" novalidate>
    ${heading && html`<p class="newsletter__heading">${heading}</p>`}
    ${text && html`<p class="newsletter__text">${text}</p>`}
    <div class="newsletter__row">
      <label class="sr-only" for="${inputId}">Email address</label>
      <input class="field newsletter__input" id="${inputId}" type="email" name="email" autocomplete="email" placeholder="Your email address" required />
      <!-- Honeypot: hidden from people, bots fill it in and get ignored. -->
      <input type="text" name="company" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" />
      <button class="btn ${tone === 'dark' ? 'btn-accent' : 'btn-primary'}" type="submit">Sign up</button>
    </div>
    <p class="form-status" role="status" aria-live="polite"></p>
  </form>`;
}

/**
 * Hero used by content pages (About, Hair Care, FAQ…).
 * @param {{ eyebrow?: string, heading: string, sub?: string }} hero
 */
export function pageHero(hero, { tone = 'cream' } = {}) {
  return html`<section class="${cx('page-hero', `page-hero--${tone}`)}">
    <div class="container-page page-hero__inner reveal">
      ${hero.eyebrow && html`<p class="eyebrow page-hero__eyebrow">${hero.eyebrow}</p>`}
      <h1 class="page-hero__title">${splitHeading(hero.heading)}</h1>
      ${hero.sub && html`<p class="page-hero__sub">${hero.sub}</p>`}
    </div>
  </section>`;
}
