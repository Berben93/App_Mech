import { esc, fmt, options, table, result } from '../../core/dom.js';
import { CATEGORIES } from './data.js';
import { category, convert, parseNumber, parseQuantity, inchFractions } from './calc.js';

function smart(v) {
  if (!Number.isFinite(v)) return '–';
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 1e9)) return v.toExponential(4).replace('.', ',');
  return fmt(v, undefined, a < 1 ? 6 : a < 100 ? 4 : 2);
}

function conversions(value, catId, from) {
  const cat = category(catId);
  return cat.units.filter(([u]) => u !== from).map(([u]) => [u, convert(value, catId, from, u)]);
}

function render(el, params, ctx) {
  let cat = category(params.k) || CATEGORIES[0];
  let unit = cat.units.some((u) => u[0] === params.e) ? params.e : cat.units[0][0];
  let input = params.x ?? '1';

  el.innerHTML = `
    <p class="lead">Umrechnen zwischen metrischen und Zoll-Einheiten. Brüche wie „1 1/4“ gehen auch.</p>
    <div class="seg" role="group" aria-label="Größe">${CATEGORIES.map((c) => `<button type="button" data-k="${c.id}">${esc(c.name)}</button>`).join('')}</div>
    <div class="grid-2">
      <form class="card" id="un-form" autocomplete="off">
        <h2 id="un-title"></h2>
        <div class="grid">
          <label class="field"><span>Wert</span><input name="x" inputmode="decimal" value="${esc(input)}"></label>
          <label class="field"><span>Einheit</span><select name="e"></select></label>
        </div>
        <div class="results" id="un-out" aria-live="polite" style="margin-top:10px"></div>
      </form>
      <section class="card"><h2>Zollbrüche in mm</h2><div id="frac"></div></section>
    </div>`;

  const form = el.querySelector('#un-form');

  function setup() {
    el.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === cat.id)));
    el.querySelector('#un-title').textContent = cat.name;
    form.elements.e.innerHTML = options(cat.units.map((u) => u[0]), unit);
  }

  function update() {
    ctx.setParams({ k: cat.id, e: unit, x: input });
    const v = parseNumber(input);
    el.querySelector('#un-out').innerHTML = Number.isFinite(v)
      ? conversions(v, cat.id, unit).map(([u, r]) => result(esc(u), smart(r))).join('')
      : '<p class="warn-text">Zahl eingeben.</p>';
  }

  el.querySelector('#frac').innerHTML = table(['Zoll', 'Dezimal', 'mm'],
    inchFractions(1, 64).filter((r) => r.denom <= 32).map((r) => ({ cls: r.denom <= 8 ? 'hl' : '', cells: [`<strong>${r.label}</strong>`, fmt(r.inch, 5), fmt(r.mm, 4)] })));

  form.addEventListener('input', (e) => {
    if (e.target.name === 'x') input = e.target.value;
    if (e.target.name === 'e') unit = e.target.value;
    update();
  });
  el.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    cat = category(b.dataset.k);
    unit = cat.units[0][0];
    setup();
    update();
  });
  setup();
  update();
}

function search(q) {
  const p = parseQuantity(q);
  if (!p) return [];
  const list = p.to ? [[p.to, convert(p.value, p.cat, p.unit, p.to)]] : conversions(p.value, p.cat, p.unit);
  return [{
    title: `${fmt(p.value, undefined, 4)} ${p.unit}`,
    score: 85,
    params: { k: p.cat, e: p.unit, x: String(p.value) },
    html: `<div class="results">${list.map(([u, r], i) => result(esc(u), smart(r), '', i === 0)).join('')}</div>`,
  }];
}

export default {
  id: 'einheiten',
  title: 'Einheiten',
  subtitle: 'Zoll ↔ mm, Kraft, Druck, Drehmoment, Temperatur …',
  color: '#0891b2',
  icon: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  keywords: ['Einheiten', 'Umrechnung', 'Zoll', 'inch', 'mm', 'psi', 'bar', 'lbf', 'Newton', 'Fahrenheit', 'Celsius', 'PS', 'kW', 'Pfund', 'Bruch'],
  render,
  search,
};
