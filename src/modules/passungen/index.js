import { esc, fmt, fmtSigned, num, options, table, result, formValues } from '../../core/dom.js';
import { fit, tolerance, itValue, parseFitQuery, parseShaftQuery, MAX_NOMINAL } from './calc.js';
import { HOLE_LETTERS, SHAFT_LETTERS, COMMON_FITS, IT_RANGES } from './data.js';

const KIND_LABEL = { spiel: 'Spielpassung', uebergang: 'Übergangspassung', uebermass: 'Übermaßpassung' };
const GRADES = Array.from({ length: 18 }, (_, i) => i + 1);

const mm = (um) => um / 1000;

function splitTol(text, fallback) {
  const m = /^([a-zA-Z]{1,2})(\d{1,2})$/.exec(text || '');
  return m ? [m[1], m[2]] : fallback;
}

/** Live-Grafik der Toleranzfelder relativ zur Nulllinie. */
export function fitGraphic(f) {
  const vals = [0, f.hole.upper, f.hole.lower, f.shaft.upper, f.shaft.lower];
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  const span = Math.max(hi - lo, 1);
  const H = 220;
  const top = 24;
  const h = H - 2 * top;
  const y = (v) => top + ((hi - v) / span) * h;
  const zone = (cls, x, t) => {
    const y1 = y(t.upper);
    const y2 = y(t.lower);
    return `<rect class="${cls}" x="${x}" y="${y1}" width="110" height="${Math.max(y2 - y1, 2)}" rx="3"/>`
      + `<text x="${x + 118}" y="${y1 + 4}">${fmtSigned(mm(t.upper))}</text>`
      + `<text x="${x + 118}" y="${y2 + 4}">${fmtSigned(mm(t.lower))}</text>`
      + `<text x="${x + 55}" y="${(y1 + y2) / 2 + 4}" text-anchor="middle" font-weight="700">${esc(t.letter + t.grade)}</text>`;
  };
  return `<svg class="graphic" viewBox="0 0 400 ${H}" role="img" aria-label="Lage der Toleranzfelder">
    <line class="zero" x1="10" x2="390" y1="${y(0)}" y2="${y(0)}"/>
    <text class="muted" x="12" y="${y(0) - 6}">0 (Nennmaß ${fmt(f.nominal)})</text>
    ${zone('zone-hole', 40, f.hole)}
    ${zone('zone-shaft', 220, f.shaft)}
    <text class="muted" x="95" y="${H - 4}" text-anchor="middle">Bohrung</text>
    <text class="muted" x="275" y="${H - 4}" text-anchor="middle">Welle</text>
  </svg>`;
}

/** Kompakte Ergebnisliste einer Passung (für Modul und Suche). */
export function fitSummary(f) {
  const d = f.nominal;
  const clr = (v) => (v >= 0 ? `Spiel ${fmt(mm(v), 3)}` : `Übermaß ${fmt(mm(-v), 3)}`);
  return `<p><span class="pill ${f.kind}">${KIND_LABEL[f.kind]}</span></p>
    <div class="results">
      ${result(`Bohrung ${esc(f.hole.letter + f.hole.grade)}`, `${fmtSigned(mm(f.hole.upper))} / ${fmtSigned(mm(f.hole.lower))}`, 'mm')}
      ${result('Bohrung Höchst-/Mindestmaß', `${fmt(d + mm(f.hole.upper), 3)} / ${fmt(d + mm(f.hole.lower), 3)}`, 'mm')}
      ${result(`Welle ${esc(f.shaft.letter + f.shaft.grade)}`, `${fmtSigned(mm(f.shaft.upper))} / ${fmtSigned(mm(f.shaft.lower))}`, 'mm')}
      ${result('Welle Höchst-/Mindestmaß', `${fmt(d + mm(f.shaft.upper), 3)} / ${fmt(d + mm(f.shaft.lower), 3)}`, 'mm')}
      ${result('Größtes', clr(f.max), 'mm')}
      ${result('Kleinstes', clr(f.min), 'mm')}
    </div>`;
}

function toleranceSummary(t, d) {
  return `<div class="results">
    ${result('Oberes Abmaß', fmtSigned(mm(t.upper)), 'mm')}
    ${result('Unteres Abmaß', fmtSigned(mm(t.lower)), 'mm')}
    ${result('Höchstmaß', fmt(d + mm(t.upper), 3), 'mm')}
    ${result('Mindestmaß', fmt(d + mm(t.lower), 3), 'mm')}
    ${result(`Toleranz IT${t.grade}`, fmt(mm(t.it), 4), 'mm')}
  </div>`;
}

function render(el, params, ctx) {
  const [hl, hg] = splitTol(params.h, ['H', '7']);
  const [sl, sg] = splitTol(params.s, ['g', '6']);
  el.innerHTML = `
    <p class="lead">Abmaße, Grenzmaße und Passungsart nach ISO 286 für Nennmaße bis ${MAX_NOMINAL} mm.</p>
    <div class="grid-2">
      <form class="card" id="fit-form" autocomplete="off">
        <h2>Passung berechnen</h2>
        <div class="grid">
          <label class="field"><span>Nennmaß (mm)</span><input name="d" inputmode="decimal" value="${esc(params.d || '25')}"></label>
          <label class="field"><span>Bohrung</span><select name="hl">${options(HOLE_LETTERS, hl)}</select></label>
          <label class="field"><span>Grad</span><select name="hg">${options(GRADES, hg)}</select></label>
          <label class="field"><span>Welle</span><select name="sl">${options(SHAFT_LETTERS, sl)}</select></label>
          <label class="field"><span>Grad</span><select name="sg">${options(GRADES, sg)}</select></label>
        </div>
        <p class="note">Häufige Passungen:</p>
        <div class="chips" id="fit-chips">${COMMON_FITS.map((c) => `<button type="button" class="chip" data-fit="${c.fit}" title="${esc(c.use)}">${c.fit}</button>`).join('')}</div>
      </form>
      <section class="card" id="fit-out" aria-live="polite"></section>
    </div>
    <section class="card">
      <h2>Häufige Passungen und Anwendung</h2>
      ${table(['Passung', 'Typische Anwendung'], COMMON_FITS.map((c) => ({ cells: [`<strong>${c.fit}</strong>`, esc(c.use)] })))}
    </section>
    <section class="card">
      <h2>Grundtoleranzen IT (µm)</h2>
      <div id="it-table"></div>
    </section>`;

  const form = el.querySelector('#fit-form');
  const out = el.querySelector('#fit-out');

  function update() {
    const v = formValues(form);
    const d = num(v.d);
    const h = v.hl + v.hg;
    const s = v.sl + v.sg;
    ctx.setParams({ d: v.d, h, s }, `Ø ${v.d} ${h}/${s}`);
    el.querySelectorAll('#fit-chips .chip').forEach((c) => c.classList.toggle('active', c.dataset.fit === `${h}/${s}`));
    renderIt(d);
    if (!(d > 0 && d <= MAX_NOMINAL)) {
      out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">Nennmaß zwischen 0 und ${MAX_NOMINAL} mm eingeben.</p>`;
      return;
    }
    const f = fit(d, h, s);
    if (!f) {
      const missing = [tolerance(h, d) ? null : h, tolerance(s, d) ? null : s].filter(Boolean).join(' und ');
      out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">${esc(missing)} ist für ${fmt(d)} mm nicht genormt oder in dieser App nicht hinterlegt.</p>`;
      return;
    }
    out.innerHTML = `<h2>Ø ${fmt(d)} ${esc(h)}/${esc(s)}</h2>${fitGraphic(f)}${fitSummary(f)}`;
  }

  function renderIt(d) {
    const idx = IT_RANGES.findIndex((u) => d <= u);
    const grades = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const rows = IT_RANGES.map((upper, i) => ({
      cls: i === idx && d > 0 ? 'hl' : '',
      cells: [`${i === 0 ? 0 : IT_RANGES[i - 1]} … ${upper}`, ...grades.map((g) => `<span class="num">${fmt(itValue(g, upper))}</span>`)],
    }));
    el.querySelector('#it-table').innerHTML = table(['Nennmaß mm', ...grades.map((g) => `IT${g}`)], rows);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  el.querySelector('#fit-chips').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fit]');
    if (!btn) return;
    const [h, s] = btn.dataset.fit.split('/');
    const [a, b] = splitTol(h);
    const [c, dd] = splitTol(s);
    form.hl.value = a; form.hg.value = b; form.sl.value = c; form.sg.value = dd;
    update();
  });
  update();
}

function search(q) {
  const f = parseFitQuery(q);
  if (f) {
    const d = f.nominal ?? 25;
    if (f.shaft) {
      const r = fit(d, f.hole, f.shaft);
      if (r) {
        return [{
          title: `Ø ${fmt(d)} ${f.hole}/${f.shaft}`, score: 100, params: { d, h: f.hole, s: f.shaft },
          html: `${f.nominal ? '' : '<p class="note">Kein Nennmaß angegeben, gerechnet mit 25 mm.</p>'}${fitSummary(r)}`,
        }];
      }
    } else if (f.nominal) {
      const t = tolerance(f.hole, d);
      if (t) return [{ title: `Ø ${fmt(d)} ${f.hole}`, score: 95, params: { d, h: f.hole }, html: toleranceSummary(t, d) }];
    }
  }
  const s = parseShaftQuery(q);
  if (s) {
    const t = tolerance(s.shaft, s.nominal);
    if (t) return [{ title: `Ø ${fmt(s.nominal)} ${s.shaft}`, score: 95, params: { d: s.nominal, s: s.shaft }, html: toleranceSummary(t, s.nominal) }];
  }
  const m = /^\s*([A-Z]{1,2}\d{1,2})\s*\/\s*([a-z]{1,2}\d{1,2})\s*$/.exec(q);
  return COMMON_FITS
    .filter((c) => m ? c.fit === `${m[1]}/${m[2]}` : c.fit.toLowerCase().startsWith(q.trim().toLowerCase()) && q.trim().length >= 2)
    .map((c) => {
      const [h, s] = c.fit.split('/');
      return { title: c.fit, text: c.use, params: { h, s }, score: 70 };
    });
}

export default {
  id: 'passungen',
  title: 'ISO-Passungen',
  subtitle: 'Abmaße, Grenzmaße und Passungsart nach ISO 286',
  color: '#2563eb',
  icon: '<rect x="3" y="7" width="8" height="10" rx="1"/><path d="M11 9h10v6H11"/><path d="M15 9v6"/>',
  keywords: ['Passung', 'Toleranz', 'ISO 286', 'Bohrung', 'Welle', 'Spiel', 'Übermaß', 'Übergang', 'IT', 'H7', 'g6', 'h6', 'Presssitz', 'Laufsitz'],
  render,
  search,
};
