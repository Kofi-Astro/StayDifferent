/**
 * Storefront routes — maps each URL to the page module that renders it.
 * Page modules live in views/pages/ and return { meta, body, … } (see
 * server/render.js for the contract).
 */
import express from 'express';
import { page } from '../render.js';
import { sitemapXml, robotsTxt } from '../seo.js';
import { homePage } from '../../views/pages/home.js';
import { colourGuidePage } from '../../views/pages/colour-guide.js';

export const siteRouter = express.Router();

siteRouter.get('/', page(homePage));
siteRouter.get('/colour-guide', page(colourGuidePage));

/* ---------- SEO files ----------------------------------------------------- */
siteRouter.get('/sitemap.xml', async (req, res) => {
  res.type('application/xml').send(await sitemapXml());
});
siteRouter.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(robotsTxt());
});
