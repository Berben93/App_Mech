// Senkungen (Kegel- und Zylindersenkungen) und Gewindefreistiche nach DIN 76-1.
import { COUNTERSINK, COUNTERBORE, UNDERCUT_EXT, UNDERCUT_INT } from './data.js';
import { METRIC_COARSE } from '../gewinde/data.js';

export function countersink(d) {
  return COUNTERSINK.find((c) => c.d === d) || null;
}

export function counterbore(d) {
  return COUNTERBORE.find((c) => c.d === d) || null;
}

/**
 * Kegelsenkung: Tiefe von der Oberfläche bis zum Übergang in die Bohrung
 * und Z-Zustellung eines spitzen Senkers ab Oberfläche (Spitze bis Senk-Ø).
 */
export function coneDepth(d2, d1, angle = 90) {
  const t = Math.tan(((angle / 2) * Math.PI) / 180);
  if (!(d2 > 0) || !(t > 0)) return null;
  return { depth: Math.max(d2 - (d1 || 0), 0) / 2 / t, tipZ: d2 / 2 / t };
}

/** Regelsteigung zu einem Nenndurchmesser. */
export function coarsePitch(d) {
  return METRIC_COARSE.find((t) => t.d === d)?.p ?? null;
}

/**
 * Gewindefreistich nach DIN 76-1.
 * @param {number} d  Nenndurchmesser
 * @param {number} p  Steigung
 * @param {'A'|'B'|'C'|'D'} form  A/B Außengewinde (Regel/kurz), C/D Innengewinde (Regel/kurz)
 */
export function undercut(d, p, form = 'A') {
  const internal = form === 'C' || form === 'D';
  const row = (internal ? UNDERCUT_INT : UNDERCUT_EXT).find((r) => r.p === p);
  if (!row || !(d > 0)) return null;
  const [g1, g2] = row[form.toLowerCase()];
  return {
    d, p, form, internal,
    dg: Math.round((internal ? d + row.x : d - row.x) * 1000) / 1000,
    tol: internal ? 'H13' : 'h13',
    g1, g2, r: row.r,
  };
}
