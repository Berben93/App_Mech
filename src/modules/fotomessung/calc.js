// Gewinde aus einem Foto bestimmen: Münze als Maßstab, Durchmesser und Steigung aus markierten Punkten.
// Ohne DOM (getestet).
import { METRIC_COARSE, METRIC_FINE, UNIFIED, PIPE_G } from '../gewinde/data.js';
import { metric, unified, pipe } from '../gewinde/calc.js';

/** Münzen mit Durchmesser in mm (Herausgeber-Angaben). */
export const COINS = [
  { id: 'eur2', name: '2 Euro', d: 25.75 },
  { id: 'eur1', name: '1 Euro', d: 23.25 },
  { id: 'eur050', name: '50 Cent', d: 24.25 },
  { id: 'eur020', name: '20 Cent', d: 22.25 },
  { id: 'eur010', name: '10 Cent', d: 19.75 },
  { id: 'eur005', name: '5 Cent', d: 21.25 },
  { id: 'eur002', name: '2 Cent', d: 18.75 },
  { id: 'eur001', name: '1 Cent', d: 16.25 },
  { id: 'chf1', name: '1 Franken (CH)', d: 23.2 },
  { id: 'chf5', name: '5 Franken (CH)', d: 31.45 },
  { id: 'pln1', name: '1 Złoty (PL)', d: 23 },
  { id: 'pln5', name: '5 Złotych (PL)', d: 24 },
  { id: 'try1', name: '1 Lira (TR)', d: 26.15 },
  { id: 'usd025', name: 'Quarter (US)', d: 24.26 },
  { id: 'own', name: 'Eigene Referenz (Ø eingeben)', d: null },
];

export function distance(a, b) {
  return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : NaN;
}

/**
 * Messung auswerten. Punkte in Bildpixeln.
 *   ref: [a, b] über den Münzdurchmesser, refMm: Durchmesser der Referenz
 *   dia: [a, b] quer über das Gewinde, pitch: [a, b] entlang der Achse über `count` Gänge
 * Liefert { mmPerPx, d, p, dErr, pErr } (NaN, wenn etwas fehlt).
 */
export function measure({ ref, refMm, dia, pitch, count = 1, clickPx = 2 }) {
  const refPx = distance(ref?.[0], ref?.[1]);
  if (!(refPx > 0) || !(refMm > 0)) return { mmPerPx: NaN, d: NaN, p: NaN, dErr: NaN, pErr: NaN };
  const mmPerPx = refMm / refPx;
  const dPx = distance(dia?.[0], dia?.[1]);
  const pPx = distance(pitch?.[0], pitch?.[1]);
  const n = Math.max(1, Math.round(count));
  const d = dPx * mmPerPx;
  const p = (pPx * mmPerPx) / n;
  // Unsicherheit: je Messpunkt etwa ±clickPx, dazu der Fehler des Maßstabs
  const relRef = (2 * clickPx) / refPx;
  const dErr = d * relRef + 2 * clickPx * mmPerPx;
  const pErr = p * relRef + (2 * clickPx * mmPerPx) / n;
  return { mmPerPx, d, p, dErr, pErr };
}

/** Alle Normgewinde mit Außen- und Kerndurchmesser der Mutter, für den Vergleich. */
function candidates() {
  const out = [];
  for (const t of METRIC_COARSE) out.push({ ...metric(t.d), params: { t: 'M', id: `${t.d}x${t.p}` } });
  for (const t of METRIC_FINE) out.push({ ...metric(t.d, t.p), params: { t: 'MF', id: `${t.d}x${t.p}` } });
  for (const u of UNIFIED) {
    if (u.unc) out.push({ ...unified(u.size, 'UNC'), params: { t: 'UNC', id: u.size } });
    if (u.unf) out.push({ ...unified(u.size, 'UNF'), params: { t: 'UNF', id: u.size } });
  }
  for (const g of PIPE_G) out.push({ ...pipe(g.size), params: { t: 'G', id: g.size } });
  return out;
}

let CACHE = null;

/**
 * Passende Normgewinde zu gemessenem Ø (außen am Bolzen oder innen in der Mutter) und optional Steigung.
 * Liefert die besten `limit` Treffer mit { name, type, d, p, D1, score, dd, dp, params }.
 */
export function matchThread({ d, p, internal = false, limit = 5 }) {
  if (!(d > 0)) return [];
  CACHE ||= candidates();
  const hasP = p > 0;
  const tolD = Math.max(0.25, d * 0.035);
  const rows = CACHE.map((t) => {
    const ref = internal ? t.D1 : t.d;
    const dd = d - ref;
    const dp = hasP ? p - t.p : 0;
    const tolP = Math.max(0.06, t.p * 0.07);
    // Bolzen sind meist etwas kleiner als das Nennmaß: leichte Untermaße weniger streng werten
    const dPenalty = !internal && dd < 0 ? Math.abs(dd) * 0.75 : Math.abs(dd);
    let score = (dPenalty / tolD) ** 2 + (hasP ? (Math.abs(dp) / tolP) ** 2 : 0);
    // ohne Steigung: Regelgewinde bevorzugen
    if (!hasP && t.type !== 'M') score += 0.6;
    return { name: t.name, type: t.type, d: t.d, p: t.p, D1: t.D1, tpi: t.tpi, score, dd, dp, params: t.params };
  });
  return rows.sort((a, b) => a.score - b.score).slice(0, limit);
}

/** Wie gut passt der beste Treffer? good | fair | poor */
export function confidence(best, second) {
  if (!best) return 'poor';
  if (best.score < 1 && (!second || second.score > best.score * 2.5)) return 'good';
  if (best.score < 4) return 'fair';
  return 'poor';
}
