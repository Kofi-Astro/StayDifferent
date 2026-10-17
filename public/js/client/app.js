/**
 * ============================================================================
 *  app.js — loaded on EVERY storefront page
 * ----------------------------------------------------------------------------
 *  Boots the global behaviour: currency, dialogs (menu/search/cart), header,
 *  cart, search, accordions and forms. Page-specific behaviour lives in its own
 *  module (e.g. client/colour-guide.js) loaded only on that page.
 * ============================================================================
 */
import { initCurrency } from './currency.js';
import { initDialogs } from './dialogs.js';
import { initHeader } from './header.js';
import { initCart } from './cart.js';
import { initSearch } from './search.js';
import { initAccordions } from './accordion.js';
import { initForms } from './forms.js';

initCurrency();
initDialogs();
initHeader();
initCart();
initSearch();
initAccordions();
initForms();
