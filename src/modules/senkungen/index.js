import { esc, fmt, num, options, result, table, formValues, steps } from '../../core/dom.js';
import { COUNTERSINK, COUNTERBORE, UNDERCUT_EXT, UNDERCUT_INT } from './data.js';
import { countersink, counterbore, coneDepth, coarsePitch, undercut } from './calc.js';
import { METRIC_COARSE } from '../gewinde/data.js';

const TABS = [['senk', 'Senkungen'], ['frei', 'Gewindefreistich DIN 76']];
const FORMS = [['A', 'A – Außengewinde, Regelfall'], ['B', 'B – Außengewinde, kurz'], ['C', 'C – Innengewinde, Regelfall'], ['D', 'D – Innengewinde, kurz']];
const PITCHES = UNDERCUT_EXT.map((r) => r.p);
const ANGLES = [60, 82, 90, 100, 120];

/** Schnitt einer Kegel- oder Zylindersenkung. */
function sinkGraphic({ d1, d2, depth, angle, cyl }) {
  const W = 400;
  const H = 170;
  const sc = 220 / Math.max(d2, 1);
  const cx = W / 2;
  const top = 30;
  const dep = Math.min(depth * sc, 90);
  const bh = (d1 / 2) * sc;
  const sh = (d2 / 2) * sc;
  const mat = 'fill="color-mix(in srgb, var(--muted) 22%, transparent)" stroke="var(--text)" stroke-width="1.5"';
  const left = cyl
    ? `M 20 ${top} L ${cx - sh} ${top} L ${cx - sh} ${top + dep} L ${cx - bh} ${top + dep} L ${cx - bh} ${H - 10} L 20 ${H - 10} Z`
    : `M 20 ${top} L ${cx - sh} ${top} L ${cx - bh} ${top + dep} L ${cx - bh} ${H - 10} L 20 ${H - 10} Z`;
  const right = cyl
    ? `M ${W - 20} ${top} L ${cx + sh} ${top} L ${cx + sh} ${top + dep} L ${cx + bh} ${top + dep} L ${cx + bh} ${H - 10} L ${W - 20} ${H - 10} Z`
    : `M ${W - 20} ${top} L ${cx + sh} ${top} L ${cx + bh} ${top + dep} L ${cx + bh} ${H - 10} L ${W - 20} ${H - 10} Z`;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Schnitt der Senkung">
    <path class="anim" d="${left}" ${mat}/><path class="anim" d="${right}" ${mat}/>
    <line x1="${cx}" x2="${cx}" y1="8" y2="${H - 4}" stroke="var(--muted)" stroke-dasharray="8 3 2 3"/>
    <line class="axis" x1="${cx - sh}" x2="${cx + sh}" y1="${top - 12}" y2="${top - 12}"/>
    <text x="${cx}" y="${top - 16}" text-anchor="middle">Ø ${fmt(d2)}</text>
    <text x="${cx}" y="${H - 16}" text-anchor="middle">Ø ${fmt(d1)}</text>
    <text class="muted" x="${cx + sh + 8}" y="${top + dep / 2 + 4}">${cyl ? `t ${fmt(depth, 1)}` : `${angle}°`}</text>
  </svg>`;
}

/** Freistich am Gewindeende (Außen- oder Innengewinde). */
function undercutGraphic(u) {
  const W = 400;
  const H = 150;
  const g = Math.min(u.g2 * 18, 150);
  const depth = 26;
  const x0 = 60;
  const yTop = u.internal ? 110 : 40;
  const dir = u.internal ? -1 : 1;
  const thread = Array.from({ length: 8 }, (_, i) => `${x0 + i * 14},${yTop} ${x0 + i * 14 + 7},${yTop - dir * 9}`).join(' ');
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewindefreistich">
    <polyline points="${x0 - 40},${yTop} ${thread} ${x0 + 112},${yTop}" class="profile" style="fill:none"/>
    <path class="anim" d="M ${x0 + 112} ${yTop} L ${x0 + 112} ${yTop + dir * depth} L ${x0 + 112 + g} ${yTop + dir * depth} Q ${x0 + 126 + g} ${yTop + dir * depth} ${x0 + 130 + g} ${yTop} L ${W - 20} ${yTop}" class="profile" style="fill:none"/>
    <line class="axis" x1="${x0 + 112}" x2="${x0 + 112 + g + 16}" y1="${yTop + dir * (depth + 18)}" y2="${yTop + dir * (depth + 18)}"/>
    <text x="${x0 + 120 + g / 2}" y="${yTop + dir * (depth + 18) + (u.internal ? -6 : 16)}" text-anchor="middle">g₂ ≤ ${fmt(u.g2)}</text>
    <text x="${W - 24}" y="${yTop + dir * 18}" text-anchor="end">d<tspan font-size="9">g</tspan> ${fmt(u.dg, 2)} ${u.tol}</text>
    <text class="muted" x="${x0 - 36}" y="${yTop - dir * 16}">${u.internal ? 'Innengewinde' : 'Außengewinde'} M${fmt(u.d)}×${fmt(u.p)}</text>
  </svg>`;
}

function render(el, params, ctx) {
  let tab = params.v === 'frei' ? 'frei' : 'senk';
  const sizes = [...new Set([...COUNTERSINK, ...COUNTERBORE].map((c) => c.d))].sort((a, b) => a - b);
  el.innerHTML = `
    <p class="lead">Senkungen für Senk- und Zylinderschrauben sowie Gewindefreistiche nach DIN 76-1.</p>
    <div class="seg" role="group" aria-label="Bereich">${TABS.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>
    <div id="sk-body"></div>`;
  const body = el.querySelector('#sk-body');

  function renderSenk() {
    body.innerHTML = `<div class="grid-2">
      <form class="card" id="sk-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">
          <label class="field"><span>Schraube</span><select name="d">${options(sizes.map((d) => [d, `M${fmt(d)}`]), params.d || '6')}</select></label>
          <label class="field adv"><span>Senkwinkel für Rechner</span><select name="a">${options(ANGLES.map((a) => [a, `${a}°`]), params.a || '90')}</select></label>
          <label class="field adv"><span>Eigener Senk-Ø (mm)</span><input name="x" inputmode="decimal" value="${esc(params.x || '')}" placeholder="optional"></label>
        </div>
        <p class="note adv">Mit eigenem Senk-Ø rechnet der Kegelrechner Tiefe und Z-Zustellung für jeden Senkwinkel, z. B. 82° für Zollschrauben oder 60° für Zentrierungen.</p>
      </form>
      <section class="card" id="sk-out" aria-live="polite"></section>
    </div>
    <section class="card adv"><h2>Kegelsenkungen 90° (ISO 15065)</h2>
      ${table(['Schraube', 'Durchgang d₁ H13', 'Senk-Ø d₂', 'Tiefe ≈'], COUNTERSINK.map((c) => [`<strong>M${fmt(c.d)}</strong>`, fmt(c.d1), fmt(c.d2), fmt((c.d2 - c.d1) / 2, 2)]))}
      <p class="note">Für Senkschrauben mit Kopf nach ISO 7721 (ISO 2009, ISO 7046, ISO 1482, ISO 10642 bis M10). Senk-Ø als Mindestmaß, damit der Kopf nicht übersteht.</p></section>
    <section class="card adv"><h2>Zylindersenkungen für ISO 4762 (DIN 974-2)</h2>
      ${table(['Schraube', 'Durchgang d₁', 'Senk-Ø d₂ H13', 'Senktiefe t'], COUNTERBORE.map((c) => [`<strong>M${fmt(c.d)}</strong>`, fmt(c.d1), fmt(c.d2), fmt(c.t, 1)]))}
      <p class="note">Ohne Unterlegscheibe, Kopf bündig. Mit Scheibe oder Federring Senk-Ø und Tiefe entsprechend vergrößern.</p></section>`;
    const form = body.querySelector('#sk-form');
    const out = body.querySelector('#sk-out');
    const update = () => {
      const v = formValues(form);
      const d = num(v.d);
      const angle = num(v.a);
      const own = num(v.x);
      ctx.setParams({ v: tab, d: v.d, a: v.a, x: v.x }, `M${v.d} Senkung`);
      const cs = countersink(d);
      const cb = counterbore(d);
      const d1 = cs?.d1 ?? cb?.d1;
      const d2 = own > 0 ? own : cs?.d2;
      const cone = d2 ? coneDepth(d2, d1, angle) : null;
      out.innerHTML = `<h2>M${fmt(d)}</h2>
        ${cone ? sinkGraphic({ d1, d2, depth: cone.depth, angle }) : cb ? sinkGraphic({ d1: cb.d1, d2: cb.d2, depth: cb.t, cyl: true }) : ''}
        <div class="results">
          ${result('Durchgangsbohrung d₁', fmt(d1), 'mm', true)}
          ${cs ? result('Kegelsenkung 90° Ø d₂ (ISO 15065)', fmt(cs.d2), 'mm') : ''}
          ${cb ? result('Zylindersenkung Ø × Tiefe (ISO 4762)', `${fmt(cb.d2)} × ${fmt(cb.t, 1)}`, 'mm') : ''}
          <div class="${own > 0 ? '' : 'adv'}">
          ${cone ? result(`${own > 0 ? 'Eigene ' : ''}Kegelsenkung ${angle}° Tiefe`, fmt(cone.depth, 2), 'mm') : ''}
          ${cone ? result('Z-Zustellung spitzer Senker ab Oberfläche', fmt(cone.tipZ, 2), 'mm') : ''}
          </div>
        </div>
        ${!cs ? '<p class="note">Kegelsenkungen nach ISO 15065 gibt es bis M10; für größere Senkschrauben Kopfmaß der Schraube nehmen.</p>' : ''}
        ${cone ? steps([
          { title: 'Senktiefe bis zur Bohrung', formula: 't = (d₂ − d₁) / 2 / tan(α/2)', values: `t = (${fmt(d2)} − ${fmt(d1)}) / 2 / tan(${fmt(angle / 2)}°)`, result: `${fmt(cone.depth, 2)} mm` },
          { title: 'Zustellung eines spitzen Senkers', formula: 'Z = d₂ / 2 / tan(α/2)', values: `Z = ${fmt(d2)} / 2 / tan(${fmt(angle / 2)}°)`, result: `${fmt(cone.tipZ, 2)} mm` },
        ]) : ''}`;
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  function renderFrei() {
    const ext = ['A', 'B'].includes(params.f) || !params.f;
    body.innerHTML = `<div class="grid-2">
      <form class="card" id="fr-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">
          <label class="field"><span>Gewinde-Ø d (mm)</span><input name="d" inputmode="decimal" value="${esc(params.d || '12')}" list="fr-d"></label>
          <label class="field"><span>Steigung P (mm)</span><select name="p">${options(PITCHES.map((p) => [p, fmt(p)]), params.p || coarsePitch(num(params.d || 12)) || 1.75)}</select></label>
          <label class="field" style="grid-column:1/-1"><span>Form</span><select name="f">${options(FORMS, params.f || 'A')}</select></label>
        </div>
        <datalist id="fr-d">${METRIC_COARSE.map((t) => `<option value="${t.d}">`).join('')}</datalist>
        <p class="note">Bei Eingabe eines Regelgewinde-Ø wird die Steigung automatisch gesetzt. Form ${ext ? 'A/B' : 'C/D'}: ${ext ? 'Außengewinde (Bolzen)' : 'Innengewinde (Grundloch)'}.</p>
      </form>
      <section class="card" id="fr-out" aria-live="polite"></section>
    </div>
    <section class="card adv"><h2>DIN 76-1 Außengewinde (Form A / B)</h2>
      ${table(['P', 'd<sub>g</sub> h13', 'g₁ min A', 'g₂ max A', 'g₁ min B', 'g₂ max B', 'r'], UNDERCUT_EXT.map((r) => [fmt(r.p), `d − ${fmt(r.x)}`, fmt(r.a[0]), fmt(r.a[1]), fmt(r.b[0]), fmt(r.b[1]), fmt(r.r)]))}</section>
    <section class="card adv"><h2>DIN 76-1 Innengewinde (Form C / D)</h2>
      ${table(['P', 'd<sub>g</sub> H13', 'g₁ min C', 'g₂ max C', 'g₁ min D', 'g₂ max D', 'R'], UNDERCUT_INT.map((r) => [fmt(r.p), `d + ${fmt(r.x)}`, fmt(r.c[0]), fmt(r.c[1]), fmt(r.d[0]), fmt(r.d[1]), fmt(r.r)]))}
      <p class="note">Form B und D nur, wenn ein kurzer Freistich nötig ist. Bauteile mit Freistich erreichen nicht die Prüfkräfte nach ISO 898-1.</p></section>`;
    const form = body.querySelector('#fr-form');
    const out = body.querySelector('#fr-out');
    const update = (e) => {
      if (e?.target?.name === 'd') {
        const p = coarsePitch(num(form.elements.d.value));
        if (p) form.elements.p.value = String(p);
      }
      const v = formValues(form);
      const u = undercut(num(v.d), num(v.p), v.f);
      ctx.setParams({ v: tab, d: v.d, p: v.p, f: v.f }, `Freistich M${v.d}×${v.p} Form ${v.f}`);
      if (!u) {
        out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Durchmesser und Steigung eingeben.</p>';
        return;
      }
      out.innerHTML = `<h2>DIN 76-${esc(u.form)} M${fmt(u.d)}×${fmt(u.p)}</h2>
        ${undercutGraphic(u)}
        <div class="results">
          ${result(`Freistich-Ø d<sub>g</sub> (${u.tol})`, fmt(u.dg, 2), 'mm', true)}
          ${result('Breite g₁ min', fmt(u.g1), 'mm')}
          ${result('Länge g₂ max', fmt(u.g2), 'mm')}
          ${result('Radius r', fmt(u.r), 'mm')}
          <div class="adv">${result('Einstichtiefe radial', fmt(Math.abs(u.d - u.dg) / 2, 2), 'mm')}</div>
        </div>
        <p class="note">Zeichnungsangabe: „Freistich DIN 76-${esc(u.form)}“. Übergang zum Gewinde mit 30° Fase.</p>`;
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  function show() {
    el.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === tab)));
    if (tab === 'senk') renderSenk();
    else renderFrei();
  }
  el.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b || b.dataset.v === tab) return;
    tab = b.dataset.v;
    params = {};
    show();
  });
  show();
}

function search(q) {
  const t = q.trim();
  const m = /^(?:senkung|freistich|din\s*76)?\s*m\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?\s*(senkung|freistich)?$/i.exec(t);
  if (m && /senkung|freistich|din\s*76/i.test(t)) {
    const d = num(m[1]);
    if (/freistich|din\s*76/i.test(t)) {
      const p = m[2] ? num(m[2]) : coarsePitch(d);
      const u = p ? undercut(d, p, 'A') : null;
      if (!u) return [];
      return [{ title: `Freistich DIN 76-A M${fmt(d)}×${fmt(p)}`, score: 95, params: { v: 'frei', d, p, f: 'A' },
        html: `<div class="results">${result('Freistich-Ø d<sub>g</sub>', fmt(u.dg, 2), 'mm', true)}${result('g₁ min / g₂ max', `${fmt(u.g1)} / ${fmt(u.g2)}`, 'mm')}${result('Radius r', fmt(u.r), 'mm')}</div>` }];
    }
    const cs = countersink(d);
    const cb = counterbore(d);
    if (!cs && !cb) return [];
    return [{ title: `Senkungen M${fmt(d)}`, score: 95, params: { v: 'senk', d },
      html: `<div class="results">${cs ? result('Kegelsenkung 90° Ø', fmt(cs.d2), 'mm', true) : ''}${cb ? result('Zylindersenkung Ø × t', `${fmt(cb.d2)} × ${fmt(cb.t, 1)}`, 'mm') : ''}</div>` }];
  }
  // Bei reiner Gewindesuche ("M8") als zusätzliche Zeile
  const g = /^m\s*(\d+(?:[.,]\d+)?)$/i.exec(t);
  if (g) {
    const d = num(g[1]);
    const cs = countersink(d);
    const cb = counterbore(d);
    if (!cs && !cb) return [];
    return [{ title: `Senkungen M${fmt(d)}`, text: [cs ? `Kegel 90° Ø${fmt(cs.d2)}` : '', cb ? `Zylinder Ø${fmt(cb.d2)}×${fmt(cb.t, 1)}` : ''].filter(Boolean).join(' · '), score: 60, params: { v: 'senk', d } }];
  }
  return [];
}

export default {
  id: 'senkungen',
  title: 'Senkungen & Freistiche',
  subtitle: 'ISO 15065, DIN 974 und Gewindefreistiche DIN 76',
  color: '#7c3aed',
  icon: '<path d="M3 5h6l3 4 3-4h6"/><path d="M12 9v12"/><path d="M8 21V12M16 21V12"/>',
  keywords: ['Senkung', 'Kegelsenkung', 'Zylindersenkung', 'Senkschraube', 'ISO 15065', 'DIN 74', 'DIN 974', 'Freistich', 'Gewindefreistich', 'DIN 76', 'Einstich', 'Gewindeauslauf', 'Senker'],
  render,
  search,
};
