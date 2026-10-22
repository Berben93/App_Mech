// Blechbiegen nach DIN 6935: Korrekturfaktor k, Ausgleichswert v, gestreckte Länge.
// Winkel β = Öffnungswinkel zwischen den Schenkeln (90° = rechtwinklig, 180° = flach).
// Schenkellängen a, b sind Außenmaße bis zum Schnittpunkt der Außenkanten.
import { MIN_RADIUS_STEEL, MIN_RADIUS_FACTOR, DIE_WIDTHS } from './data.js';

/** Korrekturfaktor k (Lage der neutralen Faser): k = 0,65 + 0,5·lg(r/s), höchstens 1. */
export function kFactor(r, s) {
  if (!(r > 0) || !(s > 0)) return NaN;
  return Math.min(1, 0.65 + 0.5 * Math.log10(r / s));
}

/** Ausgleichswert v in mm (negativ = Biegeverkürzung). */
export function compensation(r, s, beta) {
  const k = kFactor(r, s);
  const arc = Math.PI * ((180 - beta) / 180) * (r + (s / 2) * k);
  if (beta >= 0 && beta <= 90) return arc - 2 * (r + s);
  if (beta > 90 && beta <= 165) return arc - 2 * (r + s) * Math.tan(((180 - beta) / 2) * (Math.PI / 180));
  if (beta > 165 && beta <= 180) return 0;
  return NaN;
}

/** Gestreckte Länge L = a + b + v; neutrale Faser, Bogenlänge und Kennwerte. */
export function bend({ s, r, beta, a, b }) {
  const k = kFactor(r, s);
  const v = compensation(r, s, beta);
  const arc = Math.PI * ((180 - beta) / 180) * (r + (s / 2) * k);
  return { k, K: k / 2, v, arc, L: a + b + v, neutral: r + (s / 2) * k };
}

/** Kleinster Biegeradius: Tabellenwert (Stahl) oder Faktor · s. */
export function minRadius(s, groupId) {
  const g = MIN_RADIUS_STEEL.groups.find((x) => x.id === groupId);
  if (g) {
    const i = MIN_RADIUS_STEEL.thickness.findIndex((t) => s <= t + 1e-9);
    return i < 0 ? null : g.r[i];
  }
  const f = MIN_RADIUS_FACTOR.find((x) => x.id === groupId);
  return f ? Math.round(f.factor * s * 10) / 10 : null;
}

/** Empfohlene Gesenkweite V ≈ 8·s (bis 3 mm 6–8·s, darüber 10–12·s), auf die nächste übliche Weite. */
export function dieWidth(s) {
  const target = s <= 3 ? 8 * s : s <= 10 ? 10 * s : 12 * s;
  return DIE_WIDTHS.find((v) => v >= target) ?? DIE_WIDTHS[DIE_WIDTHS.length - 1];
}

/** Presskraft beim Freibiegen in kN: F = 1,42 · Rm · s² · l / (1000 · V). */
export function pressForce({ rm, s, l, V }) {
  return (1.42 * rm * s * s * l) / (1000 * V);
}
