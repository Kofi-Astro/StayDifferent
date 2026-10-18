/**
 * ============================================================================
 *  Content pages: About · Hair Care · FAQ · Shipping & Returns · Contact
 * ----------------------------------------------------------------------------
 *  Copy for each lives in data/pages.js and is editable in Admin → Pages.
 * ============================================================================
 */
import { html, splitHeading, paragraphs } from '../../public/js/shared/html.js';
import { socialLinks, whatsappUrl } from '../../public/js/shared/links.js';
import { sectionHeading, accordion, pageHero } from '../../public/js/components/ui.js';
import { icon } from '../../public/js/components/icons.js';
import { media } from '../../public/js/components/hair-art.js';
import { getPage } from '../../server/data.js';
import { breadcrumbJsonLd } from '../../server/seo.js';

/* ---------- About -------------------------------------------------------- */
export async function aboutPage(ctx) {
  const about = await getPage('about');
  const shade = ctx.shades['toffee-riot'] || Object.values(ctx.shades)[0];
  const body = html`
  ${pageHero(about.hero)}
  <section class="section" aria-labelledby="story-title">
    <div class="container-page about-story">
      <div class="about-story__media media-frame reveal">
        ${media({ image: about.story.image, alt: 'The Stay Different team styling hair', swatch: shade?.swatch, texture: 'curly', seed: 'about' })}
      </div>
      <div class="about-story__copy">
        ${sectionHeading({ eyebrow: about.story.eyebrow, heading: about.story.heading, id: 'story-title', className: 'reveal' })}
        <div class="prose reveal">${paragraphs(about.story.body)}</div>
      </div>
    </div>
  </section>
  <section class="section section--dark" aria-label="Our values">
    <div class="container-page">
      <ol class="values-grid" role="list">
        ${about.values.map(
          (v, i) => html`<li class="value reveal">
            <span class="value__num" aria-hidden="true">0${i + 1}</span>
            <h2 class="value__title">${v.title}</h2>
            <p class="value__text">${v.text}</p>
          </li>`,
        )}
      </ol>
    </div>
  </section>
  <section class="section about-closing">
    <div class="container-page about-closing__inner reveal">
      <h2 class="about-closing__title">${splitHeading(about.closing.heading)}</h2>
      <p class="about-closing__body">${about.closing.body}</p>
      <div class="btn-row" style="justify-content:center">
        <a class="btn btn-primary" href="/shop">Shop the collection ${icon('arrow', 'icon--sm')}</a>
        <a class="btn btn-outline" href="/colour-guide">Find your shade</a>
      </div>
    </div>
  </section>`;
  return {
    meta: { title: 'About us', description: about.hero.sub },
    body,
    jsonLd: [breadcrumbJsonLd([['Home', '/'], ['About', '/about']])],
  };
}

/* ---------- Hair Care ---------------------------------------------------- */
export async function hairCarePage() {
  const care = await getPage('hairCare');
  const body = html`
  ${pageHero(care.hero)}
  <section class="section section--tight">
    <div class="container-page">
      <nav class="care-jump no-scrollbar" aria-label="Hair care topics">
        ${care.sections.map((s, i) => html`<a class="chip" href="#care-${i}">${s.title}</a>`)}
      </nav>
      <div class="care-grid">
        ${care.sections.map(
          (s, i) => html`<article class="care-card reveal" id="care-${i}" aria-labelledby="care-${i}-title">
            <span class="care-card__icon" aria-hidden="true">${icon(s.icon || 'sparkle')}</span>
            <p class="eyebrow care-card__num">0${i + 1}</p>
            <h2 class="care-card__title" id="care-${i}-title">${s.title}</h2>
            <ul class="care-card__tips" role="list">
              ${s.tips.map((t) => html`<li>${t}</li>`)}
            </ul>
          </article>`,
        )}
      </div>
    </div>
  </section>
  <section class="section section--sand">
    <div class="container-page care-cta reveal">
      <h2 class="care-cta__title">Still have a <em>hair question?</em></h2>
      <p>Send us a message and a real person (who knows hair) will reply.</p>
      <a class="btn btn-primary" href="/contact">Ask us anything ${icon('arrow', 'icon--sm')}</a>
    </div>
  </section>`;
  return {
    meta: { title: 'Hair care guide', description: care.hero.sub },
    body,
    jsonLd: [breadcrumbJsonLd([['Home', '/'], ['Hair Care', '/hair-care']])],
  };
}

/* ---------- FAQ & Shipping (same accordion layout) ----------------------- */
function qaBody(page, idPrefix, ctx) {
  return html`
  ${pageHero(page.hero)}
  <section class="section section--tight">
    <div class="container-page content-grid">
      <aside class="content-grid__aside">
        <nav class="qa-nav" aria-label="Sections">
          <p class="eyebrow">On this page</p>
          <ul role="list">${page.groups.map((g, i) => html`<li><a href="#${idPrefix}-${i}">${g.title}</a></li>`)}</ul>
        </nav>
        <div class="help-card">
          <p class="help-card__title">Can't find your answer?</p>
          <p>We reply fast — usually within the hour on WhatsApp.</p>
          <div class="btn-row">
            <a class="btn btn-primary" href="${whatsappUrl(ctx.settings.contact)}" target="_blank" rel="noopener">${icon('whatsapp', 'icon--sm')} WhatsApp<span class="sr-only"> (opens in a new tab)</span></a>
            <a class="btn btn-outline" href="/contact">Email us</a>
          </div>
        </div>
      </aside>
      <div class="qa-groups">
        ${page.groups.map(
          (g, i) => html`<section class="qa-group" id="${idPrefix}-${i}" aria-labelledby="${idPrefix}-${i}-title">
            <h2 class="qa-group__title" id="${idPrefix}-${i}-title">${g.title}</h2>
            ${accordion(
              g.items.map((it) => ({ title: it.q, body: it.a })),
              { id: `${idPrefix}-${i}`, openFirst: i === 0 },
            )}
          </section>`,
        )}
      </div>
    </div>
  </section>`;
}

/** FAQPage structured data — can earn rich results in Google. */
function faqJsonLd(groups) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: groups.flatMap((g) =>
      g.items.map((it) => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
    ),
  };
}

export async function faqPage(ctx) {
  const faq = await getPage('faq');
  return {
    meta: { title: 'FAQ', description: faq.hero.sub },
    body: qaBody(faq, 'faq', ctx),
    jsonLd: [faqJsonLd(faq.groups), breadcrumbJsonLd([['Home', '/'], ['FAQ', '/faq']])],
  };
}

export async function shippingPage(ctx) {
  const shipping = await getPage('shipping');
  return {
    meta: { title: 'Shipping & Returns', description: shipping.hero.sub },
    body: qaBody(shipping, 'ship', ctx),
    jsonLd: [breadcrumbJsonLd([['Home', '/'], ['Shipping & Returns', '/shipping-returns']])],
  };
}

/* ---------- Contact ------------------------------------------------------ */
export async function contactPage(ctx) {
  const page = await getPage('contactPage');
  const { contact, social } = ctx.settings;
  const socials = socialLinks(social);
  const field = (id, label, input, hint = '') => html`<div class="form-field ${id === 'message' ? 'span-2' : ''}">
    <label class="form-label" for="contact-${id}">${label}${hint && html` <span class="muted">${hint}</span>`}</label>
    ${input}
  </div>`;

  const body = html`
  ${pageHero(page.hero)}
  <section class="section section--tight">
    <div class="container-page contact-layout">
      <div class="contact-form-wrap">
        <h2 class="contact-form__title">${page.formHeading}</h2>
        <form class="form-grid form-grid--2" action="/api/contact" method="post" data-form="contact" novalidate>
          ${field('name', 'Your name', html`<input class="field" id="contact-name" name="name" autocomplete="name" required />`)}
          ${field('email', 'Email', html`<input class="field" id="contact-email" name="email" type="email" autocomplete="email" required />`)}
          ${field(
            'topic',
            'What can we help with?',
            html`<select class="field" id="contact-topic" name="topic">${page.topics.map((t) => html`<option>${t}</option>`)}</select>`,
          )}
          ${field('order', 'Order number', html`<input class="field" id="contact-order" name="orderNumber" />`, '(optional)')}
          ${field('message', 'Message', html`<textarea class="field" id="contact-message" name="message" rows="6" required></textarea>`)}
          <input type="text" name="company" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true" />
          <div class="span-2 contact-form__submit">
            <button class="btn btn-primary" type="submit">Send message ${icon('arrow', 'icon--sm')}</button>
            <p class="form-status" role="status" aria-live="polite"></p>
          </div>
        </form>
      </div>

      <aside class="contact-cards" aria-label="Other ways to reach us">
        <a class="contact-card contact-card--accent" href="${whatsappUrl(contact)}" target="_blank" rel="noopener">
          ${icon('whatsapp')}
          <span><span class="contact-card__label">WhatsApp</span><span class="contact-card__value">Fastest reply — chat now</span></span>
          <span class="sr-only">(opens in a new tab)</span>
        </a>
        <a class="contact-card" href="mailto:${contact.email}">
          ${icon('mail')}
          <span><span class="contact-card__label">Email</span><span class="contact-card__value">${contact.email}</span></span>
        </a>
        <a class="contact-card" href="tel:${contact.phone.replace(/[^\d+]/g, '')}">
          ${icon('phone')}
          <span><span class="contact-card__label">Phone</span><span class="contact-card__value">${contact.phone}</span></span>
        </a>
        <div class="contact-card contact-card--plain">
          ${icon('clock')}
          <span><span class="contact-card__label">Hours</span><span class="contact-card__value">${contact.hours}</span>
          ${contact.address && html`<span class="contact-card__value">${contact.address}</span>`}</span>
        </div>
        ${socials.length > 0 &&
        html`<div class="contact-socials">
          <p class="eyebrow">Follow the different ones</p>
          <ul class="social-list" role="list">
            ${socials.map((s) => html`<li><a class="icon-btn contact-social" href="${s.href}" target="_blank" rel="noopener">${icon(s.key)}<span class="sr-only">${s.label} (opens in a new tab)</span></a></li>`)}
          </ul>
        </div>`}
      </aside>
    </div>
  </section>`;
  return {
    meta: { title: 'Contact us', description: page.hero.sub },
    body,
    jsonLd: [breadcrumbJsonLd([['Home', '/'], ['Contact', '/contact']])],
  };
}
