import { esc, fmt, num, table, result, formValues } from '../../core/dom.js';
import { CLASSES_1, CLASSES_2, LINEAR, RADIUS, ANGLE, STRAIGHTNESS, PERPENDICULARITY, SYMMETRY, RUNOUT } from './data.js';
import { linearTolerance, radiusTolerance, angleTolerance, formTolerances, formatMinutes, findRow } from './calc.js';

const pm = (v) => (v === null || v === undefined ? '–' : `±${fmt(v)}`);
const range = (r, i) => `${i === 0 ? r.from : `über ${fmt(r.from)}`} … ${Number.isFinite(r.to) ? fmt(r.to) : '∞'}`;

function render(el, params, ctx) {
  const cls = CLASSES_1.some((c) => c.key === params.k) ? params.k : 'm';
  const cls2 = CLASSES_2.includes(params.k2) ? params.k2 : 'K';
  el.innerHTML = `
    <p class="lead">Allgemeintoleranzen für Maße ohne Toleranzangabe nach ISO 2768. Zeichnungseintrag z. B. „ISO 2768-mK“.</p>
    <div class="grid-2">
      <form class="card" id="gt-form" autocomplete="off">
        <h2>Maß prüfen</h2>
        <div class="grid">
          <label class="field"><span>Nennmaß (mm)</span><input name="d" inputmode="decimal" value="${esc(params.d || '50')}"></label>
          <label class="field"><span>Toleranzklasse</span><select name="k">${CLASSES_1.map((c) => `<option value="${c.key}"${c.key === cls ? ' selected' : ''}>${c.key} (${c.name})</option>`).join('')}</select></label>
          <label class="field"><span>Form/Lage</span><select name="k2">${CLASSES_2.map((c) => `<option${c === cls2 ? ' selected' : ''}>${c}</option>`).join('')}</select></label>
        </div>
      </form>
      <section class="card" id="gt-out" aria-live="polite"></section>
    </div>
    <section class="card"><h2>Längenmaße (mm)</h2><div id="t-linear"></div></section>
    <section class="card"><h2>Rundungshalbmesser und Fasen (mm)</h2><div id="t-radius"></div></section>
    <section class="card"><h2>Winkelmaße</h2><p class="note">Bezogen auf die Länge des kürzeren Schenkels in mm.</p><div id="t-angle"></div></section>
    <section class="card"><h2>Form und Lage (ISO 2768-2, mm)</h2><div id="t-form"></div>
      <p class="note">Lauf (Rund- und Planlauf): H ${fmt(RUNOUT.H)} · K ${fmt(RUNOUT.K)} · L ${fmt(RUNOUT.L)} mm.</p></section>`;

  const form = el.querySelector('#gt-form');
  const out = el.querySelector('#gt-out');

  function rows1(rows, d, cell) {
    const hit = findRow(rows, d);
    return rows.map((r, i) => ({ cls: r === hit ? 'hl' : '', cells: [range(r, i), ...CLASSES_1.map((c) => cell(r[c.key]))] }));
  }

  function update() {
    const v = formValues(form);
    const d = num(v.d);
    ctx.setParams({ d: v.d, k: v.k, k2: v.k2 });
    const head = ['Nennmaß', ...CLASSES_1.map((c) => `${c.key} (${c.name})`)];
    el.querySelector('#t-linear').innerHTML = table(head, rows1(LINEAR, d, pm));
    el.querySelector('#t-radius').innerHTML = table(head, rows1(RADIUS, d, pm));
    el.querySelector('#t-angle').innerHTML = table(['Schenkel', ...head.slice(1)], rows1(ANGLE, d, formatMinutes));
    const hitS = findRow(STRAIGHTNESS, d);
    const hitP = findRow(PERPENDICULARITY, d);
    const hitY = findRow(SYMMETRY, d);
    el.querySelector('#t-form').innerHTML = table(['Merkmal', 'Nennmaß', 'H', 'K', 'L'], [
      ...STRAIGHTNESS.map((r, i) => ({ cls: r === hitS ? 'hl' : '', cells: [i ? '' : 'Geradheit, Ebenheit', range(r, i), fmt(r.H), fmt(r.K), fmt(r.L)] })),
      ...PERPENDICULARITY.map((r, i) => ({ cls: r === hitP ? 'hl' : '', cells: [i ? '' : 'Rechtwinkligkeit', range(r, i), fmt(r.H), fmt(r.K), fmt(r.L)] })),
      ...SYMMETRY.map((r, i) => ({ cls: r === hitY ? 'hl' : '', cells: [i ? '' : 'Symmetrie', range(r, i), fmt(r.H), fmt(r.K), fmt(r.L)] })),
    ]);

    const lin = linearTolerance(d, v.k);
    if (!(d > 0)) { out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Nennmaß eingeben.</p>'; return; }
    const f = formTolerances(d, v.k2);
    out.innerHTML = `<h2>${fmt(d)} mm nach ISO 2768-${esc(v.k)}${esc(v.k2)}</h2>
      <div class="results">
        ${result('Längenmaß', lin === null ? 'nicht festgelegt' : `${pm(lin)}`, lin === null ? '' : 'mm', true)}
        ${lin === null ? '' : result('Grenzmaße', `${fmt(d - lin, 3)} … ${fmt(d + lin, 3)}`, 'mm')}
        ${result('Radius/Fase', pm(radiusTolerance(d, v.k)), 'mm')}
        ${result('Winkel (Schenkel = Maß)', formatMinutes(angleTolerance(d, v.k)))}
        ${result('Geradheit/Ebenheit', fmt(f.straightness), 'mm')}
        ${result('Rechtwinkligkeit', fmt(f.perpendicularity), 'mm')}
        ${result('Symmetrie', fmt(f.symmetry), 'mm')}
        ${result('Lauf', fmt(RUNOUT[v.k2]), 'mm')}
      </div>
      ${d < 0.5 ? '<p class="note">Unter 0,5 mm sind Grenzabmaße direkt am Maß anzugeben.</p>' : ''}`;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function search(q) {
  // "2768-m 50", "ISO 2768 mK 120", "2768"
  const m = /2768(?:\s*-?\s*([fmcv]))?([HKL])?(?:\s+(\d+(?:[.,]\d+)?))?/i.exec(q);
  if (!m) return [];
  const k = (m[1] || 'm').toLowerCase();
  const d = m[3] ? num(m[3]) : null;
  const params = { k, ...(m[2] ? { k2: m[2].toUpperCase() } : {}), ...(d ? { d } : {}) };
  if (d) {
    const t = linearTolerance(d, k);
    return [{
      title: `${fmt(d)} mm nach ISO 2768-${k}`, score: 95, params,
      html: `<div class="results">${result('Längenmaß', t === null ? 'nicht festgelegt' : pm(t), 'mm', true)}${t === null ? '' : result('Grenzmaße', `${fmt(d - t, 3)} … ${fmt(d + t, 3)}`, 'mm')}</div>`,
    }];
  }
  return [{ title: `ISO 2768-${k}`, text: 'Allgemeintoleranzen', params, score: 80 }];
}

export default {
  id: 'allgemeintoleranzen',
  title: 'Allgemein\u00ADtoleranzen',
  subtitle: 'Freimaße nach ISO 2768 (f, m, c, v und H, K, L)',
  color: '#7c3aed',
  icon: '<path d="M3 12h18"/><path d="M3 8v8M21 8v8"/><path d="M7 9l-4 3 4 3M17 9l4 3-4 3"/>',
  keywords: ['ISO 2768', '2768', 'Freimaß', 'Freimaßtoleranz', 'Allgemeintoleranz', 'mittel', 'fein', 'grob', 'mK', 'Winkel', 'Fase', 'Radius', 'Ebenheit', 'Geradheit'],
  render,
  search,
};
