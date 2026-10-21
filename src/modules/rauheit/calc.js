// Theoretische Rauheit beim Drehen aus Vorschub f (mm/U) und Eckenradius r (mm).
// Rth = f² / (8·r); Ra ≈ f² / (18·√3·r) ≈ f² / (31,2·r). Ergebnisse in µm.

import { N_CLASSES } from './data.js';

const K_RA = 18 * Math.sqrt(3);

export function theoreticalRoughness(f, r) {
  if (!(f > 0) || !(r > 0)) return null;
  return { Rth: (f * f) / (8 * r) * 1000, Ra: (f * f) / (K_RA * r) * 1000 };
}

/** Größter Vorschub für ein gefordertes Ra (µm) bei Eckenradius r. */
export function maxFeedForRa(ra, r) {
  if (!(ra > 0) || !(r > 0)) return null;
  return Math.sqrt((ra / 1000) * K_RA * r);
}

/** Größter Vorschub für eine geforderte Rauhtiefe Rz ≈ Rth (µm). */
export function maxFeedForRz(rz, r) {
  if (!(rz > 0) || !(r > 0)) return null;
  return Math.sqrt((rz / 1000) * 8 * r);
}

/** Passende N-Klasse (nächster Normwert ≥ Ra). */
export function nClassFor(ra) {
  return N_CLASSES.find((c) => ra <= c.ra * 1.0001) || null;
}
