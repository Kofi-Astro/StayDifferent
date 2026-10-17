/**
 * ============================================================================
 *  Hair art — branded placeholder imagery
 * ----------------------------------------------------------------------------
 *  TODO: replace with brand photography.
 *
 *  Until real photos are uploaded in the admin, every product, collection and
 *  hero shows a generated SVG "hair swatch": a gradient in the shade's colours
 *  with flowing strands drawn in the product's texture (straight, body wave,
 *  curly, kinky). It's tiny (~2 KB), looks intentional, and makes each shade
 *  instantly recognisable.
 *
 *  `media()` is what components call: it renders the uploaded image when one
 *  exists and falls back to the art automatically.
 * ============================================================================
 */
import { html, raw, safeUrl, escapeHtml } from '../shared/html.js';

/** Tiny deterministic hash → same input always gives the same artwork. */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded pseudo-random generator (mulberry32). */
function rng(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wave settings per texture: amplitude (px), half-wavelength (px), strand count. */
const WAVES = {
  straight: { amp: 5, half: 260, strands: 44 },
  'body-wave': { amp: 18, half: 80, strands: 40 },
  curly: { amp: 12, half: 26, strands: 30 },
  'kinky-curly': { amp: 8, half: 13, strands: 30 },
};

/** Number of distinct strand shapes; neighbouring strands share similar phases. */
const VARIANTS = 6;

/**
 * Build one vertical wavy strand path starting at x=0, as a chain of cubic
 * curves that approximate a sine wave.
 */
function strandPath(amp, half, phase) {
  let d = `M0 ${(-40 - phase).toFixed(0)}`;
  let y = -40 - phase;
  let dir = 1;
  while (y < 560) {
    const k = amp * 1.33 * dir;
    d += `c${k.toFixed(0)} ${(half * 0.33).toFixed(0)} ${k.toFixed(0)} ${(half * 0.67).toFixed(0)} 0 ${half.toFixed(0)}`;
    y += half;
    dir *= -1;
  }
  return d;
}

/**
 * Generate the SVG artwork.
 * @param {{ swatch: {base:string, mid:string, highlight:string}, texture?: string, seed?: string, label?: string }} opts
 */
export function hairArt({ swatch, texture = 'straight', seed = '', label = '' }) {
  const s = swatch || { base: '#3a2b22', mid: '#5d4636', highlight: '#a07c5c' };
  const wave = WAVES[texture] || WAVES.straight;
  // ID is derived from the content, so identical artwork can safely share IDs.
  const id = `ha${hash(`${seed}|${texture}|${s.base}${s.mid}${s.highlight}`).toString(36)}`;
  const rand = rng(hash(id));

  // A few strand shapes whose phase shifts gradually — like real hair, the
  // waves run roughly parallel and drift across the head.
  const variants = Array.from({ length: VARIANTS }, (_, i) => strandPath(wave.amp, wave.half, i * wave.half * 0.16));

  let strands = '';
  for (let i = 0; i < wave.strands; i++) {
    const x = Math.round(-20 + (440 / wave.strands) * i + rand() * 8);
    // Pick a variant from the strand's position (+ a little randomness).
    const v = Math.min(VARIANTS - 1, Math.floor((i / wave.strands) * VARIANTS + rand() * 1.4));
    const colour = rand() > 0.4 ? s.highlight : s.mid;
    const width = (0.8 + rand() * 2.6).toFixed(1);
    const opacity = (0.2 + rand() * 0.45).toFixed(2);
    strands += `<use href="#${id}-p${v}" x="${x}" stroke="${colour}" stroke-width="${width}" opacity="${opacity}"/>`;
  }

  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true"';

  return raw(`<svg class="hair-art" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" ${a11y} focusable="false">
<defs>
<linearGradient id="${id}-bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${s.base}"/><stop offset="0.55" stop-color="${s.mid}"/><stop offset="1" stop-color="${s.highlight}"/></linearGradient>
<linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="0.4"><stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.75" stop-color="#fff" stop-opacity="0"/></linearGradient>
${variants.map((d, i) => `<path id="${id}-p${i}" d="${d}" fill="none" stroke-linecap="round"/>`).join('')}
</defs>
<rect width="400" height="500" fill="url(#${id}-bg)"/>
<g>${strands}</g>
<rect width="400" height="500" fill="url(#${id}-sheen)"/>
</svg>`);
}

/**
 * Render an uploaded image if there is one, otherwise the hair art.
 *
 * @param {object} opts
 * @param {string} [opts.image]     Image URL (uploaded in the admin).
 * @param {string} opts.alt         Alt text (describe the hair!).
 * @param {object} [opts.swatch]    Shade swatch for the fallback art.
 * @param {string} [opts.texture]
 * @param {string} [opts.seed]      Varies the art between products of the same shade.
 * @param {boolean} [opts.eager]    true for above-the-fold images (LCP).
 * @param {string} [opts.sizes]     Responsive `sizes` hint.
 */
export function media({ image, alt, swatch, texture, seed, eager = false, sizes = '100vw' }) {
  if (image) {
    return html`<img
      class="media-img"
      src="${safeUrl(image)}"
      alt="${alt}"
      width="800"
      height="1000"
      sizes="${sizes}"
      loading="${eager ? 'eager' : 'lazy'}"
      ${raw(eager ? 'fetchpriority="high"' : '')}
      decoding="async"
    />`;
  }
  // TODO: replace with brand photography (upload images in the admin).
  return hairArt({ swatch, texture, seed, label: alt });
}
