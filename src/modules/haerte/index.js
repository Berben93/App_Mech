import { esc, fmt, num, options, result, table, formValues, steps } from '../../core/dom.js';
import { HARDNESS, SCALES, EXAMPLES } from './data.js';
import { convertHardness, parseHardness, scale } from './calc.js';

const HV_MIN = HARDNESS[0][0];
const HV_MAX = HARDNESS[HARDNESS.length - 1][0];

/** Skala von 80 bis 940 HV mit HRC-Teilung und Markierung des aktuellen Werts. */
const W = 400;
const gx = (v) => 14 + ((v - HV_MIN) / (HV_MAX - HV_MIN)) * (W - 28);

function gauge() {
  const x = gx;
  const hrcTicks = [20, 30, 40, 50, 60, 65].map((c) => {
    const row = HARDNESS.find((r) => r[4] !== null && r[4] >= c);
    return row ? `<line class="axis" x1="${x(row[0])}" x2="${x(row[0])}" y1="58" y2="66"/><text class="muted" x="${x(row[0])}" y="80" text-anchor="middle">${c}</text>` : '';
  }).join('');
  const hvTicks = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((v) => `<line class="axis" x1="${x(v)}" x2="${x(v)}" y1="34" y2="42"/><text class="muted" x="${x(v)}" y="28" text-anchor="middle">${v}</text>`).join('');
  return `<svg class="graphic" viewBox="0 0 ${W} 96" role="img" aria-label="Lage auf der Härteskala">
    <defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stop-color="#93c5fd"/><stop offset=".5" stop-color="#f59e0b"/><stop offset="1" stop-color="#b91c1c"/></linearGradient></defs>
    <rect x="14" y="42" width="${W - 28}" height="16" rx="8" fill="url(#hg)"/>
    ${hvTicks}${hrcTicks}
    <text class="muted" x="${W - 14}" y="12" text-anchor="end">HV</text>
    <text class="muted" x="${W - 14}" y="94" text-anchor="end">HRC</text>
    <g class="marker"><path d="M0 38 l-7 -10 h14 z" fill="var(--accent)"/><line x1="0" x2="0" y1="38" y2="62" stroke="var(--text)" stroke-width="2.5"/></g>
  </svg>`;
}

function render(el, params, ctx) {
  const from = scale(params.s) ? params.s : 'HRC';
  el.innerHTML = `
    <p class="lead">Härtewerte nach DIN EN ISO 18265 umrechnen: Vickers, Brinell, Rockwell und Zugfestigkeit.</p>
    <div class="grid-2">
      <form class="card" id="hd-form" autocomplete="off">
        <h2>Eingabe</h2>
        <div class="grid">
          <label class="field"><span>Wert</span><input name="x" inputmode="decimal" value="${esc(params.x || '45')}"></label>
          <label class="field"><span>Skala</span><select name="s">${options(SCALES.map((s) => [s.key, s.label]), from)}</select></label>
        </div>
        <div id="hd-gauge" style="margin-top:12px">${gauge()}</div>
        <p class="note">Gilt für unlegierte und niedriglegierte Stähle. Für Edelstahl, Guss, NE-Metalle und kaltverfestigte Werkstoffe nur als grober Anhalt.</p>
      </form>
      <section class="card" id="hd-out" aria-live="polite"></section>
    </div>
    <section class="card adv"><h2>Typische Härten</h2>
      ${table(['Werkstoff / Zustand', 'Härte'], EXAMPLES.map((e) => [esc(e.name), e.value]))}
    </section>
    <section class="card adv"><h2>Umwertungstabelle</h2><div id="hd-table"></div>
      <p class="note">HBW über 450 nur mit Hartmetallkugel. Zugfestigkeit aus Härte ist eine Schätzung (Streuung ±10 %), kein Ersatz für den Zugversuch.</p></section>`;

  const form = el.querySelector('#hd-form');
  const out = el.querySelector('#hd-out');

  function update() {
    const v = formValues(form);
    const x = num(v.x);
    const s = scale(v.s);
    ctx.setParams({ x: v.x, s: v.s }, `${v.x} ${s.unit === 'N/mm²' ? 'N/mm²' : s.unit}`);
    const r = convertHardness(x, v.s);
    const marker = el.querySelector('#hd-gauge .marker');
    marker.style.transform = `translateX(${r ? gx(r.HV) : gx(HV_MIN)}px)`;
    marker.style.opacity = r ? '1' : '0';
    if (!r) {
      out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">${esc(v.x)} ${esc(s.unit)} liegt außerhalb der Tabelle.</p>`;
    } else {
      const big = SCALES.filter((t) => t.key !== v.s);
      out.innerHTML = `<h2>${fmt(x, undefined, 1)} ${esc(s.unit)} entspricht</h2>
        <div class="results">
          ${big.map((t, i) => result(t.label, r[t.key] === null ? '–' : fmt(r[t.key], t.digits), r[t.key] === null ? '' : t.unit, i === 0)).join('')}
        </div>
        ${r.HRC === null && v.s !== 'HRC' ? '<p class="note">HRC ist erst ab etwa 20 HRC (240 HV) definiert, darunter HRB oder HB verwenden.</p>' : ''}
        ${steps([
          v.s !== 'HV' ? { title: `${s.key} → HV`, formula: 'Lineare Interpolation zwischen den Tabellenzeilen', values: `${fmt(x, undefined, 1)} ${s.unit}`, result: `${fmt(r.HV, 0)} HV` } : null,
          ...big.filter((t) => t.key !== 'HV' && r[t.key] !== null).map((t) => ({ title: `HV → ${t.key}`, values: `${fmt(r.HV, 0)} HV`, result: `${fmt(r[t.key], t.digits)} ${t.unit}` })),
        ])}`;
    }
    const near = r ? HARDNESS.reduce((a, b) => (Math.abs(b[0] - r.HV) < Math.abs(a[0] - r.HV) ? b : a)) : null;
    const cell = (val, d) => (val === null ? '–' : fmt(val, d));
    el.querySelector('#hd-table').innerHTML = table(['HV', 'HBW', 'HRC', 'HRB', 'Rm N/mm²'],
      HARDNESS.map((row) => ({ cls: row === near ? 'hl' : '', cells: [cell(row[0], 0), cell(row[2], 0), cell(row[4], 1), cell(row[3], 1), cell(row[1], 0)] })));
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function search(q) {
  const p = parseHardness(q);
  if (!p) return [];
  const r = convertHardness(p.value, p.key);
  if (!r) return [];
  const s = scale(p.key);
  return [{
    title: `${fmt(p.value, undefined, 1)} ${s.unit}`, score: 95, params: { x: p.value, s: p.key },
    html: `<div class="results">${SCALES.filter((t) => t.key !== p.key && r[t.key] !== null).map((t, i) => result(t.label, fmt(r[t.key], t.digits), t.unit, i === 0)).join('')}</div>`,
  }];
}

export default {
  id: 'haerte',
  title: 'Härtevergleich',
  subtitle: 'HRC, HB, HV und Zugfestigkeit umrechnen',
  color: '#b91c1c',
  icon: '<path d="M12 3l-4 7h8z"/><path d="M12 10v4"/><path d="M4 21h16"/><path d="M7 21c0-3 2-5 5-5s5 2 5 5"/>',
  keywords: ['Härte', 'HRC', 'HB', 'HBW', 'HV', 'HRB', 'Rockwell', 'Brinell', 'Vickers', 'Zugfestigkeit', 'Rm', 'ISO 18265', 'DIN 50150', 'Umwertung'],
  render,
  search,
};
