/**
 * Placeholder art URLs (browser).
 * Mirrors art_url() in app/art.py — the server draws the SVG, the browser
 * just needs to know its address (used by the cart drawer & search results).
 * TODO: replace with brand photography (upload images in the admin).
 */
const DEFAULT = { base: '#3a2b22', mid: '#5d4636', highlight: '#a07c5c' };
const TEXTURES = ['straight', 'body-wave', 'curly', 'kinky-curly'];

export function artUrl(swatch, texture = 'straight', seed = 'x') {
  const s = swatch || DEFAULT;
  const colours = ['base', 'mid', 'highlight'].map((k) => String(s[k] || DEFAULT[k]).replace('#', '')).join('-');
  const safeSeed = String(seed).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60) || 'x';
  return `/art/${TEXTURES.includes(texture) ? texture : 'straight'}/${colours}/${safeSeed}.svg`;
}

/** Product image if there is one, otherwise its placeholder art. */
export function imageOrArt({ image, swatch, texture, seed }) {
  return image || artUrl(swatch, texture, seed);
}
