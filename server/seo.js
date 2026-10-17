/**
 * SEO helpers: JSON-LD structured data, sitemap.xml and robots.txt.
 * Structured data helps Google show rich results (prices, availability,
 * brand info) for the store.
 */
import { SITE_URL } from '../config/site.js';
import { socialLinks } from '../public/js/shared/links.js';
import { isSoldOut, priceRange } from '../public/js/shared/catalog.js';
import { getProducts, getCollections } from './data.js';

/** Organization schema — included on every page. */
export function organizationJsonLd(settings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.brand.name,
    url: SITE_URL,
    logo: `${SITE_URL}/apple-touch-icon.png`,
    slogan: settings.brand.tagline,
    email: settings.contact.email,
    telephone: settings.contact.phone,
    sameAs: socialLinks(settings.social).map((s) => s.href),
  };
}

/** Product schema with an AggregateOffer across lengths. */
export function productJsonLd(product, settings, shade) {
  const { min, max } = priceRange(product);
  const image = product.images?.length ? product.images.map((i) => (i.startsWith('http') ? i : `${SITE_URL}${i}`)) : [`${SITE_URL}/og-image.svg`];
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.summary,
    sku: product.id,
    image,
    brand: { '@type': 'Brand', name: settings.brand.name },
    color: shade?.name,
    url: `${SITE_URL}/products/${product.slug}`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: settings.commerce.baseCurrency,
      lowPrice: min,
      highPrice: max,
      offerCount: product.variants.length,
      availability: isSoldOut(product) ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    },
  };
}

/** Breadcrumb trail, e.g. [['Shop','/shop'],['Wigs','/shop/wigs']]. */
export function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}

/** Static pages listed in the sitemap. */
const STATIC_PATHS = ['/', '/shop', '/colour-guide', '/hair-care', '/about', '/contact', '/faq', '/shipping-returns'];

/** Generate sitemap.xml from the live catalogue. */
export async function sitemapXml() {
  const [products, collections] = await Promise.all([getProducts(), getCollections()]);
  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: p, priority: p === '/' ? '1.0' : '0.8' })),
    ...collections.map((c) => ({ loc: `/shop/${c.slug}`, priority: '0.7' })),
    ...products.map((p) => ({ loc: `/products/${p.slug}`, priority: '0.6' })),
  ];
  const body = urls
    .map((u) => `  <url><loc>${SITE_URL}${u.loc}</loc><priority>${u.priority}</priority></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function robotsTxt() {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
