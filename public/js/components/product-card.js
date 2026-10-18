/**
 * ProductCard — used on Home (bestsellers), Shop (grid), Product (related).
 *
 * Shared by server and browser: the Shop page re-renders cards in the browser
 * when filters change, using exactly this function, so markup never drifts.
 */
import { html, cx } from '../shared/html.js';
import { priceRange, isSoldOut } from '../shared/catalog.js';
import { media } from './hair-art.js';
import { price } from './ui.js';

/**
 * @param {import('../../../data/types.js').Product} product
 * @param {object} o
 * @param {object} [o.shade]      The product's shade (for swatch + art).
 * @param {object} o.currency     Currency used for the initial render.
 * @param {boolean} [o.eager]     Load the image eagerly (first row).
 * @param {string} [o.headingTag] 'h2' | 'h3' — keep the page outline logical.
 */
export function productCard(product, { shade, currency, eager = false, headingTag = 'h3' }) {
  const { min, max } = priceRange(product);
  const soldOut = isSoldOut(product);
  const onSale = product.variants.some((v) => v.compareAt && v.compareAt > v.price);
  const H = headingTag === 'h2' ? 'h2' : 'h3';
  const name = html`<a class="product-card__link" href="/products/${product.slug}">${product.name}</a>`;

  return html`<article class="${cx('product-card', soldOut && 'product-card--soldout')}">
    <div class="product-card__media media-frame">
      ${media({
        image: product.images?.[0],
        alt: `${product.name}${shade ? ` in ${shade.name}` : ''}`,
        swatch: shade?.swatch,
        texture: product.texture,
        seed: product.slug,
        eager,
        sizes: '(min-width: 1024px) 33vw, 50vw',
      })}
    </div>
    <div class="product-card__badges">
      ${soldOut && html`<span class="badge badge--dark">Sold out</span>`}
      ${!soldOut && onSale && html`<span class="badge badge--accent">Sale</span>`}
      ${!soldOut && product.badge && html`<span class="badge">${product.badge}</span>`}
    </div>
    <div class="product-card__body">
      ${shade &&
      html`<p class="product-card__shade">
        <span class="swatch-dot" style="--a:${shade.swatch.base};--b:${shade.swatch.highlight}" aria-hidden="true"></span>
        ${shade.name}
      </p>`}
      ${H === 'h2' ? html`<h2 class="product-card__name">${name}</h2>` : html`<h3 class="product-card__name">${name}</h3>`}
      <p class="product-card__price">
        ${min !== max ? html`<span class="muted">From</span> ` : ''}${price(min, currency)}
      </p>
    </div>
  </article>`;
}
