/**
 * ============================================================================
 *  /products/:slug — Product page
 * ----------------------------------------------------------------------------
 *  Gallery · name · price · length selector · texture · shade swatch ·
 *  quantity · Add to bag · accordion (Details / Care / Shipping & Returns) ·
 *  "Not sure about the shade?" → Colour Guide · related products.
 *
 *  Behaviour (length → price/stock, gallery, add to bag) lives in
 *  public/js/client/product.js.
 * ============================================================================
 */
import { html, paragraphs } from '../../public/js/shared/html.js';
import { findCurrency } from '../../public/js/shared/money.js';
import { defaultVariant, variantAvailable, isSoldOut, labelFor } from '../../public/js/shared/catalog.js';
import { whatsappUrl } from '../../public/js/shared/links.js';
import { media } from '../../public/js/components/hair-art.js';
import { icon } from '../../public/js/components/icons.js';
import { accordion, price } from '../../public/js/components/ui.js';
import { productCard } from '../../public/js/components/product-card.js';
import { getProduct, getProducts, getPage } from '../../server/data.js';
import { productJsonLd, breadcrumbJsonLd } from '../../server/seo.js';

/**
 * Stock message for a variant — also used by the browser (kept in sync in
 * client/product.js).
 */
export function stockMessage(product, variant, lowStock) {
  if (!variant) return { text: 'Sold out', state: 'out' };
  if (variant.stock > 0 && variant.stock <= lowStock) return { text: `Only ${variant.stock} left — order soon`, state: 'low' };
  if (variant.stock > 0) return { text: 'In stock — ships in 1–2 business days', state: 'in' };
  if (product.allowPreorder) return { text: 'Pre-order — ships in 2–3 weeks', state: 'pre' };
  return { text: 'Sold out in this length', state: 'out' };
}

export async function productPage(ctx, req) {
  const { settings, shades, collections } = ctx;
  const product = await getProduct(req.params.slug);
  if (!product) return null;

  const [allProducts, shipping] = await Promise.all([getProducts(), getPage('shipping')]);
  const currency = findCurrency(settings.commerce.currencies, settings.commerce.defaultCurrency);
  const shade = shades[product.shade];
  const selected = defaultVariant(product);
  const soldOut = isSoldOut(product);
  const stock = stockMessage(product, selected, settings.commerce.lowStockThreshold);
  const primaryCollection = collections.find((c) => product.collections.includes(c.slug));

  // Images: uploaded photos, or three art "views" as placeholders.
  // TODO: replace with brand photography (upload in Admin → Products).
  const views = product.images.length
    ? product.images.map((src, i) => ({ image: src, seed: `${product.slug}-${i}` }))
    : ['a', 'b', 'c'].map((s) => ({ image: '', seed: `${product.slug}-${s}` }));

  // Related: shares a collection, not this product; bestsellers first.
  const related = allProducts
    .filter((p) => p.id !== product.id && p.collections.some((c) => product.collections.includes(c)))
    .sort((a, b) => Number(b.bestseller) - Number(a.bestseller))
    .slice(0, 4);

  const shippingSummary = (shipping.groups || [])
    .flatMap((g) => g.items.slice(0, 2).map((i) => html`<li><strong>${i.q}:</strong> ${i.a}</li>`));

  const body = html`
  <div class="container-page product-page">
    <nav class="breadcrumbs product-page__crumbs" aria-label="Breadcrumb">
      <ol role="list">
        <li><a href="/">Home</a></li>
        <li><a href="/shop">Shop</a></li>
        ${primaryCollection && html`<li><a href="/shop/${primaryCollection.slug}">${primaryCollection.name}</a></li>`}
        <li aria-current="page">${product.name}</li>
      </ol>
    </nav>

    <div class="product-layout">
      <!-- ── Gallery ──────────────────────────────────────────────────── -->
      <section class="gallery" aria-label="Product images" data-gallery>
        <div class="gallery__track no-scrollbar" data-gallery-track tabindex="0" aria-label="Image gallery, scroll for more">
          ${views.map(
            (v, i) => html`<figure class="gallery__slide media-frame" id="slide-${i}">
              ${media({
                image: v.image,
                alt: `${product.name}${shade ? ` in ${shade.name}` : ''} — view ${i + 1}`,
                swatch: shade?.swatch,
                texture: product.texture,
                seed: v.seed,
                eager: i === 0,
                sizes: '(min-width: 1024px) 55vw, 100vw',
              })}
            </figure>`,
          )}
        </div>
        ${views.length > 1 &&
        html`<div class="gallery__thumbs" role="group" aria-label="Choose image">
          ${views.map(
            (v, i) => html`<button type="button" class="gallery__thumb media-frame" data-gallery-thumb="${i}" aria-label="Show image ${i + 1}" aria-current="${String(i === 0)}">
              ${media({ image: v.image, alt: '', swatch: shade?.swatch, texture: product.texture, seed: v.seed })}
            </button>`,
          )}
        </div>`}
      </section>

      <!-- ── Details & buy box ────────────────────────────────────────── -->
      <section class="buy-box" aria-labelledby="product-title">
        ${shade && html`<p class="eyebrow buy-box__eyebrow">${shade.family} · No. ${shade.number}</p>`}
        <h1 class="buy-box__title" id="product-title">${product.name}</h1>
        <p class="buy-box__price">
          <span data-product-price>${price(selected?.price ?? 0, currency)}</span>
          <s class="buy-box__compare" data-product-compare ${selected?.compareAt ? '' : html`hidden`}>${selected?.compareAt ? price(selected.compareAt, currency) : ''}</s>
        </p>
        <p class="buy-box__summary">${product.summary}</p>

        <form class="buy-form" data-product-form novalidate>
          <dl class="buy-box__facts">
            <div><dt>Texture</dt><dd>${labelFor(settings.catalog.textures, product.texture)}</dd></div>
            <div><dt>Type</dt><dd>${labelFor(settings.catalog.types, product.type)}</dd></div>
            ${shade &&
            html`<div class="buy-box__shade">
              <dt>Shade</dt>
              <dd>
                <span class="swatch-dot swatch-dot--lg" style="--a:${shade.swatch.base};--b:${shade.swatch.highlight}" aria-hidden="true"></span>
                ${shade.name} <span class="muted">· ${shade.undertoneLabel}</span>
              </dd>
            </div>`}
          </dl>

          <fieldset class="length-picker">
            <legend class="buy-form__label">Length <span class="muted" data-length-label>${selected && !soldOut ? `${selected.length}"` : ''}</span></legend>
            <div class="length-picker__options">
              ${product.variants.map((v) => {
                const ok = variantAvailable(product, v);
                return html`<label class="check-chip ${ok ? '' : 'is-unavailable'}">
                  <input type="radio" name="length" value="${v.length}" ${v === selected && ok ? html`checked` : ''} ${ok ? '' : html`disabled`} />
                  <span>${v.length}"${ok ? '' : html`<span class="sr-only"> (sold out)</span>`}</span>
                </label>`;
              })}
            </div>
          </fieldset>

          <p class="stock stock--${stock.state}" data-stock role="status" aria-live="polite"><span class="stock__dot" aria-hidden="true"></span><span data-stock-text>${stock.text}</span></p>

          <div class="buy-form__row">
            <div class="qty qty--lg" role="group" aria-label="Quantity">
              <button type="button" data-qty-step="-1" aria-label="Decrease quantity">${icon('minus', 'icon--sm')}</button>
              <label class="sr-only" for="qty-input">Quantity</label>
              <input id="qty-input" type="number" name="qty" value="1" min="1" max="${selected?.stock > 0 ? Math.min(20, selected.stock) : 20}" inputmode="numeric" data-qty-input />
              <button type="button" data-qty-step="1" aria-label="Increase quantity">${icon('plus', 'icon--sm')}</button>
            </div>
            <button type="submit" class="btn btn-primary buy-form__add" data-add-to-cart ${soldOut ? html`disabled` : ''}>
              ${soldOut ? 'Sold out' : html`${icon('bag', 'icon--sm')} Add to bag`}
            </button>
          </div>
          ${soldOut &&
          html`<a class="link-arrow buy-form__restock" href="${whatsappUrl(settings.contact, `Hi! When will ${product.name} be back in stock?`)}" target="_blank" rel="noopener">
            Ask about a restock on WhatsApp ${icon('arrow', 'icon--sm')}
          </a>`}
        </form>

        <a class="shade-help" href="/colour-guide">
          ${icon('palette')}
          <span><strong>Not sure about the shade?</strong><br />Take the 30-second undertone quiz in our Colour Guide.</span>
          ${icon('arrow', 'icon--sm shade-help__arrow')}
        </a>

        <div class="buy-box__desc">${paragraphs(product.description)}</div>

        ${accordion(
          [
            { title: 'Details', content: html`<ul>${product.details.map((d) => html`<li>${d}</li>`)}</ul>` },
            { title: 'Care', body: product.care },
            {
              title: 'Shipping & Returns',
              content: html`<ul>${shippingSummary}</ul><p><a class="link-underline" href="/shipping-returns">Full shipping & returns policy</a></p>`,
            },
          ],
          { id: 'product-info', openFirst: true },
        )}
      </section>
    </div>
  </div>

  ${related.length > 0 &&
  html`<section class="section related" aria-labelledby="related-title">
    <div class="container-page">
      <div class="section-head-row">
        <header class="section-heading">
          <p class="eyebrow section-heading__eyebrow">You might also love</p>
          <h2 class="section-heading__title" id="related-title"><span class="h-line">Complete</span> <em class="h-line h-accent">the look</em></h2>
        </header>
      </div>
      <div class="product-grid product-grid--4">
        ${related.map((p) => productCard(p, { shade: shades[p.shade], currency }))}
      </div>
    </div>
  </section>`}`;

  return {
    meta: {
      title: product.name,
      description: product.summary,
      type: 'product',
      image: product.images[0] || '',
    },
    body,
    script: '/js/client/product.js',
    data: {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        texture: product.texture,
        image: product.images[0] || '',
        variants: product.variants,
        allowPreorder: product.allowPreorder,
      },
      shade: shade ? { name: shade.name, swatch: shade.swatch } : null,
    },
    jsonLd: [
      productJsonLd(product, settings, shade),
      breadcrumbJsonLd([
        ['Home', '/'],
        ['Shop', '/shop'],
        [product.name, `/products/${product.slug}`],
      ]),
    ],
  };
}
