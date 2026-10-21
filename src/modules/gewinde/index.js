import { esc, fmt, table, result } from '../../core/dom.js';
import { METRIC_COARSE, METRIC_FINE, UNIFIED, PIPE_G, TRAPEZ } from './data.js';
import { metric, unified, pipe, trapez, parseThread } from './calc.js';
import { screwSize, tighteningTorque } from '../schrauben/calc.js';

const TYPES = [
  { key: 'M', label: 'M', title: 'Metrisches Regelgewinde (ISO 261)' },
  { key: 'MF', label: 'MF', title: 'Metrisches Feingewinde (ISO 261)' },
  { key: 'UNC', label: 'UNC', title: 'Unified grob (ASME B1.1)' },
  { key: 'UNF', label: 'UNF', title: 'Unified fein (ASME B1.1)' },
  { key: 'G', label: 'G', title: 'Whitworth-Rohrgewinde (ISO 228-1)' },
  { key: 'Tr', label: 'Tr', title: 'Trapezgewinde (ISO 2904)' },
];

/** Alle Gewinde einer Art als Liste {id, data}. */
function listFor(type) {
  switch (type) {
    case 'M': return METRIC_COARSE.map((t) => metric(t.d));
    case 'MF': return METRIC_FINE.map((t) => metric(t.d, t.p));
    case 'UNC': return UNIFIED.filter((u) => u.unc).map((u) => unified(u.size, 'UNC'));
    case 'UNF': return UNIFIED.filter((u) => u.unf).map((u) => unified(u.size, 'UNF'));
    case 'G': return PIPE_G.map((g) => pipe(g.size));
    case 'Tr': return TRAPEZ.map((t) => trapez(t.d, t.p));
    default: return [];
  }
}

function threadId(t) {
  if (t.type === 'UNC' || t.type === 'UNF') return t.name.split('"')[0];
  if (t.type === 'G') return t.name.slice(2);
  return `${t.d}x${t.p}`;
}

function findThread(type, id) {
  return listFor(type).find((t) => threadId(t) === id) || null;
}

/** Gewindeprofil als Grafik: Flankenwinkel 60°, 55° (G) oder 30° (Tr). */
function profileGraphic(t) {
  const angle = t.type === 'G' ? 55 : t.type === 'Tr' ? 30 : 60;
  const W = 400;
  const H = 150;
  const pitchPx = 110;
  const half = (angle / 2) * (Math.PI / 180);
  // Tr: abgeflachtes Trapez; sonst Spitzprofil mit kleinen Abflachungen
  const depth = t.type === 'Tr' ? pitchPx * 0.5 : (pitchPx / 2) / Math.tan(half) * 0.62;
  const flankDx = depth * Math.tan(half);
  const flat = Math.max((pitchPx - 2 * flankDx) / 2, 2);
  const top = 30;
  const bottom = top + depth;
  let x = 10;
  let d = `M ${x} ${bottom}`;
  while (x < W) {
    d += ` l ${flat / 2} 0 l ${flankDx} ${-depth} l ${flat} 0 l ${flankDx} ${depth} l ${flat / 2} 0`;
    x += pitchPx;
  }
  d += ` L ${x} ${H - 10} L 10 ${H - 10} Z`;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gewindeprofil ${angle} Grad">
    <defs><clipPath id="clip-prof"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath></defs>
    <path class="profile" d="${d}" clip-path="url(#clip-prof)"/>
    <line class="axis" x1="${10 + flat / 2 + flankDx + flat / 2}" x2="${10 + flat / 2 + flankDx + flat / 2 + pitchPx}" y1="${top - 12}" y2="${top - 12}"/>
    <text x="${10 + flat + flankDx + pitchPx / 2}" y="${top - 16}" text-anchor="middle">P = ${fmt(t.p, undefined, 3)} mm</text>
    <text class="muted" x="${W - 12}" y="${H - 18}" text-anchor="end">Flankenwinkel ${angle}°</text>
  </svg>`;
}

function details(t) {
  const rows = [result('Kernlochbohrung', `${fmt(t.tapDrill, undefined, 2)}`, 'mm', true)];
  rows.push(result('Steigung P', fmt(t.p, undefined, 3), 'mm'));
  if (t.tpi) rows.push(result('Gänge je Zoll', fmt(t.tpi), 'tpi'));
  rows.push(result('Außendurchmesser d', fmt(t.d, undefined, 3), 'mm'));
  if (t.dIn) rows.push(result('Außendurchmesser', fmt(t.dIn, undefined, 4), 'Zoll'));
  rows.push(result('Flankendurchmesser d₂', fmt(t.d2, undefined, 3), 'mm'));
  if (t.d3) rows.push(result('Kerndurchmesser Bolzen d₃', fmt(t.d3, undefined, 3), 'mm'));
  rows.push(result('Kerndurchmesser Mutter D₁', fmt(t.D1, undefined, 3), 'mm'));
  if (t.h3) rows.push(result('Gewindetiefe h₃', fmt(t.h3, undefined, 3), 'mm'));
  if (t.h) rows.push(result('Gewindetiefe h', fmt(t.h, undefined, 3), 'mm'));
  if (t.D4) rows.push(result('Außendurchmesser Mutter D₄', fmt(t.D4, undefined, 3), 'mm'));
  if (t.clearance) rows.push(result('Durchgangsbohrung f/m/g', t.clearance.map((v) => fmt(v)).join(' / '), 'mm'));
  const notes = {
    M: 'Kernloch nach DIN 336 (entspricht meist d − P).',
    MF: 'Kernloch = d − P (Faustformel für ca. 6H).',
    UNC: 'Kernloch ≈ d − P, auf 0,1 mm gerundet.',
    UNF: 'Kernloch ≈ d − P, auf 0,1 mm gerundet.',
    G: 'Kernlochbohrung als Richtwert für Innengewinde. Dichtung nicht im Gewinde (zylindrisch).',
    Tr: 'Kernloch für die Mutter = D₁ = d − P.',
  };
  return `<div class="results">${rows.join('')}</div><p class="note">${notes[t.type]}</p>`;
}

function columnsFor(type) {
  const base = [['Gewinde', (t) => `<strong>${esc(t.name)}</strong>`], ['P', (t) => fmt(t.p, undefined, 3)]];
  if (type === 'UNC' || type === 'UNF') base.push(['tpi', (t) => t.tpi], ['d mm', (t) => fmt(t.d, 2)]);
  base.push(['Kernloch', (t) => fmt(t.tapDrill, undefined, 2)], ['d₂', (t) => fmt(t.d2, 3)], ['D₁', (t) => fmt(t.D1, 3)]);
  if (type === 'M') base.push(['Durchgang m', (t) => fmt(t.clearance?.[1])]);
  if (type === 'Tr') base.push(['d₃', (t) => fmt(t.d3, 3)]);
  return base;
}

function render(el, params, ctx) {
  let type = TYPES.some((t) => t.key === params.t) ? params.t : 'M';
  let id = params.id || (type === 'M' ? '12x1.75' : null);

  el.innerHTML = `
    <p class="lead">Kernlochbohrung, Steigung und Durchmesser für die gängigen Gewindearten. Zeile antippen für Details.</p>
    <div class="seg" role="group" aria-label="Gewindeart">${TYPES.map((t) => `<button type="button" data-t="${t.key}" title="${esc(t.title)}">${t.label}</button>`).join('')}</div>
    <div class="grid-2">
      <section class="card" id="th-detail" aria-live="polite"></section>
      <section class="card"><h2 id="th-title"></h2><div id="th-table"></div></section>
    </div>`;

  const detail = el.querySelector('#th-detail');

  function update() {
    const list = listFor(type);
    const current = (id && findThread(type, id)) || list[0];
    id = threadId(current);
    ctx.setParams({ t: type, id });
    el.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === type)));
    el.querySelector('#th-title').textContent = TYPES.find((t) => t.key === type).title;
    const cols = columnsFor(type);
    el.querySelector('#th-table').innerHTML = table(cols.map((c) => c[0]),
      list.map((t) => ({ cls: threadId(t) === id ? 'hl' : '', cells: cols.map((c) => c[1](t)) })));
    el.querySelectorAll('#th-table tbody tr').forEach((tr, i) => { tr.dataset.go = threadId(list[i]); });
    detail.innerHTML = `<h2>${esc(current.name)}</h2>${profileGraphic(current)}${details(current)}`;
  }

  el.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    type = b.dataset.t;
    id = null;
    update();
  });
  el.querySelector('#th-table').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-go]');
    if (!tr) return;
    id = tr.dataset.go;
    update();
    if (window.matchMedia('(max-width: 700px)').matches) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  update();
}

/** Schnellübersicht für die Suche, z. B. "M12": alles Wichtige auf einen Blick. */
function metricCard(t) {
  const s = screwSize(t.d);
  const torque = tighteningTorque({ d: t.d, p: t.p, cls: '8.8' });
  const rows = [
    result('Kernlochbohrung', fmt(t.tapDrill, undefined, 2), 'mm', true),
    result('Steigung', fmt(t.p, undefined, 3), 'mm'),
  ];
  if (t.clearance) rows.push(result('Durchgangsbohrung mittel', fmt(t.clearance[1]), 'mm'));
  if (s) {
    rows.push(result('Schlüsselweite Sechskant', `${fmt(s.sw)}${s.swDin ? ` (DIN ${fmt(s.swDin)})` : ''}`, 'mm'));
    rows.push(result('Innensechskant ISO 4762', fmt(s.isk), 'mm'));
  }
  if (torque) rows.push(result('Anziehdrehmoment 8.8, µ 0,12', fmt(torque.MA, 0), 'Nm'));
  return `<div class="results">${rows.join('')}</div>${t.known ? '' : '<p class="note warn-text">Diese Steigung ist nicht in der Normreihe.</p>'}`;
}

function search(q) {
  const p = parseThread(q);
  if (!p) return [];
  if (p.kind === 'metric') {
    const t = metric(p.d, p.p);
    if (!t) return [];
    return [{ title: t.name, score: 100, params: { t: t.type, id: threadId(t) }, html: metricCard(t) }];
  }
  const t = p.kind === 'trapez' ? trapez(p.d, p.p) : p.kind === 'pipe' ? pipe(p.size) : unified(p.size, p.series);
  if (!t) return [];
  return [{ title: t.name, score: 100, params: { t: t.type, id: threadId(t) }, html: details(t) }];
}

export default {
  id: 'gewinde',
  title: 'Gewinde',
  subtitle: 'M, MF, UNC, UNF, G und Tr mit Kernloch',
  color: '#0d9488',
  icon: '<path d="M8 3h8M8 21h8"/><path d="M9 3v18M15 3v18"/><path d="M9 7l6 2M9 11l6 2M9 15l6 2"/>',
  keywords: ['Gewinde', 'Kernloch', 'Kernlochbohrung', 'Steigung', 'Regelgewinde', 'Feingewinde', 'UNC', 'UNF', 'Zoll', 'Rohrgewinde', 'Whitworth', 'BSP', 'Trapez', 'Tr', 'Durchgangsbohrung', 'Gewindebohren'],
  render,
  search,
};
