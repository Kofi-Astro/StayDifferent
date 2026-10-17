/**
 * ============================================================================
 *  Colour Guide components
 * ----------------------------------------------------------------------------
 *  ShadeCard · UndertoneCard · UndertoneQuiz · LookPicker · HarmonyContrast
 *
 *  All are pure template functions (server-rendered). Interactivity — quiz
 *  scoring, card highlighting, shade filters — is added by
 *  public/js/client/colour-guide.js using the data-* hooks below.
 * ============================================================================
 */
import { html, cx } from '../shared/html.js';
import { icon } from './icons.js';
import { hairArt } from './hair-art.js';

const DIMENSION_LEVEL = { soft: 1, medium: 2, high: 3 };
const DIMENSION_LABEL = { soft: 'Soft', medium: 'Medium', high: 'High' };

/** Link for a shade: its hero product if it's live, otherwise the Coloured collection. */
export function shadeHref(shade, liveProductSlugs) {
  return liveProductSlugs.has(shade.product) ? `/products/${shade.product}` : '/shop/coloured';
}

/** A soft gradient chip showing base → highlight (used on chips and rows). */
export function swatchDot(shade, className = '') {
  return html`<span class="${cx('swatch-dot', className)}" style="--a:${shade.swatch.base};--b:${shade.swatch.highlight}" aria-hidden="true"></span>`;
}

/**
 * ShadeCard — one of the 7 shades in Step 02.
 * data-undertones / data-dimension power the filter chips.
 */
export function shadeCard(shade, { href }) {
  const level = DIMENSION_LEVEL[shade.dimension] || 1;
  return html`<article
    class="shade-card reveal"
    id="shade-${shade.slug}"
    data-shade-card
    data-undertones="${shade.undertones.join(' ')}"
    data-dimension="${shade.dimension}"
    aria-labelledby="shade-${shade.slug}-name"
  >
    <div class="shade-card__swatch media-frame">
      ${hairArt({ swatch: shade.swatch, texture: 'body-wave', seed: `guide-${shade.slug}` })}
      <span class="shade-card__number" aria-hidden="true">${shade.number}</span>
      <!-- Base → highlight strip: the "colour chip" view of the shade -->
      <span class="shade-card__strip" aria-hidden="true">
        <span style="background:${shade.swatch.base}"></span>
        <span style="background:${shade.swatch.mid}"></span>
        <span style="background:${shade.swatch.highlight}"></span>
      </span>
    </div>
    <div class="shade-card__body">
      <p class="eyebrow shade-card__family">No. ${shade.number} · ${shade.family}</p>
      <h3 class="shade-card__name" id="shade-${shade.slug}-name"><a href="${href}">${shade.name}</a></h3>
      <p class="shade-card__hook">${shade.hook}</p>
      <p class="shade-card__desc">${shade.description}</p>
      <dl class="spec-table">
        <div><dt>Undertone</dt><dd>${shade.undertoneLabel}</dd></div>
        <div><dt>Depth</dt><dd>${shade.depth}</dd></div>
        <div class="spec-table__wide">
          <dt>Dimension</dt>
          <dd class="spec-table__dimension">
            <span class="meter" aria-hidden="true">${[1, 2, 3].map((n) => html`<span class="${n <= level ? 'on' : ''}"></span>`)}</span>
            ${DIMENSION_LABEL[shade.dimension]}
          </dd>
        </div>
        <div class="spec-table__wide"><dt>Best suited to</dt><dd>${shade.bestFor}</dd></div>
      </dl>
      <a class="link-arrow shade-card__cta" href="${href}" aria-label="Shop ${shade.name}">Shop ${shade.name} ${icon('arrow', 'icon--sm')}</a>
    </div>
  </article>`;
}

/**
 * UndertoneCard — Warm / Cool / Neutral in Step 01.
 * @param {object} u          Undertone (data/colour-guide.js)
 * @param {object} shades     { slug: shade } lookup
 */
export function undertoneCard(u, shades) {
  const matches = u.matches.map((slug) => shades[slug]).filter(Boolean);
  const metal = { warm: 'gold', cool: 'silver', neutral: 'both' }[u.key] || 'both';
  // A band made of the matched shades' colours, like a fabric swatch book.
  const band = matches.map((s) => `${s.swatch.base}, ${s.swatch.highlight}`).join(', ') || '#cdb89e, #e3d3bf';
  return html`<article class="undertone-card reveal" id="undertone-${u.key}" data-undertone-card="${u.key}" tabindex="-1" aria-labelledby="undertone-${u.key}-name">
    <span class="undertone-card__match" aria-hidden="true">${icon('sparkle', 'icon--sm')} Your match</span>
    <p class="eyebrow undertone-card__label">${u.number} / ${u.name}</p>
    <h3 class="undertone-card__name" id="undertone-${u.key}-name">${u.name}</h3>
    <div class="undertone-card__band" style="background:linear-gradient(90deg, ${band})" aria-hidden="true"></div>
    <p class="undertone-card__desc">${u.description}</p>
    <p class="undertone-card__jewellery">
      <span class="metal metal--${metal}" aria-hidden="true"></span>
      <span><strong>Jewellery test:</strong> ${u.jewellery}</span>
    </p>
    <div class="undertone-card__look">
      <p class="eyebrow">Look towards</p>
      <ul role="list">${u.lookTowards.map((l) => html`<li>${l}</li>`)}</ul>
    </div>
    <div class="undertone-card__matches">
      <p class="eyebrow">Your Stay Different matches</p>
      <ul class="chip-row" role="list">
        ${matches.map((s) => html`<li><a class="chip shade-chip" href="#shade-${s.slug}">${swatchDot(s)} ${s.name}</a></li>`)}
      </ul>
    </div>
  </article>`;
}

/**
 * UndertoneQuiz — three questions as native radio groups (fully keyboard
 * accessible: Tab between questions, arrow keys between answers).
 * Scoring lives in client/colour-guide.js.
 */
export function undertoneQuiz(questions, { heading, intro }) {
  return html`<form class="quiz reveal" data-quiz aria-labelledby="quiz-heading" novalidate>
    <div class="quiz__head">
      <p class="eyebrow quiz__eyebrow">${icon('sparkle', 'icon--sm')} Undertone quiz</p>
      <h3 class="quiz__title" id="quiz-heading">${heading}</h3>
      <p class="quiz__intro">${intro}</p>
    </div>
    <div class="quiz__questions">
      ${questions.map(
        (q, qi) => html`<fieldset class="quiz__q">
          <legend class="quiz__legend"><span class="quiz__num">0${qi + 1}</span> ${q.question}</legend>
          <div class="quiz__options">
            ${q.options.map(
              (o) => html`<label class="quiz__option">
                <input type="radio" name="q${qi}" value="${o.undertone}" required />
                <span>${o.label}</span>
              </label>`,
            )}
          </div>
        </fieldset>`,
      )}
    </div>
    <div class="quiz__actions">
      <button class="btn btn-accent" type="submit">Reveal my undertone ${icon('arrow', 'icon--sm')}</button>
      <p class="quiz__progress" data-quiz-progress aria-live="polite">0 of ${questions.length} answered</p>
    </div>
    <div class="quiz__result" data-quiz-result hidden tabindex="-1" role="status" aria-live="polite"></div>
  </form>`;
}

/**
 * LookPicker — "I want…" rows, each a full-width link to the matching shade.
 */
export function lookPicker(looks, shades, liveProductSlugs) {
  return html`<ul class="look-picker" role="list">
    ${looks
      .filter((l) => shades[l.shade])
      .map((l) => {
        const shade = shades[l.shade];
        return html`<li class="reveal">
          <a class="look-row" href="${shadeHref(shade, liveProductSlugs)}">
            <span class="look-row__statement">${l.statement}</span>
            <span class="look-row__shade">
              ${swatchDot(shade, 'look-row__dot')}
              <span class="look-row__name">${shade.name}</span>
              ${icon('arrow', 'look-row__arrow')}
            </span>
          </a>
        </li>`;
      })}
  </ul>`;
}

/**
 * Harmony vs Contrast panels with a little visual: two overlapping circles
 * (skin + hair) that either blend or clash on purpose.
 */
export function harmonyContrast(step4) {
  const panel = (kind, p) => html`<article class="${cx('hc-panel', `hc-panel--${kind}`, 'reveal')}" aria-labelledby="hc-${kind}">
    ${p.badge && html`<span class="badge badge--accent hc-panel__badge">${p.badge}</span>`}
    <div class="hc-visual hc-visual--${kind}" aria-hidden="true">
      <span class="hc-visual__skin"></span><span class="hc-visual__hair"></span>
    </div>
    <p class="eyebrow hc-panel__label">${p.label}</p>
    <h3 class="hc-panel__title" id="hc-${kind}">${p.title}</h3>
    <p class="hc-panel__text">${p.text}</p>
    ${p.example && html`<p class="hc-panel__example"><span class="eyebrow">Try</span> ${p.example}</p>`}
  </article>`;
  return html`<div class="hc-grid">${panel('harmony', step4.harmony)}${panel('contrast', step4.contrast)}</div>`;
}
