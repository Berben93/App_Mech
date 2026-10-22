import { esc, fmt, num, result, table, formValues, steps } from '../../core/dom.js';
import { N_CLASSES, PROCESSES } from './data.js';
import { theoreticalRoughness, maxFeedForRa, maxFeedForRz, nClassFor } from './calc.js';

const RADII = ['0.2', '0.4', '0.8', '1.2', '1.6', '2.4'];

/** Balken je Verfahren auf logarithmischer Ra-Achse; das gesuchte Ra wird markiert. */
function processChart(mark) {
  const min = Math.log10(0.02);
  const max = Math.log10(60);
  const W = 400;
  const left = 110;
  const x = (ra) => left + ((Math.log10(ra) - min) / (max - min)) * (W - left - 10);
  const rowH = 18;
  const H = PROCESSES.length * rowH + 30;
  const ticks = [0.025, 0.1, 0.4, 1.6, 6.3, 25];
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Erreichbare Rauheit je Verfahren">
    ${ticks.map((t) => `<line class="axis" x1="${x(t)}" x2="${x(t)}" y1="0" y2="${H - 22}" stroke-dasharray="2 3" stroke-width="1"/>
      <text class="muted" x="${x(t)}" y="${H - 8}" text-anchor="middle">${fmt(t)}</text>`).join('')}
    ${PROCESSES.map((p, i) => {
      const y = i * rowH + 4;
      const hit = mark && mark >= p.ra[0] && mark <= p.ra[1];
      return `<text x="${left - 6}" y="${y + 11}" text-anchor="end"${hit ? ' font-weight="700"' : ' class="muted"'}>${esc(p.name)}</text>
        <rect x="${x(p.ra[0])}" y="${y}" width="${x(p.ra[1]) - x(p.ra[0])}" height="${rowH - 6}" rx="4"
          fill="var(--accent)" opacity="${hit ? 0.9 : 0.35}"/>`;
    }).join('')}
    ${mark ? `<line x1="${x(mark)}" x2="${x(mark)}" y1="0" y2="${H - 22}" stroke="var(--bad)" stroke-width="2"/>` : ''}
  </svg>`;
}

function render(el, params, ctx) {
  el.innerHTML = `
    <p class="lead">Rauheitsklassen, erreichbare Werte je Verfahren und die theoretische Rauheit beim Drehen.</p>
    <div class="grid-2">
      <form class="card" id="ra-form" autocomplete="off">
        <h2>Drehen: Vorschub und Eckenradius</h2>
        <div class="grid">
          <label class="field"><span>Vorschub f (mm/U)</span><input name="f" inputmode="decimal" value="${esc(params.f || '0.15')}"></label>
          <label class="field"><span>Eckenradius r (mm)</span><input name="r" inputmode="decimal" list="radii" value="${esc(params.r || '0.8')}"></label>
          <label class="field"><span>Gefordert Ra (µm)</span><input name="ra" inputmode="decimal" value="${esc(params.ra || '1.6')}"></label>
        </div>
        <datalist id="radii">${RADII.map((r) => `<option value="${r}">`).join('')}</datalist>
        <div class="results" id="ra-out" aria-live="polite" style="margin-top:10px"></div>
        <p class="note adv">R<sub>th</sub> = f²/(8·r) ≈ Rz; Ra ≈ f²/(31,2·r). In der Praxis liegt die Rauheit wegen Verschleiß und Schwingungen etwas höher.</p>
      </form>
      <section class="card adv"><h2>Erreichbare Rauheit Ra (µm)</h2><div id="ra-chart"></div></section>
    </div>
    <section class="card adv"><h2>Rauheitsklassen ISO 1302</h2><div id="ra-table"></div>
      <p class="note">Rz lässt sich nicht exakt aus Ra umrechnen. Als grober Anhalt gilt Rz ≈ 4 bis 7 × Ra.</p></section>`;

  const form = el.querySelector('#ra-form');

  function update() {
    const v = formValues(form);
    ctx.setParams(v, `f ${v.f} · r ${v.r}`);
    const f = num(v.f);
    const r = num(v.r);
    const ra = num(v.ra);
    const th = theoreticalRoughness(f, r);
    const fmax = maxFeedForRa(ra, r);
    const cls = th ? nClassFor(th.Ra) : null;
    el.querySelector('#ra-out').innerHTML = th
      ? `${result('Ra theoretisch', fmt(th.Ra, 2), 'µm', true)}
         ${result('R<sub>th</sub> (≈ Rz)', fmt(th.Rth, 2), 'µm')}
         ${result('Klasse', cls ? `${cls.n} (Ra ${fmt(cls.ra)})` : '–')}
         ${fmax ? result(`Max. Vorschub für Ra ${fmt(ra)}`, fmt(fmax, 3), 'mm/U') : ''}
         ${fmax ? `<div class="adv">${result(`Max. Vorschub für Rz ${fmt(ra * 6)} (≈ 6·Ra)`, fmt(maxFeedForRz(ra * 6, r), 3), 'mm/U')}</div>` : ''}
         ${steps([
           { title: 'Theoretische Rautiefe', formula: 'R<sub>th</sub> = f² / (8·r) · 1000', values: `R<sub>th</sub> = ${fmt(f)}² / (8·${fmt(r)}) · 1000`, result: `${fmt(th.Rth, 2)} µm` },
           { title: 'Mittenrauwert', formula: 'Ra ≈ f² / (31,2·r) · 1000', values: `Ra ≈ ${fmt(f)}² / (31,2·${fmt(r)}) · 1000`, result: `${fmt(th.Ra, 2)} µm` },
           fmax ? { title: `Größter Vorschub für Ra ${fmt(ra)} µm`, formula: 'f = √(Ra · 31,2 · r / 1000)', values: `f = √(${fmt(ra)} · 31,2 · ${fmt(r)} / 1000)`, result: `${fmt(fmax, 3)} mm/U` } : null,
         ])}`
      : '<p class="warn-text">Vorschub und Radius eingeben.</p>';
    el.querySelector('#ra-chart').innerHTML = processChart(ra > 0 ? ra : null);
    el.querySelector('#ra-table').innerHTML = table(['Klasse', 'Ra µm', 'Rz ≈ µm', 'Ra µinch', 'Typisch'],
      N_CLASSES.map((c) => ({
        cls: ra > 0 && nClassFor(ra) === c ? 'hl' : '',
        cells: [`<strong>${c.n}</strong>`, fmt(c.ra), `${fmt(c.ra * 4, 1)} … ${fmt(c.ra * 7, 1)}`, fmt(Math.round(c.ra * 39.37)),
          esc(PROCESSES.filter((p) => c.ra >= p.ra[0] && c.ra <= p.ra[1]).slice(-3).map((p) => p.name).join(', '))],
      })));
  }

  form.addEventListener('input', update);
  update();
}

function search(q) {
  const m = /^(?:(ra|rz)\s*)?(\d+(?:[.,]\d+)?)$|^(N\d{1,2})$/i.exec(q.trim());
  if (!m) return [];
  if (m[3]) {
    const c = N_CLASSES.find((x) => x.n.toLowerCase() === m[3].toLowerCase());
    if (!c) return [];
    return [{ title: `Rauheitsklasse ${c.n}`, score: 90, params: { ra: c.ra },
      html: `<div class="results">${result('Ra', fmt(c.ra), 'µm', true)}${result('Rz ≈', `${fmt(c.ra * 4, 1)} … ${fmt(c.ra * 7, 1)}`, 'µm')}</div>` }];
  }
  if (!m[1]) return [];
  const value = num(m[2]);
  const ra = m[1].toLowerCase() === 'ra' ? value : value / 6;
  const c = nClassFor(ra);
  const procs = PROCESSES.filter((p) => ra >= p.ra[0] && ra <= p.ra[1]).map((p) => p.name);
  return [{
    title: `${m[1].toUpperCase() === 'RA' ? 'Ra' : 'Rz'} ${fmt(value)} µm`, score: 90, params: { ra: Math.round(ra * 100) / 100 },
    html: `<div class="results">
      ${m[1].toLowerCase() === 'ra' ? result('Rz ≈', `${fmt(value * 4, 1)} … ${fmt(value * 7, 1)}`, 'µm') : result('Ra ≈', `${fmt(value / 7, 2)} … ${fmt(value / 4, 2)}`, 'µm')}
      ${c ? result('Klasse', c.n) : ''}
      ${result('Max. Vorschub bei r 0,8', fmt(maxFeedForRa(ra, 0.8), 3), 'mm/U')}
    </div><p class="note">Erreichbar z. B. mit: ${esc(procs.join(', ') || '–')}</p>`,
  }];
}

export default {
  id: 'rauheit',
  title: 'Rauheit',
  subtitle: 'Ra, Rz, N-Klassen und Vorschub beim Drehen',
  color: '#a16207',
  icon: '<path d="M3 16l2-4 2 3 2-6 2 5 2-3 2 4 2-5 2 4 2-2"/><path d="M3 20h18"/>',
  keywords: ['Rauheit', 'Oberfläche', 'Ra', 'Rz', 'Rauhtiefe', 'Mittenrauwert', 'ISO 1302', 'N-Klasse', 'Oberflächengüte', 'Eckenradius'],
  render,
  search,
};
