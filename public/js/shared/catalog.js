/**
 * Catalogue helpers shared by server and browser: price ranges, stock status
 * and label lookups. Keep these pure (no DOM, no Node APIs).
 */

/** @typedef {import('../../../data/types.js').Product} Product */
/** @typedef {import('../../../data/types.js').Variant} Variant */

/** Can this length be ordered right now? */
export function variantAvailable(product, variant) {
  return Boolean(variant) && (Number(variant.stock) > 0 || Boolean(product.allowPreorder));
}

/** True when no length can be ordered. */
export function isSoldOut(product) {
  return !(product.variants || []).some((v) => variantAvailable(product, v));
}

/** Total units in stock across all lengths. */
export function totalStock(product) {
  return (product.variants || []).reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
}

/** Lowest & highest price across lengths. */
export function priceRange(product) {
  const prices = (product.variants || []).map((v) => Number(v.price) || 0);
  if (!prices.length) return { min: 0, max: 0 };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** First length that can be ordered (used as the default selection). */
export function defaultVariant(product) {
  const variants = product.variants || [];
  return variants.find((v) => variantAvailable(product, v)) || variants[0];
}

/** Look up a label in a [{value,label}] list, falling back to a prettified value. */
export function labelFor(options, value) {
  const hit = (options || []).find((o) => o.value === value);
  if (hit) return hit.label;
  return String(value || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Unique key for a cart line (product + length). */
export function cartKey(productId, length) {
  return `${productId}:${length}`;
}
