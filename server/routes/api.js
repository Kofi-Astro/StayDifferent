/**
 * ============================================================================
 *  Public JSON API
 * ----------------------------------------------------------------------------
 *  GET  /api/products        Lightweight product index for the search overlay
 *  POST /api/newsletter      Newsletter sign-up
 *  POST /api/contact         Contact form
 *  POST /api/checkout        Checkout (stub — see TODO below)
 *
 *  All submissions are validated on the server (never trust the browser) and
 *  saved to DATA_DIR/submissions.json, where the client sees them in
 *  Admin → Inbox.
 * ============================================================================
 */
import express from 'express';
import { getProducts, getSettings, getShadeMap, getCollections } from '../data.js';
import { addSubmission } from '../store.js';
import { priceRange, isSoldOut, variantAvailable } from '../../public/js/shared/catalog.js';
import { formatMoney, findCurrency } from '../../public/js/shared/money.js';
import { whatsappUrl } from '../../public/js/shared/links.js';
import { rateLimit } from '../rate-limit.js';

export const apiRouter = express.Router();

// Accept JSON (fetch) and classic form posts (no-JS fallback). Small bodies only.
apiRouter.use(express.json({ limit: '100kb' }));
apiRouter.use(express.urlencoded({ extended: false, limit: '100kb' }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim + cap a string field so nobody can store megabytes of text. */
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);

/**
 * Reply to a form submission. fetch() callers get JSON; a no-JS form post is
 * redirected back to the page it came from.
 */
function respond(req, res, status, body) {
  if (req.is('application/json')) return res.status(status).json(body);
  const back = req.get('referer') || '/';
  return res.redirect(303, back);
}

/* ---------- Search index -------------------------------------------------- */
apiRouter.get('/products', async (req, res) => {
  const [products, shades, collections] = await Promise.all([getProducts(), getShadeMap(), getCollections()]);
  const collectionNames = Object.fromEntries(collections.map((c) => [c.slug, c.name]));
  res.set('Cache-Control', 'public, max-age=60');
  res.json(
    products.map((p) => ({
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      shade: shades[p.shade]?.name || '',
      swatch: shades[p.shade]?.swatch,
      texture: p.texture,
      image: p.images?.[0] || '',
      from: priceRange(p).min,
      soldOut: isSoldOut(p),
      // Extra words to match against (collection names, shade family).
      keywords: [...p.collections.map((c) => collectionNames[c]), shades[p.shade]?.family, p.type].filter(Boolean).join(' '),
    })),
  );
});

/* ---------- Newsletter ----------------------------------------------------- */
apiRouter.post('/newsletter', rateLimit({ max: 10 }), async (req, res) => {
  if (req.body.company) return respond(req, res, 200, { ok: true }); // honeypot → silently ignore bots
  const email = clean(req.body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return respond(req, res, 400, { error: 'Please enter a valid email address.' });
  await addSubmission('newsletter', { email });
  // TODO: forward to your email platform (Klaviyo, Mailchimp…) here.
  respond(req, res, 200, { ok: true, message: "You're on the list. Welcome to the different ones." });
});

/* ---------- Contact -------------------------------------------------------- */
apiRouter.post('/contact', rateLimit({ max: 5 }), async (req, res) => {
  if (req.body.company) return respond(req, res, 200, { ok: true });
  const entry = {
    name: clean(req.body.name, 120),
    email: clean(req.body.email, 200).toLowerCase(),
    topic: clean(req.body.topic, 120),
    orderNumber: clean(req.body.orderNumber, 60),
    message: clean(req.body.message, 4000),
  };
  const errors = {};
  if (!entry.name) errors.name = 'Please tell us your name.';
  if (!EMAIL_RE.test(entry.email)) errors.email = 'Please enter a valid email address.';
  if (entry.message.length < 10) errors.message = 'Your message needs at least 10 characters.';
  if (Object.keys(errors).length) return respond(req, res, 400, { error: 'Please check the highlighted fields.', errors });
  await addSubmission('contact', entry);
  // TODO: send an email notification to the business here (e.g. via Resend / SendGrid).
  respond(req, res, 200, { ok: true, message: 'Message received! We will get back to you within one business day.' });
});

/* ---------- Checkout (stub) ------------------------------------------------ */
/**
 * Validates the bag against LIVE prices & stock (the browser's copy could be
 * stale or tampered with), saves an order request, then either:
 *   - returns a WhatsApp link with the order pre-filled ('whatsapp' mode), or
 *   - returns the "checkout coming soon" message ('disabled' mode).
 *
 * TODO: payment integration — create a Stripe Checkout Session / Paystack
 * transaction here using `lines` and `subtotal`, and return its URL instead.
 */
apiRouter.post('/checkout', rateLimit({ max: 20 }), async (req, res) => {
  const [settings, products, shades] = await Promise.all([getSettings(), getProducts(), getShadeMap()]);
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
  const currency = findCurrency(settings.commerce.currencies, clean(req.body.currency, 3) || settings.commerce.defaultCurrency);

  const lines = [];
  const problems = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => Number(v.length) === Number(item.length));
    const qty = Math.max(1, Math.min(20, Math.floor(Number(item.qty) || 1)));
    if (!product || !variant) {
      problems.push('An item in your bag is no longer available.');
      continue;
    }
    if (!variantAvailable(product, variant)) {
      problems.push(`${product.name} (${variant.length}") just sold out.`);
      continue;
    }
    if (variant.stock > 0 && qty > variant.stock && !product.allowPreorder) {
      problems.push(`Only ${variant.stock} left of ${product.name} (${variant.length}").`);
      continue;
    }
    lines.push({
      productId: product.id,
      name: product.name,
      shade: shades[product.shade]?.name || '',
      length: variant.length,
      qty,
      price: variant.price,
      preorder: variant.stock <= 0,
    });
  }

  if (!lines.length) return res.status(400).json({ error: problems[0] || 'Your bag is empty.' });

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const order = await addSubmission('orders', {
    status: 'pending',
    currency: currency.code,
    subtotal,
    lines,
    channel: settings.commerce.checkoutMode,
  });

  if (settings.commerce.checkoutMode === 'whatsapp' && settings.contact.whatsapp) {
    const ref = order.id.slice(0, 8).toUpperCase();
    const message = [
      `Hi ${settings.brand.name}! I'd like to order (ref ${ref}):`,
      ...lines.map(
        (l) => `• ${l.qty} × ${l.name}${l.shade ? ` — ${l.shade}` : ''}, ${l.length}" — ${formatMoney(l.price * l.qty, currency)}${l.preorder ? ' (pre-order)' : ''}`,
      ),
      `Subtotal: ${formatMoney(subtotal, currency)}`,
    ].join('\n');
    return res.json({ ok: true, mode: 'whatsapp', url: whatsappUrl(settings.contact, message), warnings: problems });
  }

  res.json({ ok: true, mode: 'disabled', message: settings.commerce.checkoutMessage, warnings: problems });
});
