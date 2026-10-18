/**
 * Page copy for Home, About, Hair Care, FAQ, Shipping & Returns and Contact.
 * Every field here is editable in the admin (Admin → Pages → …).
 *
 * Conventions:
 *  - Headings: "First line|second line" — the part after "|" renders in italic
 *    accent on its own line.
 *  - Long text: separate paragraphs with a blank line.
 */

export const home = {
  hero: {
    eyebrow: 'Premium human hair · Extensions · Wigs',
    heading: 'Stay|different.',
    sub: 'Made for the ones who stand out. Premium human hair in shades and textures that say exactly who you are.',
    primaryLabel: 'Shop the collection',
    primaryLink: '/shop',
    secondaryLabel: 'Find your shade',
    secondaryLink: '/colour-guide',
    // TODO: replace with brand photography (upload in Admin → Home).
    image: '',
    artShade: 'wild-card',
    artTexture: 'body-wave',
  },
  collections: {
    eyebrow: 'Shop by collection',
    heading: 'Pick your|texture',
  },
  shadeTeaser: {
    eyebrow: 'The Colour Guide',
    heading: 'Find the shade|that feels like you',
    body: 'Warm, cool or somewhere in between? Take our 30-second undertone quiz and meet the shades made for you.',
    ctaLabel: 'Open the Colour Guide',
  },
  bestsellers: {
    eyebrow: 'Most loved',
    heading: 'The|bestsellers',
  },
  promise: [
    { title: '100% human hair', text: 'Cuticle-aligned, ethically sourced, never mixed.' },
    { title: 'Colour-matched', text: 'Professionally coloured and toned in-house.' },
    { title: 'Fast, tracked delivery', text: 'Dispatched within 1–2 business days.' },
    { title: '14-day returns', text: 'Unopened, unworn hair — no awkward questions.' },
  ],
  social: {
    eyebrow: 'Join the different ones',
    heading: 'As seen on|you',
    body: 'Tag @staydifferenthair to be featured. Real people, real installs, zero filters (okay, maybe one).',
  },
  newsletter: {
    eyebrow: 'The inner circle',
    heading: 'First dibs on every drop.',
    text: 'New shades land with subscribers first — plus restock alerts and the occasional members-only treat.',
  },
};

export const about = {
  hero: {
    eyebrow: 'Our story',
    heading: 'Built for the ones|who refuse to blend in',
    sub: 'Stay Different started with a simple idea: your hair should look like your personality, not like everyone else\'s.',
  },
  story: {
    eyebrow: 'Why "Stay Different"?',
    heading: 'Hair is|self-expression',
    body:
      'We grew tired of an industry that sold one look to everyone. The same three shades. The same "safe" textures. The same message: fit in.\n\nSo we built the opposite. Stay Different Hair makes premium, 100% human hair in shades with personality and textures that celebrate every curl pattern. We colour and tone in small batches, obsess over hairlines, and test every unit on real people before it reaches you.\n\nWhether you want to blend in beautifully or walk in and change the room, we are here for both. Just do it your way.',
    // TODO: replace with brand photography.
    image: '',
  },
  values: [
    { title: 'Quality without compromise', text: '100% human hair, cuticle-aligned and double-drawn. If we would not wear it, we will not sell it.' },
    { title: 'Shades with personality', text: 'Original colours developed in-house and named for the people who wear them.' },
    { title: 'Every texture, celebrated', text: 'From bone-straight to kinky coils — no texture is an afterthought.' },
    { title: 'Honest help', text: 'Real people on WhatsApp who will tell you which shade actually suits you.' },
  ],
  closing: {
    heading: 'Your hair.|Your rules.',
    body: 'Ready to find yours?',
  },
};

export const hairCare = {
  hero: {
    eyebrow: 'Hair care',
    heading: 'Look after it,|it looks after you',
    sub: 'Premium hair lasts a year or more with the right routine. Here is everything you need to know.',
  },
  sections: [
    {
      title: 'Washing',
      icon: 'drop',
      tips: [
        'Wash every 7–10 wears (curls every 5–7), or when product builds up.',
        'Detangle gently before you wash, starting at the ends.',
        'Use lukewarm water and a sulphate-free shampoo, smoothing downwards — never scrub in circles.',
        'Deep condition for 15–20 minutes, then rinse with cool water to seal the cuticle.',
        'Blot with a microfibre towel and air-dry flat or on a wig stand.',
      ],
    },
    {
      title: 'Styling',
      icon: 'comb',
      tips: [
        'Use a wide-tooth comb or loop brush; never brush curls when dry.',
        'Keep products light — heavy oils weigh hair down and loosen lace knots.',
        'Refresh waves and curls with water and a leave-in between washes.',
        'Sleep in a satin bonnet or on a silk pillowcase to cut down frizz.',
      ],
    },
    {
      title: 'Heat',
      icon: 'flame',
      tips: [
        'Always apply a heat protectant first.',
        'Keep tools at or below 180°C / 350°F (lower for coloured hair).',
        'One slow pass beats five fast ones.',
        'Give hair heat-free days to keep it soft and shiny.',
      ],
    },
    {
      title: 'Storage',
      icon: 'box',
      tips: [
        'Store wigs on a stand or in their satin bag, away from direct sunlight.',
        'Loosely braid or wrap bundles and clip-ins before storing.',
        'Keep hair completely dry before packing it away.',
      ],
    },
    {
      title: 'Lifespan',
      icon: 'clock',
      tips: [
        'With good care, our hair lasts 12 months or more.',
        'Coloured and blonde hair needs a little extra moisture to go the distance.',
        'Tape-ins can be re-taped and reused for 2–3 applications.',
        'Sun, chlorine and salt water shorten lifespan — rinse straight after swimming.',
      ],
    },
  ],
};

export const faq = {
  hero: {
    eyebrow: 'Help centre',
    heading: 'Questions,|answered',
    sub: 'Can\'t find what you\'re looking for? Message us — we reply fast.',
  },
  groups: [
    {
      title: 'Hair & quality',
      items: [
        { q: 'Is your hair 100% human hair?', a: 'Yes. Every product is 100% human hair, cuticle-aligned and never mixed with synthetic or animal fibres.' },
        { q: 'Can I colour or bleach the hair?', a: 'Our natural (1B) hair can be coloured and lifted by a professional. Pre-coloured shades can be toned or darkened, but we do not recommend lifting them further.' },
        { q: 'Will the hair shed or tangle?', a: 'A little shedding in the first couple of washes is normal. Follow our Hair Care guide and tangling stays minimal.' },
        { q: 'How many bundles do I need?', a: 'For a full sew-in: 3 bundles up to 20", 4 bundles for 22" and longer. Add a closure or frontal for a leave-out-free install.' },
      ],
    },
    {
      title: 'Colour',
      items: [
        { q: 'How do I pick the right shade?', a: 'Start with our Colour Guide — the 30-second quiz finds your undertone and matches you with shades. Still unsure? Send us a photo in natural light on WhatsApp.' },
        { q: 'Why does the colour look different on my screen?', a: 'Screens, lighting and camera settings all shift colour. Our swatches are a close guide, but always view the hair in daylight if you can.' },
      ],
    },
    {
      title: 'Orders',
      items: [
        { q: 'How do I place an order?', a: 'Add items to your bag and press Checkout. While full online payments are being set up, checkout sends your bag to us on WhatsApp and we confirm everything with you directly.' },
        { q: 'Can I change or cancel my order?', a: 'Message us within 12 hours of ordering and we will do our best before it ships.' },
      ],
    },
  ],
};

export const shipping = {
  hero: {
    eyebrow: 'Shipping & Returns',
    heading: 'Fast to you.|Fair if not.',
    sub: 'Everything you need to know about getting your hair — and sending it back if it is not right.',
  },
  // TODO: replace with the client's real shipping & returns policy.
  groups: [
    {
      title: 'Shipping',
      items: [
        { q: 'Processing time', a: 'Orders are dispatched within 1–2 business days. Custom colour and wig customisation can take 5–7 business days.' },
        { q: 'Delivery times', a: 'Domestic express: 1–3 business days. International: 5–10 business days. Tracking is emailed as soon as your order ships.' },
        { q: 'Shipping costs', a: 'Free express shipping on orders over the threshold shown at the top of the site. Otherwise, shipping is calculated at checkout.' },
        { q: 'Customs & duties', a: 'International orders may be subject to import duties, which are the responsibility of the customer.' },
      ],
    },
    {
      title: 'Returns',
      items: [
        { q: 'Return window', a: 'Return unopened, unworn hair with its original packaging and seal intact within 14 days of delivery.' },
        { q: 'Non-returnable items', a: 'For hygiene reasons, hair that has been opened, worn, washed, coloured, cut or had its lace altered cannot be returned.' },
        { q: 'How to start a return', a: 'Contact us with your order number. We will send you instructions and the return address.' },
        { q: 'Refunds', a: 'Refunds are issued to the original payment method within 5–7 business days of us receiving your return.' },
      ],
    },
  ],
};

export const contactPage = {
  hero: {
    eyebrow: 'Contact',
    heading: 'Let\'s|talk hair',
    sub: 'Shade dilemmas, order questions or just saying hi — we reply within one business day (usually much faster on WhatsApp).',
  },
  formHeading: 'Send us a message',
  topics: ['Choosing a shade', 'An existing order', 'Returns', 'Wholesale & collaborations', 'Something else'],
};
