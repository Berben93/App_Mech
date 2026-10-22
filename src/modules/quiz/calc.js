// Lernmodus: Fragen werden aus den Tabellen und Formeln der App erzeugt, damit jede Runde anders ist.
// Ohne DOM (getestet). Zahlen in Fragen und Antworten im Zahlenformat der App.
import { METRIC_COARSE } from '../gewinde/data.js';
import { metric } from '../gewinde/calc.js';
import { screwSize } from '../schrauben/calc.js';
import { COMMON_FITS } from '../passungen/data.js';
import { fit, tolerance } from '../passungen/calc.js';
import { linearTolerance } from '../allgemeintoleranzen/calc.js';
import { N_CLASSES } from '../rauheit/data.js';
import { SYMBOLS } from '../formlage/data.js';
import { convertHardness } from '../haerte/calc.js';
import { MATERIALS as STEELS } from '../werkstoffe/data.js';
import { rpm } from '../schnittwerte/calc.js';
import { numberLocale } from '../../core/i18n.js';

/** Kleiner Zufallsgenerator mit Startwert (mulberry32), damit Tests reproduzierbar sind. */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];

function shuffle(r, list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const de = (v, max = 3) => Number(v).toLocaleString(numberLocale(), { maximumFractionDigits: max, useGrouping: numberLocale() !== 'en-US' });
const signed = (v) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${de(Math.abs(v), 3)}`);

/** Antwort plus Ablenker zu einer Frage mit vier verschiedenen Optionen machen. */
function choices(r, correct, distractors) {
  const opts = [correct];
  for (const d of shuffle(r, distractors)) {
    if (opts.length >= 4) break;
    if (!opts.includes(d)) opts.push(d);
  }
  const options = shuffle(r, opts);
  return { options, answer: options.indexOf(correct) };
}

export const CATEGORIES = [
  { id: 'gewinde', name: 'Gewinde & Schrauben' },
  { id: 'passung', name: 'Passungen & Toleranzen' },
  { id: 'zerspanung', name: 'Zerspanung' },
  { id: 'formlage', name: 'Form & Lage' },
  { id: 'werkstoff', name: 'Werkstoffe & Härte' },
  { id: 'einheiten', name: 'Einheiten & Oberfläche' },
];

const THREADS = METRIC_COARSE.filter((t) => t.d >= 3 && t.d <= 30 && Number.isInteger(t.d));

const GENERATORS = {
  gewinde: [
    (r) => {
      const t = metric(pick(r, THREADS).d);
      const wrong = [t.d - t.p / 2, t.d - 2 * t.p, t.d - t.p + 0.5, t.d - t.p - 0.5, t.d * 0.8].map((v) => Math.round(v * 10) / 10);
      return {
        q: `Welcher Kernlochbohrer passt für ${t.name}?`,
        ...choices(r, `${de(t.tapDrill, 2)} mm`, wrong.filter((v) => v !== t.tapDrill).map((v) => `${de(v, 2)} mm`)),
        explain: `Faustformel: Kernloch = d − P = ${de(t.d)} − ${de(t.p)} = ${de(t.d - t.p, 2)} mm${t.tapDrill !== Math.round((t.d - t.p) * 100) / 100 ? ` (Werkstattwert nach DIN 336: ${de(t.tapDrill, 2)} mm)` : ''}.`,
        link: `#/m/gewinde?t=M&id=${t.d}x${t.p}`,
      };
    },
    (r) => {
      const t = pick(r, THREADS);
      const pitches = [...new Set(METRIC_COARSE.map((x) => x.p))];
      return {
        q: `Welche Steigung hat das Regelgewinde M${de(t.d)}?`,
        ...choices(r, `${de(t.p)} mm`, pitches.filter((p) => Math.abs(p - t.p) <= 1 && p !== t.p).map((p) => `${de(p)} mm`)),
        explain: `M${de(t.d)} hat als Regelgewinde (ISO 261) die Steigung P = ${de(t.p)} mm. Feingewinde schreibt man mit Steigung, z. B. M${de(t.d)}×${de(t.p > 1 ? t.p - 0.5 : 0.5)}.`,
        link: `#/m/gewinde?t=M&id=${t.d}x${t.p}`,
      };
    },
    (r) => {
      const t = pick(r, THREADS.filter((x) => screwSize(x.d)?.sw));
      const s = screwSize(t.d);
      const others = THREADS.map((x) => screwSize(x.d)?.sw).filter((v) => v && v !== s.sw && Math.abs(v - s.sw) <= 6);
      return {
        q: `Welche Schlüsselweite hat eine Sechskantschraube M${de(t.d)} nach ISO?`,
        ...choices(r, `SW ${de(s.sw)}`, [...others, ...(s.swDin ? [s.swDin] : [])].map((v) => `SW ${de(v)}`)),
        explain: `ISO 4014/4017: M${de(t.d)} → SW ${de(s.sw)}.${s.swDin ? ` Die alte DIN 933 hatte hier SW ${de(s.swDin)}.` : ''} Innensechskant ISO 4762: ${de(s.isk)} mm.`,
        link: `#/m/schrauben?g=${t.d}x${t.p}`,
      };
    },
    (r) => {
      const t = pick(r, THREADS.filter((x) => x.d >= 4));
      const s = screwSize(t.d);
      return {
        q: `Welchen Innensechskant (Inbus) hat eine Zylinderschraube M${de(t.d)} nach ISO 4762?`,
        ...choices(r, `${de(s.isk)} mm`, THREADS.map((x) => screwSize(x.d)?.isk).filter((v) => v && v !== s.isk && Math.abs(v - s.isk) <= 5).map((v) => `${de(v)} mm`)),
        explain: `ISO 4762: M${de(t.d)} → Innensechskant ${de(s.isk)} mm. Faustwert für mittlere Größen: etwa 0,8 · d.`,
        link: `#/m/schrauben?g=${t.d}x${t.p}`,
      };
    },
  ],
  passung: [
    (r) => {
      const c = pick(r, COMMON_FITS.filter((x) => x.fit.startsWith('H')));
      const d = pick(r, [10, 16, 20, 25, 30, 40, 50, 63, 80]);
      const [h, s] = c.fit.split('/');
      const f = fit(d, h, s);
      const names = { spiel: 'Spielpassung', uebergang: 'Übergangspassung', uebermass: 'Übermaßpassung' };
      const options = ['Spielpassung', 'Übergangspassung', 'Übermaßpassung'];
      const clr = (v) => (v >= 0 ? `Spiel ${de(v / 1000)}` : `Übermaß ${de(-v / 1000)}`);
      return {
        q: `Welche Passungsart ist Ø ${d} ${c.fit}?`,
        options,
        answer: options.indexOf(names[f.kind]),
        explain: `Größtes ${clr(f.max)} mm, kleinstes ${clr(f.min)} mm → ${names[f.kind]}. Anwendung: ${c.use}.`,
        link: `#/m/passungen?d=${d}&h=${h}&s=${s}`,
      };
    },
    (r) => {
      const d = pick(r, [8, 12, 20, 25, 35, 45, 60, 90]);
      const grade = pick(r, [6, 7, 8]);
      const t = tolerance(`H${grade}`, d);
      const it = t.it / 1000;
      return {
        q: `Welche Grenzabmaße hat eine Bohrung Ø ${d} H${grade}?`,
        ...choices(r, `${signed(it)} / 0 mm`, [`0 / ${signed(-it)} mm`, `${signed(it / 2)} / ${signed(-it / 2)} mm`, `${signed(it * 2)} / 0 mm`, `${signed(tolerance(`H${grade + 1}`, d).it / 1000)} / 0 mm`]),
        explain: `Bei H liegt das untere Abmaß auf der Nulllinie (EI = 0). Das obere Abmaß ist die Grundtoleranz IT${grade} für ${d} mm: ${t.it} µm = ${de(it)} mm.`,
        link: `#/m/passungen?d=${d}&h=H${grade}&s=h6`,
      };
    },
    (r) => {
      const d = pick(r, [8, 15, 25, 50, 80, 150, 250]);
      const k = pick(r, ['f', 'm', 'c']);
      const names = { f: 'fein', m: 'mittel', c: 'grob' };
      const t = linearTolerance(d, k);
      const others = ['f', 'm', 'c', 'v'].filter((x) => x !== k).map((x) => linearTolerance(d, x)).filter((x) => x && x !== t);
      return {
        q: `Welches Freimaß gilt für ${d} mm nach ISO 2768-${k} (${names[k]})?`,
        ...choices(r, `±${de(t)} mm`, [...others, t * 2, t / 2].map((x) => `±${de(x)} mm`)),
        explain: `ISO 2768-1, Klasse ${k} (${names[k]}), Bereich bis ${d} mm: ±${de(t)} mm. Grenzmaße ${de(d - t)} … ${de(d + t)} mm.`,
        link: `#/m/allgemeintoleranzen?d=${d}&k=${k}`,
      };
    },
    (r) => {
      const c = pick(r, [['h', 'Welle', 'oberes Abmaß 0 (Einheitswelle)'], ['H', 'Bohrung', 'unteres Abmaß 0 (Einheitsbohrung)']]);
      return {
        q: `Was bedeutet der Großbuchstabe bzw. Kleinbuchstabe im Kurzzeichen „${c[0]}7“?`,
        ...choices(r, `${c[1]}, ${c[2]}`, ['Welle, oberes Abmaß 0 (Einheitswelle)', 'Bohrung, unteres Abmaß 0 (Einheitsbohrung)', 'Bohrung, oberes Abmaß 0', 'Welle, unteres Abmaß 0']),
        explain: 'Großbuchstaben stehen für Bohrungen (Innenmaße), Kleinbuchstaben für Wellen (Außenmaße). H und h liegen direkt an der Nulllinie; die Zahl ist der Toleranzgrad IT.',
        link: '#/m/passungen',
      };
    },
  ],
  zerspanung: [
    (r) => {
      const d = pick(r, [20, 25, 32, 40, 50, 63, 80, 100]);
      const vc = pick(r, [80, 120, 150, 180, 200, 250]);
      const n = Math.round(rpm(vc, d));
      const wrong = [Math.round(vc * 1000 / d), Math.round(vc * 1000 / (Math.PI * d * 2)), Math.round(vc * Math.PI * d / 1000), Math.round(n * 1.5), Math.round(n / 1.5)];
      return {
        q: `Drehen: vc = ${vc} m/min, Ø ${d} mm. Welche Drehzahl stellst du ein?`,
        ...choices(r, `${de(n, 0)} 1/min`, wrong.map((v) => `${de(v, 0)} 1/min`)),
        explain: `n = vc · 1000 / (π · d) = ${vc} · 1000 / (π · ${d}) = ${de(n, 0)} 1/min.`,
        link: `#/m/schnittwerte?v=turn&d=${d}&vc=${vc}`,
      };
    },
    (r) => {
      const n = pick(r, [1000, 1500, 2000, 2500, 3000, 4000]);
      const z = pick(r, [2, 3, 4, 5, 6]);
      const fz = pick(r, [0.03, 0.05, 0.08, 0.1, 0.12]);
      const vf = Math.round(n * z * fz);
      return {
        q: `Fräsen: n = ${de(n)} 1/min, z = ${z}, fz = ${de(fz)} mm. Welche Vorschubgeschwindigkeit vf?`,
        ...choices(r, `${de(vf, 0)} mm/min`, [Math.round(n * fz), Math.round(n * z * fz * 10), Math.round(n * fz / z), Math.round(vf * 2)].map((v) => `${de(v, 0)} mm/min`)),
        explain: `vf = n · z · fz = ${de(n)} · ${z} · ${de(fz)} = ${de(vf, 0)} mm/min.`,
        link: `#/m/schnittwerte?v=mill&z=${z}&fz=${fz}`,
      };
    },
    (r) => {
      const L = pick(r, [60, 90, 120, 150, 200]);
      const vf = pick(r, [100, 150, 200, 300, 400]);
      const th = L / vf;
      return {
        q: `Weg L = ${L} mm, vf = ${vf} mm/min. Wie lang ist die Hauptzeit?`,
        ...choices(r, `${de(th, 2)} min`, [vf / L, (L * vf) / 1000, th * 2, th * 60].map((v) => `${de(v, 2)} min`)),
        explain: `th = L / vf = ${L} / ${vf} = ${de(th, 2)} min = ${de(th * 60, 0)} s.`,
        link: '#/m/schnittwerte',
      };
    },
    (r) => {
      const items = [
        ['Edelstahl (rostfrei)', 'M', 'gelb'], ['Stahl', 'P', 'blau'], ['Gusseisen', 'K', 'rot'],
        ['Aluminium und NE-Metalle', 'N', 'grün'], ['Titan und Nickellegierungen', 'S', 'orange/braun'], ['Gehärteter Stahl', 'H', 'grau'],
      ];
      const [name, iso, color] = pick(r, items);
      return {
        q: `Welche ISO-Zerspanungsgruppe gilt für: ${name}?`,
        ...choices(r, iso, items.map((i) => i[1])),
        explain: `ISO 513: ${name} → Gruppe ${iso}, Kennfarbe ${color}. Die Gruppen sind P, M, K, N, S und H.`,
        link: '#/m/schnittwerte',
      };
    },
  ],
  formlage: [
    (r) => {
      const s = pick(r, SYMBOLS);
      return {
        q: 'Wie heißt dieses Symbol nach ISO 1101?',
        svg: s.svg,
        ...choices(r, s.name, SYMBOLS.filter((x) => x.id !== s.id).map((x) => x.name)),
        explain: `${s.name}: ${s.text}`,
        link: `#/m/formlage?s=${s.id}`,
      };
    },
    (r) => {
      const s = pick(r, SYMBOLS);
      const options = ['Ja, immer mit Bezug', 'Nein, ohne Bezug'];
      return {
        q: `Braucht die Toleranz „${s.name}“ einen Bezug?`,
        svg: s.svg,
        options,
        answer: s.datum ? 0 : 1,
        explain: `${s.name} ist ${s.datum ? 'eine Lage-, Richtungs- oder Lauftoleranz und braucht einen Bezug' : 'eine Formtoleranz und steht ohne Bezug'}. ${s.zone}`,
        link: `#/m/formlage?s=${s.id}`,
      };
    },
  ],
  werkstoff: [
    (r) => {
      const m = pick(r, STEELS);
      return {
        q: `Welcher Werkstoff hat die Werkstoffnummer ${m.wnr}?`,
        ...choices(r, m.name, (() => {
          const same = STEELS.filter((x) => x.wnr !== m.wnr && x.wnr.slice(0, 3) === m.wnr.slice(0, 3)).map((x) => x.name);
          return same.length >= 3 ? same : STEELS.filter((x) => x.wnr !== m.wnr).map((x) => x.name);
        })()),
        explain: `${m.wnr} = ${m.name}${m.old && m.old !== '–' ? ` (alt: ${m.old})` : ''}${m.aisi && m.aisi !== '–' ? `, AISI/UNS: ${m.aisi}` : ''}. ${m.use}`,
        link: `#/m/werkstoffe?w=${m.wnr}`,
      };
    },
    (r) => {
      const hrc = pick(r, [25, 30, 35, 40, 45, 50, 55, 60]);
      const c = convertHardness(hrc, 'HRC');
      const hv = Math.round(c.HV / 10) * 10;
      return {
        q: `Etwa wie viel Vickers-Härte entsprechen ${hrc} HRC?`,
        ...choices(r, `≈ ${hv} HV`, [hv - 100, hv + 100, hrc * 10, hv + 200, Math.round(c.HV * 0.6 / 10) * 10].filter((v) => v > 0).map((v) => `≈ ${v} HV`)),
        explain: `Nach ISO 18265 entsprechen ${hrc} HRC etwa ${de(c.HV, 0)} HV${c.Rm ? ` bzw. einer Zugfestigkeit von etwa ${de(c.Rm, 0)} N/mm²` : ''}.`,
        link: `#/m/haerte?x=${hrc}&s=HRC`,
      };
    },
    (r) => {
      const items = [['1.4301', 'V2A'], ['1.4571', 'V4A'], ['1.0503', 'C45'], ['1.7225', '42CrMo4'], ['1.0038', 'S235JR']];
      const [wnr, short] = pick(r, items);
      return {
        q: `Welche Werkstoffnummer hat ${short}?`,
        ...choices(r, wnr, items.map((i) => i[0]).concat(['1.4404', '1.2379', '1.0718'])),
        explain: `${short} = ${wnr}.`,
        link: `#/m/werkstoffe?w=${wnr}`,
      };
    },
  ],
  einheiten: [
    (r) => {
      const fr = pick(r, [['1/4', 0.25], ['3/8', 0.375], ['1/2', 0.5], ['5/8', 0.625], ['3/4', 0.75], ['1', 1], ['1/8', 0.125]]);
      const mm = fr[1] * 25.4;
      return {
        q: `Wie viel mm sind ${fr[0]} Zoll?`,
        ...choices(r, `${de(mm, 3)} mm`, [fr[1] * 25, fr[1] * 24.5, fr[1] * 2.54, mm + 1.5875, mm - 1.5875].map((v) => `${de(v, 3)} mm`)),
        explain: `1 Zoll = 25,4 mm → ${fr[0]}″ = ${de(fr[1], 3)} · 25,4 = ${de(mm, 3)} mm.`,
        link: `#/m/einheiten?k=laenge&e=in&x=${encodeURIComponent(fr[0])}`,
      };
    },
    (r) => {
      const c = pick(r, N_CLASSES.slice(3, 11));
      return {
        q: `Welche Rauheitsklasse entspricht Ra ${de(c.ra)} µm?`,
        ...choices(r, c.n, N_CLASSES.filter((x) => x.n !== c.n && Math.abs(N_CLASSES.indexOf(x) - N_CLASSES.indexOf(c)) <= 3).map((x) => x.n)),
        explain: `ISO 1302: ${c.n} = Ra ${de(c.ra)} µm. Jede Klasse höher verdoppelt etwa den Ra-Wert.`,
        link: `#/m/rauheit?ra=${c.ra}`,
      };
    },
    (r) => {
      const bar = pick(r, [6, 10, 50, 100, 200]);
      const psi = bar * 14.5038;
      return {
        q: `${bar} bar sind etwa …`,
        ...choices(r, `${de(Math.round(psi))} psi`, [bar * 10, bar * 100, Math.round(bar * 1.45), Math.round(psi * 2)].map((v) => `${de(v)} psi`)),
        explain: `1 bar ≈ 14,5 psi → ${bar} bar ≈ ${de(psi, 1)} psi. Außerdem: 1 bar = 0,1 MPa = 0,1 N/mm².`,
        link: `#/m/einheiten?k=druck&e=bar&x=${bar}`,
      };
    },
  ],
};

/**
 * Eine Runde: `count` Fragen aus den gewählten Themen (leer = alle), möglichst ohne Wiederholung.
 * Frage: { cat, q, options[], answer, explain, link, svg? }
 */
export function makeRound({ cats = [], count = 10, seed } = {}) {
  const r = rng(seed ?? Date.now());
  const ids = shuffle(r, (cats.length ? cats : CATEGORIES.map((c) => c.id)).filter((c) => GENERATORS[c]));
  const out = [];
  const seen = new Set();
  let tries = 0;
  while (out.length < count && tries < count * 20) {
    // Themen reihum, damit eine Runde gemischt ist
    const cat = ids[tries % ids.length];
    tries++;
    const q = pick(r, GENERATORS[cat])(r);
    if (seen.has(q.q)) continue;
    seen.add(q.q);
    out.push({ cat, ...q });
  }
  return out;
}

export function generatorCount() {
  return Object.values(GENERATORS).reduce((n, g) => n + g.length, 0);
}
