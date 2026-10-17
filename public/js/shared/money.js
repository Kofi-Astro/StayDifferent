/**
 * Money formatting & currency conversion — shared by server and browser.
 *
 * All prices are STORED in the base currency (Admin → Settings → Commerce).
 * For display we multiply by the selected currency's `rate` and format with
 * the browser's Intl API, so symbols, separators and placement are correct
 * for every currency without any lookup tables.
 */

/**
 * @typedef {{ code: string, label?: string, rate: number }} Currency
 */

/**
 * Convert a base-currency amount into another currency.
 * @param {number} amount        Amount in base currency.
 * @param {Currency} [currency]  Target currency (rate relative to base).
 */
export function convert(amount, currency) {
  const rate = currency && Number(currency.rate) > 0 ? Number(currency.rate) : 1;
  return Number(amount || 0) * rate;
}

/**
 * Format a base-currency amount for display, e.g. 189 → "$189" or "£149".
 * Converted prices are rounded to whole units so they look intentional.
 * @param {number} amount
 * @param {Currency} [currency]
 */
export function formatMoney(amount, currency) {
  const code = currency?.code || 'USD';
  const value = convert(amount, currency);
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol',
    }).format(Math.round(value));
  } catch {
    // Unknown currency code typed in the admin — fall back gracefully.
    return `${code} ${Math.round(value).toLocaleString('en')}`;
  }
}

/**
 * Find a currency by code in the settings list (falls back to the first one).
 * @param {Currency[]} currencies
 * @param {string} code
 */
export function findCurrency(currencies, code) {
  return currencies.find((c) => c.code === code) || currencies[0] || { code: 'USD', rate: 1 };
}
