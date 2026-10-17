/**
 * ============================================================================
 *  Site configuration & business placeholders
 * ----------------------------------------------------------------------------
 *  These are the DEFAULT settings. Everything here can be changed by the client
 *  in the admin panel (Admin → Settings) without touching code. Values saved in
 *  the admin are deep-merged over these defaults, so adding a new field here
 *  automatically makes it available everywhere.
 *
 *  Search the codebase for "TODO:" to find every placeholder that needs real
 *  business details before launch.
 * ============================================================================
 */

/** Public site URL — used for canonical links, sitemap and Open Graph. */
export const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const defaultSettings = {
  brand: {
    name: 'Stay Different Hair',
    shortName: 'Stay D',
    monogram: 'SD',
    /** The primary tagline used in the hero, footer and metadata. */
    tagline: 'Stay different.',
    /** Alternative taglines, kept for campaigns & rotating copy. */
    taglineAlts: ['Made for the ones who stand out.', 'Your hair. Your rules.'],
    /**
     * Optional uploaded logo image. When empty the site renders the SVG/text
     * "STAY D ( HAIR )" wordmark (based on brand/logo-option-2-black-circle.jpg).
     */
    logoImage: '',
    promise:
      'Premium 100% human hair, ethically sourced and made for people who refuse to blend in. Hair as self-expression — never conformity.',
  },

  contact: {
    // TODO: replace with the real support inbox.
    email: 'hello@staydifferenthair.com',
    // TODO: replace with the real phone number (display format).
    phone: '+44 20 0000 0000',
    // TODO: WhatsApp number in international format, digits only (no +, spaces).
    whatsapp: '440000000000',
    whatsappMessage: "Hi Stay Different! I'd love some help choosing my hair.",
    hours: 'Mon–Sat, 9am – 6pm',
    // TODO: business address (optional — leave blank to hide).
    address: '',
  },

  social: {
    // TODO: real handles (without @). Leave blank to hide an icon.
    instagram: 'staydifferenthair',
    tiktok: 'staydifferenthair',
    youtube: '',
    facebook: '',
  },

  commerce: {
    /** Currency all prices are stored in. */
    baseCurrency: 'USD',
    /** Currency shown to first-time visitors. */
    defaultCurrency: 'USD',
    /**
     * Display currencies + conversion rates FROM the base currency.
     * TODO: confirm rates / currencies before launch (rates are illustrative).
     */
    currencies: [
      { code: 'USD', label: 'US Dollar', rate: 1 },
      { code: 'GBP', label: 'British Pound', rate: 0.79 },
      { code: 'EUR', label: 'Euro', rate: 0.92 },
      { code: 'GHS', label: 'Ghana Cedi', rate: 15.5 },
      { code: 'CAD', label: 'Canadian Dollar', rate: 1.37 },
    ],
    /** Orders above this (base currency) ship free. 0 disables the message. */
    freeShippingThreshold: 250,
    /**
     * How the Checkout button behaves:
     *   'whatsapp' – sends the cart as a pre-filled WhatsApp message (works today)
     *   'disabled' – shows `checkoutMessage` (use while payments are being set up)
     * TODO: integrate a payment provider (Stripe / Paystack / Shopify) — see
     *       app/api/checkout/route.js for the stub.
     */
    checkoutMode: 'whatsapp',
    checkoutMessage:
      'Online checkout is launching soon. In the meantime, send us your bag on WhatsApp and we will sort the rest.',
    lowStockThreshold: 3,
  },

  announcement: {
    enabled: true,
    // "{threshold}" is replaced with the free-shipping threshold in the shopper's currency.
    text: 'Free express shipping on orders over {threshold} — stay different, stay fast.',
    link: '/shipping-returns',
  },

  catalog: {
    /** Texture options used by filters and the product editor. */
    textures: [
      { value: 'straight', label: 'Straight' },
      { value: 'body-wave', label: 'Body Wave' },
      { value: 'curly', label: 'Curly' },
      { value: 'kinky-curly', label: 'Kinky Curly' },
    ],
    /** Product types (what the product physically is). */
    types: [
      { value: 'bundle', label: 'Bundle' },
      { value: 'clip-in', label: 'Clip-in set' },
      { value: 'tape-in', label: 'Tape-in' },
      { value: 'wig', label: 'Wig' },
      { value: 'closure', label: 'Closure' },
      { value: 'frontal', label: 'Frontal' },
    ],
  },

  seo: {
    title: 'Stay Different Hair — Premium Human Hair Extensions & Wigs',
    description:
      'Premium human-hair extensions, wigs, closures and frontals for people who refuse to blend in. Find your shade with the Stay Different Colour Guide.',
    // TODO: replace with a brand photograph (1200×630). Empty = generated OG card.
    ogImage: '',
  },

  footer: {
    newsletterHeading: 'Be the first to stand out.',
    newsletterText: 'New shades, restocks and members-only drops. No spam — just hair worth talking about.',
  },
};

/** Navigation shown in the header (Shop gets the mega-menu automatically). */
export const mainNav = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop', mega: true },
  { label: 'Colour Guide', href: '/colour-guide' },
  { label: 'Hair Care', href: '/hair-care' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

/** Footer link groups. */
export const footerNav = {
  support: [
    { label: 'Contact us', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Shipping & Returns', href: '/shipping-returns' },
    { label: 'Hair Care', href: '/hair-care' },
  ],
  explore: [
    { label: 'Shop all', href: '/shop' },
    { label: 'Colour Guide', href: '/colour-guide' },
    { label: 'About us', href: '/about' },
    { label: 'Wigs', href: '/shop/wigs' },
  ],
};
