// Montagevorspannkraft und Anziehdrehmoment nach VDI 2230 Blatt 1 (vereinfachte Standardrechnung).
import { profile60 } from '../gewinde/calc.js';
import { CLEARANCE } from '../gewinde/data.js';
import { SCREW_SIZES, PROPERTY_CLASSES } from './data.js';

export function screwSize(d) {
  return SCREW_SIZES.find((s) => s.d === d) || null;
}

export function propertyClass(key) {
  return PROPERTY_CLASSES.find((c) => c.key === key) || null;
}

/**
 * @param {object} o
 * @param {number} o.d       Nenndurchmesser mm
 * @param {number} o.p       Steigung mm
 * @param {string} o.cls     Festigkeitsklasse, z. B. "8.8"
 * @param {number} [o.muG]   Reibwert im Gewinde
 * @param {number} [o.muK]   Reibwert unter Kopf
 * @param {number} [o.nu]    Ausnutzung der Streckgrenze (VDI-Standard 0,9)
 * @param {number} [o.dw]    Kopfauflage-Außendurchmesser; Standard Schlüsselweite bzw. Kopfdurchmesser
 * @param {number} [o.dh]    Bohrungsdurchmesser; Standard Durchgangsbohrung mittel (ISO 273)
 * @returns Vorspannkraft FM in N, Anziehdrehmoment MA in Nm und Zwischenwerte
 */
export function tighteningTorque({ d, p, cls, muG = 0.12, muK = 0.12, nu = 0.9, dw, dh }) {
  const pc = propertyClass(cls);
  if (!pc || !(d > 0) || !(p > 0)) return null;
  const size = screwSize(d);
  const headDia = dw ?? size?.sw ?? 1.5 * d;
  const hole = dh ?? CLEARANCE[d]?.[1] ?? 1.1 * d;
  const { d2, d3 } = profile60(d, p);
  const d0 = (d2 + d3) / 2;
  const As = (Math.PI / 4) * d0 ** 2;
  const rp = pc.rp(d);
  // Zulässige Montagevorspannung bei Ausnutzung nu der Streckgrenze (Vergleichsspannung aus Zug und Torsion)
  const torsion = 1.5 * (d2 / d0) * (p / (Math.PI * d2) + 1.155 * muG);
  const sigmaM = (nu * rp) / Math.sqrt(1 + 3 * torsion ** 2);
  const FM = sigmaM * As;
  const DKm = (headDia + hole) / 2;
  const lever = 0.16 * p + 0.58 * d2 * muG + (DKm / 2) * muK; // mm
  const MA = (FM * lever) / 1000; // N·mm → Nm
  return { d, p, cls, muG, muK, nu, rp, As, d2, d3, d0, sigmaM, FM, DKm, headDia, hole, MA };
}
