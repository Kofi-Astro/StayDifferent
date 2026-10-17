/**
 * Currency selector.
 *
 * Prices are rendered by the server in the default currency, each wrapped in
 * <span data-price="189">. When the shopper picks a currency we:
 *   1. remember it in localStorage,
 *   2. re-format every [data-price] element on the page,
 *   3. emit 'currency:change' so dynamic UI (cart, search, filters) follows.
 */
import { pageData, storage, emit, $$ } from './core.js';
import { formatMoney, findCurrency } from '../shared/money.js';

const STORAGE_KEY = 'sd-currency';

/** All currencies configured in Admin → Settings. */
const currencies = () => pageData().settings?.commerce?.currencies || [];

/** The shopper's chosen currency object. */
export function currentCurrency() {
  const commerce = pageData().settings?.commerce || {};
  const saved = storage.get(STORAGE_KEY);
  const valid = currencies().some((c) => c.code === saved);
  return findCurrency(currencies(), valid ? saved : commerce.defaultCurrency);
}

/** Format a base-currency amount in the shopper's currency. */
export function money(amount) {
  return formatMoney(amount, currentCurrency());
}

/** Re-format every [data-price] inside `root` (defaults to the whole page). */
export function refreshPrices(root = document) {
  const currency = currentCurrency();
  for (const el of $$('[data-price]', root)) {
    el.textContent = formatMoney(Number(el.dataset.price), currency);
  }
}

export function initCurrency() {
  const selects = $$('[data-currency-select]');
  const sync = () => {
    const code = currentCurrency().code;
    for (const s of selects) s.value = code;
  };

  for (const select of selects) {
    select.addEventListener('change', () => {
      storage.set(STORAGE_KEY, select.value);
      sync(); // keep header + mobile menu selects in step
      refreshPrices();
      emit('currency:change', currentCurrency());
    });
  }

  // Apply a previously chosen currency on page load.
  sync();
  if (currentCurrency().code !== pageData().settings?.commerce?.defaultCurrency) refreshPrices();
}
