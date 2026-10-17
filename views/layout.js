/**
 * ============================================================================
 *  Document layout — the <html> shell every storefront page is rendered into
 * ----------------------------------------------------------------------------
 *  Contains: <head> (SEO + Open Graph + JSON-LD + font preloads + CSS),
 *  header, <main id="main">, footer, the inline JSON data the browser scripts
 *  need, and the script tags.
 * ============================================================================
 */
import { html, raw } from '../public/js/shared/html.js';
import { header } from '../public/js/components/header.js';
import { footer } from '../public/js/components/footer.js';
import { SITE_URL } from '../config/site.js';
import { ASSET_VERSION } from '../server/version.js';

/**
 * Serialise data for an inline <script type="application/json">.
 * Escaping "<" prevents a "</script>" inside content from closing the tag.
 */
function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Append the asset version so browsers fetch fresh CSS/JS after a deploy. */
const v = (url) => `${url}?v=${ASSET_VERSION}`;

/**
 * @param {object} o
 * @param {object} o.ctx            Layout data: { settings, collections, shades, path }.
 * @param {object} o.meta           { title, description, image?, type?, noindex? }.
 * @param {any}    o.body           Page markup (html``).
 * @param {object[]} [o.jsonLd]     Structured data objects.
 * @param {string[]} [o.styles]     Extra page stylesheets.
 * @param {string}   [o.script]     Page module (e.g. '/js/client/shop.js').
 * @param {object}   [o.data]       Extra data exposed to the page script.
 */
export function layout({ ctx, meta, body, jsonLd = [], styles = [], script, data = {} }) {
  const { settings, path } = ctx;
  const title = meta.title ? `${meta.title} — ${settings.brand.name}` : settings.seo.title;
  const description = meta.description || settings.seo.description;
  const canonical = `${SITE_URL}${path === '/' ? '' : path}`;
  // Share image: the page's own, else the admin's default, else the generated card.
  const ogImage = meta.image || settings.seo.ogImage || '/og-image.svg';
  const ogImageAbs = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

  // Only the settings the browser actually needs (no admin-only values).
  const clientData = {
    settings: {
      commerce: settings.commerce,
      contact: { whatsapp: settings.contact.whatsapp, email: settings.contact.email },
    },
    ...data,
  };

  return html`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${canonical}" />
  ${meta.noindex && html`<meta name="robots" content="noindex" />`}
  <meta name="theme-color" content="#1e1612" />

  <!-- Open Graph / social sharing -->
  <meta property="og:site_name" content="${settings.brand.name}" />
  <meta property="og:type" content="${meta.type || 'website'}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImageAbs}" />
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Icons -->
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- Self-hosted fonts: preload the two used above the fold -->
  <link rel="preload" href="/fonts/bodoni-moda.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin />

  <link rel="stylesheet" href="${v('/css/styles.css')}" />
  ${styles.map((href) => html`<link rel="stylesheet" href="${v(href)}" />`)}

  ${jsonLd.map((obj) => html`<script type="application/ld+json">${raw(jsonForScript(obj))}</script>`)}
</head>
<body>
  ${header(ctx)}
  <main id="main" tabindex="-1">
    ${body}
  </main>
  ${footer(ctx)}

  <script id="sd-data" type="application/json">${raw(jsonForScript(clientData))}</script>
  <script type="module" src="${v('/js/client/app.js')}"></script>
  ${script && html`<script type="module" src="${v(script)}"></script>`}
</body>
</html>`;
}
