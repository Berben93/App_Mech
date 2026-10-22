import { esc, fmt, fmtSigned, num, result, table, steps } from '../../core/dom.js';
import { chain, encodeLinks, decodeLinks, toLinks } from './calc.js';

const DEFAULT = [
  { dir: 1, n: '80', tol: '±0,1' },
  { dir: -1, n: '30', tol: 'h11' },
  { dir: -1, n: '20', tol: '0/-0,05' },
  { dir: -1, n: '28', tol: '±0,05' },
];

/** Maßkette als Pfeile: + nach rechts, − nach links; darunter das Schlussmaß. */
function chainGraphic(links, N) {
  const W = 400;
  const valid = links.filter((l) => l.ok);
  let pos = 0;
  let min = 0;
  let max = 0;
  const segs = valid.map((l) => {
    const a = pos;
    pos += l.dir * l.n;
    min = Math.min(min, pos);
    max = Math.max(max, pos);
    return { a, b: pos, l };
  });
  const span = Math.max(max - min, 1);
  const x = (v) => 20 + ((v - min) / span) * (W - 40);
  const rowH = 24;
  const H = segs.length * rowH + 60;
  const arrow = (x1, x2, y, cls) => `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${cls}" stroke-width="2"/>
    <path d="M ${x2} ${y} l ${x2 > x1 ? -7 : 7} -4 v 8 z" fill="${cls}"/><path d="M ${x1} ${y} l ${x2 > x1 ? 7 : -7} -4 v 8 z" fill="${cls}"/>`;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Maßkette">
    ${segs.map((s, i) => `${arrow(x(s.a), x(s.b), 20 + i * rowH, s.l.dir > 0 ? 'var(--accent)' : 'var(--warn)')}
      <line x1="${x(s.b)}" x2="${x(s.b)}" y1="${12 + i * rowH}" y2="${H - 22}" stroke="var(--line)" stroke-dasharray="3 3"/>
      <text x="${(x(s.a) + x(s.b)) / 2}" y="${15 + i * rowH}" text-anchor="middle" style="font-size:11px">${s.l.dir > 0 ? '+' : '−'}${fmt(s.l.n)}</text>`).join('')}
    <line x1="${x(0)}" x2="${x(0)}" y1="12" y2="${H - 22}" stroke="var(--line)" stroke-dasharray="3 3"/>
    ${N !== 0 ? arrow(x(0), x(N), H - 22, 'var(--text)') : ''}
    <text x="${Math.min(Math.max((x(0) + x(N)) / 2, 90), W - 90)}" y="${H - 6}" text-anchor="middle" font-weight="700">Schlussmaß ${fmt(N, 3)}</text>
  </svg>`;
}

function render(el, params, ctx) {
  let rows = decodeLinks(params.k) || DEFAULT.map((r) => ({ ...r }));
  el.innerHTML = `
    <p class="lead">Schlussmaß einer Maßkette nach dem arithmetischen (Höchst-/Mindestmaß) und dem statistischen Verfahren.</p>
    <div class="grid-2">
      <section class="card">
        <h2>Kettenglieder</h2>
        <div id="tk-rows"></div>
        <button type="button" class="btn secondary small" id="tk-add" style="margin-top:10px">+ Maß hinzufügen</button>
        <div class="grid adv" style="margin-top:14px">
          <label class="field"><span>Schlussmaß min (optional)</span><input id="tk-min" inputmode="decimal" value="${esc(params.min || '')}"></label>
          <label class="field"><span>Schlussmaß max (optional)</span><input id="tk-max" inputmode="decimal" value="${esc(params.max || '')}"></label>
        </div>
        <p class="note">+ vergrößert das Schlussmaß, − verkleinert es. Toleranz als „±0,1“, „+0,1/−0,05“, „0/−0,1“ oder ISO-Kurzzeichen wie „h7“, „H8“.</p>
      </section>
      <section class="card" id="tk-out" aria-live="polite"></section>
    </div>`;

  const list = el.querySelector('#tk-rows');
  const out = el.querySelector('#tk-out');

  function drawRows() {
    list.innerHTML = rows.map((r, i) => `<div class="chain-row" data-i="${i}">
        <button type="button" class="dir ${r.dir > 0 ? 'plus' : 'minus'}" data-act="dir" aria-label="Richtung umschalten">${r.dir > 0 ? '+' : '−'}</button>
        <label class="field"><span>Maß ${i + 1}</span><input data-k="n" inputmode="decimal" value="${esc(r.n)}"></label>
        <label class="field"><span>Toleranz</span><input data-k="tol" value="${esc(r.tol)}" autocapitalize="off" spellcheck="false"></label>
        <button type="button" class="icon-btn small" data-act="del" aria-label="Maß ${i + 1} entfernen"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>`).join('');
  }

  function update() {
    const lo = num(el.querySelector('#tk-min').value);
    const hi = num(el.querySelector('#tk-max').value);
    ctx.setParams({ k: encodeLinks(rows), min: el.querySelector('#tk-min').value, max: el.querySelector('#tk-max').value }, `Maßkette ${rows.length} Glieder`);
    const links = toLinks(rows);
    list.querySelectorAll('.chain-row').forEach((row, i) => row.classList.toggle('invalid', !links[i].ok));
    const bad = links.filter((l) => !l.ok);
    if (bad.length || !links.length) {
      out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">${links.length ? `Maß ${bad.map((b) => b.i).join(', ')}: Nennmaß oder Toleranz nicht lesbar.` : 'Mindestens ein Maß eingeben.'}</p>`;
      return;
    }
    const c = chain(links);
    const check = (min, max) => {
      if (!Number.isFinite(lo) && !Number.isFinite(hi)) return '';
      const ok = (!Number.isFinite(lo) || min >= lo - 1e-9) && (!Number.isFinite(hi) || max <= hi + 1e-9);
      return ` <span class="pill ${ok ? 'spiel' : 'uebermass'}">${ok ? 'erfüllt' : 'nicht erfüllt'}</span>`;
    };
    out.innerHTML = `<h2>Schlussmaß</h2>${chainGraphic(links, c.N)}
      <div class="results">
        ${result('Nennmaß N₀', fmt(c.N, 3), 'mm', true)}
      </div>
      <h3 class="sub">Arithmetisch (Worst Case)${check(c.arith.min, c.arith.max)}</h3>
      <div class="results">
        ${result('Abmaße', `${fmtSigned(c.arith.ES)} / ${fmtSigned(c.arith.EI)}`, 'mm')}
        ${result('Höchst- / Mindestmaß', `${fmt(c.arith.max, 3)} / ${fmt(c.arith.min, 3)}`, 'mm')}
        ${result('Toleranz T₀', fmt(c.arith.T, 3), 'mm')}
      </div>
      <div class="adv">
      <h3 class="sub">Statistisch (quadratisch)${check(c.stat.min, c.stat.max)}</h3>
      <div class="results">
        ${result('Abmaße', `${fmtSigned(c.stat.ES)} / ${fmtSigned(c.stat.EI)}`, 'mm')}
        ${result('Höchst- / Mindestmaß', `${fmt(c.stat.max, 3)} / ${fmt(c.stat.min, 3)}`, 'mm')}
        ${result('Toleranz T<sub>s</sub>', fmt(c.stat.T, 3), 'mm')}
      </div>
      ${table(['Nr.', 'Richtung', 'Nennmaß', 'Abmaße', 'T'], links.map((l) => [String(l.i), l.dir > 0 ? '+' : '−', fmt(l.n, 3), `${fmtSigned(l.es)} / ${fmtSigned(l.ei)}${l.iso ? ` (${esc(l.iso)})` : ''}`, fmt(l.es - l.ei, 3)]))}
      </div>
      ${steps([
        { title: 'Nennmaß', formula: 'N₀ = Σ N<sub>+</sub> − Σ N<sub>−</sub>', values: `N₀ = ${links.map((l) => `${l.dir > 0 ? '+' : '−'} ${fmt(l.n, 3)}`).join(' ').replace(/^\+ /, '')}`, result: `${fmt(c.N, 3)} mm` },
        { title: 'Oberes Abmaß (arithmetisch)', formula: 'ES₀ = Σ ES<sub>+</sub> − Σ EI<sub>−</sub>', values: `ES₀ = ${links.map((l) => (l.dir > 0 ? `+ (${fmtSigned(l.es)})` : `− (${fmtSigned(l.ei)})`)).join(' ').replace(/^\+ /, '')}`, result: `${fmtSigned(c.arith.ES)} mm` },
        { title: 'Unteres Abmaß (arithmetisch)', formula: 'EI₀ = Σ EI<sub>+</sub> − Σ ES<sub>−</sub>', values: `EI₀ = ${links.map((l) => (l.dir > 0 ? `+ (${fmtSigned(l.ei)})` : `− (${fmtSigned(l.es)})`)).join(' ').replace(/^\+ /, '')}`, result: `${fmtSigned(c.arith.EI)} mm` },
        { title: 'Statistische Toleranz', formula: 'T<sub>s</sub> = √(Σ T<sub>i</sub>²)', values: `T<sub>s</sub> = √(${links.map((l) => `${fmt(l.es - l.ei, 3)}²`).join(' + ')})`, result: `${fmt(c.stat.T, 3)} mm` },
        { title: 'Lage der Toleranzmitte', formula: 'C₀ = Σ ± (ES<sub>i</sub> + EI<sub>i</sub>)/2', values: `Abmaße = C₀ ± T<sub>s</sub>/2 = ${fmtSigned(c.stat.C)} ± ${fmt(c.stat.T / 2, 4)}`, result: `${fmtSigned(c.stat.ES)} / ${fmtSigned(c.stat.EI)} mm` },
      ])}
      <p class="note adv">Statistisch gilt bei vielen, unabhängig gefertigten Maßen mit normalverteilten Istmaßen (≈ 99,73 % innerhalb). Bei wenigen Gliedern oder Einzelfertigung arithmetisch rechnen.</p>`;
  }

  list.addEventListener('input', (e) => {
    const row = e.target.closest('.chain-row');
    if (!row || !e.target.dataset.k) return;
    rows[Number(row.dataset.i)][e.target.dataset.k] = e.target.value;
    update();
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = Number(b.closest('.chain-row').dataset.i);
    if (b.dataset.act === 'dir') rows[i].dir *= -1;
    else if (rows.length > 1) rows.splice(i, 1);
    drawRows();
    update();
  });
  el.querySelector('#tk-add').addEventListener('click', () => {
    rows.push({ dir: -1, n: '10', tol: '±0,05' });
    drawRows();
    update();
    list.querySelector('.chain-row:last-child input')?.focus();
  });
  el.querySelector('#tk-min').addEventListener('input', update);
  el.querySelector('#tk-max').addEventListener('input', update);
  drawRows();
  update();
}

export default {
  id: 'toleranzketten',
  title: 'Toleranzketten',
  subtitle: 'Maßketten arithmetisch und statistisch',
  color: '#4f46e5',
  icon: '<path d="M3 8h18M3 16h12"/><path d="M3 5v6M21 5v6M3 13v6M15 13v6"/>',
  keywords: ['Toleranzkette', 'Maßkette', 'Schlussmaß', 'Toleranzrechnung', 'Worst Case', 'statistisch', 'RSS', 'Toleranzanalyse', 'Spiel'],
  render,
};
