/** 404 page — shown for unknown URLs and hidden/deleted products. */
import { html } from '../../public/js/shared/html.js';
import { icon } from '../../public/js/components/icons.js';

export function notFoundPage() {
  return {
    meta: { title: 'Page not found', noindex: true },
    body: html`<section class="not-found">
      <div class="container-page not-found__inner">
        <p class="eyebrow">Error 404</p>
        <h1 class="not-found__title">This page went<br /><em>a different way.</em></h1>
        <p class="not-found__text">The link may be old, or the product may have moved. Let's get you somewhere good.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/shop">Shop all hair ${icon('arrow', 'icon--sm')}</a>
          <a class="btn btn-outline" href="/colour-guide">Colour Guide</a>
        </div>
      </div>
    </section>`,
  };
}
