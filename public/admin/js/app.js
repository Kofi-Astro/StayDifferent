/**
 * ============================================================================
 *  Stay Different — admin app
 * ----------------------------------------------------------------------------
 *  A small single-page app. The URL hash picks the view:
 *
 *    #/                     Dashboard (stock alerts, orders, getting started)
 *    #/products             Product list      #/products/<id>   edit (or "new")
 *    #/shades, #/collections                  (same list/edit pattern)
 *    #/section/<key>        Edit a page or Settings (home, colourGuide, …)
 *    #/inbox                Orders, messages, newsletter subscribers
 *    #/media                Uploaded images
 *    #/backup               Download / restore all content
 *    #/account              Change the admin password
 *
 *  Data flow: on load we fetch /admin/api/bootstrap (schemas + every section).
 *  Edits happen in schema-driven forms (form.js); "Save" sends the whole
 *  section to the server, which validates it (app/schemas.py) and stores it.
 * ============================================================================
 */
import { api, uploadImage } from './api.js';
import { h, icon, artUrl } from './dom.js';
import { buildForm } from './form.js';

/** App state (filled by bootstrap). */
const state = {
  schemas: [],
  sections: {},
  customised: {},
  counts: {},
  dirty: false,
};

const mainEl = document.getElementById('admin-main');
/** Replace the main area's content (null/false children are skipped). */
const main = { replaceChildren: (...nodes) => mainEl.replaceChildren(...nodes.flat().filter(Boolean)), focus: (o) => mainEl.focus(o) };
const nav = document.getElementById('admin-nav');
const schemaFor = (key) => state.schemas.find((s) => s.key === key);

/* ───────────────────────── Helpers ─────────────────────────────────────── */

let toastTimer;
function toast(message, kind = 'ok') {
  const el = document.getElementById('admin-toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.dataset.show = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.dataset.show = 'false'), 3500);
}

const settings = () => state.sections.settings || {};
const money = (n) => {
  const code = settings().commerce?.baseCurrency || 'USD';
  return `${code} ${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
};
const totalStock = (p) => (p.variants || []).reduce((n, v) => n + (Number(v.stock) || 0), 0);
const priceRange = (p) => {
  const prices = (p.variants || []).map((v) => Number(v.price) || 0);
  return prices.length ? [Math.min(...prices), Math.max(...prices)] : [0, 0];
};
const fmtDate = (iso) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** Ask before leaving a form with unsaved changes. */
function setDirty(value) {
  state.dirty = value;
  document.body.dataset.dirty = String(value);
}
window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

/** Options for select fields, built from live data. */
function options(source) {
  const s = state.sections;
  switch (source) {
    case 'shades':
      return (s.shades || []).map((x) => ({ value: x.slug, label: `${x.name}${x.inGuide ? '' : ' (not in guide)'}` }));
    case 'guideShades':
      return (s.shades || []).filter((x) => x.inGuide).map((x) => ({ value: x.slug, label: x.name }));
    case 'collections':
      return (s.collections || []).map((x) => ({ value: x.slug, label: x.name }));
    case 'products':
      return (s.products || []).map((x) => ({ value: x.slug, label: `${x.name}${x.status !== 'active' ? ` (${x.status})` : ''}` }));
    case 'textures':
      return settings().catalog?.textures || [];
    case 'types':
      return settings().catalog?.types || [];
    default:
      return [];
  }
}

/** Shared form context (see form.js). */
const formCtx = {
  options,
  changed: () => setDirty(true),
  pickImage: () => openMediaPicker(),
};

/** Page header used by every view. */
function header(title, { subtitle, actions = [] } = {}) {
  return h('header', { class: 'a-page-head' }, h('div', {}, h('h1', {}, title), subtitle ? h('p', { class: 'a-muted' }, subtitle) : null), h('div', { class: 'a-row' }, actions));
}

/** Show server validation errors in a list at the top of the form. */
function errorBox(err) {
  return h('div', { class: 'a-alert', role: 'alert' }, h('strong', {}, err.message), err.details?.length ? h('ul', {}, err.details.map((d) => h('li', {}, d))) : null);
}

/** Save a whole section to the server and update local state. */
async function saveSection(key, value) {
  const res = await api(`/sections/${key}`, { method: 'PUT', body: value });
  state.sections[key] = res.value;
  state.customised[key] = true;
  setDirty(false);
  return res.value;
}

/* ───────────────────────── Navigation ──────────────────────────────────── */

function renderNav() {
  const groups = {};
  for (const s of state.schemas) (groups[s.group] ||= []).push(s);
  const current = location.hash || '#/';
  const link = (href, label, badge) =>
    h('a', { href, class: 'a-nav__link', 'aria-current': current === href || (href !== '#/' && current.startsWith(href + '/')) ? 'page' : null }, label, badge ? h('span', { class: 'a-badge' }, badge) : null);

  nav.replaceChildren(
    h('div', { class: 'a-nav__brand' }, h('span', { class: 'a-nav__logo' }, 'STAY D'), h('span', { class: 'a-nav__sub' }, 'Admin')),
    h('button', { type: 'button', class: 'a-nav__toggle', 'aria-expanded': 'false', 'aria-controls': 'admin-nav-links', onclick: (e) => {
      const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
      e.currentTarget.setAttribute('aria-expanded', String(open));
      nav.dataset.open = String(open);
    } }, icon('menu'), h('span', {}, 'Menu')),
    h(
      'nav',
      { id: 'admin-nav-links', class: 'a-nav__links' },
      link('#/', 'Dashboard'),
      link('#/inbox', 'Inbox', state.counts.ordersPending ? String(state.counts.ordersPending) : null),
      ...Object.entries(groups).map(([group, items]) =>
        h('div', { class: 'a-nav__group' }, h('p', { class: 'a-nav__heading' }, group), items.map((s) => link(s.kind === 'collection' ? `#/${s.key}` : `#/section/${s.key}`, s.label))),
      ),
      h('div', { class: 'a-nav__group' }, h('p', { class: 'a-nav__heading' }, 'Tools'), link('#/media', 'Media library'), link('#/backup', 'Backup & restore'), link('#/account', 'Account & password')),
    ),
    h(
      'div',
      { class: 'a-nav__foot' },
      h('a', { href: '/', target: '_blank', rel: 'noopener', class: 'a-nav__link' }, icon('external'), 'View shop'),
      h('form', { method: 'post', action: '/admin/logout' }, h('button', { class: 'a-nav__link a-nav__logout', type: 'submit' }, 'Sign out')),
    ),
  );
}

/* ───────────────────────── Dashboard ───────────────────────────────────── */

async function viewDashboard() {
  const products = state.sections.products || [];
  const active = products.filter((p) => p.status === 'active');
  const low = Number(settings().commerce?.lowStockThreshold ?? 3);
  const alerts = [];
  for (const p of active) for (const v of p.variants || []) if (Number(v.stock) <= low) alerts.push({ p, v });
  const outOfStock = active.filter((p) => (p.variants || []).every((v) => Number(v.stock) <= 0 && !p.allowPreorder));

  const subs = await api('/submissions');
  const pending = subs.orders.filter((o) => o.status === 'pending');

  // "Getting started" checklist — the placeholders the owner should replace.
  const c = settings().contact || {};
  const checklist = [
    ['Add your real email, phone & WhatsApp number', c.email && !/staydifferenthair\.com$/.test(c.email) && !/0000/.test(c.phone || '') && !/^440000/.test(c.whatsapp || ''), '#/section/settings'],
    ['Upload product photos', products.some((p) => p.images?.length), '#/products'],
    ['Upload a hero photo for the Home page', Boolean(state.sections.home?.hero?.image), '#/section/home'],
    ['Check prices, lengths & stock', state.customised.products, '#/products'],
    ['Review the Shipping & Returns policy', state.customised.shipping, '#/section/shipping'],
    ['Set your currencies & exchange rates', state.customised.settings, '#/section/settings'],
  ];

  const stat = (label, value, href, tone = '') => h('a', { class: `a-stat ${tone}`, href }, h('span', { class: 'a-stat__value' }, String(value)), h('span', { class: 'a-stat__label' }, label));

  main.replaceChildren(
    header('Welcome back', { subtitle: `Here's what's happening at ${settings().brand?.name || 'your store'}.` }),
    h(
      'div',
      { class: 'a-stats' },
      stat('Products live', active.length, '#/products'),
      stat('Sold out', outOfStock.length, '#/products', outOfStock.length ? 'a-stat--warn' : ''),
      stat('Pending orders', pending.length, '#/inbox', pending.length ? 'a-stat--accent' : ''),
      stat('Messages', subs.contact.length, '#/inbox?tab=contact'),
      stat('Subscribers', subs.newsletter.length, '#/inbox?tab=newsletter'),
    ),
    h(
      'div',
      { class: 'a-columns' },
      h(
        'section',
        { class: 'a-card' },
        h('h2', {}, 'Stock alerts'),
        alerts.length
          ? h(
              'table',
              { class: 'a-table' },
              h('thead', {}, h('tr', {}, h('th', {}, 'Product'), h('th', {}, 'Length'), h('th', {}, 'Stock'))),
              h(
                'tbody',
                {},
                alerts.slice(0, 12).map(({ p, v }) =>
                  h('tr', {}, h('td', {}, h('a', { href: `#/products/${p.id}` }, p.name)), h('td', {}, `${v.length}"`), h('td', {}, h('span', { class: `a-pill ${Number(v.stock) <= 0 ? 'a-pill--danger' : 'a-pill--warn'}` }, Number(v.stock) <= 0 ? 'Sold out' : `${v.stock} left`))),
                ),
              ),
            )
          : h('p', { class: 'a-muted' }, 'Everything is well stocked. 🎉'),
      ),
      h(
        'section',
        { class: 'a-card' },
        h('h2', {}, 'Getting started'),
        h('p', { class: 'a-muted' }, 'Replace the placeholder details before you launch.'),
        h('ul', { class: 'a-checklist' }, checklist.map(([label, done, href]) => h('li', { class: done ? 'is-done' : '' }, h('span', { class: 'a-checklist__box', 'aria-hidden': 'true' }, done ? '✓' : ''), h('a', { href }, label), done ? h('span', { class: 'sr-only' }, ' (done)') : null))),
      ),
    ),
    pending.length
      ? h('section', { class: 'a-card' }, h('h2', {}, 'Latest orders'), pending.slice(0, 5).map(orderCard))
      : null,
  );
}

/* ───────────────────────── Collections (lists) ─────────────────────────── */

function itemThumb(schema, item) {
  if (schema.key === 'products') {
    const shade = (state.sections.shades || []).find((s) => s.slug === item.shade);
    return item.images?.[0] || artUrl(shade?.swatch, item.texture, item.slug);
  }
  if (schema.key === 'shades') return artUrl(item.swatch, 'body-wave', item.slug);
  const shade = (state.sections.shades || []).find((s) => s.slug === item.artShade);
  return item.image || artUrl(shade?.swatch, item.artTexture, item.slug);
}

function viewList(key, query) {
  const schema = schemaFor(key);
  const items = state.sections[key] || [];
  const search = h('input', { class: 'a-input', type: 'search', placeholder: `Search ${schema.label.toLowerCase()}…`, value: query.get('q') || '', 'aria-label': 'Search' });
  const statusFilter =
    key === 'products'
      ? h('select', { class: 'a-input', 'aria-label': 'Filter by status' }, ['all', 'active', 'draft', 'archived', 'soldout', 'low'].map((v) => h('option', { value: v }, { all: 'All products', active: 'Active', draft: 'Drafts', archived: 'Archived', soldout: 'Sold out', low: 'Low stock' }[v])))
      : null;
  const tbody = h('tbody');
  const low = Number(settings().commerce?.lowStockThreshold ?? 3);

  const columns = {
    products: ['', 'Product', 'Status', 'Price', 'Stock', ''],
    shades: ['', 'Shade', 'Undertone', 'In guide', ''],
    collections: ['', 'Collection', 'Products', 'Featured', ''],
  }[key];

  const row = (item, index) => {
    const href = `#/${key}/${encodeURIComponent(item[schema.idKey])}`;
    const cells = [h('td', { class: 'a-table__thumb' }, h('img', { src: itemThumb(schema, item), alt: '', loading: 'lazy' })), h('td', {}, h('a', { href, class: 'a-strong' }, item[schema.titleKey] || '(untitled)'), h('div', { class: 'a-muted a-small' }, item.slug))];
    if (key === 'products') {
      const [lo, hi] = priceRange(item);
      const stock = totalStock(item);
      const lowCount = (item.variants || []).filter((v) => Number(v.stock) <= low).length;
      cells.push(
        h('td', {}, h('span', { class: `a-pill a-pill--${item.status}` }, item.status[0].toUpperCase() + item.status.slice(1))),
        h('td', {}, lo === hi ? money(lo) : `${money(lo)} – ${money(hi)}`),
        h('td', {}, h('span', { class: `a-pill ${stock <= 0 ? 'a-pill--danger' : lowCount ? 'a-pill--warn' : ''}` }, stock <= 0 ? (item.allowPreorder ? 'Pre-order' : 'Sold out') : `${stock} units`)),
      );
    } else if (key === 'shades') {
      cells.push(h('td', {}, item.undertoneLabel), h('td', {}, item.inGuide ? 'Yes' : 'No'));
    } else {
      cells.push(h('td', {}, String((state.sections.products || []).filter((p) => (p.collections || []).includes(item.slug)).length)), h('td', {}, item.featured ? 'Yes' : 'No'));
    }
    cells.push(
      h(
        'td',
        { class: 'a-table__actions' },
        h('a', { class: 'a-icon-btn', href, 'aria-label': `Edit ${item[schema.titleKey]}` }, '✎'),
        h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': `Duplicate ${item[schema.titleKey]}`, onclick: () => duplicate(key, index) }, icon('copy')),
        h('button', { type: 'button', class: 'a-icon-btn a-icon-btn--danger', 'aria-label': `Delete ${item[schema.titleKey]}`, onclick: () => removeItem(key, index) }, icon('trash')),
      ),
    );
    return h('tr', {}, cells);
  };

  const paint = () => {
    const q = search.value.trim().toLowerCase();
    const status = statusFilter?.value || 'all';
    const visible = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !q || JSON.stringify([item.name, item.slug, item.summary]).toLowerCase().includes(q))
      .filter(({ item }) => {
        if (status === 'all') return true;
        if (status === 'soldout') return totalStock(item) <= 0;
        if (status === 'low') return (item.variants || []).some((v) => Number(v.stock) <= low);
        return item.status === status;
      });
    tbody.replaceChildren(...(visible.length ? visible.map(({ item, index }) => row(item, index)) : [h('tr', {}, h('td', { colspan: columns.length, class: 'a-muted a-empty' }, 'Nothing found.'))]));
  };
  search.addEventListener('input', paint);
  statusFilter?.addEventListener('change', paint);
  paint();

  main.replaceChildren(
    header(schema.label, {
      subtitle: `${items.length} ${items.length === 1 ? 'item' : 'items'}`,
      actions: [h('a', { class: 'a-btn a-btn--primary', href: `#/${key}/new` }, icon('plus'), `New ${schema.label.replace(/s$/, '').toLowerCase()}`)],
    }),
    h('div', { class: 'a-toolbar' }, search, statusFilter),
    h('div', { class: 'a-card a-card--flush' }, h('table', { class: 'a-table a-table--list' }, h('thead', {}, h('tr', {}, columns.map((c) => h('th', {}, c)))), tbody)),
  );
}

async function duplicate(key, index) {
  const schema = schemaFor(key);
  const copy = structuredClone(state.sections[key][index]);
  copy.name = `${copy.name} (copy)`;
  copy.slug = `${copy.slug}-copy`;
  if (schema.idKey === 'id') copy.id = `p${Date.now().toString(36)}`;
  if ('status' in copy) copy.status = 'draft';
  try {
    await saveSection(key, [...state.sections[key], copy]);
    toast('Duplicated — the copy is saved as a draft.');
    location.hash = `#/${key}/${encodeURIComponent(copy[schema.idKey])}`;
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function removeItem(key, index) {
  const schema = schemaFor(key);
  const item = state.sections[key][index];
  if (!confirm(`Delete "${item[schema.titleKey]}"? This can't be undone (but a backup is kept on the server).`)) return;
  try {
    await saveSection(key, state.sections[key].filter((_, i) => i !== index));
    toast('Deleted.');
    route();
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ───────────────────────── Item editor ─────────────────────────────────── */

function viewItem(key, id) {
  const schema = schemaFor(key);
  const items = state.sections[key] || [];
  const isNew = id === 'new';
  const index = isNew ? -1 : items.findIndex((i) => String(i[schema.idKey]) === id);
  if (!isNew && index < 0) {
    main.replaceChildren(header('Not found'), h('p', {}, h('a', { href: `#/${key}` }, `← Back to ${schema.label}`)));
    return;
  }
  // New items start from the schema defaults ($auto / $today are filled in here).
  const defaults = structuredClone(schema.defaults || {});
  for (const [k, v] of Object.entries(defaults)) {
    if (v === '$auto') defaults[k] = `p${Date.now().toString(36)}`;
    if (v === '$today') defaults[k] = new Date().toISOString().slice(0, 10);
  }
  const item = isNew ? defaults : items[index];
  const form = buildForm(schema.fields, item, formCtx);
  const errors = h('div');
  const preview = !isNew && schema.preview ? schema.preview.replace(/\{(\w+)\}/g, (_, k) => item[k]) : null;

  const save = async (e) => {
    e?.preventDefault();
    const value = form.getValue();
    const next = [...items];
    if (isNew) next.push(value);
    else next[index] = value;
    errors.replaceChildren();
    try {
      await saveSection(key, next);
      toast('Saved. Your changes are live.');
      location.hash = `#/${key}/${encodeURIComponent(value[schema.idKey])}`;
      if (!isNew) route();
    } catch (err) {
      errors.replaceChildren(errorBox(err));
      errors.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  main.replaceChildren(
    h('a', { class: 'a-back', href: `#/${key}` }, `← ${schema.label}`),
    header(isNew ? `New ${schema.label.replace(/s$/, '').toLowerCase()}` : item[schema.titleKey], {
      actions: [
        preview ? h('a', { class: 'a-btn', href: preview, target: '_blank', rel: 'noopener' }, icon('external'), 'View on site') : null,
        !isNew ? h('button', { type: 'button', class: 'a-btn a-btn--danger', onclick: () => removeItem(key, index) }, icon('trash'), 'Delete') : null,
      ],
    }),
    errors,
    h('form', { class: 'a-editor', onsubmit: save, novalidate: true }, form.el, saveBar()),
  );
}

/** Sticky bar with the Save button (lights up when there are unsaved changes). */
function saveBar(extra = []) {
  return h('div', { class: 'a-savebar' }, h('span', { class: 'a-savebar__status' }), extra, h('button', { type: 'submit', class: 'a-btn a-btn--primary' }, 'Save changes'));
}

/* ───────────────────────── Singleton editor (pages, settings) ─────────── */

function viewSection(key) {
  const schema = schemaFor(key);
  if (!schema) return viewNotFound();
  const form = buildForm(schema.fields, state.sections[key], formCtx);
  const errors = h('div');

  const save = async (e) => {
    e.preventDefault();
    errors.replaceChildren();
    try {
      await saveSection(key, form.getValue());
      toast('Saved. Your changes are live.');
      route();
    } catch (err) {
      errors.replaceChildren(errorBox(err));
      errors.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const reset = async () => {
    if (!confirm(`Reset "${schema.label}" to the original content? Your edits to this section will be replaced (a backup is kept on the server).`)) return;
    try {
      const res = await api(`/sections/${key}`, { method: 'DELETE' });
      state.sections[key] = res.value;
      state.customised[key] = false;
      setDirty(false);
      toast('Reset to the original content.');
      route();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  main.replaceChildren(
    header(schema.label, {
      subtitle: state.customised[key] ? 'Edited — showing your saved version.' : 'Showing the original content. Edit anything and save.',
      actions: [
        h('a', { class: 'a-btn', href: schema.preview || '/', target: '_blank', rel: 'noopener' }, icon('external'), 'View on site'),
        state.customised[key] ? h('button', { type: 'button', class: 'a-btn a-btn--ghost', onclick: reset }, 'Reset to original') : null,
      ],
    }),
    errors,
    h('form', { class: 'a-editor', onsubmit: save, novalidate: true }, form.el, saveBar()),
  );
}

/* ───────────────────────── Inbox ───────────────────────────────────────── */

function orderCard(order) {
  const status = h(
    'select',
    { class: 'a-input a-input--compact', 'aria-label': 'Order status' },
    ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'].map((s) => h('option', { value: s, selected: order.status === s }, s[0].toUpperCase() + s.slice(1))),
  );
  status.addEventListener('change', async () => {
    try {
      await api(`/submissions/orders/${order.id}`, { method: 'PATCH', body: { status: status.value } });
      order.status = status.value;
      toast('Order updated. Remember to adjust stock if needed.');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  return h(
    'article',
    { class: 'a-order' },
    h('div', { class: 'a-order__head' }, h('strong', {}, `Order ${order.id.slice(0, 8).toUpperCase()}`), h('span', { class: 'a-muted a-small' }, `${fmtDate(order.createdAt)} · via ${order.channel}`), status),
    h('ul', { class: 'a-order__lines' }, (order.lines || []).map((l) => h('li', {}, `${l.qty} × ${l.name}${l.shade ? ` — ${l.shade}` : ''}, ${l.length}"`, h('span', {}, money(l.price * l.qty))))),
    h('p', { class: 'a-order__total' }, `Subtotal ${money(order.subtotal)}`, order.currency && order.currency !== settings().commerce?.baseCurrency ? h('span', { class: 'a-muted a-small' }, ` (customer browsing in ${order.currency})`) : null),
  );
}

async function viewInbox(query) {
  const tab = query.get('tab') || 'orders';
  const subs = await api('/submissions');
  const tabs = [
    ['orders', `Orders (${subs.orders.length})`],
    ['contact', `Messages (${subs.contact.length})`],
    ['newsletter', `Subscribers (${subs.newsletter.length})`],
  ];
  const del = async (kind, id) => {
    if (!confirm('Delete this entry?')) return;
    await api(`/submissions/${kind}/${id}`, { method: 'DELETE' });
    toast('Deleted.');
    route();
  };

  let body;
  if (tab === 'orders') {
    body = subs.orders.length
      ? subs.orders.map((o) => h('div', { class: 'a-inbox-item' }, orderCard(o), h('button', { type: 'button', class: 'a-btn a-btn--small a-btn--ghost', onclick: () => del('orders', o.id) }, icon('trash'), 'Delete')))
      : h('p', { class: 'a-muted' }, 'No orders yet. When a customer checks out, their order request appears here.');
  } else if (tab === 'contact') {
    body = subs.contact.length
      ? subs.contact.map((m) =>
          h(
            'article',
            { class: 'a-inbox-item a-message' },
            h('div', { class: 'a-order__head' }, h('strong', {}, m.name), h('span', { class: 'a-muted a-small' }, `${fmtDate(m.createdAt)} · ${m.topic}${m.orderNumber ? ` · Order ${m.orderNumber}` : ''}`)),
            h('p', { class: 'a-message__text' }, m.message),
            h('div', { class: 'a-row' }, h('a', { class: 'a-btn a-btn--small', href: `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}` }, `Reply to ${m.email}`), h('button', { type: 'button', class: 'a-btn a-btn--small a-btn--ghost', onclick: () => del('contact', m.id) }, icon('trash'), 'Delete')),
          ),
        )
      : h('p', { class: 'a-muted' }, 'No messages yet.');
  } else {
    const csv = () => {
      const rows = [['email', 'signed_up'], ...subs.newsletter.map((s) => [s.email, s.createdAt])];
      const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
      const a = h('a', { href: URL.createObjectURL(blob), download: 'subscribers.csv' });
      a.click();
      URL.revokeObjectURL(a.href);
    };
    body = subs.newsletter.length
      ? [
          h('div', { class: 'a-toolbar' }, h('button', { type: 'button', class: 'a-btn', onclick: csv }, 'Download CSV')),
          h('table', { class: 'a-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Email'), h('th', {}, 'Signed up'), h('th', {}, ''))), h('tbody', {}, subs.newsletter.map((s) => h('tr', {}, h('td', {}, s.email), h('td', {}, fmtDate(s.createdAt)), h('td', { class: 'a-table__actions' }, h('button', { type: 'button', class: 'a-icon-btn a-icon-btn--danger', 'aria-label': `Remove ${s.email}`, onclick: () => del('newsletter', s.id) }, icon('trash'))))))),
        ]
      : h('p', { class: 'a-muted' }, 'No subscribers yet.');
  }

  main.replaceChildren(
    header('Inbox', { subtitle: 'Order requests, contact messages and newsletter sign-ups.' }),
    h('div', { class: 'a-tabs', role: 'tablist' }, tabs.map(([key, label]) => h('a', { href: `#/inbox?tab=${key}`, role: 'tab', 'aria-selected': String(key === tab), class: 'a-tab' }, label))),
    h('div', { class: 'a-card', role: 'tabpanel' }, body),
  );
}

/* ───────────────────────── Media ───────────────────────────────────────── */

async function uploadFiles(files) {
  const urls = [];
  for (const file of files) {
    try {
      const res = await uploadImage(file);
      urls.push(res.url);
    } catch (err) {
      toast(`${file.name}: ${err.message}`, 'error');
    }
  }
  if (urls.length) toast(`Uploaded ${urls.length} image${urls.length === 1 ? '' : 's'}.`);
  return urls;
}

function fileButton(label, onFiles, multiple = true) {
  const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif,image/gif', multiple, class: 'sr-only', id: `file-${Math.random().toString(36).slice(2)}` });
  input.addEventListener('change', async () => {
    await onFiles([...input.files]);
    input.value = '';
  });
  return h('label', { class: 'a-btn a-btn--primary', for: input.id }, icon('upload'), label, input);
}

async function viewMedia() {
  const files = await api('/media');
  main.replaceChildren(
    header('Media library', { subtitle: 'Images you upload can be used on any product or page.', actions: [fileButton('Upload images', async (f) => (await uploadFiles(f), route()))] }),
    files.length
      ? h(
          'div',
          { class: 'a-media-grid' },
          files.map((f) =>
            h(
              'figure',
              { class: 'a-media' },
              h('img', { src: f.url, alt: '', loading: 'lazy' }),
              h('figcaption', {}, h('span', { class: 'a-small' }, f.name), h('span', { class: 'a-muted a-small' }, `${Math.round(f.size / 1024)} KB`)),
              h(
                'div',
                { class: 'a-row' },
                h('button', { type: 'button', class: 'a-btn a-btn--small', onclick: () => navigator.clipboard.writeText(f.url).then(() => toast('Link copied.')) }, icon('copy'), 'Copy link'),
                h('button', { type: 'button', class: 'a-icon-btn a-icon-btn--danger', 'aria-label': `Delete ${f.name}`, onclick: async () => {
                  if (!confirm('Delete this image? Anywhere it is used will show the placeholder instead.')) return;
                  await api(`/media/${encodeURIComponent(f.name)}`, { method: 'DELETE' });
                  toast('Deleted.');
                  route();
                } }, icon('trash')),
              ),
            ),
          ),
        )
      : h('div', { class: 'a-card a-empty' }, h('p', {}, 'No images yet. Upload brand photography to replace the placeholders across the site.')),
  );
}

/** Modal picker used by image fields: upload new or choose an existing image. */
function openMediaPicker() {
  return new Promise(async (resolve) => {
    const dialog = h('dialog', { class: 'a-dialog', 'aria-label': 'Choose an image' });
    const finish = (url) => {
      dialog.close();
      dialog.remove();
      resolve(url);
    };
    const files = await api('/media').catch(() => []);
    dialog.append(
      h('div', { class: 'a-dialog__head' }, h('h2', {}, 'Choose an image'), h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': 'Close', onclick: () => finish(null) }, '✕')),
      h('div', { class: 'a-row' }, fileButton('Upload new', async (f) => {
        const urls = await uploadFiles(f);
        if (urls[0]) finish(urls[0]);
      }, false)),
      files.length
        ? h('div', { class: 'a-media-grid a-media-grid--picker' }, files.map((f) => h('button', { type: 'button', class: 'a-media a-media--pick', onclick: () => finish(f.url) }, h('img', { src: f.url, alt: f.name, loading: 'lazy' }))))
        : h('p', { class: 'a-muted' }, 'Your library is empty — upload your first image.'),
    );
    dialog.addEventListener('cancel', () => finish(null));
    document.body.append(dialog);
    dialog.showModal();
  });
}

/* ───────────────────────── Backup ──────────────────────────────────────── */

function viewBackup() {
  const restore = async ([file]) => {
    if (!file) return;
    if (!confirm('Restore this backup? All current content will be replaced by the backup (the current version is saved on the server first).')) return;
    try {
      const data = JSON.parse(await file.text());
      await api('/import', { method: 'POST', body: data });
      toast('Backup restored.');
      await bootstrap();
    } catch (err) {
      toast(err.message || 'That file could not be read.', 'error');
    }
  };
  main.replaceChildren(
    header('Backup & restore', { subtitle: 'Download everything you have edited as a single file, or restore one.' }),
    h(
      'div',
      { class: 'a-columns' },
      h('section', { class: 'a-card' }, h('h2', {}, 'Download a backup'), h('p', { class: 'a-muted' }, 'Products, shades, pages and settings in one JSON file. Keep it somewhere safe. (Uploaded images are stored separately on the server volume.)'), h('a', { class: 'a-btn a-btn--primary', href: '/admin/api/export', download: true }, 'Download backup')),
      h('section', { class: 'a-card' }, h('h2', {}, 'Restore a backup'), h('p', { class: 'a-muted' }, 'Replaces all content with the backup file. The server also keeps the last 30 versions automatically.'), fileButton('Choose backup file', restore, false)),
    ),
  );
}

/* ───────────────────────── Account (change password) ──────────────────── */

async function viewAccount() {
  const info = await api('/account');
  const status = h('p', { class: 'a-muted', role: 'status', 'aria-live': 'polite' });
  const field = (id, label, autocomplete) =>
    h('div', { class: 'a-field' }, h('label', { class: 'a-label', for: id }, label), h('input', { class: 'a-input', id, type: 'password', autocomplete, required: true }));

  const form = h(
    'form',
    { class: 'a-form a-form--narrow', novalidate: true },
    field('pw-current', 'Current password', 'current-password'),
    field('pw-new', 'New password', 'new-password'),
    h('p', { class: 'a-help' }, `At least ${info.minLength} characters. Changing it signs out every other device.`),
    field('pw-confirm', 'Type the new password again', 'new-password'),
    h('div', { class: 'a-row' }, h('button', { type: 'submit', class: 'a-btn a-btn--primary' }, 'Change password'), status),
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = (id) => /** @type {HTMLInputElement} */ (form.querySelector(`#${id}`)).value;
    status.textContent = 'Saving…';
    try {
      await api('/password', { method: 'POST', body: { current: value('pw-current'), new: value('pw-new'), confirm: value('pw-confirm') } });
      form.reset();
      status.textContent = '';
      toast('Password changed.');
    } catch (err) {
      status.textContent = err.message;
      toast(err.message, 'error');
    }
  });

  main.replaceChildren(
    header('Account & password', { subtitle: 'Keep the admin safe with a password only you know.' }),
    h('div', { class: 'a-columns' },
      h('section', { class: 'a-card' }, h('h2', {}, 'Change password'), form),
      h(
        'section',
        { class: 'a-card' },
        h('h2', {}, 'If you forget it'),
        info.emailReset
          ? h('p', {}, 'Use "Forgot password?" on the sign-in page. A one-time reset link is emailed to ', h('strong', {}, info.adminEmail), '.')
          : h('p', {}, 'Email reset links are not set up yet (add ADMIN_EMAIL and the SMTP settings in Railway — see the README).'),
        h('p', { class: 'a-muted' }, 'You can always get back in by changing the ADMIN_PASSWORD variable in Railway → web → Variables. After the redeploy, that password works again.'),
      ),
    ),
  );
}

function viewNotFound() {
  main.replaceChildren(header('Page not found'), h('p', {}, h('a', { href: '#/' }, '← Dashboard')));
}

/* ───────────────────────── Router ──────────────────────────────────────── */

let lastHash = location.hash;
async function route() {
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const query = new URLSearchParams(qs);
  const parts = path.split('/').filter(Boolean);
  renderNav();
  nav.dataset.open = 'false';
  setDirty(false);
  try {
    if (!parts.length) await viewDashboard();
    else if (parts[0] === 'inbox') await viewInbox(query);
    else if (parts[0] === 'media') await viewMedia();
    else if (parts[0] === 'backup') viewBackup();
    else if (parts[0] === 'account') await viewAccount();
    else if (parts[0] === 'section') viewSection(parts[1]);
    else if (schemaFor(parts[0])?.kind === 'collection') (parts[1] ? viewItem(parts[0], decodeURIComponent(parts[1])) : viewList(parts[0], query));
    else viewNotFound();
  } catch (err) {
    main.replaceChildren(header('Something went wrong'), errorBox(err));
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', () => {
  // Warn before navigating away from unsaved edits.
  if (state.dirty && !confirm('You have unsaved changes. Leave without saving?')) {
    history.replaceState(null, '', lastHash);
    return;
  }
  lastHash = location.hash;
  route();
});

async function bootstrap() {
  const data = await api('/bootstrap');
  Object.assign(state, { schemas: data.schemas, sections: data.sections, customised: data.customised, counts: data.counts });
  await route();
}

bootstrap().catch((err) => {
  main.replaceChildren(h('div', { class: 'a-alert' }, `Could not load the admin: ${err.message}`));
});
