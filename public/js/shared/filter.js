/**
 * Shop filtering & sorting — shared by server and browser.
 *
 * The server uses it to render the right products for a URL like
 *   /shop/wigs?texture=body-wave&length=20&price=150-250&sort=price-asc
 * (so filtered pages work without JavaScript and can be bookmarked/shared),
 * and the browser uses it to update the grid instantly when a filter changes.
 */
import { priceRange, isSoldOut } from './catalog.js';

/** Price bands in BASE currency. Labels are formatted per currency in the UI. */
export const PRICE_BANDS = [
  { value: '0-150', min: 0, max: 150 },
  { value: '150-250', min: 150, max: 250 },
  { value: '250-', min: 250, max: Infinity },
];

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

/** Read a query value that may be a string, array or comma list → string[]. */
function list(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((v) => String(v).trim()).filter(Boolean);
}

/**
 * Normalise raw query params (from Express req.query or URLSearchParams).
 * @param {Record<string, any>} q
 */
export function parseFilters(q = {}) {
  return {
    texture: list(q.texture),
    shade: list(q.shade),
    length: list(q.length).map(Number).filter(Number.isFinite),
    price: list(q.price),
    available: q.available === '1' || q.available === 'true',
    sort: SORTS.some((s) => s.value === q.sort) ? q.sort : 'featured',
    q: String(q.q || '').trim().slice(0, 80),
  };
}

/** Filters → URL query string (only non-default values). */
export function filtersToQuery(f) {
  const params = new URLSearchParams();
  for (const key of ['texture', 'shade', 'length', 'price']) if (f[key].length) params.set(key, f[key].join(','));
  if (f.available) params.set('available', '1');
  if (f.sort !== 'featured') params.set('sort', f.sort);
  if (f.q) params.set('q', f.q);
  const s = params.toString();
  return s ? `?${s}` : '';
}

/** How many filters are active (for the "Filters (3)" button label). */
export function activeFilterCount(f) {
  return f.texture.length + f.shade.length + f.length.length + f.price.length + (f.available ? 1 : 0);
}

/**
 * Apply filters + sorting.
 * @param {import('../../../data/types.js').Product[]} products
 * @param {ReturnType<typeof parseFilters>} f
 * @param {Record<string, {name: string}>} [shades]  For text search on shade names.
 */
export function applyFilters(products, f, shades = {}) {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  const bands = PRICE_BANDS.filter((b) => f.price.includes(b.value));

  const result = products.filter((p) => {
    if (f.texture.length && !f.texture.includes(p.texture)) return false;
    if (f.shade.length && !f.shade.includes(p.shade)) return false;
    if (f.length.length && !p.variants.some((v) => f.length.includes(Number(v.length)))) return false;
    if (bands.length) {
      const { min } = priceRange(p);
      if (!bands.some((b) => min >= b.min && min < b.max)) return false;
    }
    if (f.available && isSoldOut(p)) return false;
    if (words.length) {
      const hay = `${p.name} ${p.summary} ${p.texture} ${p.type} ${shades[p.shade]?.name || ''}`.toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });

  const byPrice = (p) => priceRange(p).min;
  switch (f.sort) {
    case 'newest':
      return result.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    case 'price-asc':
      return result.sort((a, b) => byPrice(a) - byPrice(b));
    case 'price-desc':
      return result.sort((a, b) => byPrice(b) - byPrice(a));
    case 'name':
      return result.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // "Featured": bestsellers first, sold-out last, otherwise catalogue order.
      return result.sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || Number(b.bestseller) - Number(a.bestseller));
  }
}
