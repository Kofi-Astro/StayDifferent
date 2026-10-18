/**
 * ============================================================================
 *  Colour Guide interactivity
 * ----------------------------------------------------------------------------
 *  1. Undertone quiz  — tallies answers, reveals the result, highlights the
 *                       matching undertone card and scrolls to it.
 *  2. Shade filters   — Undertone × Dimension chips filter the shade grid.
 *  3. Scroll-spy      — highlights the current step in the sticky sub-nav.
 *  4. Anchor helpers  — clicking a shade chip clears filters if needed and
 *                       flashes the target card.
 * ============================================================================
 */
import { $, $$, storage, scrollToEl } from './core.js';
import { html, raw } from '../shared/html.js';
import { icons } from '../shared/icons.js';

const UNDERTONE_KEY = 'sd-undertone';

/* ───────────────────────── 1. Undertone quiz ───────────────────────────── */

/**
 * Work out the undertone from the answers: the most-picked undertone wins.
 * If two undertones tie for the top spot, the honest answer is "neutral".
 * @param {string[]} answers e.g. ['warm','warm','neutral']
 */
export function scoreQuiz(answers) {
  const tally = { warm: 0, cool: 0, neutral: 0 };
  for (const a of answers) if (a in tally) tally[a] += 1;
  const top = Math.max(...Object.values(tally));
  const leaders = Object.keys(tally).filter((k) => tally[k] === top);
  return leaders.length === 1 ? leaders[0] : 'neutral';
}

/** Highlight one undertone card (and dim the others). Pass null to clear. */
function highlightUndertone(key) {
  for (const card of $$('[data-undertone-card]')) {
    const match = card.dataset.undertoneCard === key;
    card.dataset.matched = String(Boolean(key) && match);
    card.dataset.dimmed = String(Boolean(key) && !match);
  }
}

function initQuiz() {
  const form = /** @type {HTMLFormElement|null} */ ($('[data-quiz]'));
  if (!form) return;
  const fieldsets = $$('fieldset', form);
  const progress = $('[data-quiz-progress]', form);
  const result = $('[data-quiz-result]', form);

  const answers = () => fieldsets.map((fs) => /** @type {HTMLInputElement|null} */ (fs.querySelector('input:checked'))?.value);

  form.addEventListener('change', () => {
    const done = answers().filter(Boolean).length;
    progress.textContent = `${done} of ${fieldsets.length} answered`;
    for (const fs of fieldsets) fs.dataset.missing = 'false';
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const picked = answers();
    const missing = fieldsets.filter((_, i) => !picked[i]);
    if (missing.length) {
      for (const fs of missing) fs.dataset.missing = 'true';
      progress.textContent = `Answer ${missing.length === 1 ? 'one more question' : `${missing.length} more questions`} to see your result.`;
      /** @type {HTMLInputElement} */ (missing[0].querySelector('input')).focus();
      return;
    }
    showResult(scoreQuiz(/** @type {string[]} */ (picked)), { scroll: true });
  });

  /** Render the result panel + highlight the card. */
  function showResult(key, { scroll }) {
    const card = $(`[data-undertone-card="${key}"]`);
    if (!card) return;
    const name = $('.undertone-card__name', card)?.textContent || key;
    const jewellery = $('.undertone-card__jewellery span:last-child', card)?.textContent || '';

    result.innerHTML = html`<p class="eyebrow">Your result</p>
      <p class="quiz__result-title">You're most likely <em>${name}</em>.</p>
      <p class="quiz__result-text">${jewellery} We've highlighted your card below, along with the shades made for you.</p>
      <div class="btn-row">
        <a class="btn btn-primary" href="#undertone-${key}" data-see-card>See my undertone ${raw(icons.arrow('icon--sm'))}</a>
        <a class="btn btn-outline" href="#shades" data-see-shades="${key}">Show my shades</a>
        <button type="button" class="btn btn-outline" data-quiz-reset>Retake</button>
      </div>`.toString();
    result.hidden = false;
    highlightUndertone(key);
    storage.set(UNDERTONE_KEY, key);

    if (scroll) {
      // Let the result render, then glide to the matching card and focus it
      // (focus announces the card to screen-reader users).
      requestAnimationFrame(() => {
        scrollToEl(card, 'center');
        /** @type {HTMLElement} */ (card).focus({ preventScroll: true });
      });
    }
  }

  result.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const shadesBtn = target.closest('[data-see-shades]');
    if (shadesBtn) {
      e.preventDefault();
      setFilter('undertone', shadesBtn.getAttribute('data-see-shades'));
      setFilter('dimension', 'all');
      scrollToEl($('#shades'));
      return;
    }
    if (target.closest('[data-see-card]')) {
      e.preventDefault();
      const card = $(`#${target.closest('a').getAttribute('href').slice(1)}`);
      scrollToEl(card, 'center');
      card?.focus({ preventScroll: true });
      return;
    }
    if (target.closest('[data-quiz-reset]')) {
      form.reset();
      result.hidden = true;
      progress.textContent = `0 of ${fieldsets.length} answered`;
      highlightUndertone(null);
      storage.set(UNDERTONE_KEY, null);
      /** @type {HTMLInputElement} */ (fieldsets[0].querySelector('input')).focus();
    }
  });

  // Returning visitor? Re-show their last result (without jumping the page).
  const saved = storage.get(UNDERTONE_KEY);
  if (saved && $(`[data-undertone-card="${saved}"]`)) showResult(saved, { scroll: false });
}

/* ───────────────────────── 2. Shade filters ────────────────────────────── */

const filters = { undertone: 'all', dimension: 'all' };

function applyFilters() {
  const cards = $$('[data-shade-card]');
  let visible = 0;
  for (const card of cards) {
    const undertones = (card.dataset.undertones || '').split(' ');
    const show =
      (filters.undertone === 'all' || undertones.includes(filters.undertone)) &&
      (filters.dimension === 'all' || card.dataset.dimension === filters.dimension);
    card.hidden = !show;
    if (show) visible += 1;
  }
  const count = $('[data-shade-count]');
  const all = filters.undertone === 'all' && filters.dimension === 'all';
  if (count) count.textContent = all ? `Showing all ${cards.length} shades` : `Showing ${visible} of ${cards.length} shades`;
  const empty = $('[data-shade-empty]');
  if (empty) empty.hidden = visible > 0;
}

/** Set one filter group's value and sync the chip states. */
function setFilter(group, value) {
  filters[group] = value;
  for (const chip of $$(`[data-filter="${group}"]`)) {
    chip.setAttribute('aria-pressed', String(chip.dataset.value === value));
  }
  applyFilters();
}

function initFilters() {
  const bar = $('[data-shade-filters]');
  if (!bar) return;
  bar.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement} */ (e.target).closest('[data-filter]');
    if (chip) setFilter(chip.dataset.filter, chip.dataset.value);
  });
  $('[data-filter-reset]')?.addEventListener('click', () => {
    setFilter('undertone', 'all');
    setFilter('dimension', 'all');
  });
}

/* ───────────────────────── 3. Scroll-spy sub-nav ───────────────────────── */

function initScrollSpy() {
  const links = $$('[data-spy]');
  const list = $('.cg-subnav__list');
  if (!links.length) return;

  const setActive = (id) => {
    for (const link of links) {
      const active = link.dataset.spy === id;
      if (active) {
        link.setAttribute('aria-current', 'location');
        // Keep the active chip visible in the horizontally-scrolling list.
        list?.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' });
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };

  // A section counts as "current" when it crosses the upper third of the screen.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
    },
    { rootMargin: '-30% 0px -60% 0px' },
  );
  for (const section of $$('[data-spy-section]')) observer.observe(section);
}

/* ───────────────────────── 4. Shade anchor links ───────────────────────── */

function initShadeAnchors() {
  document.addEventListener('click', (e) => {
    const link = /** @type {HTMLElement} */ (e.target).closest('a[href^="#shade-"]');
    if (!link) return;
    const card = document.getElementById(link.getAttribute('href').slice(1));
    if (!card) return;
    e.preventDefault();
    // If a filter is hiding the card, clear the filters first.
    if (card.hidden) {
      setFilter('undertone', 'all');
      setFilter('dimension', 'all');
    }
    scrollToEl(card, 'center');
    history.replaceState(null, '', link.getAttribute('href'));
    card.dataset.flash = 'false';
    void card.offsetWidth;
    card.dataset.flash = 'true';
    /** @type {HTMLElement|null} */ (card.querySelector('.shade-card__name a'))?.focus({ preventScroll: true });
  });
}

initQuiz();
initFilters();
initScrollSpy();
initShadeAnchors();
