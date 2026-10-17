/**
 * ============================================================================
 *  /colour-guide — the flagship page
 * ----------------------------------------------------------------------------
 *  Narrative flow (one full-width section per step):
 *    Hero → Opening → 01 Undertone (quiz + cards) → 02 Shades (filterable)
 *    → Colour with texture → 03 Choose by the look → 04 Harmony/Contrast
 *    → Closing note
 *
 *  All copy comes from data/colour-guide.js (editable in Admin → Colour Guide);
 *  shades come from data/shades.js (Admin → Shades).
 * ============================================================================
 */
import { html, splitHeading, paragraphs } from '../../public/js/shared/html.js';
import { sectionHeading } from '../../public/js/components/ui.js';
import { icon } from '../../public/js/components/icons.js';
import { hairArt, media } from '../../public/js/components/hair-art.js';
import {
  shadeCard,
  undertoneCard,
  undertoneQuiz,
  lookPicker,
  harmonyContrast,
  shadeHref,
} from '../../public/js/components/colour-guide.js';
import { whatsappUrl } from '../../public/js/shared/links.js';
import { getPage, getShades, getProducts } from '../../server/data.js';
import { breadcrumbJsonLd } from '../../server/seo.js';

/** In-page navigation (sticky chips under the header, with scroll-spy). */
const STEPS = [
  { id: 'undertone', label: '01 Undertone' },
  { id: 'shades', label: '02 Shades' },
  { id: 'look', label: '03 The look' },
  { id: 'harmony-contrast', label: '04 Harmony or contrast' },
];

export async function colourGuidePage(ctx) {
  const [guide, allShades, products] = await Promise.all([getPage('colourGuide'), getShades(), getProducts()]);
  const { settings } = ctx;
  const shades = Object.fromEntries(allShades.map((s) => [s.slug, s]));
  const guideShades = allShades.filter((s) => s.inGuide);
  const live = new Set(products.map((p) => p.slug));
  const textureProducts = guide.texture.products.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean);

  const body = html`
  <!-- ── Hero ─────────────────────────────────────────────────────────── -->
  <section class="cg-hero section--dark" aria-labelledby="cg-title">
    <div class="container-page cg-hero__inner">
      <div class="cg-hero__copy fade-in-up">
        <p class="eyebrow cg-hero__eyebrow">${guide.hero.eyebrow}</p>
        <h1 class="cg-hero__title" id="cg-title">${splitHeading(guide.hero.heading)}</h1>
        <p class="cg-hero__sub">${guide.hero.sub}</p>
        <ol class="cg-hero__steps" role="list">
          ${STEPS.map((s) => html`<li><a href="#${s.id}">${s.label}</a></li>`)}
        </ol>
      </div>
      <!-- A fan of hair "strands", one per shade — each jumps to its card. -->
      <ul class="cg-ribbon" role="list" aria-label="Jump to a shade">
        ${guideShades.map(
          (s, i) => html`<li style="--i:${i}">
            <a class="cg-ribbon__strand" href="#shade-${s.slug}">
              ${hairArt({ swatch: s.swatch, texture: 'body-wave', seed: `ribbon-${s.slug}` })}
              <span class="cg-ribbon__label"><span>${s.number}</span> ${s.name}</span>
            </a>
          </li>`,
        )}
      </ul>
    </div>
  </section>

  <!-- ── Sticky step navigation ───────────────────────────────────────── -->
  <nav class="cg-subnav" aria-label="Colour Guide steps" data-cg-subnav>
    <div class="container-page">
      <ol class="cg-subnav__list no-scrollbar" role="list">
        ${STEPS.map((s) => html`<li><a class="chip" href="#${s.id}" data-spy="${s.id}">${s.label}</a></li>`)}
      </ol>
    </div>
  </nav>

  <!-- ── Opening ──────────────────────────────────────────────────────── -->
  <section class="section cg-opening" aria-labelledby="cg-opening-title">
    <div class="container-page">
      <div class="cg-opening__grid">
        ${sectionHeading({ eyebrow: guide.opening.eyebrow, heading: guide.opening.heading, id: 'cg-opening-title', className: 'reveal' })}
        <div class="prose reveal">${paragraphs(guide.opening.body)}</div>
      </div>
      <ol class="cg-pillars" role="list">
        ${guide.opening.pillars.map(
          (p, i) => html`<li class="cg-pillar reveal">
            <span class="cg-pillar__num" aria-hidden="true">${['i', 'ii', 'iii', 'iv'][i] || i + 1}</span>
            <h3 class="cg-pillar__title">${p.title}</h3>
            <p class="cg-pillar__text">${p.text}</p>
          </li>`,
        )}
      </ol>
    </div>
  </section>

  <!-- ── Step 01 — Undertone ──────────────────────────────────────────── -->
  <section class="section section--deep cg-step" id="undertone" aria-labelledby="undertone-title" data-spy-section>
    <div class="container-page">
      <div class="cg-step__intro">
        ${sectionHeading({ eyebrow: guide.step1.eyebrow, heading: guide.step1.heading, body: guide.step1.body, id: 'undertone-title', className: 'reveal' })}
      </div>
      ${undertoneQuiz(guide.quiz, { heading: guide.step1.quizHeading, intro: guide.step1.quizIntro })}
      <div class="undertone-grid" data-undertone-grid>
        ${guide.undertones.map((u) => undertoneCard(u, shades))}
      </div>
    </div>
  </section>

  <!-- ── Step 02 — Shades ─────────────────────────────────────────────── -->
  <section class="section cg-step" id="shades" aria-labelledby="shades-title" data-spy-section>
    <div class="container-page">
      ${sectionHeading({ eyebrow: guide.step2.eyebrow, heading: guide.step2.heading, body: guide.step2.body, id: 'shades-title', className: 'reveal' })}

      <div class="shade-filters" data-shade-filters>
        <div class="shade-filters__group" role="group" aria-labelledby="filter-undertone-label">
          <span class="eyebrow shade-filters__label" id="filter-undertone-label">Undertone</span>
          <div class="chip-row">
            ${['all', 'warm', 'cool', 'neutral'].map(
              (v) => html`<button type="button" class="chip" data-filter="undertone" data-value="${v}" aria-pressed="${String(v === 'all')}">${v === 'all' ? 'All' : v[0].toUpperCase() + v.slice(1)}</button>`,
            )}
          </div>
        </div>
        <div class="shade-filters__group" role="group" aria-labelledby="filter-dimension-label">
          <span class="eyebrow shade-filters__label" id="filter-dimension-label">Dimension</span>
          <div class="chip-row">
            ${['all', 'soft', 'medium', 'high'].map(
              (v) => html`<button type="button" class="chip" data-filter="dimension" data-value="${v}" aria-pressed="${String(v === 'all')}">${v === 'all' ? 'Any' : v[0].toUpperCase() + v.slice(1)}</button>`,
            )}
          </div>
        </div>
        <p class="shade-filters__count" data-shade-count role="status" aria-live="polite">Showing all ${guideShades.length} shades</p>
      </div>

      <div class="shade-grid" data-shade-grid>
        ${guideShades.map((s) => shadeCard(s, { href: shadeHref(s, live) }))}
      </div>
      <div class="shade-empty" data-shade-empty hidden>
        <p>No shades match that combination — which is very on-brand, honestly.</p>
        <button type="button" class="btn btn-outline" data-filter-reset>Clear filters</button>
      </div>
    </div>
  </section>

  <!-- ── Colour, with texture ─────────────────────────────────────────── -->
  ${textureProducts.length > 0 &&
  html`<section class="section section--dark cg-texture" aria-labelledby="texture-title">
    <div class="container-page">
      <div class="cg-texture__head">
        ${sectionHeading({ eyebrow: guide.texture.eyebrow, heading: guide.texture.heading, body: guide.texture.body, id: 'texture-title', className: 'reveal' })}
      </div>
      <div class="cg-texture__grid">
        ${textureProducts.map((p) => {
          const shade = shades[p.shade];
          return html`<a class="texture-card reveal" href="/products/${p.slug}">
            <span class="texture-card__media media-frame">
              ${media({ image: p.images[0], alt: `${p.name} in ${shade?.name || ''}`, swatch: shade?.swatch, texture: p.texture, seed: `texture-${p.slug}` })}
            </span>
            <span class="texture-card__body">
              <span class="eyebrow texture-card__shade">${shade?.name}</span>
              <span class="texture-card__name">${p.name}</span>
              <span class="link-arrow texture-card__cta">Discover shade ${icon('arrow', 'icon--sm')}</span>
            </span>
          </a>`;
        })}
      </div>
    </div>
  </section>`}

  <!-- ── Step 03 — Choose by the look ─────────────────────────────────── -->
  <section class="section cg-step" id="look" aria-labelledby="look-title" data-spy-section>
    <div class="container-page">
      ${sectionHeading({ eyebrow: guide.step3.eyebrow, heading: guide.step3.heading, body: guide.step3.body, id: 'look-title', className: 'reveal' })}
      ${lookPicker(guide.looks, shades, live)}
    </div>
  </section>

  <!-- ── Step 04 — Harmony or contrast ────────────────────────────────── -->
  <section class="section section--sand cg-step" id="harmony-contrast" aria-labelledby="hc-title" data-spy-section>
    <div class="container-page">
      ${sectionHeading({ eyebrow: guide.step4.eyebrow, heading: guide.step4.heading, body: guide.step4.body, id: 'hc-title', className: 'reveal' })}
      ${harmonyContrast(guide.step4)}
    </div>
  </section>

  <!-- ── Closing note ─────────────────────────────────────────────────── -->
  <section class="section cg-closing" aria-labelledby="closing-title">
    <div class="container-page cg-closing__inner reveal">
      <span class="cg-closing__diamond" aria-hidden="true"></span>
      <p class="eyebrow cg-closing__eyebrow">${guide.closing.eyebrow}</p>
      <h2 class="cg-closing__title" id="closing-title">${splitHeading(guide.closing.heading)}</h2>
      <p class="cg-closing__body">${guide.closing.body}</p>
      <div class="btn-row cg-closing__ctas">
        <a class="btn btn-primary" href="/shop/coloured">${guide.closing.primaryLabel} ${icon('arrow', 'icon--sm')}</a>
        <a class="btn btn-outline" href="${whatsappUrl(settings.contact, "Hi! I'm using the Colour Guide and could use help choosing a shade.")}" target="_blank" rel="noopener">
          ${icon('whatsapp', 'icon--sm')} ${guide.closing.secondaryLabel}<span class="sr-only"> (opens WhatsApp)</span>
        </a>
      </div>
    </div>
  </section>`;

  return {
    meta: {
      title: 'Colour Guide — find your shade',
      description: 'Find your undertone in 30 seconds and discover the Stay Different shade made for you — from Honey Rebel to Midnight Espresso.',
    },
    body,
    styles: ['/css/colour-guide.css'],
    script: '/js/client/colour-guide.js',
    data: { undertoneNames: Object.fromEntries(guide.undertones.map((u) => [u.key, u.name])) },
    jsonLd: [breadcrumbJsonLd([['Home', '/'], ['Colour Guide', '/colour-guide']])],
  };
}
