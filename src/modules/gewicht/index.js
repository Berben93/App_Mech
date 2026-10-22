import { esc, fmt, num, options, result, table, normalize, steps } from '../../core/dom.js';
import { load, save } from '../../core/store.js';
import { MATERIALS, SHAPES } from './data.js';
import { weight } from './calc.js';

const STORE_KEY = 'materials';

export function allMaterials() {
  const own = load(STORE_KEY, []).filter((m) => m && m.name && m.rho > 0);
  return [...MATERIALS, ...own.map((m) => ({ ...m, own: true }))];
}

/** Querschnitt maßstäblich zeichnen; ändert sich live mit der Eingabe. */
function crossSection(shape, v) {
  const S = 160;
  const pad = 14;
  const box = S - 2 * pad;
  const c = S / 2;
  const ok = (...xs) => xs.every((x) => x > 0 && Number.isFinite(x));
  let body = '';
  switch (shape.id) {
    case 'rund':
    case 'kugel':
      if (ok(v.d)) body = `<circle class="profile" cx="${c}" cy="${c}" r="${box / 2}"/>`;
      break;
    case 'rohr':
      if (ok(v.D, v.s) && 2 * v.s < v.D) {
        const r = box / 2;
        const ri = r * (1 - (2 * v.s) / v.D);
        body = `<path class="profile" fill-rule="evenodd" d="M ${c - r} ${c} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z M ${c - ri} ${c} a ${ri} ${ri} 0 1 0 ${2 * ri} 0 a ${ri} ${ri} 0 1 0 ${-2 * ri} 0 Z"/>`;
      }
      break;
    case 'vierkant':
      if (ok(v.a)) body = `<rect class="profile" x="${pad}" y="${pad}" width="${box}" height="${box}"/>`;
      break;
    case 'flach':
    case 'rechteckrohr': {
      if (!ok(v.b, v.h)) break;
      const k = box / Math.max(v.b, v.h);
      const w = v.b * k;
      const h = Math.max(v.h * k, 2);
      const x = c - w / 2;
      const y = c - h / 2;
      if (shape.id === 'flach') body = `<rect class="profile" x="${x}" y="${y}" width="${w}" height="${h}"/>`;
      else if (ok(v.s) && 2 * v.s < Math.min(v.b, v.h)) {
        const s = v.s * k;
        body = `<path class="profile" fill-rule="evenodd" d="M${x} ${y}h${w}v${h}h${-w}Z M${x + s} ${y + s}v${h - 2 * s}h${w - 2 * s}v${-(h - 2 * s)}Z"/>`;
      }
      break;
    }
    case 'sechskant':
      if (ok(v.s)) {
        const r = box / 2;
        const pts = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i;
          return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
        }).join(' ');
        body = `<polygon class="profile" points="${pts}"/>`;
      }
      break;
    case 'winkel':
      if (ok(v.a, v.b, v.s) && v.s < Math.min(v.a, v.b)) {
        const k = box / Math.max(v.a, v.b);
        const a = v.a * k;
        const b = v.b * k;
        const s = Math.max(v.s * k, 2);
        const x = c - b / 2;
        const y = c - a / 2;
        body = `<path class="profile" d="M${x} ${y}v${a}h${b}v${-s}h${-(b - s)}v${-(a - s)}Z"/>`;
      }
      break;
    default:
  }
  return `<svg class="graphic" viewBox="0 0 ${S} ${S}" style="max-width:180px;margin:0 auto" role="img" aria-label="Querschnitt ${esc(shape.name)}">${body}</svg>`;
}

function render(el, params, ctx) {
  let shape = SHAPES.find((s) => s.id === params.f) || SHAPES[0];
  let mats = allMaterials();
  let matId = mats.some((m) => m.id === params.w) ? params.w : 's235';
  const values = { ...params };

  el.innerHTML = `
    <p class="lead">Gewicht von Halbzeugen und Rohteilen aus Querschnitt, Länge und Dichte. Eigene Werkstoffe bleiben auf diesem Gerät gespeichert.</p>
    <div class="seg" role="group" aria-label="Form">${SHAPES.map((s) => `<button type="button" data-f="${s.id}">${s.name}</button>`).join('')}</div>
    <div class="grid-2">
      <form class="card" id="wt-form" autocomplete="off">
        <h2>Eingaben (mm)</h2>
        <div class="grid">
          <label class="field" style="grid-column:1/-1"><span>Werkstoff</span><select name="w"></select></label>
        </div>
        <div class="grid" id="wt-fields" style="margin-top:12px"></div>
      </form>
      <section class="card" id="wt-out" aria-live="polite"></section>
    </div>
    <section class="card adv">
      <h2>Eigene Werkstoffe</h2>
      <form class="grid" id="own-form" autocomplete="off">
        <label class="field"><span>Bezeichnung</span><input name="name" placeholder="z. B. Hardox 450" required></label>
        <label class="field"><span>Dichte (g/cm³)</span><input name="rho" inputmode="decimal" placeholder="7,85" required></label>
        <label class="field"><span>Werkstoffnummer</span><input name="wnr" placeholder="optional"></label>
        <div class="field"><span>&nbsp;</span><button class="btn" type="submit">Hinzufügen</button></div>
      </form>
      <div id="own-list" style="margin-top:12px"></div>
    </section>
    <section class="card adv"><h2>Dichten (g/cm³)</h2><div id="rho-table"></div></section>`;

  const form = el.querySelector('#wt-form');
  const out = el.querySelector('#wt-out');

  function fillMaterials() {
    mats = allMaterials();
    if (!mats.some((m) => m.id === matId)) matId = mats[0].id;
    form.elements.w.innerHTML = options(mats.map((m) => [m.id, `${m.name}${m.wnr ? ` (${m.wnr})` : ''} · ${fmt(m.rho)}`]), matId);
    const own = mats.filter((m) => m.own);
    el.querySelector('#own-list').innerHTML = own.length
      ? table(['Bezeichnung', 'Dichte', ''], own.map((m) => [esc(m.name) + (m.wnr ? ` <small>(${esc(m.wnr)})</small>` : ''), fmt(m.rho), `<button class="btn secondary small" type="button" data-del="${esc(m.id)}">Löschen</button>`]))
      : '<p class="note">Noch keine eigenen Werkstoffe.</p>';
    el.querySelector('#rho-table').innerHTML = table(['Werkstoff', 'W.-Nr.', 'Dichte'], mats.map((m) => ({
      cls: m.id === matId ? 'hl' : '', cells: [esc(m.name), esc(m.wnr || ''), fmt(m.rho)],
    })));
  }

  function buildFields() {
    const len = [...shape.fields.map(([k]) => k), 'L'];
    const fields = [...shape.fields, ...(shape.volume ? [] : [['L', 'Länge L', 1000]]), ['n', 'Stückzahl', 1, true], ['preis', 'Preis €/kg (optional)', '', true]];
    el.querySelector('#wt-fields').innerHTML = fields.map(([name, label, def, adv]) => {
      if (values[name] === undefined) values[name] = String(def);
      return `<label class="field${adv ? ' adv' : ''}"><span>${label}</span><input name="${name}" inputmode="decimal" value="${esc(values[name])}"${len.includes(name) ? ' data-unit="mm"' : ''}></label>`;
    }).join('');
    el.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === shape.id)));
  }

  function update() {
    const mat = mats.find((m) => m.id === matId);
    const dims = Object.fromEntries(shape.fields.map(([n]) => [n, num(values[n])]));
    const L = num(values.L);
    const n = num(values.n) || 1;
    const price = num(values.preis);
    ctx.setParams({ f: shape.id, w: matId, ...Object.fromEntries([...shape.fields.map(([k]) => k), 'L', 'n', 'preis'].map((k) => [k, values[k]])) },
      `${shape.name} ${shape.fields.map(([k]) => values[k]).join('×')}${shape.volume ? '' : ` × ${values.L}`} · ${mat.name}`);
    const r = weight(shape.id, dims, L, mat.rho);
    if (!r || !Number.isFinite(r.mass)) {
      out.innerHTML = `<h2>Ergebnis</h2>${crossSection(shape, dims)}<p class="warn-text">Maße prüfen (Wanddicke kleiner als halber Durchmesser bzw. halbe Seite).</p>`;
      return;
    }
    out.innerHTML = `<h2>${esc(shape.name)} · ${esc(mat.name)}</h2>
      ${crossSection(shape, dims)}
      <div class="results">
        ${result(n > 1 ? `Gewicht gesamt (${fmt(n)} Stk.)` : 'Gewicht', fmt(r.mass * n, r.mass * n < 10 ? 3 : 2), 'kg', true)}
        ${n > 1 ? result('Gewicht je Stück', fmt(r.mass, 3), 'kg') : ''}
        ${r.perMeter !== null ? result('Metergewicht', fmt(r.perMeter, 3), 'kg/m') : ''}
        ${price > 0 ? result('Materialpreis', fmt(r.mass * n * price, 2), '€') : ''}
        <div class="adv">
        ${r.area !== null ? result('Querschnitt', fmt(r.area, 1), 'mm²') : ''}
        ${result('Volumen je Stück', fmt(r.volume, 2), 'cm³')}
        </div>
      </div>
      ${steps([
        r.area !== null ? { title: 'Querschnittsfläche', formula: `A (${esc(shape.name)})`, values: shape.fields.map(([k]) => `${k} = ${fmt(dims[k])} mm`).join(', '), result: `${fmt(r.area, 1)} mm²` } : null,
        { title: 'Volumen', formula: r.area !== null ? 'V = A · L / 1000' : 'V = π/6 · d³ / 1000', values: r.area !== null ? `V = ${fmt(r.area, 1)} · ${fmt(L)} / 1000` : `V = π/6 · ${fmt(dims.d)}³ / 1000`, result: `${fmt(r.volume, 2)} cm³` },
        { title: 'Masse', formula: 'm = V · ρ / 1000', values: `m = ${fmt(r.volume, 2)} · ${fmt(mat.rho)} / 1000`, result: `${fmt(r.mass, 3)} kg` },
      ])}
      <p class="note">Dichte ${fmt(mat.rho)} g/cm³. Kantenradien bei Rohren und Profilen sind nicht berücksichtigt.</p>`;
  }

  form.addEventListener('input', (e) => {
    if (e.target.name === 'w') return;
    values[e.target.name] = e.target.value;
    update();
  });
  form.addEventListener('change', (e) => {
    if (e.target.name !== 'w') return;
    matId = e.target.value;
    fillMaterials();
    update();
  });
  el.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    shape = SHAPES.find((s) => s.id === b.dataset.f);
    buildFields();
    update();
  });

  el.querySelector('#own-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const rho = num(f.elements.rho.value);
    const name = f.elements.name.value.trim();
    if (!name || !(rho > 0 && rho < 25)) {
      f.elements.rho.setCustomValidity('Dichte zwischen 0 und 25 g/cm³');
      f.reportValidity();
      f.elements.rho.setCustomValidity('');
      return;
    }
    const own = load(STORE_KEY, []);
    const id = `own-${Date.now().toString(36)}`;
    own.push({ id, name, rho, wnr: f.elements.wnr.value.trim() });
    save(STORE_KEY, own);
    matId = id;
    f.reset();
    fillMaterials();
    update();
  });
  el.querySelector('#own-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    save(STORE_KEY, load(STORE_KEY, []).filter((m) => m.id !== b.dataset.del));
    fillMaterials();
    update();
  });

  fillMaterials();
  buildFields();
  update();
}

function search(q) {
  const nq = normalize(q);
  if (nq.length < 2) return [];
  const hits = allMaterials().filter((m) => normalize(m.name).includes(nq) || (m.wnr && m.wnr.startsWith(q.trim())));
  return hits.slice(0, 6).map((m) => ({
    title: `${m.name}${m.wnr ? ` (${m.wnr})` : ''}`,
    text: `Dichte ${fmt(m.rho)} g/cm³ · Rundstab Ø50: ${fmt(weight('rund', { d: 50 }, 1000, m.rho).perMeter, 2)} kg/m`,
    params: { w: m.id },
    score: m.wnr === q.trim() ? 92 : 55,
    ...(m.wnr === q.trim() ? {
      html: `<div class="results">${result('Dichte', fmt(m.rho), 'g/cm³', true)}${result('Rundstab Ø50 je Meter', fmt(weight('rund', { d: 50 }, 1000, m.rho).perMeter, 2), 'kg/m')}</div>`,
    } : {}),
  }));
}

export default {
  id: 'gewicht',
  title: 'Gewichts\u00ADrechner',
  subtitle: 'Rund, Rohr, Flach, Profil – auch mit eigenen Werkstoffen',
  color: '#16a34a',
  icon: '<path d="M6 8h12l2 12H4z"/><circle cx="12" cy="5" r="2"/>',
  keywords: ['Gewicht', 'Masse', 'Dichte', 'Metergewicht', 'kg', 'Rohr', 'Rundstab', 'Blech', 'Werkstoff', 'Stahl', 'Aluminium', 'Messing', 'Edelstahl'],
  render,
  search,
};
