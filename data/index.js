/**
 * Seed content registry.
 *
 * Maps each content "section" key to its default value. The store
 * (server/store.js) returns these defaults for any section the client has NOT
 * edited in the admin yet. Once a section is saved in the admin, the saved copy
 * wins — and "Reset to defaults" in the admin brings these values back.
 *
 * Adding a new section? Add it here, give it a schema in
 * public/js/shared/schemas.js, and it appears in the admin automatically.
 */
import { defaultSettings } from '../config/site.js';
import { products } from './products.js';
import { shades } from './shades.js';
import { collections } from './collections.js';
import { colourGuide } from './colour-guide.js';
import { home, about, hairCare, faq, shipping, contactPage } from './pages.js';

export const seed = {
  settings: defaultSettings,
  products,
  shades,
  collections,
  colourGuide,
  home,
  about,
  hairCare,
  faq,
  shipping,
  contactPage,
};
