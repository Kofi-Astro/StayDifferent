/**
 * Product page behaviour:
 *   - Length selector → updates price, "was" price, stock message, qty limit
 *   - Quantity stepper (− / +), clamped to stock
 *   - Gallery: thumbnails scroll the main track; swipe on mobile
 *   - Add to bag → cart (opens the drawer)
 */
import { pageData, $, $$ } from './core.js';
import { money } from './currency.js';
import { addToCart } from './cart.js';
import { variantAvailable, cartKey } from '../shared/catalog.js';

const { product, shade, settings } = pageData();
const LOW_STOCK = Number(settings?.commerce?.lowStockThreshold) || 3;
const MAX_QTY = 20;

/** Mirrors stockMessage() in views/pages/product.js. */
function stockMessage(variant) {
  if (!variant) return { text: 'Sold out', state: 'out' };
  if (variant.stock > 0 && variant.stock <= LOW_STOCK) return { text: `Only ${variant.stock} left — order soon`, state: 'low' };
  if (variant.stock > 0) return { text: 'In stock — ships in 1–2 business days', state: 'in' };
  if (product.allowPreorder) return { text: 'Pre-order — ships in 2–3 weeks', state: 'pre' };
  return { text: 'Sold out in this length', state: 'out' };
}

function initBuyForm() {
  const form = /** @type {HTMLFormElement|null} */ ($('[data-product-form]'));
  if (!form || !product) return;
  const qtyInput = /** @type {HTMLInputElement} */ ($('[data-qty-input]', form));
  const addBtn = /** @type {HTMLButtonElement} */ ($('[data-add-to-cart]', form));

  const selectedVariant = () => {
    const length = Number(/** @type {HTMLInputElement|null} */ (form.querySelector('input[name="length"]:checked'))?.value);
    return product.variants.find((v) => Number(v.length) === length);
  };
  const maxQty = (v) => (v && v.stock > 0 ? Math.min(MAX_QTY, v.stock) : MAX_QTY);

  function update() {
    const v = selectedVariant();
    // Price (+ keep data-price in sync so currency switching still works)
    const priceEl = $('[data-product-price] [data-price]');
    if (priceEl && v) {
      priceEl.dataset.price = String(v.price);
      priceEl.textContent = money(v.price);
    }
    const compare = $('[data-product-compare]');
    if (compare) {
      compare.hidden = !(v?.compareAt > v?.price);
      compare.innerHTML = v?.compareAt ? `<span data-price="${v.compareAt}">${money(v.compareAt)}</span>` : '';
    }
    // Stock message
    const msg = stockMessage(v);
    const stock = $('[data-stock]');
    stock.className = `stock stock--${msg.state}`;
    $('[data-stock-text]').textContent = msg.text;
    $('[data-length-label]').textContent = v ? `${v.length}"` : '';
    // Quantity limit + button state
    qtyInput.max = String(maxQty(v));
    if (Number(qtyInput.value) > maxQty(v)) qtyInput.value = String(maxQty(v));
    const ok = variantAvailable(product, v);
    addBtn.disabled = !ok;
  }

  form.addEventListener('change', (e) => {
    if (/** @type {HTMLInputElement} */ (e.target).name === 'length') update();
  });

  // − / + buttons
  form.addEventListener('click', (e) => {
    const step = /** @type {HTMLElement} */ (e.target).closest('[data-qty-step]');
    if (!step) return;
    const next = Number(qtyInput.value || 1) + Number(step.getAttribute('data-qty-step'));
    qtyInput.value = String(Math.max(1, Math.min(maxQty(selectedVariant()), next)));
  });
  // Typed quantities are clamped too.
  qtyInput.addEventListener('change', () => {
    const n = Math.floor(Number(qtyInput.value)) || 1;
    qtyInput.value = String(Math.max(1, Math.min(maxQty(selectedVariant()), n)));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = selectedVariant();
    if (!variantAvailable(product, v)) return;
    addToCart({
      key: cartKey(product.id, v.length),
      productId: product.id,
      slug: product.slug,
      name: product.name,
      shade: shade?.name || '',
      swatch: shade?.swatch,
      texture: product.texture,
      image: product.image,
      length: Number(v.length),
      price: Number(v.price),
      qty: Number(qtyInput.value) || 1,
      max: v.stock > 0 ? Number(v.stock) : null, // null = pre-order
    });
  });

  update();
}

function initGallery() {
  const track = $('[data-gallery-track]');
  const thumbs = $$('[data-gallery-thumb]');
  if (!track || !thumbs.length) return;

  const slides = $$('.gallery__slide', track);
  const setCurrent = (index) => thumbs.forEach((t, i) => t.setAttribute('aria-current', String(i === index)));

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
      setCurrent(i);
    });
  });

  // Keep thumbnails in sync when the shopper swipes the track.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) setCurrent(slides.indexOf(/** @type {HTMLElement} */ (entry.target)));
    },
    { root: track, threshold: 0.6 },
  );
  slides.forEach((s) => observer.observe(s));
}

initBuyForm();
initGallery();
