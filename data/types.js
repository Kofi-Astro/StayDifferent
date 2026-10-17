/**
 * ============================================================================
 *  Content types (JSDoc)
 * ----------------------------------------------------------------------------
 *  These typedefs describe every piece of content the storefront renders.
 *  They are the CONTRACT between the UI and the data source:
 *
 *      pages/components  →  server/data.js (getters)  →  server/store.js  →  /data seed
 *
 *  If you later move to a headless CMS (Sanity, Contentful, Shopify…), map the
 *  CMS response into these shapes inside server/data.js and nothing else changes.
 *
 *  This file has no runtime code; it is imported only for types:
 *    /** @typedef {import("../../data/types.js").Product} Product *\/
 * ============================================================================
 */

/**
 * A length option for a product. Price is in the store's BASE currency
 * (see settings.commerce.baseCurrency) and converted for display.
 * @typedef {Object} Variant
 * @property {number} length          Length in inches (e.g. 18).
 * @property {number} price           Price in base currency.
 * @property {number|null} [compareAt] Optional "was" price for sales.
 * @property {number} stock           Units in stock. 0 = sold out for this length.
 */

/**
 * @typedef {'active'|'draft'|'archived'} ProductStatus
 *   active   – visible & purchasable
 *   draft    – hidden from the storefront (work in progress)
 *   archived – hidden, kept for records
 */

/**
 * @typedef {Object} Product
 * @property {string} id              Stable identifier (never shown to shoppers).
 * @property {string} slug            URL segment: /products/{slug}.
 * @property {string} name
 * @property {ProductStatus} status
 * @property {string[]} collections   Collection slugs this product belongs to.
 * @property {string} texture         Texture value (see settings.catalog.textures).
 * @property {string} type            Product type (see settings.catalog.types).
 * @property {string} shade           Shade slug (see data/shades.js).
 * @property {string} summary         One-liner for cards & meta description.
 * @property {string} description     Longer copy for the product page.
 * @property {string[]} details       Bullet list for the "Details" accordion.
 * @property {string} care            Copy for the "Care" accordion.
 * @property {Variant[]} variants     One entry per available length.
 * @property {string[]} images        Image URLs. Empty = branded placeholder art.
 * @property {boolean} bestseller     Show in the Home "Bestsellers" grid.
 * @property {boolean} allowPreorder  Let customers order lengths with 0 stock.
 * @property {string} [badge]         Small label on cards, e.g. "New".
 * @property {string} createdAt       ISO date — used for "Newest" sorting.
 */

/**
 * Colour swatch used to paint gradients when there's no photography.
 * @typedef {Object} Swatch
 * @property {string} base       Root / darkest colour.
 * @property {string} mid        Mid-lengths.
 * @property {string} highlight  Brightest ribbon / ends.
 */

/**
 * @typedef {'soft'|'medium'|'high'} Dimension
 */

/**
 * @typedef {Object} Shade
 * @property {string} slug
 * @property {string} number          Display number, e.g. "01".
 * @property {string} name
 * @property {string} family          Colour family, e.g. "Bronde".
 * @property {string} hook            One-line italic hook.
 * @property {string} description     Two sentences.
 * @property {string} undertoneLabel  Human label, e.g. "Warm–neutral".
 * @property {('warm'|'cool'|'neutral')[]} undertones  Used by filters & quiz.
 * @property {string} depth           e.g. "Light", "Medium", "Deep".
 * @property {Dimension} dimension
 * @property {string} bestFor         "Best suited to…" copy.
 * @property {Swatch} swatch
 * @property {string} product         Slug of the hero product for this shade.
 * @property {boolean} inGuide        Show in the Colour Guide shade grid.
 */

/**
 * @typedef {Object} Collection
 * @property {string} slug
 * @property {string} name
 * @property {string} tagline         Short line for menus & cards.
 * @property {string} description     Intro copy on the collection page.
 * @property {string} [image]         Optional image URL.
 * @property {string} artShade        Shade slug used for placeholder art.
 * @property {string} artTexture      Texture used for placeholder art.
 * @property {boolean} featured       Show on the Home page.
 */

/**
 * @typedef {Object} Undertone
 * @property {'warm'|'cool'|'neutral'} key
 * @property {string} number
 * @property {string} name
 * @property {string} description
 * @property {string} jewellery
 * @property {string[]} lookTowards
 * @property {string[]} matches       Shade slugs.
 */

/**
 * @typedef {Object} LookRow
 * @property {string} statement       e.g. "I want something dark & natural".
 * @property {string} shade           Shade slug.
 */

/**
 * @typedef {Object} QuizOption
 * @property {string} label
 * @property {'warm'|'cool'|'neutral'} undertone
 *
 * @typedef {Object} QuizQuestion
 * @property {string} question
 * @property {QuizOption[]} options
 */

/**
 * Generic accordion / FAQ item.
 * @typedef {Object} QA
 * @property {string} q
 * @property {string} a
 */

export {};
