// Normteile auswählen und O-Ring-Nuten berechnen.
import { KEYS, RINGS_SHAFT, RINGS_BORE, PINS, WASHERS, ORING_TYPES } from './data.js';

/** Passfeder DIN 6885-1 für einen Wellen-Ø (über … bis). */
export function keyFor(d) {
  const k = KEYS.find((x) => d > x.from && d <= x.to);
  return k ? { ...k, shaftGroove: d - k.t1, hubGroove: d + k.t2 } : null;
}

export function ringFor(d, kind = 'welle') {
  const list = kind === 'bohrung' ? RINGS_BORE : RINGS_SHAFT;
  return list.find((r) => r.d1 === d) || null;
}

export function pinFor(d) {
  return PINS.find((p) => p.d === d) || null;
}

export function washerFor(d) {
  return WASHERS.find((w) => w.d === d) || null;
}

/**
 * O-Ring-Nut (Richtwerte, angelehnt an ISO 3601-2 und Herstellerangaben).
 * @param {object} o
 * @param {string} o.type   kolben | stange | axial
 * @param {boolean} o.dyn   dynamisch (bewegt) statt statisch
 * @param {number} o.d2     Schnurstärke
 * @param {number} [o.D]    Bohrungs-Ø (Kolben) bzw. Stangen-Ø (Stange)
 * @param {number} [o.d1]   Innen-Ø des O-Rings
 */
export function oringGroove({ type, dyn, d2, D, d1 }) {
  const t = ORING_TYPES.find((x) => x.id === type);
  if (!t || !(d2 > 0)) return null;
  const squeeze = dyn ? t.squeeze.dyn : t.squeeze.stat;
  const depth = Math.round(d2 * (1 - squeeze) * 100) / 100;
  const width = Math.round(d2 * t.width * 10) / 10;
  const fill = ((Math.PI * d2 * d2) / 4) / (depth * width);
  const out = { type, squeeze, depth, width, fill };
  if (D > 0 && type === 'kolben') {
    out.grooveDia = D - 2 * depth;
    out.ringId = out.grooveDia; // O-Ring innen ≈ Nutgrund, 2–5 % gedehnt
    if (d1 > 0) out.stretch = (out.grooveDia - d1) / d1;
  }
  if (D > 0 && type === 'stange') {
    out.grooveDia = D + 2 * depth;
    out.ringId = D;
    if (d1 > 0) out.stretch = (D - d1) / d1;
  }
  return out;
}
