/**
 * ============================================================================
 *  Schema-driven forms
 * ----------------------------------------------------------------------------
 *  buildForm(fields, value, ctx) turns a field list from app/schemas.json into
 *  a working form and returns { el, getValue }.
 *
 *  Every field renderer returns { el, get } where get() reads the current
 *  value back out — so the form never needs a separate state object.
 *
 *  ctx (provided by app.js):
 *    options(source)  → [{ value, label }] for selects ('shades', 'products'…)
 *    pickImage()      → Promise<url|null>  (upload or choose from library)
 *    changed()        → call whenever the user edits something
 * ============================================================================
 */
import { h, icon, slugify } from './dom.js';

let uid = 0;
const nextId = (key) => `f-${key}-${++uid}`;

/** Empty value for a field (used when adding a new repeater row). */
function emptyValue(field) {
  switch (field.type) {
    case 'number':
      return field.nullable ? null : 0;
    case 'toggle':
      return false;
    case 'multiselect':
    case 'list':
    case 'images':
    case 'repeater':
      return [];
    case 'group':
      return Object.fromEntries(field.fields.map((f) => [f.key, emptyValue(f)]));
    case 'color':
      return '#8a5a34';
    default:
      return '';
  }
}

/** Label shown on a collapsed repeater row: a field key or a "{key}" template. */
function rowLabel(field, item, index) {
  const tpl = field.itemLabel;
  let text = '';
  if (tpl && tpl.includes('{')) text = tpl.replace(/\{(\w+)\}/g, (_, k) => item?.[k] ?? '');
  else if (tpl) text = item?.[tpl] ?? '';
  return String(text).trim() || `Item ${index + 1}`;
}

/** Standard wrapper: label + control + help text. */
function wrap(field, id, control, { inline = false } = {}) {
  return h(
    'div',
    { class: `a-field a-field--${field.type}${inline ? ' a-field--inline' : ''}` },
    inline ? null : h('label', { class: 'a-label', for: id }, field.label, field.required ? h('span', { class: 'a-req', 'aria-hidden': 'true' }, ' *') : null),
    control,
    inline ? h('label', { class: 'a-label', for: id }, field.label) : null,
    field.help ? h('p', { class: 'a-help', id: `${id}-help` }, field.help) : null,
  );
}

/* ───────────────────────── Field renderers ─────────────────────────────── */

const renderers = {
  hidden(field, value) {
    return { el: null, get: () => value };
  },

  text(field, value, ctx) {
    const id = nextId(field.key);
    const input = h('input', {
      class: 'a-input',
      id,
      type: field.inputType || 'text',
      value: value ?? '',
      required: field.required,
      pattern: field.pattern,
      'aria-describedby': field.help ? `${id}-help` : null,
      oninput: ctx.changed,
    });
    return { el: wrap(field, id, input), get: () => input.value.trim(), input };
  },

  heading(field, value, ctx) {
    return renderers.text(field, value, ctx);
  },

  textarea(field, value, ctx) {
    const id = nextId(field.key);
    const input = h('textarea', { class: 'a-input', id, rows: field.rows || 4, 'aria-describedby': field.help ? `${id}-help` : null, oninput: ctx.changed });
    input.value = value ?? '';
    return { el: wrap(field, id, input), get: () => input.value.trim() };
  },

  number(field, value, ctx) {
    const id = nextId(field.key);
    const input = h('input', {
      class: 'a-input',
      id,
      type: 'number',
      inputmode: 'decimal',
      value: value ?? '',
      min: field.min,
      step: field.step || 'any',
      required: field.required,
      oninput: ctx.changed,
    });
    return {
      el: wrap(field, id, input),
      get: () => (input.value === '' ? (field.nullable ? null : 0) : Number(input.value)),
    };
  },

  toggle(field, value, ctx) {
    const id = nextId(field.key);
    const input = h('input', { class: 'a-switch', id, type: 'checkbox', checked: Boolean(value), onchange: ctx.changed });
    return { el: wrap(field, id, input, { inline: true }), get: () => input.checked };
  },

  select(field, value, ctx) {
    const id = nextId(field.key);
    const options = field.options || ctx.options(field.optionsFrom);
    const select = h('select', { class: 'a-input', id, onchange: ctx.changed });
    // Keep unknown saved values selectable so nothing is silently lost.
    const all = options.some((o) => o.value === value) || !value ? options : [{ value, label: `${value} (not found)` }, ...options];
    if (!field.required) select.append(h('option', { value: '' }, '— None —'));
    for (const o of all) select.append(h('option', { value: o.value, selected: o.value === value }, o.label));
    return { el: wrap(field, id, select), get: () => select.value };
  },

  multiselect(field, value, ctx) {
    const options = field.options || ctx.options(field.optionsFrom);
    const selected = new Set(value || []);
    const group = h('div', { class: 'a-checks', role: 'group', 'aria-label': field.label });
    const boxes = options.map((o) => {
      const box = h('input', { type: 'checkbox', value: o.value, checked: selected.has(o.value), onchange: ctx.changed });
      group.append(h('label', { class: 'a-check' }, box, h('span', {}, o.label)));
      return box;
    });
    // Preserve selections that no longer exist as options.
    const orphans = [...selected].filter((v) => !options.some((o) => o.value === v));
    const fieldset = h('fieldset', { class: 'a-field a-fieldset-plain' }, h('legend', { class: 'a-label' }, field.label), group, field.help ? h('p', { class: 'a-help' }, field.help) : null);
    return { el: fieldset, get: () => [...boxes.filter((b) => b.checked).map((b) => b.value), ...orphans] };
  },

  color(field, value, ctx) {
    const id = nextId(field.key);
    const picker = h('input', { type: 'color', id, value: value || '#000000', class: 'a-color' });
    const text = h('input', { class: 'a-input a-input--hex', value: value || '#000000', 'aria-label': `${field.label} hex code`, maxlength: 7 });
    picker.addEventListener('input', () => {
      text.value = picker.value;
      ctx.changed();
    });
    text.addEventListener('input', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value;
      ctx.changed();
    });
    return { el: wrap(field, id, h('div', { class: 'a-color-row' }, picker, text)), get: () => picker.value };
  },

  image(field, value, ctx) {
    const id = nextId(field.key);
    let current = value || '';
    const preview = h('div', { class: 'a-image-preview' });
    const url = h('input', { class: 'a-input', id, placeholder: '/media/… or https://…', value: current, 'aria-label': `${field.label} URL` });
    const paint = () => {
      preview.replaceChildren(current ? h('img', { src: current, alt: '' }) : h('span', { class: 'a-muted' }, 'No image — the branded placeholder is used'));
    };
    url.addEventListener('input', () => {
      current = url.value.trim();
      paint();
      ctx.changed();
    });
    const choose = h('button', { type: 'button', class: 'a-btn a-btn--small' }, icon('image'), 'Choose / upload');
    choose.addEventListener('click', async () => {
      const picked = await ctx.pickImage();
      if (picked) {
        current = picked;
        url.value = picked;
        paint();
        ctx.changed();
      }
    });
    const clear = h('button', { type: 'button', class: 'a-btn a-btn--small a-btn--ghost' }, 'Remove');
    clear.addEventListener('click', () => {
      current = '';
      url.value = '';
      paint();
      ctx.changed();
    });
    paint();
    return { el: wrap(field, id, h('div', { class: 'a-image' }, preview, h('div', { class: 'a-image__controls' }, url, h('div', { class: 'a-row' }, choose, clear)))), get: () => current };
  },

  images(field, value, ctx) {
    let list = [...(value || [])];
    const grid = h('div', { class: 'a-gallery' });
    const paint = () => {
      grid.replaceChildren(
        ...list.map((src, i) =>
          h(
            'figure',
            { class: 'a-gallery__item' },
            h('img', { src, alt: `Photo ${i + 1}` }),
            i === 0 ? h('span', { class: 'a-pill' }, 'Main') : null,
            h(
              'div',
              { class: 'a-gallery__actions' },
              h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': 'Move earlier', disabled: i === 0, onclick: () => move(i, -1) }, icon('left')),
              h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': 'Move later', disabled: i === list.length - 1, onclick: () => move(i, 1) }, icon('right')),
              h('button', { type: 'button', class: 'a-icon-btn a-icon-btn--danger', 'aria-label': 'Remove photo', onclick: () => remove(i) }, icon('trash')),
            ),
          ),
        ),
        h('button', { type: 'button', class: 'a-gallery__add', onclick: add }, icon('plus'), 'Add photo'),
      );
    };
    const move = (i, dir) => {
      [list[i], list[i + dir]] = [list[i + dir], list[i]];
      paint();
      ctx.changed();
    };
    const remove = (i) => {
      list.splice(i, 1);
      paint();
      ctx.changed();
    };
    async function add() {
      const picked = await ctx.pickImage();
      if (picked) {
        list.push(picked);
        paint();
        ctx.changed();
      }
    }
    paint();
    const fieldset = h('fieldset', { class: 'a-field a-fieldset-plain' }, h('legend', { class: 'a-label' }, field.label), grid, field.help ? h('p', { class: 'a-help' }, field.help) : null);
    return { el: fieldset, get: () => [...list] };
  },

  list(field, value, ctx) {
    const rows = h('div', { class: 'a-list' });
    const inputs = [];
    const addRow = (text = '', focus = false) => {
      const input = h('input', { class: 'a-input', value: text, 'aria-label': field.label, oninput: ctx.changed });
      const row = h(
        'div',
        { class: 'a-list__row' },
        input,
        h('button', {
          type: 'button',
          class: 'a-icon-btn a-icon-btn--danger',
          'aria-label': 'Remove',
          onclick: () => {
            row.remove();
            inputs.splice(inputs.indexOf(input), 1);
            ctx.changed();
          },
        }, icon('trash')),
      );
      inputs.push(input);
      rows.append(row);
      if (focus) input.focus();
    };
    (value || []).forEach((v) => addRow(v));
    const addBtn = h('button', { type: 'button', class: 'a-btn a-btn--small a-btn--ghost' }, icon('plus'), field.addLabel || 'Add');
    addBtn.addEventListener('click', () => {
      addRow('', true);
      ctx.changed();
    });
    const fieldset = h('fieldset', { class: 'a-field a-fieldset-plain' }, h('legend', { class: 'a-label' }, field.label), rows, addBtn, field.help ? h('p', { class: 'a-help' }, field.help) : null);
    return { el: fieldset, get: () => inputs.map((i) => i.value.trim()).filter(Boolean) };
  },

  group(field, value, ctx) {
    const inner = buildFields(field.fields, value || {}, ctx);
    const el = h(
      'fieldset',
      { class: `a-group${field.layout === 'row' ? ' a-group--row' : ''}` },
      h('legend', { class: 'a-group__title' }, field.label),
      field.help ? h('p', { class: 'a-help' }, field.help) : null,
      h('div', { class: 'a-group__body' }, inner.els),
    );
    return { el, get: inner.get };
  },

  repeater(field, value, ctx) {
    const list = h('div', { class: 'a-repeater' });
    /** @type {{ el: HTMLElement, get: () => object }[]} */
    const rows = [];

    const relabel = () =>
      rows.forEach((r, i) => {
        r.summary.textContent = rowLabel(field, r.get(), i);
        r.up.disabled = i === 0;
        r.down.disabled = i === rows.length - 1;
      });

    const addRow = (item, open = false) => {
      const inner = buildFields(field.fields, item, ctx);
      const summary = h('span', { class: 'a-repeater__label' });
      const up = h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': 'Move up' }, icon('up'));
      const down = h('button', { type: 'button', class: 'a-icon-btn', 'aria-label': 'Move down' }, icon('down'));
      const del = h('button', { type: 'button', class: 'a-icon-btn a-icon-btn--danger', 'aria-label': 'Remove' }, icon('trash'));
      const details = h(
        'details',
        { class: `a-repeater__item${field.layout === 'row' ? ' a-repeater__item--row' : ''}`, open },
        h('summary', {}, summary, h('span', { class: 'a-repeater__tools' }, field.fixed ? null : [up, down, del])),
        h('div', { class: 'a-repeater__body' }, inner.els),
      );
      const row = { el: details, get: inner.get, summary, up, down };
      rows.push(row);
      list.append(details);

      // Buttons inside <summary> must not toggle the row open/closed.
      const stop = (fn) => (e) => {
        e.preventDefault();
        fn();
        relabel();
        ctx.changed();
      };
      up.addEventListener('click', stop(() => {
        const i = rows.indexOf(row);
        rows.splice(i, 1);
        rows.splice(i - 1, 0, row);
        details.previousElementSibling?.before(details);
      }));
      down.addEventListener('click', stop(() => {
        const i = rows.indexOf(row);
        rows.splice(i, 1);
        rows.splice(i + 1, 0, row);
        details.nextElementSibling?.after(details);
      }));
      del.addEventListener('click', stop(() => {
        if (!confirm(`Remove "${summary.textContent}"?`)) return;
        rows.splice(rows.indexOf(row), 1);
        details.remove();
      }));
      details.addEventListener('input', () => relabel());
    };

    (value || []).forEach((item) => addRow(item));
    relabel();

    const add = field.fixed
      ? null
      : h('button', {
          type: 'button',
          class: 'a-btn a-btn--small a-btn--ghost',
          onclick: () => {
            addRow(emptyValue({ type: 'group', fields: field.fields }), true);
            relabel();
            ctx.changed();
            rows.at(-1).el.querySelector('input, textarea, select')?.focus();
          },
        }, icon('plus'), field.addLabel || 'Add');

    const fieldset = h('fieldset', { class: 'a-group' }, h('legend', { class: 'a-group__title' }, field.label), field.help ? h('p', { class: 'a-help' }, field.help) : null, list, add);
    return { el: fieldset, get: () => rows.map((r) => r.get()) };
  },
};

/** Build all fields at one level; returns their elements and a get(). */
function buildFields(fields, value, ctx) {
  const controls = {};
  const els = [];
  for (const field of fields) {
    const render = renderers[field.type] || renderers.text;
    const control = render(field, value?.[field.key], ctx);
    controls[field.key] = control;
    if (control.el) els.push(control.el);
  }

  // Convenience: keep the URL slug in step with the name until the user edits
  // the slug themselves.
  const name = controls.name?.input;
  const slug = controls.slug?.input;
  if (name && slug) {
    let auto = !slug.value || slug.value === slugify(name.value);
    slug.addEventListener('input', () => (auto = false));
    name.addEventListener('input', () => {
      if (auto) slug.value = slugify(name.value);
    });
  }

  return {
    els,
    get: () => Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.get()])),
  };
}

/**
 * Public entry point.
 * @returns {{ el: HTMLElement, getValue: () => object }}
 */
export function buildForm(fields, value, ctx) {
  const built = buildFields(fields, value, ctx);
  return { el: h('div', { class: 'a-form' }, built.els), getValue: built.get };
}
