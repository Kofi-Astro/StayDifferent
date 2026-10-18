/**
 * Shop page — instant filtering & sorting.
 *
 * The server rendered EVERY product in this collection (non-matching ones
 * hidden). On each filter/sort change we:
 *   1. read the form into a filters object,
 *   2. run applyFilters() (the JS twin of app/catalog.py),
 *   3. show/hide and re-order the existing cards — no re-rendering,
 *   4. update the URL so refresh, back and sharing keep the filters.
 */
import { pageData, $, $$ } from './core.js';
import { closeDialog } from './dialogs.js';
import { parseFilters, applyFilters, filtersToQuery, activeFilterCount } from '../shared/filter.js';

const { products = [], shadeNames = {}, path = '/shop' } = pageData();
const form = /** @type {HTMLFormElement|null} */ ($('[data-filter-form]'));
const grid = $('[data-product-grid]');
const sortSelect = $('[data-sort-select]');

/** Read the form (+ the sort menu, which belongs to it via form="…"). */
function readFilters() {
  const data = new FormData(form);
  return parseFilters({
    texture: data.getAll('texture'),
    shade: data.getAll('shade'),
    length: data.getAll('length'),
    price: data.getAll('price'),
    available: data.get('available') || '',
    sort: data.get('sort') || 'featured',
    q: data.get('q') || '',
  });
}

function update() {
  const filters = readFilters();
  const results = applyFilters([...products], filters, shadeNames);
  const cards = new Map($$('[data-slug]', grid).map((el) => [el.dataset.slug, el]));

  // Matching cards, in sorted order, go first; everything else is hidden.
  const visible = new Set(results.map((p) => p.slug));
  for (const p of results) {
    const card = cards.get(p.slug);
    if (card) {
      card.hidden = false;
      grid.append(card); // append() moves an existing element → re-orders
    }
  }
  for (const [slug, card] of cards) if (!visible.has(slug)) card.hidden = true;

  $('[data-empty]').hidden = results.length > 0;
  $('[data-result-count]').textContent = `${results.length} ${results.length === 1 ? 'product' : 'products'}`;
  const count = activeFilterCount(filters);
  $('[data-filter-count]').textContent = count ? `(${count})` : '';
  history.replaceState(null, '', `${path}${filtersToQuery(filters)}`);
}

if (form && grid) {
  // The sort <select> sits outside the form in the page, so its change event
  // doesn't bubble to the form — listen to both.
  form.addEventListener('change', update);
  sortSelect?.addEventListener('change', update);

  // "Show results" just closes the mobile drawer (the grid is already updated).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    closeDialog(/** @type {HTMLDialogElement} */ (form.closest('dialog')));
  });

  // "Clear" links: untick everything instead of reloading the page.
  for (const link of $$('[data-filter-clear]')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      for (const input of $$('input[type="checkbox"]', form)) /** @type {HTMLInputElement} */ (input).checked = false;
      update();
    });
  }
}
