import { esc, fmt, result, table, smooth } from '../../core/dom.js';
import { textOn } from '../../core/contrast.js';
import { MATERIALS, GROUPS, MACH_LABEL } from './data.js';
import { findMaterial, searchMaterials } from './calc.js';
import { ISO_GROUPS } from '../schnittwerte/data.js';
import { MATERIALS as WEIGHT_MATERIALS } from '../gewicht/data.js';

const WELD_CLASS = { gut: 'spiel', bedingt: 'uebergang', schlecht: 'uebermass' };

function isoPill(iso) {
  return `<span class="pill" style="background:${ISO_GROUPS[iso].color};color:${textOn(ISO_GROUPS[iso].color)}" title="ISO-Gruppe ${iso}: ${esc(ISO_GROUPS[iso].name)}">${iso}</span>`;
}

function stars(n) {
  return `<span class="rating" role="img" aria-label="${MACH_LABEL[n]}" title="${MACH_LABEL[n]}">${'●'.repeat(n)}<span class="off">${'●'.repeat(5 - n)}</span></span>`;
}

/** Steckbrief eines Werkstoffs (Modul und Suche). */
function card(m) {
  return `<div class="results">
      ${result('Werkstoffnummer', esc(m.wnr), '', true)}
      ${result('Kurzname (EN)', esc(m.name))}
      ${result('Alte Bezeichnung', esc(m.old))}
      ${result('AISI / ASTM / UNS', esc(m.aisi))}
      ${result('Zugfestigkeit R<sub>m</sub>', esc(m.rm), 'N/mm²')}
      ${result('Zerspanbarkeit', `${stars(m.mach)} ${MACH_LABEL[m.mach]}`)}
      ${result('Schweißeignung', `<span class="pill ${WELD_CLASS[m.weld]}">${m.weld}</span>`)}
      <div class="adv">
      ${result('Zustand', esc(m.state))}
      ${result('Streckgrenze R<sub>e</sub> / R<sub>p0,2</sub>', esc(m.re), m.re === '–' ? '' : 'N/mm²')}
      ${result('Härte', esc(m.hb))}
      ${result('Dichte', fmt(m.rho, 2), 'g/cm³')}
      ${result('ISO-Gruppe', `${isoPill(m.iso)} ${esc(ISO_GROUPS[m.iso].name)}`)}
      </div>
    </div>
    <p class="note">${esc(m.use)}</p>`;
}

function render(el, params, ctx) {
  let group = GROUPS.some((g) => g.id === params.g) ? params.g : '';
  let filter = params.q || '';
  let sel = findMaterial(params.w) || MATERIALS.find((m) => m.wnr === '1.4301');

  el.innerHTML = `
    <p class="lead">Werkstoffnummer, DIN/EN- und AISI-Bezeichnung, Festigkeit, Zerspanbarkeit und Schweißeignung. Zeile antippen für den Steckbrief.</p>
    <div class="grid-2">
      <section class="card" id="ws-detail" aria-live="polite"></section>
      <section class="card">
        <h2>Werkstoffe</h2>
        <label class="field"><span>Filter (Nummer, Name, AISI)</span><input id="ws-filter" type="search" value="${esc(filter)}" placeholder="z. B. 1.7225, 4140, Messing"></label>
        <div class="chips" id="ws-groups" style="margin:10px 0">
          <button type="button" class="chip" data-g="">Alle</button>
          ${GROUPS.map((g) => `<button type="button" class="chip" data-g="${g.id}">${esc(g.name)}</button>`).join('')}
        </div>
        <div id="ws-table"></div>
      </section>
    </div>
    <section class="card adv"><h2>Legende</h2>
      <p class="note" style="margin-top:0">Zerspanbarkeit: ●●●●● sehr gut (Automatenstahl, Messing) bis ●○○○○ schlecht (Nickelbasis, Titan, zähe austenitische Stähle).
      Schweißeignung „bedingt“: Vorwärmen, geeignete Zusatzwerkstoffe oder Wärmenachbehandlung nötig. „schlecht“: Schwefel/Blei, hoher Kohlenstoff oder Aushärtung.
      Festigkeiten sind Normwerte für den genannten Zustand und Abmessungsbereich; für Abnahmen gilt das Werkszeugnis.</p></section>`;

  const detail = el.querySelector('#ws-detail');

  function list() {
    let rows = filter.trim() ? searchMaterials(filter) : MATERIALS;
    if (group) rows = rows.filter((m) => m.group === group);
    return rows;
  }

  function update() {
    ctx.setParams({ w: sel.wnr, g: group, q: filter }, `${sel.wnr} ${sel.name}`);
    el.querySelectorAll('#ws-groups .chip').forEach((c) => c.classList.toggle('active', c.dataset.g === group));
    const rows = list();
    el.querySelector('#ws-table').innerHTML = rows.length
      ? table(['WNr', 'Kurzname', 'AISI', 'Rm', 'Zerspan.', 'Schweißen'], rows.map((m) => ({
        cls: m.wnr === sel.wnr ? 'hl' : '',
        cells: [`<strong>${esc(m.wnr)}</strong>`, esc(m.name), esc(m.aisi), esc(m.rm), stars(m.mach), esc(m.weld)],
      })))
      : '<p class="empty">Kein Werkstoff passt zum Filter.</p>';
    el.querySelectorAll('#ws-table tbody tr').forEach((tr, i) => { tr.dataset.go = rows[i].wnr; });
    const weight = WEIGHT_MATERIALS.find((w) => w.wnr === sel.wnr);
    detail.innerHTML = `<h2>${esc(sel.wnr)} · ${esc(sel.name)}</h2>${card(sel)}
      <div class="chips">
        <a class="chip" href="#/m/schnittwerte?w=${sel.cut}">Schnittwerte →</a>
        ${weight ? `<a class="chip" href="#/m/gewicht?w=${encodeURIComponent(weight.id)}">Gewicht rechnen →</a>` : ''}
        <a class="chip" href="#/m/haerte?x=${parseInt(sel.rm.replace(/[^\d–]/g, '').split('–')[0], 10) || 500}&s=Rm">Härte umrechnen →</a>
      </div>`;
  }

  el.querySelector('#ws-filter').addEventListener('input', (e) => { filter = e.target.value; update(); });
  el.querySelector('#ws-groups').addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (!b) return;
    group = b.dataset.g;
    update();
  });
  el.querySelector('#ws-table').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-go]');
    if (!tr) return;
    sel = findMaterial(tr.dataset.go);
    update();
    if (window.matchMedia('(max-width: 700px)').matches) detail.scrollIntoView({ behavior: smooth(), block: 'start' });
  });
  update();
}

function search(q) {
  return searchMaterials(q).filter((m) => m.score >= 70).slice(0, 4).map((m, i) => ({
    title: `${m.wnr} · ${m.name}`,
    text: `${m.aisi} · Rm ${m.rm} N/mm² · Zerspanbarkeit ${MACH_LABEL[m.mach]}`,
    params: { w: m.wnr },
    score: m.score - i,
    html: i === 0 && m.score >= 95 ? card(m) : undefined,
  }));
}

export default {
  id: 'werkstoffe',
  title: 'Werkstoffe',
  subtitle: 'WNr, DIN, AISI, Festigkeit, Zerspanbarkeit, Schweißen',
  color: '#475569',
  icon: '<path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/>',
  keywords: ['Werkstoff', 'Werkstoffnummer', 'WNr', 'Stahl', 'AISI', 'DIN', 'EN', 'Festigkeit', 'Zerspanbarkeit', 'Schweißbarkeit', 'Edelstahl', 'Aluminium', 'Messing', 'Titan', 'Inconel', 'Guss', 'V2A', 'V4A'],
  render,
  search,
};
