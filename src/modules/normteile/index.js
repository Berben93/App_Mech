import { esc, fmt, num, options, result, table, formValues, steps } from '../../core/dom.js';
import { KEYS, KEY_LENGTHS, RINGS_SHAFT, RINGS_BORE, PINS, PIN_LENGTHS, WASHERS, ORING_SECTIONS, ORING_TYPES } from './data.js';
import { keyFor, ringFor, pinFor, washerFor, oringGroove } from './calc.js';

const TABS = [['oring', 'O-Ringe'], ['passfeder', 'Passfedern'], ['ring', 'Sicherungsringe'], ['stift', 'Zylinderstifte'], ['scheibe', 'Scheiben']];

const field = (name, label, value, attrs = 'inputmode="decimal"') => `<label class="field"><span>${label}</span><input name="${name}" ${attrs} value="${esc(value)}"></label>`;

/** Querschnitt einer O-Ring-Nut mit eingelegtem, verpresstem Ring. */
function oringGraphic(g, d2) {
  const sc = 90 / Math.max(g.width, d2 * 1.1);
  const W = 400;
  const H = 150;
  const bx = W / 2 - (g.width * sc) / 2;
  const by = 30;
  const depth = g.depth * sc;
  const width = g.width * sc;
  const r = (d2 * sc) / 2;
  const squashed = depth / 2;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="O-Ring in der Nut">
    <path d="M 30 ${by} L ${bx} ${by} L ${bx} ${by + depth} L ${bx + width} ${by + depth} L ${bx + width} ${by} L ${W - 30} ${by} L ${W - 30} ${by + depth + 40} L 30 ${by + depth + 40} Z" fill="color-mix(in srgb, var(--muted) 22%, transparent)" stroke="var(--text)" stroke-width="1.5"/>
    <line x1="30" x2="${W - 30}" y1="${by}" y2="${by}" stroke="var(--text)" stroke-width="3"/>
    <ellipse class="anim" cx="${bx + r + 2}" cy="${by + squashed}" rx="${Math.min(r * (r / squashed) ** 0.5, width / 2)}" ry="${squashed}" fill="color-mix(in srgb, var(--accent) 55%, transparent)" stroke="var(--accent)" stroke-width="2"/>
    <text x="${bx + width + 10}" y="${by + depth / 2 + 4}">t ${fmt(g.depth, 2)}</text>
    <text x="${bx + width / 2}" y="${by + depth + 18}" text-anchor="middle">b ${fmt(g.width, 1)}</text>
    <text class="muted" x="34" y="${by - 8}">Gegenfläche</text>
  </svg>`;
}

function render(el, params, ctx) {
  let tab = TABS.some(([k]) => k === params.v) ? params.v : 'oring';
  el.innerHTML = `
    <p class="lead">O-Ringe mit Nutmaßen, Passfedern, Sicherungsringe, Zylinderstifte und Unterlegscheiben.</p>
    <div class="seg" role="group" aria-label="Normteil">${TABS.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>
    <div id="nt-body"></div>`;
  const body = el.querySelector('#nt-body');

  function bind(update) {
    const form = body.querySelector('form');
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  const views = {
    oring() {
      body.innerHTML = `<div class="grid-2">
        <form class="card" autocomplete="off"><h2>Eingaben</h2>
          <div class="grid">
            <label class="field" style="grid-column:1/-1"><span>Einbau</span><select name="e">${options(ORING_TYPES.map((t) => [t.id, t.label]), params.e || 'kolben')}</select></label>
            <label class="field"><span>Bewegung</span><select name="b">${options([['stat', 'statisch'], ['dyn', 'dynamisch']], params.b || 'stat')}</select></label>
            ${field('s', 'Schnurstärke d₂ (mm)', params.s || '2.5', 'inputmode="decimal" list="nt-s"')}
            ${field('D', 'Bohrung bzw. Stange Ø (mm)', params.D || '40')}
            ${field('i', 'O-Ring Innen-Ø d₁ (mm)', params.i || '', 'inputmode="decimal" placeholder="optional"')}
          </div>
          <datalist id="nt-s">${ORING_SECTIONS.map((s) => `<option value="${s}">`).join('')}</datalist>
          <p class="note">Kolben: Ø der Bohrung eingeben, Nut sitzt im Kolben. Stange: Ø der Stange eingeben, Nut sitzt in der Bohrung. Bei axialem Einbau ist der Ø ohne Bedeutung.</p>
        </form>
        <section class="card" id="nt-out" aria-live="polite"></section>
      </div>
      <section class="card"><h2>Nutmaße je Schnurstärke (Richtwerte)</h2><div id="nt-table"></div>
        <p class="note">Verpressung radial statisch ≈ 20 %, dynamisch ≈ 12 %, axial ≈ 25 %; Nutfüllung unter 85 %. Kanten gratfrei mit Fase 15–20° anfahren. Für Drücke über 100 bar Stützringe vorsehen. Herstellerangaben haben Vorrang.</p></section>`;
      bind(() => {
        const v = formValues(body.querySelector('form'));
        const d2 = num(v.s);
        const D = num(v.D);
        const d1 = num(v.i);
        ctx.setParams({ v: tab, e: v.e, b: v.b, s: v.s, D: v.D, i: v.i }, `O-Ring ${v.D ? `Ø${v.D} ` : ''}× ${v.s}`);
        const g = oringGroove({ type: v.e, dyn: v.b === 'dyn', d2, D, d1 });
        const out = body.querySelector('#nt-out');
        if (!g) { out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Schnurstärke eingeben.</p>'; return; }
        out.innerHTML = `<h2>Nut für d₂ = ${fmt(d2)} mm</h2>${oringGraphic(g, d2)}
          <div class="results">
            ${result('Nuttiefe t', fmt(g.depth, 2), 'mm', true)}
            ${result('Nutbreite b', fmt(g.width, 1), 'mm')}
            ${g.grooveDia ? result(v.e === 'kolben' ? 'Nutgrund-Ø im Kolben' : 'Nut-Ø in der Bohrung', fmt(g.grooveDia, 2), 'mm') : ''}
            ${g.ringId ? result('Passender O-Ring Innen-Ø', `≈ ${fmt(v.e === 'kolben' ? g.ringId * 0.97 : g.ringId, 1)}`, 'mm') : ''}
            ${result('Verpressung', fmt(g.squeeze * 100, 0), '%')}
            ${result('Nutfüllung', fmt(g.fill * 100, 0), '%')}
            ${g.stretch !== undefined ? result(g.stretch >= 0 ? 'Dehnung Innen-Ø' : 'Stauchung Innen-Ø', fmt(Math.abs(g.stretch) * 100, 1), '%') : ''}
          </div>
          ${g.stretch !== undefined && (g.stretch > 0.06 || g.stretch < -0.03) ? '<p class="note warn-text">Dehnung über 6 % bzw. Stauchung über 3 % vermeiden: anderen Innen-Ø wählen.</p>' : ''}
          ${steps([
            { title: 'Nuttiefe', formula: 't = d₂ · (1 − Verpressung)', values: `t = ${fmt(d2)} · (1 − ${fmt(g.squeeze, 2)})`, result: `${fmt(g.depth, 2)} mm` },
            { title: 'Nutbreite', formula: `b ≈ ${fmt(ORING_TYPES.find((t) => t.id === v.e).width, 2)} · d₂`, values: `b ≈ ${fmt(ORING_TYPES.find((t) => t.id === v.e).width, 2)} · ${fmt(d2)}`, result: `${fmt(g.width, 1)} mm` },
            { title: 'Nutfüllung', formula: 'Füllung = (π · d₂² / 4) / (t · b)', values: `Füllung = (π · ${fmt(d2)}² / 4) / (${fmt(g.depth, 2)} · ${fmt(g.width, 1)})`, result: `${fmt(g.fill * 100, 0)} %` },
            g.grooveDia ? { title: v.e === 'kolben' ? 'Nutgrund-Ø' : 'Nut-Ø', formula: v.e === 'kolben' ? 'd<sub>N</sub> = D − 2 · t' : 'D<sub>N</sub> = d + 2 · t', values: `${fmt(D)} ${v.e === 'kolben' ? '−' : '+'} 2 · ${fmt(g.depth, 2)}`, result: `${fmt(g.grooveDia, 2)} mm` } : null,
          ])}`;
        body.querySelector('#nt-table').innerHTML = table(['d₂', 't radial stat.', 't radial dyn.', 't axial', 'b radial', 'b axial'],
          ORING_SECTIONS.map((s) => {
            const st = oringGroove({ type: 'kolben', dyn: false, d2: s });
            const dy = oringGroove({ type: 'kolben', dyn: true, d2: s });
            const ax = oringGroove({ type: 'axial', dyn: false, d2: s });
            return { cls: s === d2 ? 'hl' : '', cells: [`<strong>${fmt(s)}</strong>`, fmt(st.depth, 2), fmt(dy.depth, 2), fmt(ax.depth, 2), fmt(st.width, 1), fmt(ax.width, 1)] };
          }));
      });
    },

    passfeder() {
      body.innerHTML = `<div class="grid-2">
        <form class="card" autocomplete="off"><h2>Eingaben</h2>
          <div class="grid">${field('d', 'Wellen-Ø d (mm)', params.d || '30')}</div>
          <p class="note">Nuttoleranzen: Welle P9 (fest) oder N9 (normal), Nabe P9 (fest) oder JS9 (normal). Länge aus der Normreihe wählen.</p>
        </form>
        <section class="card" id="nt-out" aria-live="polite"></section>
      </div>
      <section class="card"><h2>Passfedern DIN 6885-1</h2>
        ${table(['Welle über … bis', 'b × h', 'Welle t₁', 'Nabe t₂'], KEYS.map((k) => ({ cells: [`${k.from} … ${k.to}`, `<strong>${k.b} × ${k.h}</strong>`, fmt(k.t1), fmt(k.t2)] })))}
        <p class="note">Längen: ${KEY_LENGTHS.join(', ')} mm.</p></section>`;
      bind(() => {
        const v = formValues(body.querySelector('form'));
        const d = num(v.d);
        ctx.setParams({ v: tab, d: v.d }, `Passfeder Welle Ø${v.d}`);
        const k = keyFor(d);
        body.querySelectorAll('tbody tr').forEach((tr, i) => tr.classList.toggle('hl', KEYS[i] === KEYS.find((x) => d > x.from && d <= x.to)));
        body.querySelector('#nt-out').innerHTML = k ? `<h2>Passfeder ${k.b} × ${k.h}</h2>
          <div class="results">
            ${result('Breite × Höhe', `${k.b} × ${k.h}`, 'mm', true)}
            ${result('Wellennuttiefe t₁', fmt(k.t1), 'mm')}
            ${result('Nabennuttiefe t₂', fmt(k.t2), 'mm')}
            ${result('Maß Wellennutgrund d − t₁', fmt(k.shaftGroove, 1), 'mm')}
            ${result('Maß Nabennutgrund d + t₂', fmt(k.hubGroove, 1), 'mm')}
            ${result('Nutbreite Welle / Nabe', `${k.b} P9 bzw. N9 / ${k.b} P9 bzw. JS9`)}
          </div>
          <p class="note">Bezeichnung z. B. „Passfeder DIN 6885 – A ${k.b} × ${k.h} × 40“. Tragende Länge bei Form A = l − b.</p>`
          : '<h2>Ergebnis</h2><p class="warn-text">Wellen-Ø zwischen 6 und 230 mm eingeben.</p>';
      });
    },

    ring() {
      body.innerHTML = `<div class="grid-2">
        <form class="card" autocomplete="off"><h2>Eingaben</h2>
          <div class="grid">
            <label class="field"><span>Art</span><select name="a">${options([['welle', 'Welle (DIN 471)'], ['bohrung', 'Bohrung (DIN 472)']], params.a || 'welle')}</select></label>
            ${field('d', 'Nenn-Ø d₁ (mm)', params.d || '20')}
          </div>
        </form>
        <section class="card" id="nt-out" aria-live="polite"></section>
      </div>
      <div class="grid-2">
        <section class="card"><h2>DIN 471 (Welle)</h2>${table(['d₁', 's', 'Nut-Ø d₂', 'm H13'], RINGS_SHAFT.map((r) => [`<strong>${fmt(r.d1)}</strong>`, fmt(r.s), fmt(r.d2), fmt(r.m)]))}</section>
        <section class="card"><h2>DIN 472 (Bohrung)</h2>${table(['d₁', 's', 'Nut-Ø d₂', 'm H13'], RINGS_BORE.map((r) => [`<strong>${fmt(r.d1)}</strong>`, fmt(r.s), fmt(r.d2), fmt(r.m)]))}</section>
      </div>`;
      bind(() => {
        const v = formValues(body.querySelector('form'));
        const d = num(v.d);
        ctx.setParams({ v: tab, a: v.a, d: v.d }, `Sicherungsring ${v.a === 'bohrung' ? 'DIN 472' : 'DIN 471'} ${v.d}`);
        const r = ringFor(d, v.a);
        body.querySelector('#nt-out').innerHTML = r ? `<h2>${v.a === 'bohrung' ? 'DIN 472' : 'DIN 471'} – ${fmt(r.d1)} × ${fmt(r.s)}</h2>
          <div class="results">
            ${result('Nut-Ø d₂', fmt(r.d2), 'mm', true)}
            ${result('Nutbreite m (H13)', fmt(r.m), 'mm')}
            ${result('Ringdicke s', fmt(r.s), 'mm')}
            ${result('Nuttiefe radial', fmt(Math.abs(r.d2 - r.d1) / 2, 2), 'mm')}
          </div>
          <p class="note">Abstand Nut zur Wellen- bzw. Bohrungskante mindestens 3 × Nuttiefe. Toleranz Nut-Ø: Welle h11 bis h12, Bohrung H11 bis H12.</p>`
          : '<h2>Ergebnis</h2><p class="warn-text">Diesen Durchmesser enthält die Tabelle nicht.</p>';
      });
    },

    stift() {
      body.innerHTML = `<div class="grid-2">
        <form class="card" autocomplete="off"><h2>Eingaben</h2>
          <div class="grid">
            <label class="field"><span>Stift-Ø d</span><select name="d">${options(PINS.map((p) => [p.d, `${fmt(p.d)} mm`]), params.d || '6')}</select></label>
            ${field('l', 'Länge l (mm)', params.l || '20')}
          </div>
        </form>
        <section class="card" id="nt-out" aria-live="polite"></section>
      </div>
      <section class="card"><h2>Zylinderstifte ISO 2338 / ISO 8734</h2>
        ${table(['d', 'Fase c ≈', 'l von', 'l bis'], PINS.map((p) => [`<strong>${fmt(p.d)}</strong>`, fmt(p.c), fmt(p.l[0]), fmt(p.l[1])]))}
        <p class="note">Längen: ${PIN_LENGTHS.join(', ')} mm. ISO 2338 ungehärtet m6 oder h8; ISO 8734 gehärtet m6. Mindesteinstecktiefe je Bauteil ≈ 1,5 × d.</p></section>`;
      bind(() => {
        const v = formValues(body.querySelector('form'));
        const d = num(v.d);
        const l = num(v.l);
        const p = pinFor(d);
        ctx.setParams({ v: tab, d: v.d, l: v.l }, `Zylinderstift ${v.d} × ${v.l}`);
        const inRange = p && l >= p.l[0] && l <= p.l[1];
        body.querySelector('#nt-out').innerHTML = `<h2>Zylinderstift ${fmt(d)} × ${fmt(l)}</h2>
          <div class="results">
            ${result('Aufnahmebohrung (Passung)', `${fmt(d)} H7`, '', true)}
            ${result('Passung mit Stift m6', `${fmt(d)} H7/m6 (Übergang, eingepresst)`)}
            ${result('Fase c ≈', fmt(p.c), 'mm')}
            ${result('Längen lieferbar', `${fmt(p.l[0])} … ${fmt(p.l[1])}`, 'mm')}
            ${result('Mindesteinstecktiefe ≈', fmt(1.5 * d, 1), 'mm')}
          </div>
          ${inRange ? '' : '<p class="note warn-text">Länge liegt außerhalb des genormten Bereichs.</p>'}
          ${PIN_LENGTHS.includes(l) || !inRange ? '' : `<p class="note">Nächste Normlänge: ${PIN_LENGTHS.find((x) => x >= l)} mm.</p>`}`;
      });
    },

    scheibe() {
      body.innerHTML = `<div class="grid-2">
        <form class="card" autocomplete="off"><h2>Eingaben</h2>
          <div class="grid"><label class="field"><span>Schraube</span><select name="d">${options(WASHERS.map((w) => [w.d, `M${fmt(w.d)}`]), params.d || '8')}</select></label></div>
        </form>
        <section class="card" id="nt-out" aria-live="polite"></section>
      </div>
      <section class="card"><h2>Flache Scheiben</h2>
        ${table(['Schraube', 'd₁', 'd₂ ISO 7089', 'h', 'd₂ ISO 7093', 'h'], WASHERS.map((w) => [`<strong>M${fmt(w.d)}</strong>`, fmt(w.n.d1), fmt(w.n.d2), fmt(w.n.h), w.l ? fmt(w.l.d2) : '–', w.l ? fmt(w.l.h) : '–']))}
        <p class="note">ISO 7089 entspricht DIN 125-A (ISO 7090 mit Fase). ISO 7093 ist die große Reihe (früher DIN 9021). Härteklasse 200 HV bis 8.8, 300 HV für 10.9.</p></section>`;
      bind(() => {
        const v = formValues(body.querySelector('form'));
        const w = washerFor(num(v.d));
        ctx.setParams({ v: tab, d: v.d }, `Scheibe M${v.d}`);
        body.querySelector('#nt-out').innerHTML = `<h2>Scheiben für M${fmt(w.d)}</h2>
          <div class="results">
            ${result('ISO 7089 d₁ × d₂ × h', `${fmt(w.n.d1)} × ${fmt(w.n.d2)} × ${fmt(w.n.h)}`, 'mm', true)}
            ${w.l ? result('ISO 7093 d₁ × d₂ × h', `${fmt(w.l.d1)} × ${fmt(w.l.d2)} × ${fmt(w.l.h)}`, 'mm') : ''}
          </div>`;
      });
    },
  };

  function show() {
    el.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === tab)));
    views[tab]();
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
  const t = q.trim().replace(',', '.');
  let m = /^(?:passfeder|din\s*6885)\s*(\d+(?:\.\d+)?)$/i.exec(t);
  if (m) {
    const k = keyFor(num(m[1]));
    if (!k) return [];
    return [{ title: `Passfeder für Welle Ø${m[1]}`, score: 95, params: { v: 'passfeder', d: m[1] },
      html: `<div class="results">${result('b × h', `${k.b} × ${k.h}`, 'mm', true)}${result('t₁ / t₂', `${fmt(k.t1)} / ${fmt(k.t2)}`, 'mm')}</div>` }];
  }
  m = /^(?:din\s*(471|472)|sicherungsring)\s*(\d+(?:\.\d+)?)$/i.exec(t);
  if (m) {
    const kind = m[1] === '472' ? 'bohrung' : 'welle';
    const r = ringFor(num(m[2]), kind);
    if (!r) return [];
    return [{ title: `Sicherungsring DIN ${kind === 'bohrung' ? 472 : 471} ${m[2]}`, score: 95, params: { v: 'ring', a: kind, d: m[2] },
      html: `<div class="results">${result('Nut-Ø d₂', fmt(r.d2), 'mm', true)}${result('Nutbreite m / Ring s', `${fmt(r.m)} / ${fmt(r.s)}`, 'mm')}</div>` }];
  }
  m = /^o-?ring\s*(?:(\d+(?:\.\d+)?)\s*[x×]\s*)?(\d+(?:\.\d+)?)$/i.exec(t);
  if (m) {
    const d2 = num(m[2]);
    const g = oringGroove({ type: 'kolben', dyn: false, d2 });
    return [{ title: `O-Ring-Nut d₂ ${fmt(d2)}`, score: 90, params: { v: 'oring', s: d2, i: m[1] || '' },
      html: `<div class="results">${result('Nuttiefe radial statisch', fmt(g.depth, 2), 'mm', true)}${result('Nutbreite', fmt(g.width, 1), 'mm')}</div>` }];
  }
  m = /^(?:scheibe|iso\s*7089|din\s*125)\s*m?\s*(\d+)$/i.exec(t);
  if (m) {
    const w = washerFor(num(m[1]));
    if (!w) return [];
    return [{ title: `Scheibe ISO 7089 M${m[1]}`, score: 95, params: { v: 'scheibe', d: m[1] },
      html: `<div class="results">${result('d₁ × d₂ × h', `${fmt(w.n.d1)} × ${fmt(w.n.d2)} × ${fmt(w.n.h)}`, 'mm', true)}</div>` }];
  }
  m = /^m\s*(\d+)$/i.exec(t);
  if (m) {
    const w = washerFor(num(m[1]));
    if (w) return [{ title: `Scheibe M${m[1]}`, text: `ISO 7089: ${fmt(w.n.d1)} × ${fmt(w.n.d2)} × ${fmt(w.n.h)} mm`, score: 55, params: { v: 'scheibe', d: m[1] } }];
  }
  return [];
}

export default {
  id: 'normteile',
  title: 'Normteile',
  subtitle: 'O-Ringe, Passfedern, Sicherungsringe, Stifte, Scheiben',
  color: '#c2410c',
  icon: '<circle cx="7" cy="7" r="4"/><circle cx="7" cy="7" r="1.5"/><rect x="13" y="4" width="8" height="5" rx="2"/><path d="M4 15h7v5H4zM15 13v8M19 13v8"/>',
  keywords: ['Normteile', 'O-Ring', 'Nutmaße', 'Dichtung', 'Passfeder', 'DIN 6885', 'Sicherungsring', 'Seegerring', 'DIN 471', 'DIN 472', 'Zylinderstift', 'Passstift', 'ISO 2338', 'ISO 8734', 'Scheibe', 'Unterlegscheibe', 'ISO 7089', 'DIN 125', 'ISO 7093'],
  render,
  search,
};
