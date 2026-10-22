import { esc, fmt, num, options, table, result, formValues, steps } from '../../core/dom.js';
import { METRIC_COARSE, METRIC_FINE } from '../gewinde/data.js';
import { SCREW_SIZES, PROPERTY_CLASSES, FRICTION } from './data.js';
import { tighteningTorque, screwSize } from './calc.js';

const THREADS = [
  ...METRIC_COARSE.filter((t) => t.d >= 3).map((t) => [`${t.d}x${t.p}`, `M${fmt(t.d)}`]),
  ...METRIC_FINE.filter((t) => t.d >= 8).map((t) => [`${t.d}x${t.p}`, `M${fmt(t.d)}×${fmt(t.p)}`]),
];

function render(el, params, ctx) {
  const th = THREADS.some(([k]) => k === params.g) ? params.g : '12x1.75';
  const cls = PROPERTY_CLASSES.some((c) => c.key === params.k) ? params.k : '8.8';
  const mu = params.mu || '0.12';
  el.innerHTML = `
    <p class="lead">Anziehdrehmoment und Montagevorspannkraft nach VDI 2230 sowie Schlüsselweiten für Sechskant und Innensechskant.</p>
    <div class="grid-2">
      <form class="card" id="tq-form" autocomplete="off">
        <h2>Anziehdrehmoment</h2>
        <div class="grid">
          <label class="field"><span>Gewinde</span><select name="g">${options(THREADS, th)}</select></label>
          <label class="field"><span>Festigkeitsklasse</span><select name="k">${options(PROPERTY_CLASSES.map((c) => [c.key, c.note ? `${c.key} (${c.note})` : c.key]), cls)}</select></label>
          <label class="field adv"><span>Reibwert µ</span><select name="mu">${options(FRICTION.map((f) => [f.mu, f.label]), mu)}</select></label>
          <label class="field adv"><span>Ausnutzung Streckgrenze %</span><input name="nu" inputmode="decimal" value="${esc(params.nu || '90')}"></label>
        </div>
        <p class="note adv">Reibwert gilt für Gewinde und Kopfauflage gleichermaßen (µG = µK).</p>
      </form>
      <section class="card" id="tq-out" aria-live="polite"></section>
    </div>
    <section class="card adv"><h2 id="tq-table-title"></h2><div id="tq-table"></div></section>
    <section class="card adv"><h2>Schlüsselweiten (mm)</h2>
      ${table(['Gewinde', 'Sechskant ISO', 'Sechskant DIN (alt)', 'Innen-6kt ISO 4762', 'Senkkopf ISO 10642', 'Linsenkopf ISO 7380'],
        SCREW_SIZES.map((s) => [`<strong>M${fmt(s.d)}</strong>`, fmt(s.sw), s.swDin ? `<strong>${fmt(s.swDin)}</strong>` : fmt(s.sw), fmt(s.isk), fmt(s.isk10642), fmt(s.isk7380)]))}
      <p class="note">Bei M10, M12, M14 und M22 weichen alte DIN-Schlüsselweiten von ISO ab (fett markiert).</p>
    </section>`;

  const form = el.querySelector('#tq-form');
  const out = el.querySelector('#tq-out');

  function update() {
    const v = formValues(form);
    const [d, p] = v.g.split('x').map(Number);
    ctx.setParams({ g: v.g, k: v.k, mu: v.mu, nu: v.nu }, `M${fmt(d)}${METRIC_COARSE.some((t) => t.d === d && t.p === p) ? '' : `×${fmt(p)}`} · ${v.k}`);
    const mu = Number(v.mu);
    const nu = num(v.nu) / 100;
    const r = nu > 0 && nu <= 1 ? tighteningTorque({ d, p, cls: v.k, muG: mu, muK: mu, nu }) : null;
    if (!r) {
      out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Ausnutzung zwischen 1 und 100 % eingeben.</p>';
    } else {
      const s = screwSize(d);
      out.innerHTML = `<h2>M${fmt(d)}${METRIC_COARSE.some((t) => t.d === d && t.p === p) ? '' : `×${fmt(p)}`} · ${esc(v.k)}</h2>
        <div class="results">
          ${result('Anziehdrehmoment M<sub>A</sub>', fmt(r.MA, r.MA < 10 ? 1 : 0), 'Nm', true)}
          ${result('Montagevorspannkraft F<sub>M</sub>', fmt(r.FM / 1000, 1), 'kN')}
          ${s ? result('Schlüsselweite / Innen-6kt', `${fmt(s.sw)} / ${fmt(s.isk)}`, 'mm') : ''}
          <div class="adv">
          ${result('Spannungsquerschnitt A<sub>s</sub>', fmt(r.As, 1), 'mm²')}
          ${result('Streckgrenze R<sub>p0,2</sub>', fmt(r.rp), 'N/mm²')}
          </div>
        </div>
        ${steps([
          { title: 'Spannungsquerschnitt', formula: 'A<sub>s</sub> = π/4 · ((d₂ + d₃)/2)²', values: `A<sub>s</sub> = π/4 · ((${fmt(r.d2, 3)} + ${fmt(r.d3, 3)})/2)²`, result: `${fmt(r.As, 1)} mm²` },
          { title: 'Zulässige Montagevorspannung (Zug + Torsion)', formula: 'σ<sub>M</sub> = ν·R<sub>p0,2</sub> / √(1 + 3·[1,5·d₂/d₀·(P/(π·d₂) + 1,155·µ<sub>G</sub>)]²)', values: `σ<sub>M</sub> = ${fmt(r.nu)}·${fmt(r.rp)} / √(1 + 3·[1,5·${fmt(r.d2, 3)}/${fmt(r.d0, 3)}·(${fmt(r.p)}/(π·${fmt(r.d2, 3)}) + 1,155·${fmt(r.muG)})]²)`, result: `${fmt(r.sigmaM, 0)} N/mm²` },
          { title: 'Montagevorspannkraft', formula: 'F<sub>M</sub> = σ<sub>M</sub> · A<sub>s</sub>', values: `F<sub>M</sub> = ${fmt(r.sigmaM, 0)} · ${fmt(r.As, 1)}`, result: `${fmt(r.FM / 1000, 1)} kN` },
          { title: 'Anziehdrehmoment', formula: 'M<sub>A</sub> = F<sub>M</sub> · (0,16·P + 0,58·d₂·µ<sub>G</sub> + D<sub>Km</sub>/2·µ<sub>K</sub>)', values: `M<sub>A</sub> = ${fmt(r.FM, 0)} N · (0,16·${fmt(r.p)} + 0,58·${fmt(r.d2, 3)}·${fmt(r.muG)} + ${fmt(r.DKm, 2)}/2·${fmt(r.muK)}) mm`, result: `${fmt(r.MA, 1)} Nm` },
        ])}
        <p class="note">Richtwert für Schaftschrauben mit Kopfauflage ≈ Schlüsselweite und Durchgangsbohrung „mittel“.
          Drehmomentschlüssel streuen ±(3–5) %, Reibwerte deutlich mehr. Für sicherheitsrelevante Verbindungen eine vollständige VDI-2230-Rechnung machen.</p>`;
    }

    el.querySelector('#tq-table-title').textContent = `Tabelle Regelgewinde · µ = ${fmt(mu)} · ${fmt(nu * 100)} %`;
    const classes = ['8.8', '10.9', '12.9', 'A2-70', 'A4-80'];
    el.querySelector('#tq-table').innerHTML = table(['Gewinde', ...classes.map((c) => `${c} Nm`)],
      METRIC_COARSE.filter((t) => t.d >= 3 && t.d <= 36).map((t) => ({
        cls: t.d === d && t.p === p ? 'hl' : '',
        cells: [`<strong>M${fmt(t.d)}</strong>`, ...classes.map((c) => {
          const x = tighteningTorque({ d: t.d, p: t.p, cls: c, muG: mu, muK: mu, nu: nu || 0.9 });
          return x ? fmt(x.MA, x.MA < 10 ? 1 : 0) : '–';
        })],
      })));
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

function search(q) {
  // "Drehmoment M10", "SW 17", "Schlüsselweite 13"
  const sw = /^(?:sw|schl[uü]sselweite)\s*(\d+(?:[.,]\d+)?)$/i.exec(q.trim());
  if (sw) {
    const w = num(sw[1]);
    const hits = SCREW_SIZES.filter((s) => s.sw === w || s.swDin === w || s.isk === w);
    if (!hits.length) return [];
    return [{
      title: `Schlüsselweite ${fmt(w)}`, score: 95, params: {},
      html: `<ul class="list-plain">${hits.map((s) => `<li>M${fmt(s.d)}: ${[
        s.sw === w ? 'Sechskant ISO' : '', s.swDin === w ? 'Sechskant DIN (alt)' : '', s.isk === w ? 'Innensechskant ISO 4762' : '',
      ].filter(Boolean).join(', ')}</li>`).join('')}</ul>`,
    }];
  }
  const tq = /^(?:drehmoment|anzugsmoment|anziehdrehmoment)\s*M?\s*(\d+)$/i.exec(q.trim());
  if (tq) {
    const t = METRIC_COARSE.find((x) => x.d === Number(tq[1]));
    if (!t) return [];
    const rows = ['8.8', '10.9', '12.9'].map((c) => result(`${c}, µ 0,12`, fmt(tighteningTorque({ d: t.d, p: t.p, cls: c }).MA, 0), 'Nm'));
    return [{ title: `Anziehdrehmoment M${t.d}`, score: 98, params: { g: `${t.d}x${t.p}` }, html: `<div class="results">${rows.join('')}</div>` }];
  }
  return [];
}

export default {
  id: 'schrauben',
  title: 'Schlüsselweiten & Drehmomente',
  subtitle: 'Anziehdrehmoment nach VDI 2230, SW und Innensechskant',
  color: '#dc2626',
  icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  keywords: ['Drehmoment', 'Anziehdrehmoment', 'Anzugsmoment', 'Schlüsselweite', 'SW', 'Innensechskant', 'Inbus', 'Vorspannkraft', 'VDI 2230', 'Schraube', 'Festigkeitsklasse', '8.8', '10.9', '12.9'],
  render,
  search,
};
