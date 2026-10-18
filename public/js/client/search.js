/**
 * Search overlay — live product results as you type.
 *
 * The product index (/api/products) is fetched the FIRST time the overlay
 * opens, so it costs nothing on pages where nobody searches. Matching is
 * done in the browser: every word typed must appear somewhere in the
 * product's name, shade, texture, collections or summary.
 */
import { on, $ } from './core.js';
import { money } from './currency.js';
import { html, escapeHtml, raw } from '../shared/html.js';
import { imageOrArt } from '../shared/art.js';

let index = null;

async function loadIndex() {
  if (index) return index;
  try {
    const res = await fetch('/api/products');
    index = await res.json();
  } catch {
    index = [];
  }
  return index;
}

/** Wrap matched words in <mark> (escaped first, so it stays safe). */
function highlight(text, words) {
  let out = escapeHtml(text);
  for (const w of words) {
    const safe = escapeHtml(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(${safe})`, 'ig'), '<mark>$1</mark>');
  }
  return raw(out);
}

function resultTemplate(p, words) {
  return html`<li>
    <a class="search-result" href="/products/${p.slug}">
      <span class="search-result__thumb media-frame"><img src="${imageOrArt({ image: p.image, swatch: p.swatch, texture: p.texture, seed: p.slug })}" alt="" width="60" height="75" loading="lazy" /></span>
      <span>
        <span class="search-result__name">${highlight(p.name, words)}</span><br />
        <span class="search-result__meta">${p.shade} · ${p.soldOut ? 'Sold out' : html`From ${money(p.from)}`}</span>
      </span>
    </a>
  </li>`;
}

export function initSearch() {
  const dialog = document.getElementById('search-dialog');
  const input = /** @type {HTMLInputElement|null} */ ($('#search-input'));
  const results = $('[data-search-results]');
  const status = $('#search-status');
  if (!dialog || !input || !results) return;

  const initial = results.innerHTML; // "Popular" chips shown when the box is empty

  on('dialog:open', async (id) => {
    if (id !== 'search-dialog') return;
    input.focus();
    input.select();
    await loadIndex();
  });

  // In a type="search" box, Esc normally just clears the text. One press
  // should close the whole overlay, so handle it ourselves.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      /** @type {HTMLDialogElement} */ (dialog).close();
    }
  });

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(async () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = initial;
        status.textContent = '';
        return;
      }
      const words = query.split(/\s+/).filter(Boolean);
      const items = (await loadIndex()).filter((p) => {
        const haystack = `${p.name} ${p.shade} ${p.texture} ${p.keywords} ${p.summary}`.toLowerCase();
        return words.every((w) => haystack.includes(w));
      });

      status.textContent = `${items.length} ${items.length === 1 ? 'result' : 'results'} for ${query}`;
      results.innerHTML = items.length
        ? html`<p class="eyebrow">${items.length} ${items.length === 1 ? 'result' : 'results'}</p>
            <ul class="search-results" role="list">${items.slice(0, 8).map((p) => resultTemplate(p, words))}</ul>
            ${items.length > 8 && html`<p style="margin-top:1.5rem"><a class="link-arrow" href="/shop?q=${encodeURIComponent(query)}">See all ${items.length} results →</a></p>`}`.toString()
        : html`<p class="eyebrow">No matches</p><p>Nothing for “${query}” yet. Try a shade (e.g. “honey”) or a texture (e.g. “curly”).</p>`.toString();
    }, 120);
  });
}
