/**
 * ============================================================================
 *  Stay Different Hair — web server
 * ----------------------------------------------------------------------------
 *  A small Express app that:
 *    1. Renders storefront pages to HTML (views/pages/*.js) with fresh content
 *       from the store, so every page arrives complete (great for SEO & speed).
 *    2. Serves static files from /public (CSS, browser JS, fonts, images).
 *    3. Serves admin-uploaded images from DATA_DIR/uploads at /media/….
 *    4. Exposes a JSON API for forms, search, checkout and the admin panel.
 *
 *  Start locally:  npm run dev   →  http://localhost:3000   (admin: /admin)
 * ============================================================================
 */
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initStore, UPLOAD_DIR } from './server/store.js';
import { siteRouter } from './server/routes/site.js';
import { apiRouter } from './server/routes/api.js';
import { adminRouter } from './server/routes/admin.js';
import { renderNotFound } from './server/render.js';
import { escapeHtml } from './public/js/shared/html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
// Railway (and most hosts) sit behind a proxy — trust it so req.ip / req.secure are right.
app.set('trust proxy', 1);

/* ---------- Security headers (applied to every response) ---------------- */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});

/* ---------- Gzip/Brotli-style compression for HTML, CSS, JS, JSON -------- */
app.use(compression());

/* ---------- Static files ------------------------------------------------- */
/**
 * Caching strategy:
 *  - Fonts & images: cached for 30 days (they rarely change).
 *  - CSS/JS requested with ?v=… (see views/layout.js): cached for a year —
 *    the version changes on every deploy, so browsers fetch the new file.
 *  - CSS/JS without ?v (modules imported by other modules): revalidated with
 *    an ETag on each visit (fast 304s), so deploys are never served stale.
 */
app.use(
  express.static(path.join(__dirname, 'public'), {
    index: false,
    setHeaders(res, filePath) {
      if (/\.(woff2|png|jpe?g|webp|avif|svg|ico)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
      } else if (/\.(css|js)$/.test(filePath)) {
        const versioned = res.req?.query?.v;
        res.setHeader('Cache-Control', versioned ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
    },
  }),
);

/* ---------- Uploaded media (admin image uploads) ------------------------- */
app.use(
  '/media',
  express.static(UPLOAD_DIR, {
    index: false,
    // Uploaded files get unique random names, so they can be cached "forever".
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'),
  }),
);

/* ---------- Routes ------------------------------------------------------- */
app.use('/api', apiRouter);
app.use('/admin', adminRouter);
app.use('/', siteRouter);

/* ---------- 404 & error handling ----------------------------------------- */
app.use(async (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.status(404).send(await renderNotFound(req));
});

// Express recognises error handlers by their 4 arguments — keep `_next`.
app.use((err, req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  if (res.headersSent) return;
  const status = err.status || err.statusCode || 500;
  if (req.path.startsWith('/api/')) {
    return res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message });
  }
  res.status(status).send(isProd ? 'Something went wrong. Please try again.' : `<pre>${escapeHtml(err.stack || err)}</pre>`);
});

/* ---------- Boot --------------------------------------------------------- */
await initStore();
app.listen(PORT, () => {
  console.log(`\n  ✦ Stay Different Hair running at http://localhost:${PORT}`);
  console.log(`  ✦ Admin panel:                  http://localhost:${PORT}/admin\n`);
});
