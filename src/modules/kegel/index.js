import { esc, fmt, num, options, result, table, formValues, steps } from '../../core/dom.js';
import { MORSE, TAPERS, SINE_BARS } from './data.js';
import { cone, tailstockOffset, rightTriangle, boltCircle, sineBar, gaugeBlocks } from './calc.js';

const TABS = [['kegel', 'Kegel'], ['dreieck', 'Steigungsdreieck'], ['lochkreis', 'Lochkreis'], ['sinus', 'Sinuslineal']];
const field = (name, label, value, extra = '', cls = '') => `<label class="field${cls ? ` ${cls}` : ''}"><span>${label}</span><input name="${name}" inputmode="decimal" value="${esc(value ?? '')}" ${extra}></label>`;
const deg = (v) => {
  const d = Math.floor(v + 1e-9);
  const m = (v - d) * 60;
  return `${fmt(v, 4)}° = ${d}° ${fmt(m, 2)}′`;
};

function coneGraphic(D, d, L) {
  const W = 400;
  const H = 170;
  const sc = Math.min(300 / L, 120 / D);
  const x0 = (W - L * sc) / 2;
  const cy = H / 2;
  const R = (D * sc) / 2;
  const r = (d * sc) / 2;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kegel">
    <path class="anim" d="M ${x0} ${cy - R} L ${x0 + L * sc} ${cy - r} L ${x0 + L * sc} ${cy + r} L ${x0} ${cy + R} Z" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" stroke-width="2"/>
    <line x1="${x0 - 14}" x2="${x0 + L * sc + 14}" y1="${cy}" y2="${cy}" stroke="var(--muted)" stroke-dasharray="8 3 2 3"/>
    <text x="${x0 - 6}" y="${cy - R - 6}" text-anchor="middle">D ${fmt(D)}</text>
    <text x="${x0 + L * sc + 6}" y="${cy - r - 6}" text-anchor="middle">d ${fmt(d)}</text>
    <text x="${x0 + (L * sc) / 2}" y="${H - 6}" text-anchor="middle">L ${fmt(L)}</text>
  </svg>`;
}

function triangleGraphic(t) {
  const W = 400;
  const H = 180;
  const sc = Math.min(300 / t.b, 130 / t.a);
  const x0 = 50;
  const y0 = H - 24;
  const bx = x0 + t.b * sc;
  const ay = y0 - t.a * sc;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Rechtwinkliges Dreieck">
    <path class="anim" d="M ${x0} ${y0} L ${bx} ${y0} L ${bx} ${ay} Z" fill="color-mix(in srgb, var(--accent) 18%, transparent)" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M ${bx - 12} ${y0} L ${bx - 12} ${y0 - 12} L ${bx} ${y0 - 12}" fill="none" stroke="var(--text)" stroke-width="1.2"/>
    <text x="${(x0 + bx) / 2}" y="${y0 + 18}" text-anchor="middle">b ${fmt(t.b, 3)}</text>
    <text x="${bx + 8}" y="${(y0 + ay) / 2}">a ${fmt(t.a, 3)}</text>
    <text x="${(x0 + bx) / 2 - 18}" y="${(y0 + ay) / 2 - 8}" text-anchor="end">c ${fmt(t.c, 3)}</text>
    <text x="${x0 + 36}" y="${y0 - 6}">α</text>
  </svg>`;
}

function circleGraphic(D, holes) {
  const S = 220;
  const c = S / 2;
  const sc = 90 / (D / 2);
  return `<svg class="graphic" viewBox="0 0 ${S} ${S}" style="max-height:280px" role="img" aria-label="Lochkreis">
    <circle cx="${c}" cy="${c}" r="90" fill="none" stroke="var(--muted)" stroke-dasharray="8 3 2 3"/>
    <line x1="${c - 104}" x2="${c + 104}" y1="${c}" y2="${c}" stroke="var(--muted)" stroke-width="1"/>
    <line x1="${c}" x2="${c}" y1="${c - 104}" y2="${c + 104}" stroke="var(--muted)" stroke-width="1"/>
    ${holes.map((h) => `<circle cx="${c + h.x * sc}" cy="${c - h.y * sc}" r="8" fill="color-mix(in srgb, var(--accent) 35%, transparent)" stroke="var(--accent)" stroke-width="2"/>
      <text x="${c + h.x * sc * 0.72}" y="${c - h.y * sc * 0.72 + 4}" text-anchor="middle" style="font-size:10px">${h.i}</text>`).join('')}
    <text class="muted" x="${S - 4}" y="${c - 4}" text-anchor="end" style="font-size:10px">+X</text>
    <text class="muted" x="${c + 4}" y="10" style="font-size:10px">+Y</text>
  </svg>`;
}

function render(el, params, ctx) {
  let tab = TABS.some(([k]) => k === params.v) ? params.v : 'kegel';
  el.innerHTML = `
    <p class="lead">Kegel, rechtwinkliges Dreieck, Lochkreis-Koordinaten und Sinuslineal.</p>
    <div class="seg" role="group" aria-label="Rechner">${TABS.map(([k, l]) => `<button type="button" data-v="${k}">${l}</button>`).join('')}</div>
    <div id="kt-body"></div>`;
  const body = el.querySelector('#kt-body');

  function layout(formHtml, extra = '') {
    body.innerHTML = `<div class="grid-2"><form class="card" autocomplete="off"><h2>Eingaben</h2>${formHtml}</form>
      <section class="card" id="kt-out" aria-live="polite"></section></div>${extra}`;
    return [body.querySelector('form'), body.querySelector('#kt-out')];
  }
  function bind(form, update) {
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  const views = {
    kegel() {
      const [form, out] = layout(`<div class="grid">
          ${field('D', 'Großer Ø D (mm)', params.D || '30')}
          ${field('d', 'Kleiner Ø d (mm)', params.d || '25')}
          ${field('L', 'Kegellänge L (mm)', params.L || '50')}
          ${field('Lw', 'Werkstücklänge L<sub>w</sub> (mm)', params.Lw || '', 'placeholder="für Reitstock"', 'adv')}
        </div>
        <p class="note adv">Werkstücklänge nur für das Kegeldrehen durch Reitstockverstellung zwischen Spitzen.</p>`,
      `<section class="card adv"><h2>Morsekegel (DIN 228)</h2>
        ${table(['Kegel', 'D₁ mm', 'Verhältnis', 'Einstellwinkel α/2'], MORSE.map((m) => [`<strong>${m.name}</strong>`, fmt(m.D, 3), `1 : ${fmt(m.x, 3)}`, deg(Math.atan(1 / (2 * m.x)) * 180 / Math.PI)]))}</section>
      <section class="card adv"><h2>Weitere Kegel</h2>
        ${table(['Kegel', 'Verhältnis', 'Einstellwinkel α/2'], TAPERS.map((t) => [esc(t.name), t.x ? `1 : ${fmt(t.x, 3)}` : '–', deg(t.angle ? t.angle / 2 : Math.atan(1 / (2 * t.x)) * 180 / Math.PI)]))}</section>`);
      bind(form, () => {
        const v = formValues(form);
        const [D, d, L, Lw] = [num(v.D), num(v.d), num(v.L), num(v.Lw)];
        ctx.setParams({ v: tab, ...v }, `Kegel D${v.D} d${v.d} L${v.L}`);
        const c = cone({ D, d, L });
        if (!c) { out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">D ≥ d und L &gt; 0 eingeben.</p>'; return; }
        const vr = Lw > 0 ? tailstockOffset({ D, d, L, Lw }) : null;
        out.innerHTML = `<h2>Kegel</h2>${coneGraphic(D, d, L)}
          <div class="results">
            ${result('Einstellwinkel α/2 (Oberschlitten)', deg(c.half), '', true)}
            ${result('Kegelwinkel α', deg(c.angle))}
            ${result('Kegelverhältnis C', `1 : ${fmt(c.ratio, 3)}`)}
            <div class="adv">
            ${result('Neigung (D − d)/(2·L)', fmt(c.C / 2, 5))}
            ${vr !== null ? result('Reitstockverstellung V<sub>R</sub>', fmt(vr, 3), 'mm') : ''}
            </div>
          </div>
          ${steps([
            { title: 'Kegelverhältnis', formula: 'C = (D − d) / L', values: `C = (${fmt(D)} − ${fmt(d)}) / ${fmt(L)}`, result: `${fmt(c.C, 5)} = 1 : ${fmt(c.ratio, 3)}` },
            { title: 'Einstellwinkel', formula: 'tan(α/2) = (D − d) / (2 · L)', values: `α/2 = arctan((${fmt(D)} − ${fmt(d)}) / (2 · ${fmt(L)}))`, result: `${fmt(c.half, 4)}°` },
            vr !== null ? { title: 'Reitstockverstellung', formula: 'V<sub>R</sub> = (D − d)/2 · L<sub>w</sub>/L', values: `V<sub>R</sub> = (${fmt(D)} − ${fmt(d)})/2 · ${fmt(Lw)}/${fmt(L)}`, result: `${fmt(vr, 3)} mm` } : null,
          ])}`;
      });
    },

    dreieck() {
      const [form, out] = layout(`<div class="grid">
          ${field('a', 'Gegenkathete a (Höhe)', params.a ?? '10')}
          ${field('b', 'Ankathete b (Länge)', params.b ?? '100')}
          ${field('c', 'Hypotenuse c', params.c ?? '')}
          ${field('w', 'Winkel α (°)', params.w ?? '')}
        </div>
        <p class="note">Genau zwei Werte eingeben, die anderen Felder leer lassen. α liegt gegenüber von a, also an der Länge b.</p>`);
      bind(form, () => {
        const v = formValues(form);
        const vals = { a: num(v.a), b: num(v.b), c: num(v.c), alpha: num(v.w) };
        ctx.setParams({ v: tab, ...v }, `Dreieck ${['a', 'b', 'c', 'w'].filter((k) => v[k]).map((k) => `${k}=${v[k]}`).join(' ')}`);
        const filled = Object.values(vals).filter((x) => Number.isFinite(x) && x > 0).length;
        const t = filled === 2 ? rightTriangle(vals) : null;
        if (!t) {
          out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">${filled > 2 ? 'Nur zwei Werte eingeben, ein Feld leeren.' : 'Zwei passende Werte eingeben (Hypotenuse ist die längste Seite, α unter 90°).'}</p>`;
          return;
        }
        out.innerHTML = `<h2>Rechtwinkliges Dreieck</h2>${triangleGraphic(t)}
          <div class="results">
            ${result('Winkel α', deg(t.alpha), '', true)}
            ${result('Winkel β', deg(t.beta))}
            ${result('Gegenkathete a', fmt(t.a, 4), 'mm')}
            ${result('Ankathete b', fmt(t.b, 4), 'mm')}
            ${result('Hypotenuse c', fmt(t.c, 4), 'mm')}
            ${result('Steigung', `${fmt(t.percent, 3)} % = 1 : ${fmt(t.ratio, 3)}`)}
          </div>
          ${steps([
            { title: 'Pythagoras', formula: 'c² = a² + b²', values: `c = √(${fmt(t.a, 4)}² + ${fmt(t.b, 4)}²)`, result: `${fmt(t.c, 4)} mm` },
            { title: 'Winkel', formula: 'tan α = a / b, sin α = a / c, cos α = b / c', values: `α = arctan(${fmt(t.a, 4)} / ${fmt(t.b, 4)})`, result: `${fmt(t.alpha, 4)}°` },
            { title: 'Steigung', formula: 'm = a / b · 100 %', values: `m = ${fmt(t.a, 4)} / ${fmt(t.b, 4)} · 100`, result: `${fmt(t.percent, 3)} %` },
          ])}`;
      });
    },

    lochkreis() {
      const [form, out] = layout(`<div class="grid">
          ${field('D', 'Lochkreis-Ø (mm)', params.D || '100')}
          ${field('n', 'Anzahl Bohrungen', params.n || '6')}
          ${field('s', 'Startwinkel (°)', params.s || '0')}
          ${field('x', 'Mitte X (mm)', params.x || '0', '', 'adv')}
          ${field('y', 'Mitte Y (mm)', params.y || '0', '', 'adv')}
        </div>
        <p class="note">0° liegt auf +X, Winkel gegen den Uhrzeigersinn (wie in der CNC-Programmierung).</p>`);
      bind(form, () => {
        const v = formValues(form);
        const D = num(v.D);
        const n = Math.round(num(v.n));
        const start = num(v.s) || 0;
        ctx.setParams({ v: tab, ...v }, `Lochkreis Ø${v.D} · ${v.n} Bohrungen`);
        const bc = n >= 1 && n <= 72 ? boltCircle({ D, n, start, cx: num(v.x) || 0, cy: num(v.y) || 0 }) : null;
        if (!bc) { out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Durchmesser und 1 bis 72 Bohrungen eingeben.</p>'; return; }
        const local = boltCircle({ D, n, start });
        out.innerHTML = `<h2>${n} × auf Ø ${fmt(D)}</h2>${circleGraphic(D, local.holes)}
          <div class="results">
            ${result('Teilungswinkel', fmt(bc.step, 4), '°', true)}
            ${result('Abstand benachbarter Bohrungen', fmt(bc.pitch, 3), 'mm')}
          </div>
          ${table(['Nr.', 'Winkel', 'X', 'Y'], bc.holes.map((h) => [String(h.i), `${fmt(h.angle, 3)}°`, fmt(h.x, 3), fmt(h.y, 3)]))}
          ${steps([
            { title: 'Koordinaten', formula: 'X = X<sub>M</sub> + D/2 · cos φ, Y = Y<sub>M</sub> + D/2 · sin φ', values: `φ = ${fmt(start)}° + i · ${fmt(bc.step, 4)}°` },
            n > 1 ? { title: 'Lochabstand (Sehne)', formula: 's = D · sin(180° / n)', values: `s = ${fmt(D)} · sin(180° / ${n})`, result: `${fmt(bc.pitch, 3)} mm` } : null,
          ])}`;
      });
    },

    sinus() {
      const [form, out] = layout(`<div class="grid">
          <label class="field"><span>Lineallänge L</span><select name="L">${options(SINE_BARS.map((l) => [l, `${l} mm`]), params.L || '100')}</select></label>
          ${field('w', 'Winkel α (°)', params.w ?? '20')}
          ${field('h', 'oder Endmaßhöhe h (mm)', params.h ?? '', 'placeholder="statt Winkel"')}
        </div>
        <p class="note">Winkel eingeben → Endmaßhöhe. Feld Winkel leer lassen und h eingeben → Winkel.</p>`);
      bind(form, () => {
        const v = formValues(form);
        const L = num(v.L);
        const useAngle = v.w.trim() !== '';
        const r = sineBar({ L, alpha: useAngle ? num(v.w) : undefined, h: useAngle ? undefined : num(v.h) });
        ctx.setParams({ v: tab, ...v }, `Sinuslineal ${v.L} · ${useAngle ? `${v.w}°` : `h ${v.h}`}`);
        if (!r || !(r.h >= 0)) { out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Winkel (0–90°) oder Höhe ≤ L eingeben.</p>'; return; }
        const blocks = gaugeBlocks(Math.round(r.h * 1000) / 1000);
        out.innerHTML = `<h2>Sinuslineal ${fmt(L)} mm</h2>
          <div class="results">
            ${result('Endmaßhöhe h', fmt(r.h, 3), 'mm', true)}
            ${result('Winkel α', deg(r.alpha))}
            ${result('Endmaße (Satz 46 Stück)', blocks ? blocks.map((b) => fmt(b, 3)).join(' + ') : 'nicht kombinierbar')}
          </div>
          ${steps([useAngle
            ? { title: 'Endmaßhöhe', formula: 'h = L · sin α', values: `h = ${fmt(L)} · sin ${fmt(r.alpha, 4)}°`, result: `${fmt(r.h, 3)} mm` }
            : { title: 'Winkel', formula: 'α = arcsin(h / L)', values: `α = arcsin(${fmt(r.h, 3)} / ${fmt(L)})`, result: `${fmt(r.alpha, 4)}°` }])}
          <p class="note">Endmaße auf 0,001 mm gerundet. Kombination mit möglichst wenigen Endmaßen, jede Größe nur einmal.</p>`;
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
  const t = q.trim();
  const m = /^(?:mk|morse(?:kegel)?)\s*([0-6])$/i.exec(t);
  if (m) {
    const k = MORSE[Number(m[1])];
    return [{ title: k.name, score: 95, params: { v: 'kegel' },
      html: `<div class="results">${result('D₁', fmt(k.D, 3), 'mm', true)}${result('Kegelverhältnis', `1 : ${fmt(k.x, 3)}`)}${result('Einstellwinkel α/2', `${fmt(Math.atan(1 / (2 * k.x)) * 180 / Math.PI, 4)}°`)}</div>` }];
  }
  const s = /^sinus(?:lineal)?\s*(\d+(?:[.,]\d+)?)\s*°?$/i.exec(t);
  if (s) {
    const r = sineBar({ L: 100, alpha: num(s[1]) });
    return [{ title: `Sinuslineal 100 mm · ${s[1]}°`, score: 90, params: { v: 'sinus', L: 100, w: s[1] }, html: `<div class="results">${result('Endmaßhöhe h', fmt(r.h, 3), 'mm', true)}</div>` }];
  }
  return [];
}

export default {
  id: 'kegel',
  title: 'Kegel & Trigonometrie',
  subtitle: 'Kegelwinkel, Steigung, Lochkreis, Sinuslineal',
  color: '#db2777',
  icon: '<path d="M4 20L20 20L20 6Z"/><path d="M8 20a4 4 0 0 0-1-3"/>',
  keywords: ['Kegel', 'Kegelwinkel', 'Einstellwinkel', 'Morsekegel', 'MK', 'Steilkegel', 'Oberschlitten', 'Reitstock', 'Trigonometrie', 'Dreieck', 'Steigung', 'Winkel', 'Lochkreis', 'Teilkreis', 'Bohrbild', 'Koordinaten', 'Sinuslineal', 'Endmaß'],
  render,
  search,
};
