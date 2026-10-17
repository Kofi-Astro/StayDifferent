/**
 * Site footer — brand promise, support & explore links, newsletter, socials.
 * Server-only (imports config/site.js for the link groups).
 */
import { html } from '../shared/html.js';
import { icon } from './icons.js';
import { logo } from './logo.js';
import { newsletter } from './ui.js';
import { footerNav } from '../../../config/site.js';
import { socialLinks, whatsappUrl } from '../shared/links.js';

export function footer({ settings }) {
  const socials = socialLinks(settings.social);
  const year = new Date().getFullYear();
  return html`<footer class="site-footer">
    <div class="container-page site-footer__top">
      <div class="site-footer__brand">
        ${logo(settings, { tone: 'light', size: 'lg' })}
        <p class="site-footer__tagline">${settings.brand.tagline}</p>
        <p class="site-footer__promise">${settings.brand.promise}</p>
        ${socials.length > 0 &&
        html`<ul class="social-list" role="list">
          ${socials.map(
            (s) => html`<li><a class="icon-btn icon-btn--light" href="${s.href}" target="_blank" rel="noopener">${icon(s.key)}<span class="sr-only">${s.label} (opens in a new tab)</span></a></li>`,
          )}
        </ul>`}
      </div>

      <nav class="site-footer__col" aria-labelledby="footer-support">
        <h2 class="site-footer__heading eyebrow" id="footer-support">Customer care</h2>
        <ul role="list">
          ${footerNav.support.map((l) => html`<li><a href="${l.href}">${l.label}</a></li>`)}
          <li><a href="${whatsappUrl(settings.contact)}" target="_blank" rel="noopener">WhatsApp us</a></li>
        </ul>
      </nav>

      <nav class="site-footer__col" aria-labelledby="footer-explore">
        <h2 class="site-footer__heading eyebrow" id="footer-explore">Explore</h2>
        <ul role="list">
          ${footerNav.explore.map((l) => html`<li><a href="${l.href}">${l.label}</a></li>`)}
        </ul>
      </nav>

      <div class="site-footer__news">
        ${newsletter({
          heading: settings.footer.newsletterHeading,
          text: settings.footer.newsletterText,
          idPrefix: 'footer-newsletter',
          tone: 'dark',
        })}
      </div>
    </div>

    <div class="container-page site-footer__bottom">
      <p>© ${year} ${settings.brand.name}. All rights reserved.</p>
      <p class="site-footer__contact">
        <a href="mailto:${settings.contact.email}">${settings.contact.email}</a>
        <span aria-hidden="true">·</span>
        <a href="tel:${settings.contact.phone.replace(/[^\d+]/g, '')}">${settings.contact.phone}</a>
      </p>
    </div>
  </footer>`;
}
