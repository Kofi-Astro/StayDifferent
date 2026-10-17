/**
 * Page rendering glue: loads the shared layout data, calls a page's render
 * function and wraps the result in the document layout.
 */
import { layout } from '../views/layout.js';
import { getLayoutData } from './data.js';
import { organizationJsonLd } from './seo.js';
import { notFoundPage } from '../views/pages/not-found.js';

/**
 * Build the context object every page + the layout receives.
 * @param {import('express').Request} req
 */
export async function buildContext(req) {
  const data = await getLayoutData();
  return { ...data, path: req.path, query: req.query };
}

/**
 * Express handler factory: `page(render)` turns a page module's render
 * function into a route handler. If render returns null, a 404 is shown.
 *
 * A page render function receives (ctx, req) and returns:
 *   { meta, body, jsonLd?, styles?, script?, data? }
 */
export function page(render) {
  return async (req, res, next) => {
    try {
      const ctx = await buildContext(req);
      const result = await render(ctx, req);
      if (!result) return res.status(404).send(await renderNotFound(req, ctx));
      const out = layout({
        ctx,
        ...result,
        // Every page carries the Organization schema; pages add their own.
        jsonLd: [organizationJsonLd(ctx.settings), ...(result.jsonLd || [])],
      });
      // HTML is always rendered fresh, so admin edits show up immediately.
      res.set('Cache-Control', 'no-cache');
      res.type('html').send(out.toString());
    } catch (err) {
      next(err);
    }
  };
}

/** Render the branded 404 page as an HTML string. */
export async function renderNotFound(req, ctx) {
  const context = ctx || (await buildContext(req));
  const result = notFoundPage(context);
  return layout({ ctx: context, ...result }).toString();
}
