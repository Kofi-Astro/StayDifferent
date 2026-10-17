/**
 * Collections — the groupings shown in the Shop mega-menu, the Shop page
 * filter chips and the Home "Featured collections" row.
 * A product joins a collection by listing its slug in `product.collections`.
 * Editable in Admin → Collections.
 */

/** @type {import('./types').Collection[]} */
export const collections = [
  {
    slug: 'straight',
    name: 'Straight',
    tagline: 'Sleek, glassy, unbothered.',
    description: 'Bone-straight and silky-straight bundles, wigs and closures with a mirror finish that holds a press.',
    image: '', // TODO: replace with brand photography
    artShade: 'natural-black',
    artTexture: 'straight',
    featured: true,
  },
  {
    slug: 'body-wave',
    name: 'Body Wave',
    tagline: 'Movement that does the talking.',
    description: 'Soft S-waves with bounce and volume. Wear it as it falls or straighten it — it springs right back.',
    image: '', // TODO: replace with brand photography
    artShade: 'cocoa-muse',
    artTexture: 'body-wave',
    featured: true,
  },
  {
    slug: 'curly',
    name: 'Curly',
    tagline: 'Defined curls, big personality.',
    description: 'From loose spirals to kinky coils, our curls are steam-set to hold their pattern wash after wash.',
    image: '', // TODO: replace with brand photography
    artShade: 'toffee-riot',
    artTexture: 'curly',
    featured: true,
  },
  {
    slug: 'coloured',
    name: 'Coloured',
    tagline: 'Pre-coloured. Pro-finished.',
    description: 'Every Stay Different shade, professionally coloured and toned so it arrives ready to wear.',
    image: '', // TODO: replace with brand photography
    artShade: 'wild-card',
    artTexture: 'body-wave',
    featured: true,
  },
  {
    slug: 'clip-ins-tape-ins',
    name: 'Clip-ins & Tape-ins',
    tagline: 'Instant length, zero commitment.',
    description: 'Seamless clip-in sets and flat tape-ins for volume and length you can add (or remove) in minutes.',
    image: '', // TODO: replace with brand photography
    artShade: 'honey-rebel',
    artTexture: 'straight',
    featured: false,
  },
  {
    slug: 'wigs',
    name: 'Wigs',
    tagline: 'Glueless, pre-plucked, ready when you are.',
    description: 'HD lace wigs, pre-plucked and bleached so the hairline looks like it grew there.',
    image: '', // TODO: replace with brand photography
    artShade: 'midnight-espresso',
    artTexture: 'body-wave',
    featured: true,
  },
  {
    slug: 'closures-frontals',
    name: 'Closures & Frontals',
    tagline: 'The finishing touch.',
    description: 'HD lace closures and frontals that melt into every skin tone for a flawless, undetectable part.',
    image: '', // TODO: replace with brand photography
    artShade: 'natural-black',
    artTexture: 'straight',
    featured: false,
  },
];
