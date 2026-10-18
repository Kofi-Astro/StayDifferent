/**
 * Shop page — instant filtering & sorting.
 *
 * The server already rendered the right products for the URL. From here on,
 * every change to the filter form or sort menu:
 *   1. reads the form into a filters object,
 *   2. runs the SAME applyFilters() the server uses,
 *   3. re-renders the grid with the SAME productCard() template,
 *   4. updates the URL (so refresh/back/share keep the filters).
 */
import { pageData, $, $$, on } from './core.js';
import { currentCurrency } from './currency.js';
import { closeDialog } from './dialogs.js';
import { parseFilters, applyFilters, filtersToQuery, activeFilterCount } from '../shared/filter.js';
import { productCard } from '../components/product-card.js';

const { products = [], shades = {}, path = '/shop' } = pageData();
const form = /** @type {HTMLFormElement|null} */ ($('[data-filter-form]'));
const grid = $('[data-product-grid]');
const sortSelect = /** @type {HTMLSelectElement|null} */ ($('[data-sort-select]'));

/** Read the current form + sort state into a filters object. */
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

function render() {
  const filters = readFilters();
  const results = applyFilters([...products], filters, shades);
  const currency = currentCurrency();

  grid.innerHTML = results.map((p) => productCard(p, { shade: shades[p.shade], currency, headingTag: 'h2' })).join('');
  $('[data-empty]').hidden = results.length > 0;
  $('[data-result-count]').textContent = `${results.length} ${results.length === 1 ? 'product' : 'products'}`;
  const count = activeFilterCount(filters);
  $('[data-filter-count]').textContent = count ? `(${count})` : '';
  history.replaceState(null, '', `${path}${filtersToQuery(filters)}`);
}

if (form && grid) {
  // The sort <select> belongs to the form (form="filter-form") but sits outside
  // it in the DOM, so its change event doesn't bubble to the form.
  form.addEventListener('change', render);
  sortSelect?.addEventListener('change', render);

  // "Show results" just closes the mobile drawer (the grid is already updated).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    closeDialog(/** @type {HTMLDialogElement} */ (form.closest('dialog')));
  });

  // "Clear all" / "Clear filters": untick everything instead of reloading.
  for (const link of $$('[data-filter-clear]')) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      for (const input of $$('input[type="checkbox"]', form)) /** @type {HTMLInputElement} */ (input).checked = false;
      render();
    });
  }

  // Cards are rendered in the shopper's currency, so re-render when it changes.
  on('currency:change', render);
}
