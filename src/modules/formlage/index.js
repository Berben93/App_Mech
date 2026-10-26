import { esc, fmt, num, result, table, formValues, steps, smooth } from '../../core/dom.js';
import { SYMBOLS, CATEGORIES, MODIFIERS } from './data.js';
import { positionDeviation, findSymbol } from './calc.js';

const icon = (s, size = 40) => `<svg class="gdt-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${s.svg}</svg>`;

/** Toleranzrahmen zur Ansicht: Symbol | Wert | Bezüge. */
function frame(s, value = '0,05', datums = s.datum ? ['A'] : []) {
  const cells = [icon(s, 22), `<span>${esc(value)}</span>`, ...datums.map((d) => `<span>${esc(d)}</span>`)];
  return `<span class="gdt-frame">${cells.map((c) => `<span class="cell">${c}</span>`).join('')}</span>`;
}

function detail(s) {
  return `<div class="gdt-head">${icon(s, 56)}<div><h2 style="margin:0">${esc(s.name)}</h2>
      <p class="note" style="margin:4px 0 0">${esc(CATEGORIES.find((c) => c.id === s.cat).name)} · ${s.datum ? 'mit Bezug' : 'ohne Bezug'}</p></div></div>
    <p>${esc(s.text)}</p>
    <div class="results">
      ${result('Toleranzrahmen', frame(s, s.id === 'position' || s.id === 'koaxialitaet' ? 'Ø0,05' : '0,05'))}
    </div>
    <h3 class="sub">Toleranzzone</h3><p>${esc(s.zone)}</p>
    <h3 class="sub">Prüfhinweis</h3><p>${esc(s.check)}</p>
    <p class="note">Beispiel: ${esc(s.example.replace(/^\S+\s/, ""))}</p>`;
}

function render(el, params, ctx) {
  let sel = SYMBOLS.find((s) => s.id === params.s) || SYMBOLS[0];
  el.innerHTML = `
    <p class="lead">Alle Symbole nach DIN EN ISO 1101 mit Erklärung, Toleranzzone und Prüfhinweis. Symbol antippen.</p>
    <div class="grid-2">
      <section class="card" id="gd-detail" aria-live="polite"></section>
      <section class="card"><h2>Symbole</h2>
        ${CATEGORIES.map((c) => `<h3 class="sub">${esc(c.name)} <small class="note">${esc(c.note)}</small></h3>
          <div class="gdt-grid">${SYMBOLS.filter((s) => s.cat === c.id).map((s) => `<button type="button" class="gdt-btn" data-s="${s.id}">${icon(s, 30)}<span>${esc(s.name)}</span></button>`).join('')}</div>`).join('')}
      </section>
    </div>
    <div class="grid-2 adv">
      <form class="card" id="gd-pos" autocomplete="off">
        <h2>Positionstoleranz prüfen</h2>
        <div class="grid">
          <label class="field"><span>Abweichung Δx (mm)</span><input name="dx" inputmode="decimal" value="${esc(params.dx || '0.02')}"></label>
          <label class="field"><span>Abweichung Δy (mm)</span><input name="dy" inputmode="decimal" value="${esc(params.dy || '0.015')}"></label>
          <label class="field"><span>Positionstoleranz Ø t</span><input name="t" inputmode="decimal" value="${esc(params.t || '0.05')}"></label>
          <label class="field"><span>Bohrung MMR-Ø (optional)</span><input name="mmc" inputmode="decimal" value="${esc(params.mmc || '')}" placeholder="z. B. 8,0"></label>
          <label class="field"><span>Bohrung Ist-Ø (optional)</span><input name="ist" inputmode="decimal" value="${esc(params.ist || '')}" placeholder="z. B. 8,03"></label>
        </div>
        <div id="gd-pos-out" aria-live="polite" style="margin-top:10px"></div>
      </form>
      <section class="card"><h2>Zusatzzeichen</h2>
        ${table(['Zeichen', 'Bedeutung'], MODIFIERS.map((m) => [`<strong class="gdt-sym">${esc(m.sym)}</strong>`, `<strong>${esc(m.name)}</strong><br><small>${esc(m.text)}</small>`]), 'wrap')}
      </section>
    </div>`;

  const det = el.querySelector('#gd-detail');
  const form = el.querySelector('#gd-pos');

  function update() {
    const v = formValues(form);
    ctx.setParams({ s: sel.id, ...v }, sel.name);
    el.querySelectorAll('.gdt-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === sel.id)));
    det.innerHTML = detail(sel);
    const p = positionDeviation({ dx: num(v.dx) || 0, dy: num(v.dy) || 0, tol: num(v.t) || 0, mmc: num(v.mmc), actual: num(v.ist) });
    form.querySelector('#gd-pos-out').innerHTML = `<div class="results">
        ${result('Positionsabweichung Ø', fmt(p.dev, 4), 'mm', true)}
        ${p.bonus ? result('Zusatztoleranz aus MMR', fmt(p.bonus, 3), 'mm') : ''}
        ${result('Zulässig', fmt(p.allowed, 3), 'mm')}
        ${result('Ergebnis', `<span class="pill ${p.ok ? 'spiel' : 'uebermass'}">${p.ok ? 'in Ordnung' : 'nicht in Ordnung'}</span>`)}
      </div>
      ${steps([
        { title: 'Positionsabweichung', formula: 'Ø = 2 · √(Δx² + Δy²)', values: `Ø = 2 · √(${fmt(num(v.dx) || 0, 4)}² + ${fmt(num(v.dy) || 0, 4)}²)`, result: `${fmt(p.dev, 4)} mm` },
        p.bonus ? { title: 'Zulässige Toleranz mit Ⓜ', formula: 't<sub>zul</sub> = t + (Ist-Ø − MMR-Ø)', values: `t<sub>zul</sub> = ${fmt(num(v.t))} + (${fmt(num(v.ist), 3)} − ${fmt(num(v.mmc), 3)})`, result: `${fmt(p.allowed, 3)} mm` } : null,
      ])}`;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('.gdt-btn');
    if (!b) return;
    sel = SYMBOLS.find((s) => s.id === b.dataset.s);
    update();
    if (window.matchMedia('(max-width: 700px)').matches) det.scrollIntoView({ behavior: smooth(), block: 'start' });
  });
  form.addEventListener('input', update);
  update();
}

function search(q) {
  return findSymbol(q).slice(0, 3).map((s, i) => ({
    title: s.name,
    text: s.text,
    params: { s: s.id },
    score: 80 - i,
    html: i === 0 ? `<p>${esc(s.text)}</p><p class="note"><strong>Prüfen:</strong> ${esc(s.check)}</p>` : undefined,
  }));
}

export default {
  id: 'formlage',
  title: 'Form & Lage',
  subtitle: 'GD&T-Symbole mit Erklärung und Prüfhinweis',
  color: '#0f766e',
  icon: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M9 7v10M15 7v10"/><circle cx="5.5" cy="12" r="2"/><path d="M11 13.5l2-3"/>',
  keywords: ['Form- und Lagetoleranz', 'GD&T', 'ISO 1101', 'Geradheit', 'Ebenheit', 'Rundheit', 'Zylinderform', 'Parallelität', 'Rechtwinkligkeit', 'Neigung', 'Position', 'Koaxialität', 'Symmetrie', 'Rundlauf', 'Planlauf', 'Bezug', 'Toleranzrahmen', 'MMR'],
  render,
  search,
};
