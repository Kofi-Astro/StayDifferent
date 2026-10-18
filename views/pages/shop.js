/**
 * ============================================================================
 *  /shop and /shop/:collection — product listing with filters
 * ----------------------------------------------------------------------------
 *  Filters live in the URL (?texture=curly&sort=price-asc…), so every filtered
 *  view is shareable, bookmarkable and works without JavaScript (the filter
 *  panel is a normal GET form). With JavaScript, public/js/client/shop.js
 *  updates the grid instantly on every change.
 * ============================================================================
 */
import { html, cx } from '../../public/js/shared/html.js';
import { findCurrency, formatMoney } from '../../public/js/shared/money.js';
import { parseFilters, applyFilters, activeFilterCount, PRICE_BANDS, SORTS } from '../../public/js/shared/filter.js';
import { productCard } from '../../public/js/components/product-card.js';
import { icon } from '../../public/js/components/icons.js';
import { getProducts } from '../../server/data.js';
import { breadcrumbJsonLd } from '../../server/seo.js';

/** Label for a price band, with live-currency spans. */
function bandLabel(band, currency) {
  const fmt = (n) => html`<span data-price="${n}">${formatMoney(n, currency)}</span>`;
  if (band.min === 0) return html`Under ${fmt(band.max)}`;
  if (band.max === Infinity) return html`${fmt(band.min)} +`;
  return html`${fmt(band.min)} – ${fmt(band.max)}`;
}

/** A group of checkboxes inside the filter panel. */
function checkGroup({ legend, name, options, selected }) {
  return html`<fieldset class="filter-group">
    <legend class="eyebrow filter-group__legend">${legend}</legend>
    <div class="filter-group__options">
      ${options.map(
        (o) => html`<label class="${cx('check', o.swatch && 'check--swatch')}">
          <input type="checkbox" name="${name}" value="${o.value}" ${selected.includes(o.value) ? html`checked` : ''} />
          ${o.swatch && html`<span class="swatch-dot" style="--a:${o.swatch.base};--b:${o.swatch.highlight}" aria-hidden="true"></span>`}
          <span>${o.label}</span>
          ${o.count !== undefined && html`<span class="check__count">${o.count}</span>`}
        </label>`,
      )}
    </div>
  </fieldset>`;
}

export async function shopPage(ctx, req) {
  const { settings, collections, shades } = ctx;
  const slug = req.params.collection;
  const collection = slug ? collections.find((c) => c.slug === slug) : null;
  if (slug && !collection) return null; // unknown collection → 404

  const currency = findCurrency(settings.commerce.currencies, settings.commerce.defaultCurrency);
  const all = await getProducts();
  const scoped = collection ? all.filter((p) => p.collections.includes(collection.slug)) : all;
  const filters = parseFilters(req.query);
  const results = applyFilters([...scoped], filters, shades);

  // Only offer filter options that exist in this collection.
  const textures = settings.catalog.textures.filter((t) => scoped.some((p) => p.texture === t.value));
  const shadeOptions = Object.values(shades).filter((s) => scoped.some((p) => p.shade === s.slug));
  const lengths = [...new Set(scoped.flatMap((p) => p.variants.map((v) => Number(v.length))))].sort((a, b) => a - b);
  const activeCount = activeFilterCount(filters);
  const title = collection ? collection.name : filters.q ? `Results for “${filters.q}”` : 'Shop all';

  const filterPanel = html`<form class="filters" id="filter-form" action="${req.path}" method="get" data-filter-form aria-label="Filter products">
    <div class="filters__head">
      <h2 class="filters__title">Filters</h2>
      <button type="button" class="icon-btn filters__close" data-dialog-close>${icon('close')}<span class="sr-only">Close filters</span></button>
    </div>
    <div class="filters__body">
      ${filters.q && html`<input type="hidden" name="q" value="${filters.q}" />`}
      ${textures.length > 1 &&
      checkGroup({
        legend: 'Texture',
        name: 'texture',
        options: textures.map((t) => ({ ...t, count: scoped.filter((p) => p.texture === t.value).length })),
        selected: filters.texture,
      })}
      ${shadeOptions.length > 1 &&
      checkGroup({
        legend: 'Shade',
        name: 'shade',
        options: shadeOptions.map((s) => ({ value: s.slug, label: s.name, swatch: s.swatch })),
        selected: filters.shade,
      })}
      <fieldset class="filter-group">
        <legend class="eyebrow filter-group__legend">Length (inches)</legend>
        <div class="filter-group__chips">
          ${lengths.map(
            (l) => html`<label class="check-chip">
              <input type="checkbox" name="length" value="${l}" ${filters.length.includes(l) ? html`checked` : ''} />
              <span>${l}"</span>
            </label>`,
          )}
        </div>
      </fieldset>
      <fieldset class="filter-group">
        <legend class="eyebrow filter-group__legend">Price</legend>
        <div class="filter-group__options">
          ${PRICE_BANDS.map(
            (b) => html`<label class="check">
              <input type="checkbox" name="price" value="${b.value}" ${filters.price.includes(b.value) ? html`checked` : ''} />
              <span>${bandLabel(b, currency)}</span>
            </label>`,
          )}
        </div>
      </fieldset>
      <fieldset class="filter-group">
        <legend class="eyebrow filter-group__legend">Availability</legend>
        <label class="check">
          <input type="checkbox" name="available" value="1" ${filters.available ? html`checked` : ''} />
          <span>In stock only</span>
        </label>
      </fieldset>
    </div>
    <div class="filters__foot">
      <a class="btn btn-outline" href="${req.path}" data-filter-clear>Clear all</a>
      <!-- Without JS this submits the form; with JS it just closes the drawer. -->
      <button class="btn btn-primary" type="submit" data-filter-apply>Show results</button>
    </div>
  </form>`;

  const body = html`
  <section class="shop-hero">
    <div class="container-page">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol role="list">
          <li><a href="/">Home</a></li>
          ${collection ? html`<li><a href="/shop">Shop</a></li><li aria-current="page">${collection.name}</li>` : html`<li aria-current="page">Shop</li>`}
        </ol>
      </nav>
      <h1 class="shop-hero__title">${title}</h1>
      ${collection ? html`<p class="shop-hero__desc">${collection.description}</p>` : html`<p class="shop-hero__desc">Premium human hair in every texture and every shade — find the one that says <em>you</em>.</p>`}
      <nav class="shop-collections no-scrollbar" aria-label="Collections">
        <a class="chip" href="/shop" ${!collection ? html`aria-current="page"` : ''}>All</a>
        ${collections.map((c) => html`<a class="chip" href="/shop/${c.slug}" ${collection?.slug === c.slug ? html`aria-current="page"` : ''}>${c.name}</a>`)}
      </nav>
    </div>
  </section>

  <section class="shop" aria-label="Products">
    <div class="container-page shop__layout">
      <!-- Filters: ONE piece of markup. On phones/tablets it's a slide-in
           <dialog>; on desktop CSS shows the same (closed) dialog as a
           sticky sidebar — see .filters-dialog in styles.css. -->
      <dialog class="drawer drawer-left filters-dialog" id="filters-dialog" aria-label="Filters">
        ${filterPanel}
      </dialog>

      <div class="shop__main">
        <div class="shop-toolbar">
          <button type="button" class="btn btn-outline shop-toolbar__filters" data-dialog-open="filters-dialog" aria-haspopup="dialog">
            Filters <span data-filter-count>${activeCount ? `(${activeCount})` : ''}</span>
          </button>
          <p class="shop-toolbar__count" data-result-count role="status" aria-live="polite">${results.length} ${results.length === 1 ? 'product' : 'products'}</p>
          <div class="shop-toolbar__sort">
            <label for="sort-select" class="sr-only">Sort by</label>
            <!-- form="filter-form" ties the sort menu to the filter form, so it is
                 submitted with the filters even though it sits outside it. -->
            <select id="sort-select" class="field field--compact" name="sort" form="filter-form" data-sort-select>
              ${SORTS.map((s) => html`<option value="${s.value}" ${filters.sort === s.value ? html`selected` : ''}>${s.label}</option>`)}
            </select>
          </div>
        </div>

        <div class="product-grid" data-product-grid>
          ${results.map((p, i) => productCard(p, { shade: shades[p.shade], currency, eager: i < 2, headingTag: 'h2' }))}
        </div>
        <div class="shop-empty" data-empty ${results.length ? html`hidden` : ''}>
          <p class="shop-empty__title">Nothing matches — yet.</p>
          <p>Try removing a filter, or let the Colour Guide point you somewhere new.</p>
          <div class="btn-row">
            <a class="btn btn-primary" href="${req.path}" data-filter-clear>Clear filters</a>
            <a class="btn btn-outline" href="/colour-guide">Colour Guide</a>
          </div>
        </div>
      </div>
    </div>
  </section>`;

  const trail = [['Home', '/'], ['Shop', '/shop']];
  if (collection) trail.push([collection.name, `/shop/${collection.slug}`]);

  return {
    meta: {
      title: collection ? `${collection.name} hair` : 'Shop all hair',
      description: collection?.description || 'Shop premium human hair extensions, wigs, clip-ins, closures and frontals in original Stay Different shades.',
      // Filtered variants of a listing shouldn't compete with the main page in search.
      noindex: Object.keys(req.query).length > 0,
    },
    body,
    script: '/js/client/shop.js',
    // The browser gets the products in scope so filtering is instant.
    data: { products: scoped, shades, path: req.path },
    jsonLd: [breadcrumbJsonLd(trail)],
  };
}
