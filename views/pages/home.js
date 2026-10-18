/**
 * ============================================================================
 *  / — Home page
 * ----------------------------------------------------------------------------
 *  Hero → tagline marquee → featured collections → "Find your shade" teaser
 *  → bestsellers → brand promise strip → Instagram/TikTok strip → newsletter
 *
 *  Copy: data/pages.js → `home` (Admin → Pages → Home).
 * ============================================================================
 */
import { html, splitHeading, safeUrl } from '../../public/js/shared/html.js';
import { findCurrency } from '../../public/js/shared/money.js';
import { socialLinks } from '../../public/js/shared/links.js';
import { sectionHeading, newsletter } from '../../public/js/components/ui.js';
import { icon } from '../../public/js/components/icons.js';
import { media, hairArt } from '../../public/js/components/hair-art.js';
import { productCard } from '../../public/js/components/product-card.js';
import { getPage, getProducts } from '../../server/data.js';

/** Icons for the 4 promise items, in order. */
const PROMISE_ICONS = ['shield', 'palette', 'truck', 'return'];

export async function homePage(ctx) {
  const { settings, collections, shades } = ctx;
  const [home, products] = await Promise.all([getPage('home'), getProducts()]);
  const currency = findCurrency(settings.commerce.currencies, settings.commerce.defaultCurrency);
  const featured = collections.filter((c) => c.featured);
  // Show 4 or 8 bestsellers so the 4-column desktop grid never has a gap.
  const allBestsellers = products.filter((p) => p.bestseller);
  const bestsellers = allBestsellers.slice(0, allBestsellers.length >= 8 ? 8 : 4);
  const guideShades = Object.values(shades).filter((s) => s.inGuide);
  const heroShade = shades[home.hero.artShade];
  const socials = socialLinks(settings.social).filter((s) => ['instagram', 'tiktok'].includes(s.key));
  const taglines = [settings.brand.tagline, ...settings.brand.taglineAlts];

  const body = html`
  <!-- ── Hero ─────────────────────────────────────────────────────────── -->
  <section class="home-hero" aria-labelledby="home-title">
    <div class="container-page home-hero__inner">
      <div class="home-hero__copy fade-in-up">
        <p class="eyebrow home-hero__eyebrow">${home.hero.eyebrow}</p>
        <h1 class="home-hero__title" id="home-title">${splitHeading(home.hero.heading)}</h1>
        <p class="home-hero__sub">${home.hero.sub}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="${safeUrl(home.hero.primaryLink)}">${home.hero.primaryLabel} ${icon('arrow', 'icon--sm')}</a>
          <a class="btn btn-outline" href="${safeUrl(home.hero.secondaryLink)}">${home.hero.secondaryLabel}</a>
        </div>
      </div>
      <div class="home-hero__visual">
        <div class="home-hero__media media-frame">
          ${media({
            image: home.hero.image,
            alt: `Model wearing ${heroShade?.name || 'Stay Different'} hair`,
            swatch: heroShade?.swatch,
            texture: home.hero.artTexture,
            seed: 'home-hero',
            eager: true,
            sizes: '(min-width: 1024px) 45vw, 100vw',
          })}
        </div>
        ${heroShade &&
        html`<a class="home-hero__tag" href="/colour-guide#shade-${heroShade.slug}">
          <span class="swatch-dot" style="--a:${heroShade.swatch.base};--b:${heroShade.swatch.highlight}" aria-hidden="true"></span>
          <span><span class="eyebrow">Now wearing</span><br />${heroShade.name} · No. ${heroShade.number}</span>
        </a>`}
      </div>
    </div>
  </section>

  <!-- ── Tagline marquee (decorative; duplicated for a seamless loop) ──── -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      ${[0, 1].map(
        () => html`<span class="marquee__group">${[...taglines, ...taglines].map((t) => html`<span>${t}</span><span class="marquee__diamond"></span>`)}</span>`,
      )}
    </div>
  </div>

  <!-- ── Featured collections ─────────────────────────────────────────── -->
  <section class="section" aria-labelledby="collections-title">
    <div class="container-page">
      <div class="section-head-row">
        ${sectionHeading({ eyebrow: home.collections.eyebrow, heading: home.collections.heading, id: 'collections-title', className: 'reveal' })}
        <a class="link-arrow" href="/shop">Shop all ${icon('arrow', 'icon--sm')}</a>
      </div>
      <ul class="collection-row no-scrollbar" role="list">
        ${featured.map(
          (c) => html`<li class="reveal">
            <a class="collection-card" href="/shop/${c.slug}">
              <span class="collection-card__media media-frame">
                ${media({ image: c.image, alt: '', swatch: shades[c.artShade]?.swatch, texture: c.artTexture, seed: `col-${c.slug}` })}
              </span>
              <span class="collection-card__body">
                <span class="collection-card__name">${c.name}</span>
                <span class="collection-card__tagline">${c.tagline}</span>
              </span>
            </a>
          </li>`,
        )}
      </ul>
    </div>
  </section>

  <!-- ── Find your shade teaser ───────────────────────────────────────── -->
  <section class="section section--dark shade-teaser" aria-labelledby="teaser-title">
    <div class="container-page shade-teaser__inner">
      <div class="shade-teaser__copy reveal">
        ${sectionHeading({ eyebrow: home.shadeTeaser.eyebrow, heading: home.shadeTeaser.heading, body: home.shadeTeaser.body, id: 'teaser-title' })}
        <a class="btn btn-accent" href="/colour-guide">${home.shadeTeaser.ctaLabel} ${icon('arrow', 'icon--sm')}</a>
      </div>
      <ul class="shade-wheel" role="list" aria-label="Our shades">
        ${guideShades.map(
          (s, i) => html`<li class="reveal" style="--i:${i}">
            <a class="shade-wheel__item" href="/colour-guide#shade-${s.slug}">
              <span class="shade-wheel__swatch">${hairArt({ swatch: s.swatch, texture: 'curly', seed: `wheel-${s.slug}` })}</span>
              <span class="shade-wheel__name"><span class="shade-wheel__num">${s.number}</span> ${s.name}</span>
            </a>
          </li>`,
        )}
      </ul>
    </div>
  </section>

  <!-- ── Bestsellers ──────────────────────────────────────────────────── -->
  ${bestsellers.length > 0 &&
  html`<section class="section" aria-labelledby="bestsellers-title">
    <div class="container-page">
      <div class="section-head-row">
        ${sectionHeading({ eyebrow: home.bestsellers.eyebrow, heading: home.bestsellers.heading, id: 'bestsellers-title', className: 'reveal' })}
        <a class="link-arrow" href="/shop">View all ${icon('arrow', 'icon--sm')}</a>
      </div>
      <div class="product-grid product-grid--4">
        ${bestsellers.map((p) => productCard(p, { shade: shades[p.shade], currency }))}
      </div>
    </div>
  </section>`}

  <!-- ── Brand promise strip ──────────────────────────────────────────── -->
  <section class="section--tight section--sand" aria-label="Our promise">
    <div class="container-page">
      <ul class="promise-strip" role="list">
        ${home.promise.map(
          (p, i) => html`<li class="promise-item reveal">
            ${icon(PROMISE_ICONS[i % PROMISE_ICONS.length])}
            <h2 class="promise-item__title">${p.title}</h2>
            <p class="promise-item__text">${p.text}</p>
          </li>`,
        )}
      </ul>
    </div>
  </section>

  <!-- ── Social strip ─────────────────────────────────────────────────── -->
  <section class="section social-strip" aria-labelledby="social-title">
    <div class="container-page">
      <div class="section-head-row">
        ${sectionHeading({ eyebrow: home.social.eyebrow, heading: home.social.heading, body: home.social.body, id: 'social-title', className: 'reveal' })}
        <div class="btn-row">
          ${socials.map(
            (s) => html`<a class="btn btn-outline" href="${s.href}" target="_blank" rel="noopener">${icon(s.key, 'icon--sm')} ${s.label}<span class="sr-only"> (opens in a new tab)</span></a>`,
          )}
        </div>
      </div>
      <!-- TODO: replace with real Instagram/TikTok posts (or an embed widget). -->
      <ul class="social-grid" role="list">
        ${guideShades.slice(0, 6).map(
          (s, i) => html`<li class="reveal">
            <a class="social-tile media-frame" href="${socials[i % Math.max(1, socials.length)]?.href || '#'}" target="_blank" rel="noopener">
              ${hairArt({ swatch: s.swatch, texture: ['body-wave', 'curly', 'straight', 'kinky-curly'][i % 4], seed: `social-${i}` })}
              <span class="social-tile__overlay">${icon(i % 2 ? 'tiktok' : 'instagram')}<span class="sr-only">See ${s.name} on social media (opens in a new tab)</span></span>
            </a>
          </li>`,
        )}
      </ul>
    </div>
  </section>

  <!-- ── Newsletter ───────────────────────────────────────────────────── -->
  <section class="section section--deep home-newsletter" aria-label="Newsletter">
    <div class="container-page home-newsletter__inner reveal">
      <p class="eyebrow home-newsletter__eyebrow">${home.newsletter.eyebrow}</p>
      ${newsletter({ heading: home.newsletter.heading, text: home.newsletter.text, idPrefix: 'home-newsletter' })}
    </div>
  </section>`;

  return { meta: {}, body };
}
