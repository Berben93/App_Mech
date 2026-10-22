import { esc, fmt, num, result, table, formValues, steps } from '../../core/dom.js';
import { jobCost, priceScale, formatDuration } from './calc.js';

// [Name, Beschriftung, Standardwert, erweitert]
const FIELDS = [
  ['m', 'Losgröße (Stück)', '50'],
  ['tr', 'Rüstzeit t<sub>r</sub> (min)', '60'],
  ['th', 'Hauptzeit t<sub>h</sub> (min/Stk)', '4.5'],
  ['tn', 'Nebenzeit t<sub>n</sub> (min/Stk)', '1'],
  ['z', 'Verteilzeit (%)', '10', true],
  ['rate', 'Stundensatz (€/h)', '85'],
  ['mat', 'Material (€/Stk)', '3.20'],
  ['ext', 'Fremdleistung (€/Stk)', '0', true],
  ['margin', 'Zuschlag Gewinn/Wagnis (%)', '15', true],
];

const eur = (v, d = 2) => `${fmt(v, d)} €`;

/** Balken: Stückpreis je Losgröße; zeigt, wie sich die Rüstkosten verteilen. */
function scaleChart(rows, current) {
  const W = 400;
  const H = 180;
  const max = Math.max(...rows.map((r) => r.unitPrice));
  const bw = (W - 40) / rows.length;
  return `<svg class="graphic" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stückpreis je Losgröße">
    ${rows.map((r, i) => {
      const h = (r.unitPrice / max) * (H - 50);
      const x = 20 + i * bw;
      return `<rect class="anim" x="${x + 4}" y="${H - 24 - h}" width="${bw - 8}" height="${h}" rx="3"
          fill="${r.m === current ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 35%, transparent)'}"/>
        <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" style="font-size:10px">${r.m}</text>
        <text x="${x + bw / 2}" y="${H - 28 - h}" text-anchor="middle" style="font-size:9px">${fmt(r.unitPrice, r.unitPrice < 100 ? 2 : 0)}</text>`;
    }).join('')}
    <text class="muted" x="${W - 6}" y="12" text-anchor="end" style="font-size:10px">€/Stk je Losgröße</text>
  </svg>`;
}

function render(el, params, ctx) {
  el.innerHTML = `
    <p class="lead">Schneller Angebotspreis: Hauptzeit und Nebenzeit je Stück plus Rüstzeit, mal Stundensatz, plus Material und Zuschlag.</p>
    <div class="grid-2">
      <form class="card" id="ko-form" autocomplete="off">
        <h2>Eingaben</h2>
        <div class="grid">${FIELDS.map(([n, l, d, adv]) => `<label class="field${adv ? ' adv' : ''}"><span>${l}</span><input name="${n}" inputmode="decimal" value="${esc(params[n] ?? d)}"></label>`).join('')}</div>
        <p class="note">Hauptzeit steht im Modul <a href="#/m/schnittwerte">Schnittwerte</a> (t<sub>h</sub> = L / v<sub>f</sub>). Stundensatz inklusive Maschine, Personal und Gemeinkosten.</p>
      </form>
      <section class="card" id="ko-out" aria-live="polite"></section>
    </div>
    <section class="card adv"><h2>Preisstaffel</h2><div id="ko-scale"></div></section>`;

  const form = el.querySelector('#ko-form');
  const out = el.querySelector('#ko-out');

  function update() {
    const v = formValues(form);
    const input = Object.fromEntries(FIELDS.map(([n]) => [n, num(v[n]) || 0]));
    input.m = Math.max(1, Math.round(num(v.m)));
    ctx.setParams(v, `${v.m} Stk · th ${v.th} min · ${v.rate} €/h`);
    const r = jobCost(input);
    if (!r || !(num(v.th) >= 0) || !(num(v.rate) >= 0)) {
      out.innerHTML = '<h2>Ergebnis</h2><p class="warn-text">Losgröße, Hauptzeit und Stundensatz eingeben.</p>';
      el.querySelector('#ko-scale').innerHTML = '';
      return;
    }
    out.innerHTML = `<h2>Angebot ${fmt(input.m)} Stück</h2>
      <div class="results">
        ${result('Angebotspreis je Stück', eur(r.unitPrice), '', true)}
        ${result('Angebotspreis gesamt', eur(r.price))}
        ${result('Zeit je Stück t<sub>e</sub>', formatDuration(r.te))}
        <div class="adv">
        ${result('Auftragszeit T', formatDuration(r.T))}
        ${result('Fertigungskosten', eur(r.production))}
        ${result('davon Rüsten', eur(r.setupShare))}
        ${result('Material und Fremdleistung', eur(r.material))}
        ${result('Selbstkosten je Stück', eur(r.unitCost))}
        </div>
      </div>
      ${steps([
        { title: 'Zeit je Einheit', formula: 't<sub>e</sub> = (t<sub>h</sub> + t<sub>n</sub>) · (1 + Verteilzeit)', values: `t<sub>e</sub> = (${fmt(input.th)} + ${fmt(input.tn)}) · (1 + ${fmt(input.z)} %)`, result: `${fmt(r.te, 2)} min` },
        { title: 'Auftragszeit', formula: 'T = t<sub>r</sub> + m · t<sub>e</sub>', values: `T = ${fmt(input.tr)} + ${fmt(input.m)} · ${fmt(r.te, 2)}`, result: `${fmt(r.T, 1)} min` },
        { title: 'Fertigungskosten', formula: 'K<sub>F</sub> = T / 60 · Stundensatz', values: `K<sub>F</sub> = ${fmt(r.T, 1)} / 60 · ${fmt(input.rate)}`, result: eur(r.production) },
        { title: 'Selbstkosten', formula: 'K = K<sub>F</sub> + m · (Material + Fremdleistung)', values: `K = ${fmt(r.production, 2)} + ${fmt(input.m)} · (${fmt(input.mat, 2)} + ${fmt(input.ext, 2)})`, result: eur(r.cost) },
        { title: 'Angebotspreis', formula: 'P = K · (1 + Zuschlag)', values: `P = ${fmt(r.cost, 2)} · (1 + ${fmt(input.margin)} %)`, result: `${eur(r.price)} = ${eur(r.unitPrice)}/Stk` },
      ])}
      <p class="note">Ohne Mehrwertsteuer. Schnellkalkulation; Werkzeugverschleiß, Prüfaufwand und Verpackung über Zuschläge oder Stundensatz berücksichtigen.</p>`;
    const sizes = [...new Set([1, 5, 10, 25, 50, 100, 250, 500, input.m])].sort((a, b) => a - b);
    const rows = priceScale(input, sizes);
    el.querySelector('#ko-scale').innerHTML = scaleChart(rows, input.m)
      + table(['Losgröße', 'Auftragszeit', 'Preis gesamt', 'Preis je Stück'], rows.map((x) => ({
        cls: x.m === input.m ? 'hl' : '',
        cells: [fmt(x.m), formatDuration(x.T), eur(x.price), eur(x.unitPrice)],
      })));
  }

  form.addEventListener('input', update);
  update();
}

export default {
  id: 'kosten',
  title: 'Fertigungszeit & Kosten',
  subtitle: 'Hauptzeit, Rüstzeit, Stundensatz, Angebotspreis',
  color: '#15803d',
  icon: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5a3.5 3.5 0 1 0 0 5M7.5 11h6M7.5 13.5h6"/>',
  keywords: ['Kosten', 'Kalkulation', 'Angebot', 'Preis', 'Stundensatz', 'Maschinenstundensatz', 'Rüstzeit', 'Hauptzeit', 'Nebenzeit', 'Auftragszeit', 'Losgröße', 'Stückkosten', 'REFA'],
  render,
};
