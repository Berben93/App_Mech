import { esc, fmt, num, options, result, table, formValues, steps } from '../../core/dom.js';
import { MIN_RADIUS_STEEL, MIN_RADIUS_FACTOR, RM_TYPICAL } from './data.js';
import { bend, minRadius, dieWidth, pressForce } from './calc.js';

const MATS = [...MIN_RADIUS_STEEL.groups.map((g) => [g.id, `Stahl ${g.label}`]), ...MIN_RADIUS_FACTOR.map((f) => [f.id, f.label])];

/** Profil des gebogenen Blechs, maßstäblich; Dicke = Strichstärke. */
function profile({ s, r, beta, a, b }) {
  const alpha = (180 - beta) * (Math.PI / 180);
  const R = r + s / 2;
  const cut = (r + s) * Math.tan(alpha / 2);
  const l1 = Math.max(a - (beta >= 90 ? cut : r + s), s);
  const l2 = Math.max(b - (beta >= 90 ? cut : r + s), s);
  const ex = l1 + R * Math.sin(alpha);
  const ey = -R + R * Math.cos(alpha);
  const fx = ex + l2 * Math.cos(alpha);
  const fy = ey - l2 * Math.sin(alpha);
  const xs = [0, l1, ex, fx];
  const ys = [0, ey, fy, -R * (1 - Math.cos(Math.min(alpha, Math.PI / 2)))];
  const pad = Math.max(s * 2, (Math.max(...xs) - Math.min(...xs) + Math.max(...ys.map(Math.abs))) * 0.08);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - minX + pad;
  const h = Math.max(...ys) - minY + pad;
  const unit = Math.max(w, h) / 120;
  const d = `M 0 0 L ${l1} 0 A ${R} ${R} 0 0 0 ${ex} ${ey} L ${fx} ${fy}`;
  return `<svg class="graphic" viewBox="${minX} ${minY} ${w} ${h}" style="max-height:260px" role="img" aria-label="Biegeteil">
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="${s}" stroke-linejoin="round" opacity=".85"/>
    <path d="${d}" fill="none" stroke="var(--text)" stroke-width="${unit * 0.6}" stroke-dasharray="${unit * 3} ${unit * 2}"/>
    <text x="${l1 / 2}" y="${s / 2 + unit * 9}" text-anchor="middle" style="font-size:${unit * 7}px">a</text>
    <text x="${(ex + fx) / 2 + unit * 7}" y="${(ey + fy) / 2}" style="font-size:${unit * 7}px">b</text>
    <text class="muted" x="${l1 - unit * 6}" y="${-unit * 8}" text-anchor="end" style="font-size:${unit * 6}px">β ${fmt(beta)}°</text>
  </svg>`;
}

function render(el, params, ctx) {
  const p = (k, d) => esc(params[k] ?? d);
  el.innerHTML = `
    <p class="lead">Gestreckte Länge, Biegeverkürzung und kleinster Biegeradius nach DIN 6935, dazu Gesenkweite und Presskraft.</p>
    <div class="grid-2">
      <form class="card" id="bg-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">
          <label class="field" style="grid-column:1/-1"><span>Werkstoff</span><select name="m">${options(MATS, params.m || '390')}</select></label>
          <label class="field"><span>Blechdicke s (mm)</span><input name="s" inputmode="decimal" value="${p('s', '2')}"></label>
          <label class="field"><span>Innenradius r (mm)</span><input name="r" inputmode="decimal" value="${p('r', '2')}"></label>
          <label class="field"><span>Öffnungswinkel β (°)</span><input name="w" inputmode="decimal" value="${p('w', '90')}"></label>
          <label class="field"><span>Schenkel a außen (mm)</span><input name="a" inputmode="decimal" value="${p('a', '50')}"></label>
          <label class="field"><span>Schenkel b außen (mm)</span><input name="b" inputmode="decimal" value="${p('b', '30')}"></label>
          <label class="field"><span>Biegelänge l (mm)</span><input name="l" inputmode="decimal" value="${p('l', '1000')}"></label>
        </div>
        <p class="note">β ist der Winkel zwischen den Schenkeln (90° = rechtwinklig). Schenkel a und b als Außenmaße bis zum Schnittpunkt der Außenkanten.</p>
      </form>
      <section class="card" id="bg-out" aria-live="polite"></section>
    </div>
    <section class="card"><h2>Kleinste Biegeradien Stahl (DIN 6935)</h2><div id="bg-table"></div>
      <p class="note">Richtwerte für Biegen quer zur Walzrichtung. Längs zur Walzrichtung etwa eine Stufe größer wählen. Edelstahl ≈ 1·s, Aluminium je nach Zustand 0,5 bis 3·s.</p></section>`;

  const form = el.querySelector('#bg-form');
  const out = el.querySelector('#bg-out');

  function update() {
    const v = formValues(form);
    const s = num(v.s);
    const r = num(v.r);
    const beta = num(v.w);
    const a = num(v.a);
    const b = num(v.b);
    const l = num(v.l);
    ctx.setParams(v, `s ${v.s} · r ${v.r} · ${v.w}° · ${v.a}+${v.b}`);
    const rmin = minRadius(s, v.m);
    el.querySelector('#bg-table').innerHTML = table(['s bis mm', ...MIN_RADIUS_STEEL.groups.map((g) => `r min ${g.id === '390' ? '≤ 390' : g.id === '490' ? '≤ 490' : '≤ 640'}`)],
      MIN_RADIUS_STEEL.thickness.map((t, i) => ({
        cls: s > 0 && s <= t && (i === 0 || s > MIN_RADIUS_STEEL.thickness[i - 1]) ? 'hl' : '',
        cells: [fmt(t), ...MIN_RADIUS_STEEL.groups.map((g) => fmt(g.r[i]))],
      })));
    if (!(s > 0 && r >= 0 && beta >= 0 && beta <= 180 && a > 0 && b > 0)) {
      out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Dicke, Radius, Winkel (0–180°) und Schenkel eingeben.</p>';
      return;
    }
    const res = bend({ s, r: Math.max(r, 0.01), beta, a, b });
    const V = dieWidth(s);
    const rm = RM_TYPICAL[v.m] ?? MIN_RADIUS_FACTOR.find((f) => f.id === v.m)?.rm ?? 400;
    const F = l > 0 ? pressForce({ rm, s, l, V }) : NaN;
    const alpha = 180 - beta;
    out.innerHTML = `<h2>Gestreckte Länge</h2>
      ${profile({ s, r, beta, a, b })}
      <div class="results">
        ${result('Gestreckte Länge L', fmt(res.L, 2), 'mm', true)}
        ${result('Ausgleichswert v', fmt(res.v, 2), 'mm')}
        ${result('Biegeverkürzung', fmt(-res.v, 2), 'mm')}
        ${result('Korrekturfaktor k (DIN 6935)', fmt(res.k, 3))}
        ${result('K-Faktor (CAD, = k/2)', fmt(res.K, 3))}
        ${result('Biegewinkel α = 180° − β', fmt(alpha, 1), '°')}
        ${rmin !== null ? result('Kleinster Biegeradius', fmt(rmin, 1), 'mm') : result('Kleinster Biegeradius', 'außerhalb Tabelle')}
        ${result('Gesenkweite V (Richtwert)', fmt(V), 'mm')}
        ${Number.isFinite(F) ? result(`Presskraft für ${fmt(l)} mm`, `${fmt(F, 0)} kN ≈ ${fmt(F / 9.81, 1)} t`) : ''}
      </div>
      ${rmin !== null && r < rmin ? `<p class="note warn-text">Innenradius ${fmt(r)} mm ist kleiner als der empfohlene Mindestradius ${fmt(rmin)} mm: Rissgefahr an der Außenseite.</p>` : ''}
      ${steps([
        { title: 'Korrekturfaktor', formula: 'k = 0,65 + 0,5 · lg(r / s)  (höchstens 1)', values: `k = 0,65 + 0,5 · lg(${fmt(r)} / ${fmt(s)})`, result: fmt(res.k, 3) },
        beta <= 90
          ? { title: 'Ausgleichswert (β ≤ 90°)', formula: 'v = π · (180° − β)/180° · (r + s/2 · k) − 2 · (r + s)', values: `v = π · ${fmt(alpha)}/180 · (${fmt(r)} + ${fmt(s)}/2 · ${fmt(res.k, 3)}) − 2 · (${fmt(r)} + ${fmt(s)})`, result: `${fmt(res.v, 2)} mm` }
          : beta <= 165
            ? { title: 'Ausgleichswert (90° < β ≤ 165°)', formula: 'v = π · (180° − β)/180° · (r + s/2 · k) − 2 · (r + s) · tan((180° − β)/2)', values: `v = π · ${fmt(alpha)}/180 · (${fmt(r)} + ${fmt(s)}/2 · ${fmt(res.k, 3)}) − 2 · (${fmt(r)} + ${fmt(s)}) · tan(${fmt(alpha / 2)}°)`, result: `${fmt(res.v, 2)} mm` }
            : { title: 'Ausgleichswert (β > 165°)', formula: 'v ≈ 0', result: '0 mm' },
        { title: 'Gestreckte Länge', formula: 'L = a + b + v', values: `L = ${fmt(a)} + ${fmt(b)} + (${fmt(res.v, 2)})`, result: `${fmt(res.L, 2)} mm` },
        Number.isFinite(F) ? { title: 'Presskraft (Freibiegen)', formula: 'F = 1,42 · R<sub>m</sub> · s² · l / (1000 · V)', values: `F = 1,42 · ${fmt(rm)} · ${fmt(s)}² · ${fmt(l)} / (1000 · ${fmt(V)})`, result: `${fmt(F, 0)} kN` } : null,
      ])}
      <p class="note">Mehrere Biegungen: alle Außenmaße addieren und je Biegestelle einen Ausgleichswert v dazurechnen. Presskraft mit typischem R<sub>m</sub> ≈ ${fmt(rm)} N/mm².</p>`;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

export default {
  id: 'biegen',
  title: 'Blechbiegen',
  subtitle: 'Gestreckte Länge, Biegeverkürzung, Biegeradius',
  color: '#0891b2',
  icon: '<path d="M3 20h8a6 6 0 0 0 6-6V4"/><path d="M3 16h8a2 2 0 0 0 2-2V4"/>',
  keywords: ['Biegen', 'Blech', 'Abkanten', 'gestreckte Länge', 'Zuschnitt', 'Biegeverkürzung', 'Ausgleichswert', 'K-Faktor', 'Biegeradius', 'DIN 6935', 'Abkantpresse', 'Gesenk', 'Presskraft'],
  render,
};
