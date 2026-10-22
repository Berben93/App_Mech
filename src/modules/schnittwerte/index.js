import { esc, fmt, num, options, result, table } from '../../core/dom.js';
import { MATERIALS, PROCESSES, TOOLS, ISO_GROUPS } from './data.js';
import { turning, milling, drilling, drillFeed, rpm } from './calc.js';

// Felder je Verfahren: [Name, Beschriftung, Standardwert]
const FIELDS = {
  turn: [['d', 'Durchmesser d (mm)', '50'], ['vc', 'vc (m/min)', ''], ['f', 'Vorschub f (mm/U)', ''], ['ap', 'Schnitttiefe ap (mm)', '2'], ['L', 'Weg L (mm)', '100']],
  mill: [['D', 'Fräser-Ø D (mm)', '16'], ['z', 'Schneiden z', '4'], ['vc', 'vc (m/min)', ''], ['fz', 'Zahnvorschub fz (mm)', ''], ['ap', 'Schnitttiefe ap (mm)', '8'], ['ae', 'Eingriffsbreite ae (mm)', '4'], ['L', 'Weg L (mm)', '200']],
  drill: [['D', 'Bohrer-Ø D (mm)', '10'], ['vc', 'vc (m/min)', ''], ['f', 'Vorschub f (mm/U)', ''], ['L', 'Bohrtiefe L (mm)', '30']],
};

const mean = ([a, b]) => Math.round((a + b) / 2);

function render(el, params, ctx) {
  let proc = PROCESSES.some((p) => p.key === params.v) ? params.v : 'turn';
  let mat = MATERIALS.find((m) => m.id === params.w) || MATERIALS[0];
  let tool = TOOLS.some((t) => t.key === params.t) ? params.t : 'hm';
  const values = { ...params };
  let feedTouched = !!(params.f || params.fz);

  el.innerHTML = `
    <p class="lead">Drehzahl, Vorschubgeschwindigkeit, Leistung und Hauptzeit mit Richtwerten je Werkstoffgruppe.</p>
    <div class="seg" role="group" aria-label="Verfahren">${PROCESSES.map((p) => `<button type="button" data-v="${p.key}">${p.label}</button>`).join('')}</div>
    <div class="grid-2">
      <form class="card" id="sw-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">
          <label class="field" style="grid-column:1/-1"><span>Werkstoff</span><select name="w">${options(MATERIALS.map((m) => [m.id, `${m.iso} · ${m.name}`]), mat.id)}</select></label>
          <label class="field"><span>Schneidstoff</span><select name="t">${options(TOOLS.map((t) => [t.key, t.label]), tool)}</select></label>
        </div>
        <div class="grid" id="sw-fields" style="margin-top:12px"></div>
        <p class="note" id="sw-hint"></p>
      </form>
      <section class="card" id="sw-out" aria-live="polite"></section>
    </div>
    <section class="card"><h2>Richtwerte vc (m/min)</h2><div id="sw-table"></div>
      <p class="note">Richtwerte für beschichtetes Hartmetall bzw. HSS-E bei stabilen Bedingungen. Angaben des Werkzeugherstellers haben Vorrang.</p></section>`;

  const form = el.querySelector('#sw-form');
  const out = el.querySelector('#sw-out');

  function range() { return mat[proc][tool]; }

  function defaults() {
    const r = range();
    if (r) values.vc = String(mean(r));
    if (proc === 'turn') values.f = String(tool === 'hss' ? Math.min(mat.f.turn, 0.12) : mat.f.turn);
    if (proc === 'mill') values.fz = String(tool === 'hss' ? Math.round(mat.f.mill * 50) / 100 : mat.f.mill);
    if (proc === 'drill') values.f = String(drillFeed(mat.f.drill * (tool === 'hss' ? 0.8 : 1), num(values.D || 10)));
    feedTouched = false;
  }

  function buildFields() {
    el.querySelector('#sw-fields').innerHTML = FIELDS[proc].map(([name, label, def]) => {
      if (values[name] === undefined || values[name] === '') values[name] = def;
      return `<label class="field"><span>${label}</span><input name="${name}" inputmode="decimal" value="${esc(values[name])}"></label>`;
    }).join('');
    el.querySelectorAll('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === proc)));
  }

  function compute() {
    const v = Object.fromEntries(FIELDS[proc].map(([name]) => [name, num(values[name])]));
    const kc = mat.kc;
    if (proc === 'turn') return { ...turning({ ...v, kc }), dia: v.d };
    if (proc === 'mill') return { ...milling({ ...v, kc }), dia: v.D };
    return { ...drilling({ ...v, kc }), dia: v.D };
  }

  function update() {
    ctx.setParams({ v: proc, w: mat.id, t: tool, ...Object.fromEntries(FIELDS[proc].map(([n]) => [n, values[n]])) });
    const r = range();
    el.querySelector('#sw-hint').innerHTML = r
      ? `Richtwert vc für ${esc(mat.name)} mit ${tool === 'hm' ? 'Hartmetall' : 'HSS'}: <strong>${r[0]}–${r[1]} m/min</strong>.`
      : `<span class="warn-text">${tool === 'hss' ? 'HSS' : 'Dieser Schneidstoff'} ist für ${esc(mat.name)} nicht geeignet.</span>`;
    const c = compute();
    if (!Number.isFinite(c.n) || !Number.isFinite(c.vf)) {
      out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Bitte alle Felder mit Zahlen füllen.</p>';
    } else {
      const minutes = c.th;
      out.innerHTML = `<h2>Ergebnis ${PROCESSES.find((p) => p.key === proc).label}</h2>
        <div class="results">
          ${result('Drehzahl n', fmt(Math.round(c.n)), '1/min', true)}
          ${result('Vorschubgeschwindigkeit v<sub>f</sub>', fmt(Math.round(c.vf)), 'mm/min')}
          ${result('Zeitspanvolumen Q', fmt(c.Q, 1), 'cm³/min')}
          ${result('Schnittleistung P<sub>c</sub> (ca.)', fmt(c.Pc, 2), 'kW')}
          ${Number.isFinite(minutes) ? result('Hauptzeit t<sub>h</sub>', `${fmt(minutes, 2)} min = ${fmt(minutes * 60, 0)} s`) : ''}
        </div>
        <p class="note">${proc === 'turn' ? 'Drehen: n = vc·1000/(π·d), v<sub>f</sub> = n·f, Q = vc·ap·f.' : proc === 'mill' ? 'Fräsen: n = vc·1000/(π·D), v<sub>f</sub> = n·z·f<sub>z</sub>, Q = ap·ae·v<sub>f</sub>/1000.' : 'Bohren: n = vc·1000/(π·D), v<sub>f</sub> = n·f.'}
        Leistung mit k<sub>c</sub> ≈ ${fmt(mat.kc)} N/mm², ohne Maschinenwirkungsgrad.</p>`;
    }
    renderTable();
  }

  function renderTable() {
    const dia = num(values[proc === 'turn' ? 'd' : 'D']);
    const cell = (rg) => (rg ? `${rg[0]}–${rg[1]}` : '–');
    el.querySelector('#sw-table').innerHTML = table(
      ['Gruppe', 'Werkstoff', 'HM', 'HSS', dia > 0 ? `n bei Ø${fmt(dia)} (HM)` : 'n'],
      MATERIALS.map((m) => ({
        cls: m.id === mat.id ? 'hl' : '',
        cells: [`<span class="pill" style="background:${ISO_GROUPS[m.iso].color};color:#fff">${m.iso}</span>`, esc(m.name), cell(m[proc].hm), cell(m[proc].hss),
          dia > 0 ? fmt(Math.round(rpm(mean(m[proc].hm), dia))) : '–'],
      })),
    );
  }

  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'w' || t.name === 't') return;
    values[t.name] = t.value;
    if (t.name === 'f' || t.name === 'fz') feedTouched = true;
    if (proc === 'drill' && t.name === 'D' && !feedTouched) {
      values.f = String(drillFeed(mat.f.drill * (tool === 'hss' ? 0.8 : 1), num(t.value)));
      form.elements.f.value = values.f;
    }
    update();
  });
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name === 'w') mat = MATERIALS.find((m) => m.id === t.value);
    else if (t.name === 't') tool = t.value;
    else return;
    defaults();
    buildFields();
    update();
  });
  el.querySelector('.seg').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    proc = b.dataset.v;
    defaults();
    buildFields();
    update();
  });

  if (!values.vc || !(values.f || values.fz)) {
    const keep = { vc: values.vc, f: values.f, fz: values.fz };
    defaults();
    for (const [k, v] of Object.entries(keep)) if (v) values[k] = v;
    feedTouched = !!(keep.f || keep.fz);
  }
  buildFields();
  update();
}

function search(q) {
  const s = q.trim().toLowerCase();
  if (s.length < 3) return [];
  return MATERIALS.filter((m) => m.name.toLowerCase().includes(s)).map((m) => ({
    title: `Schnittwerte ${m.name}`,
    text: `Drehen HM ${m.turn.hm.join('–')} m/min · Fräsen HM ${m.mill.hm.join('–')} m/min`,
    params: { w: m.id },
    score: 50,
  }));
}

export default {
  id: 'schnittwerte',
  title: 'Schnittwerte',
  subtitle: 'Drehen, Fräsen, Bohren: n, vf, Leistung, Hauptzeit',
  color: '#ea580c',
  icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.8 2.8M16.2 16.2L19 19M5 19l2.8-2.8M16.2 7.8L19 5"/>',
  keywords: ['Schnittgeschwindigkeit', 'vc', 'Drehzahl', 'Vorschub', 'fz', 'Drehen', 'Fräsen', 'Bohren', 'Hauptzeit', 'Zeitspanvolumen', 'Schnittleistung', 'Schnittdaten'],
  render,
  search,
};
