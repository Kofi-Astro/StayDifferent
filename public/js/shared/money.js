/**
 * Money formatting & currency conversion (browser).
 *
 * Mirrors app/money.py exactly, so a price looks identical whether the server
 * rendered it or the browser re-formatted it after a currency switch.
 * All prices are stored in the base currency; `rate` converts from it.
 */

/** Display symbols. Unknown codes are shown as "XYZ 1,234". */
const SYMBOLS = {
  USD: '$',
  GBP: '£',
  EUR: '€',
  GHS: 'GH₵',
  NGN: '₦',
  CAD: 'CA$',
  AUD: 'A$',
  ZAR: 'R',
  KES: 'KSh',
};

/**
 * Format a base-currency amount, e.g. 189 → "$189" or "£149".
 * @param {number} amount
 * @param {{ code: string, rate: number }} [currency]
 */
export function formatMoney(amount, currency) {
  const rate = Number(currency?.rate) > 0 ? Number(currency.rate) : 1;
  const value = Math.round(Number(amount || 0) * rate);
  const code = String(currency?.code || 'USD').toUpperCase();
  const formatted = value.toLocaleString('en-US');
  return SYMBOLS[code] ? `${SYMBOLS[code]}${formatted}` : `${code} ${formatted}`;
}

/** Find a currency by code in the settings list (falls back to the first one). */
export function findCurrency(currencies, code) {
  return currencies.find((c) => c.code === code) || currencies[0] || { code: 'USD', rate: 1 };
}
