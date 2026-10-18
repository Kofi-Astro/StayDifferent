# Stay Different Hair

A premium e-commerce site for **Stay Different Hair** (human-hair extensions, wigs, closures & frontals), with an interactive **Colour Guide** and a built-in **admin panel** where the owner can change almost everything (products, stock, prices, photos, page copy, contact details, currencies) without touching code.

| Part | Built with |
| --- | --- |
| Storefront pages | **HTML** templates (Jinja2) + **CSS** + vanilla **JavaScript** |
| Server | **Python 3.13** + **FastAPI** |
| Admin panel | HTML + CSS + vanilla JavaScript (talks to a small JSON API) |
| Content | JSON files in `/data` (defaults) + a JSON store for admin edits |

There is no front-end build step: what is in `public/` and `templates/` is exactly what the browser receives.

---

## 1. Run it locally

```bash
# one-time setup
python3.13 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt

# start the site (auto-reloads when you edit files)
.venv/bin/uvicorn app.main:app --reload
```

- Shop: <http://localhost:8000>
- Admin: <http://localhost:8000/admin>. The local password is **`admin`**. Set `ADMIN_PASSWORD` to change it (see `.env.example`).

Checks before you deploy:

```bash
.venv/bin/pytest                 # 36 tests: pages, forms, checkout, admin security…
.venv/bin/ruff check .           # lint
.venv/bin/ruff format --check .  # formatting
```

---

## 2. Project structure

```
app/                     Python server (FastAPI)
  main.py                App setup: routes, static files, security headers, caching
  config.py              Paths, environment variables, navigation
  store.py               JSON content store (admin edits, backups, form submissions)
  data.py                ★ Data-access layer: every page reads content through here
  catalog.py             Stock/price rules + shop filtering & sorting
  money.py               Currency conversion & price formatting
  art.py                 Generated placeholder "hair swatch" images + SVG icons
  render.py              Jinja2 setup and template helpers
  seo.py                 JSON-LD structured data, sitemap.xml, robots.txt
  auth.py                Admin login (signed cookie, CSRF origin check)
  schemas.py             Validates admin saves against schemas.json
  schemas.json           ★ Describes every editable field (drives the admin forms)
  routes/site.py         Storefront pages
  routes/api.py          Search, newsletter, contact, checkout (stub)
  routes/admin.py        Admin login + admin JSON API

templates/               HTML (Jinja2)
  base.html              Page shell: <head>, SEO tags, header, footer, scripts
  partials/              header.html, footer.html, macros.html (reusable components)
  pages/                 One template per page (home, colour_guide, shop, product…)
  admin/                 Admin login + admin app shell

public/                  Served as-is
  css/styles.css         Design tokens + all storefront styles
  css/colour-guide.css   Colour Guide page styles
  js/client/             Browser behaviour (cart, quiz, filters, search, menus…)
  js/shared/             Small helpers (money, filters, escaping) used by the above
  admin/                 Admin UI (admin.css, js/app.js, js/form.js…)
  fonts/                 Self-hosted Bodoni Moda + DM Sans (OFL licensed)

data/                    ★ Default content (JSON) — see "Editing content"
brand/                   Logo options + sources for the share image & app icon
tests/                   pytest suite
```

### Components

These are Jinja macros in `templates/partials/macros.html` plus the partial templates:

| Component | Where |
| --- | --- |
| Header, MegaMenu, CartDrawer, SearchOverlay | `templates/partials/header.html` (behaviour in `public/js/client/header.js`, `cart.js`, `search.js`) |
| Footer, Newsletter | `partials/footer.html`, `macros.newsletter` |
| ProductCard, SectionHeading, Accordion, Price | `macros.product_card`, `macros.section_heading`, `macros.accordion`, `macros.price` |
| ShadeCard, UndertoneCard, UndertoneQuiz, LookPicker | `templates/pages/colour_guide.html` (behaviour in `public/js/client/colour-guide.js`) |

### Design tokens

All colours, fonts, spacing and motion values are CSS custom properties at the top of `public/css/styles.css`:

- **Espresso** `#1E1612`
- **Cream** `#F6F0E8`
- **Sand** `#E3D3BF`
- **Terracotta** `#D2552F`, with `#B4441F` for small text and buttons (meets WCAG AA)
- **Logo gold** `#B8935A`

Fonts are Bodoni Moda for display headings and DM Sans for body text.

---

## 3. Editing content

### The easy way: the admin panel (`/admin`)

| Section | What you can do |
| --- | --- |
| **Dashboard** | Stock alerts, pending orders, and a "Getting started" checklist of placeholders to replace |
| **Products** | Add, duplicate or delete products. For each one you can set: lengths, prices, "was" prices and **stock per length**; photos; draft/active status; collections; shade; badges; pre-orders |
| **Shades** | The colour library behind the Colour Guide (names, copy, swatch colours, filters) |
| **Collections** | Shop categories (mega-menu, filters, Home page) |
| **Pages** | Every word on Home, Colour Guide (including the quiz questions and "I want…" rows), About, Hair Care, FAQ, Shipping & Returns, Contact |
| **Settings** | Brand name, taglines, logo upload, contact details and WhatsApp, social handles, currencies and exchange rates, free-shipping threshold, checkout mode, announcement bar, SEO, textures and product types |
| **Inbox** | Order requests (change their status), contact messages, newsletter subscribers (CSV export) |
| **Media library** | Upload and manage images |
| **Backup & restore** | Download or restore everything in one file. The server also keeps the last 30 versions automatically. |

Changes go live immediately. Any section can be **reset to the original** content.

Heading tip: type a `|` in a heading to break it onto two lines, with the second line in italic accent, e.g. `Know your|undertone`.

### The developer way: `/data/*.json`

`/data` holds the **default** content. The site uses a default until the owner saves that section in the admin; after that, the saved copy (in `DATA_DIR/content.json`) takes over. "Reset to original" goes back to the `/data` version.

| File | Contents |
| --- | --- |
| `settings.json` | Brand, contact, socials, currencies, checkout, announcement bar, SEO |
| `products.json` | Products. Prices are in the base currency. `variants` = one entry per length (`length`, `price`, `compareAt`, `stock`) |
| `shades.json` | Shades (`undertones` drives the Colour Guide filters, `swatch` paints the placeholder art) |
| `collections.json` | Collections |
| `colour-guide.json` | All Colour Guide copy, quiz, undertone cards, "I want…" rows |
| `home.json`, `about.json`, `hair-care.json`, `faq.json`, `shipping.json`, `contact-page.json` | Page copy |

**Adding a new editable field:** add it to the JSON in `/data`, then describe it in `app/schemas.json`. The admin form picks it up automatically, and the server validates it. Finally, use it in a template.

### Swapping to a headless CMS later

All pages read content through `app/data.py` (`get_products()`, `get_settings()`, …). To move to Sanity, Contentful, Shopify or similar, change those functions to fetch from the CMS and return the same shapes. Templates and routes don't change.

---

## 4. Placeholders to replace before launch (`TODO`)

The admin dashboard's **Getting started** checklist tracks most of these.

| Placeholder | Where to change it |
| --- | --- |
| Brand photography (all product, collection, hero and About images are generated placeholder art) | Admin → Products / Collections / Pages → upload photos. Code: `app/art.py`, `templates/partials/macros.html` |
| Email, phone, **WhatsApp number**, hours, address | Admin → Settings → Contact details (`data/settings.json → contact`) |
| Instagram / TikTok handles | Admin → Settings → Social media |
| Product prices, lengths, stock | Admin → Products (`data/products.json`) |
| Base currency, display currencies & exchange rates | Admin → Settings → Prices, currency & checkout. The defaults are USD base with GBP, EUR, GHS and CAD at illustrative rates. |
| Shipping & returns policy | Admin → Pages → Shipping & Returns (`data/shipping.json`) |
| Instagram/TikTok strip on the Home page | Uses placeholder tiles. `templates/pages/home.html` (swap for real posts or an embed) |
| **Payment / checkout** | `app/routes/api.py → checkout()`. Today the bag is sent as a WhatsApp order (or shows a "coming soon" message; switch in Settings). Add Stripe / Paystack there. |
| Newsletter → email platform | `app/routes/api.py → newsletter()` (sign-ups are stored and listed in the Inbox) |
| Contact form → email notification | `app/routes/api.py → contact()` (messages are stored and listed in the Inbox) |
| Share image | `public/og-image.jpg` (or upload one in Settings → Search & sharing) |

**Stock and orders:** checkout doesn't reduce stock automatically, because orders are confirmed by hand over WhatsApp. When you confirm an order in the Inbox, adjust stock in Products.

---

## 5. Deploy to Railway

1. **Push** this repo to GitHub, then in Railway choose **New Project → Deploy from GitHub repo**. Railway detects Python from `requirements.txt`, and the start command comes from `railway.json`.
2. **Add a volume** (service → *Settings → Volumes*) mounted at **`/storage`**. This keeps admin edits, uploads and orders across deploys. Without it they are lost on every redeploy.
3. **Set variables** (service → *Variables*):

   | Variable | Value |
   | --- | --- |
   | `ADMIN_PASSWORD` | A long password. The admin stays off until this is set. |
   | `ADMIN_SECRET` | A long random string: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
   | `DATA_DIR` | `/storage` |
   | `SITE_URL` | Your public URL, e.g. `https://staydifferenthair.com` (no trailing slash) |
   | `ENV` | `production` |

4. **Generate a domain** (*Settings → Networking*) or attach your own, then update `SITE_URL` to match.
5. Visit `/admin`, sign in, and work through the Getting started checklist.

With the Railway CLI the same steps are `railway init`, `railway volume add --mount-path /storage`, `railway variables --set KEY=value`, then `railway up`.

---

## 6. Brand assets

- Logo options are in `brand/`. The site uses **option 2** (the black circle "STAY D · ( HAIR )"), recreated in HTML/CSS so it stays sharp and recolours on dark sections. To use an image logo instead, upload one in Admin → Settings → Brand.
- `public/favicon.svg` is the SD monogram.
- `public/og-image.jpg` and `public/apple-touch-icon.png` are rendered from `brand/og-card.html` and `brand/app-icon.html`. Open those files in a browser at 1200×630 and 180×180 and screenshot them to regenerate.

---

## 7. Quality notes

- **Accessibility:**
  - Skip link, landmarks and a logical heading outline.
  - Visible focus rings everywhere.
  - Native `<dialog>` for the menu, search and cart: focus trap, Esc to close, inert background.
  - ARIA on the accordions, mega-menu, filter chips and quiz.
  - Quiz answers are real radio buttons.
  - Colours meet WCAG AA contrast.
  - Every animation respects `prefers-reduced-motion`.
- **Performance:**
  - Server-rendered HTML.
  - Self-hosted, preloaded fonts.
  - Lazy-loaded images.
  - Gzip.
  - Long-lived caching for versioned assets.
  - Placeholder art served as cacheable SVGs.
  - Scroll animations use CSS only, with no JavaScript.
  - Lighthouse (mobile, local): performance 97–99; accessibility, best practices and SEO 100.
- **SEO:**
  - Per-page titles, descriptions and canonical URLs.
  - Open Graph tags.
  - JSON-LD for Organization, Product, BreadcrumbList and FAQPage.
  - `sitemap.xml` and `robots.txt`.
- **Security:**
  - All template output is auto-escaped.
  - The server validates every admin save and form.
  - Rate-limited forms and login.
  - Signed `HttpOnly`, `SameSite=Strict` admin cookie with an origin check.
  - Uploads are restricted to image types up to 8 MB.
