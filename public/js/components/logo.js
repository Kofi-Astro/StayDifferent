/**
 * Brand logo.
 *
 * Default: a typographic recreation of the chosen logo
 * (brand/logo-option-2-black-circle.jpg) — "STAY D" in a high-contrast Didone
 * serif, a small gold diamond and "( HAIR )". Built in HTML/CSS rather than an
 * image so it's razor-sharp, tiny in file size and recolours on dark sections.
 *
 * If the client uploads a logo image in Admin → Settings → Brand, that image
 * is used instead.
 */
import { html, safeUrl } from '../shared/html.js';

/**
 * @param {object} settings  Site settings.
 * @param {{ tone?: 'dark'|'light', size?: 'md'|'lg' }} [opts]
 */
export function logo(settings, { tone = 'dark', size = 'md' } = {}) {
  const brand = settings.brand;
  if (brand.logoImage) {
    return html`<img class="logo-img logo-img--${size}" src="${safeUrl(brand.logoImage)}" alt="${brand.name}" width="160" height="48" />`;
  }
  return html`<span class="logo logo--${tone} logo--${size}" aria-label="${brand.name}" role="img">
    <span class="logo__word" aria-hidden="true">STAY D</span>
    <span class="logo__sub" aria-hidden="true"><span class="logo__diamond"></span>( HAIR )</span>
  </span>`;
}
