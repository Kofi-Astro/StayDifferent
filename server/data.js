/**
 * ============================================================================
 *  Data access layer — THE place pages get content from
 * ----------------------------------------------------------------------------
 *  Every page and API route reads content through these getters, never from
 *  /data or the store directly. That makes this the single swap point for a
 *  headless CMS: change the bodies of these functions to fetch from the CMS
 *  and map the results into the shapes documented in data/types.js.
 * ============================================================================
 */
import { getSection } from './store.js';
import { defaultSettings } from '../config/site.js';

/** Recursively merge `override` onto `base` (arrays are replaced, not merged). */
function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (base && typeof base === 'object' && override && typeof override === 'object') {
    const out = { ...base };
    for (const [k, v] of Object.entries(override)) out[k] = deepMerge(base[k], v);
    return out;
  }
  return override === undefined ? base : override;
}

/**
 * Site settings — saved values merged over config/site.js defaults so any
 * new setting added in code is always present.
 */
export async function getSettings() {
  return deepMerge(defaultSettings, await getSection('settings'));
}

/**
 * Products.
 * @param {{ includeHidden?: boolean }} [opts]  Admin passes includeHidden to see drafts.
 * @returns {Promise<import('../data/types.js').Product[]>}
 */
export async function getProducts({ includeHidden = false } = {}) {
  const all = await getSection('products');
  return includeHidden ? all : all.filter((p) => p.status === 'active');
}

/** One active product by slug (or undefined). */
export async function getProduct(slug) {
  return (await getProducts()).find((p) => p.slug === slug);
}

/** @returns {Promise<import('../data/types.js').Shade[]>} */
export async function getShades() {
  return getSection('shades');
}

/** Shades as a { slug: shade } lookup object. */
export async function getShadeMap() {
  return Object.fromEntries((await getShades()).map((s) => [s.slug, s]));
}

/** @returns {Promise<import('../data/types.js').Collection[]>} */
export async function getCollections() {
  return getSection('collections');
}

export async function getCollection(slug) {
  return (await getCollections()).find((c) => c.slug === slug);
}

/** Page copy: 'home' | 'about' | 'hairCare' | 'faq' | 'shipping' | 'contactPage' | 'colourGuide'. */
export async function getPage(key) {
  return getSection(key);
}

/**
 * Everything the global layout needs on every page (header, footer, cart,
 * currency selector). Loaded once per request.
 */
export async function getLayoutData() {
  const [settings, collections, shades] = await Promise.all([getSettings(), getCollections(), getShadeMap()]);
  return { settings, collections, shades };
}
