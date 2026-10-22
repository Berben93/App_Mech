import { esc, fmt, num, options, result, formValues, steps } from '../../core/dom.js';
import { threadMill, ncProgram } from './calc.js';
import { METRIC_COARSE } from '../gewinde/data.js';

const MATERIALS = [
  ['p', 'Stahl bis 900 N/mm²', 120, 0.06],
  ['p2', 'Stahl vergütet 900–1300', 80, 0.04],
  ['m', 'Edelstahl', 70, 0.04],
  ['k', 'Grauguss', 110, 0.07],
  ['n', 'Aluminium', 250, 0.08],
  ['s', 'Titan, Inconel', 40, 0.03],
];

/** Draufsicht: Gewinde-Ø, Fräser und Mittelpunktsbahn. */
function pathGraphic(r, d, D, internal) {
  const S = 220;
  const c = S / 2;
  const sc = 85 / Math.max(internal ? d / 2 : r.R + D / 2, 1);
  return `<svg class="graphic" viewBox="0 0 ${S} ${S}" style="max-height:260px" role="img" aria-label="Fräsbahn">
    <circle cx="${c}" cy="${c}" r="${(d / 2) * sc}" fill="${internal ? 'none' : 'color-mix(in srgb, var(--muted) 22%, transparent)'}" stroke="var(--text)" stroke-width="2"/>
    <circle cx="${c}" cy="${c}" r="${r.R * sc}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="6 4"/>
    <circle class="anim" cx="${c + r.R * sc}" cy="${c}" r="${(D / 2) * sc}" fill="color-mix(in srgb, var(--accent) 35%, transparent)" stroke="var(--accent)" stroke-width="2"/>
    <path d="M ${c + r.R * sc} ${c - 18} a 18 18 0 0 ${internal ? 0 : 1} ${internal ? -10 : 10} -4" fill="none" stroke="var(--text)" stroke-width="1.5"/>
    <text x="${c}" y="${c + 4}" text-anchor="middle" style="font-size:11px">R ${fmt(r.R, 3)}</text>
    <text class="muted" x="6" y="14" style="font-size:10px">${internal ? 'G03 innen' : 'G02 außen'} · Gleichlauf</text>
  </svg>`;
}

function render(el, params, ctx) {
  const p = (k, d) => esc(params[k] ?? d);
  el.innerHTML = `
    <p class="lead">Drehzahl, Vorschub an Kontur und Fräsermitte, Bahnradius und ein Beispielprogramm für die Zirkularinterpolation.</p>
    <div class="grid-2">
      <form class="card" id="gf-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">
          <label class="field"><span>Gewinde-Ø d (mm)</span><input name="d" inputmode="decimal" value="${p('d', '12')}" list="gf-d"></label>
          <label class="field"><span>Steigung P (mm)</span><input name="p" inputmode="decimal" value="${p('p', '1.75')}"></label>
          <label class="field"><span>Art</span><select name="a">${options([['i', 'Innengewinde'], ['a', 'Außengewinde']], params.a || 'i')}</select></label>
          <label class="field"><span>Richtung</span><select name="r">${options([['r', 'Rechts'], ['l', 'Links']], params.r || 'r')}</select></label>
          <label class="field"><span>Fräser-Ø D (mm)</span><input name="D" inputmode="decimal" value="${p('D', '9.5')}"></label>
          <label class="field"><span>Schneiden z</span><input name="z" inputmode="decimal" value="${p('z', '3')}"></label>
          <label class="field" style="grid-column:1/-1"><span>Werkstoff (Startwerte)</span><select name="w">${options(MATERIALS.map((m) => [m[0], m[1]]), params.w || 'p')}</select></label>
          <label class="field"><span>vc (m/min)</span><input name="vc" inputmode="decimal" value="${p('vc', '120')}"></label>
          <label class="field"><span>fz (mm)</span><input name="fz" inputmode="decimal" value="${p('fz', '0.06')}"></label>
          <label class="field"><span>Gewindelänge L (mm)</span><input name="L" inputmode="decimal" value="${p('L', '18')}"></label>
          <label class="field"><span>Fräsertyp</span><select name="t">${options([['1', 'Einzahn (Gang für Gang)'], ['m', 'Mehrzahn (1 Umlauf)']], params.t || '1')}</select></label>
        </div>
        <datalist id="gf-d">${METRIC_COARSE.map((t) => `<option value="${t.d}">`).join('')}</datalist>
        <p class="note">Bei Regelgewinde-Ø wird die Steigung automatisch gesetzt. Fräser-Ø innen höchstens etwa 80 % von d (Herstellerangabe beachten), sonst verschneidet er die Flanken.</p>
      </form>
      <section class="card" id="gf-out" aria-live="polite"></section>
    </div>
    <section class="card"><h2>NC-Programm (Beispiel)</h2>
      <pre class="code" id="gf-nc"></pre>
      <div class="chips"><button type="button" class="chip" id="gf-copy">Programm kopieren</button></div>
      <p class="note">ISO/Fanuc-Syntax, Nullpunkt in Gewindemitte an der Oberkante, ohne Werkzeugradiuskorrektur (Mittelpunktsbahn). Vor dem Einsatz an die eigene Steuerung anpassen und im Simulator prüfen. Besser als radial: mit Viertelkreis tangential anfahren.</p></section>`;

  const form = el.querySelector('#gf-form');
  const out = el.querySelector('#gf-out');

  function update(e) {
    if (e?.target?.name === 'd') {
      const t = METRIC_COARSE.find((x) => x.d === num(e.target.value));
      if (t) form.elements.p.value = String(t.p);
    }
    if (e?.target?.name === 'w') {
      const m = MATERIALS.find((x) => x[0] === e.target.value);
      form.elements.vc.value = String(m[2]);
      form.elements.fz.value = String(m[3]);
    }
    const v = formValues(form);
    const internal = v.a === 'i';
    const input = { d: num(v.d), p: num(v.p), internal, left: v.r === 'l', D: num(v.D), z: Math.round(num(v.z)), vc: num(v.vc), fz: num(v.fz), L: num(v.L) || 0, multi: v.t === 'm' };
    const name = `M${v.d}×${v.p}${v.r === 'l' ? ' LH' : ''} ${internal ? 'innen' : 'außen'}`;
    ctx.setParams(v, name);
    const r = threadMill(input);
    const nc = el.querySelector('#gf-nc');
    if (!r || r.error) {
      out.innerHTML = `<h2>Ergebnis</h2><p class="warn-text">${esc(r?.error || 'Alle Felder mit Zahlen füllen.')}</p>`;
      nc.textContent = '';
      return;
    }
    out.innerHTML = `<h2>${esc(name)}</h2>${pathGraphic(r, input.d, input.D, internal)}
      <div class="results">
        ${result('Drehzahl n', fmt(Math.round(r.n)), '1/min', true)}
        ${result('Vorschub Fräsermitte (programmieren)', fmt(Math.round(r.vfCenter)), 'mm/min', true)}
        ${result('Vorschub an der Kontur', fmt(Math.round(r.vfContour)), 'mm/min')}
        ${result('Bahn-Ø / Bahnradius R', `${fmt(r.pathDia, 3)} / ${fmt(r.R, 3)}`, 'mm')}
        ${result('Z je Umlauf', fmt(input.p, 3), 'mm')}
        ${result('Umläufe', fmt(r.turns))}
        ${result('Profiltiefe radial (ISO)', fmt(r.depth, 3), 'mm')}
        ${result('Fräszeit (ohne Anfahren)', `${fmt(r.time, 2)} min = ${fmt(r.time * 60, 0)} s`)}
      </div>
      ${steps([
        { title: 'Drehzahl', formula: 'n = v<sub>c</sub> · 1000 / (π · D)', values: `n = ${fmt(input.vc)} · 1000 / (π · ${fmt(input.D)})`, result: `${fmt(Math.round(r.n))} 1/min` },
        { title: 'Vorschub an der Kontur', formula: 'v<sub>f</sub> = n · z · f<sub>z</sub>', values: `v<sub>f</sub> = ${fmt(Math.round(r.n))} · ${input.z} · ${fmt(input.fz)}`, result: `${fmt(Math.round(r.vfContour))} mm/min` },
        { title: 'Bahndurchmesser', formula: internal ? 'D<sub>B</sub> = d − D' : 'D<sub>B</sub> = d + D', values: `D<sub>B</sub> = ${fmt(input.d)} ${internal ? '−' : '+'} ${fmt(input.D)}`, result: `${fmt(r.pathDia, 3)} mm` },
        { title: 'Vorschub Fräsermitte', formula: 'v<sub>fm</sub> = v<sub>f</sub> · D<sub>B</sub> / d', values: `v<sub>fm</sub> = ${fmt(Math.round(r.vfContour))} · ${fmt(r.pathDia, 3)} / ${fmt(input.d)}`, result: `${fmt(Math.round(r.vfCenter))} mm/min` },
      ])}`;
    nc.textContent = ncProgram(input, r, `${name.replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe').replace(/[ü]/g, 'ue').replace('×', 'x')}, L${fmt(input.L)}`);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  el.querySelector('#gf-copy').addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(el.querySelector('#gf-nc').textContent);
      e.target.textContent = 'Kopiert ✓';
    } catch {
      e.target.textContent = 'Kopieren nicht möglich';
    }
    setTimeout(() => { e.target.textContent = 'Programm kopieren'; }, 2000);
  });
  update();
}

export default {
  id: 'gewindefraesen',
  title: 'Gewindefräsen',
  subtitle: 'Zirkularinterpolation: Bahn, Vorschub, NC-Programm',
  color: '#9333ea',
  icon: '<circle cx="12" cy="12" r="8"/><circle cx="17" cy="12" r="3"/><path d="M12 4a8 8 0 0 1 8 8"/>',
  keywords: ['Gewindefräsen', 'Zirkularinterpolation', 'Helix', 'G02', 'G03', 'Gewindefräser', 'Fräsermittelpunkt', 'Bahnradius', 'CNC', 'NC-Programm', 'Gleichlauf'],
  render,
};
