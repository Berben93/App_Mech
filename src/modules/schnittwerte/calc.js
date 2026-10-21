// Grundformeln der Zerspanung. Einheiten: mm, m/min, mm/U, mm/min, kW, min.

/** Drehzahl n = vc·1000 / (π·d) in 1/min. */
export function rpm(vc, d) {
  return d > 0 ? (vc * 1000) / (Math.PI * d) : NaN;
}

/** Schnittgeschwindigkeit vc = π·d·n / 1000 in m/min. */
export function cuttingSpeed(n, d) {
  return (Math.PI * d * n) / 1000;
}

/** Drehen: Vorschubgeschwindigkeit, Zeitspanvolumen, Schnittleistung und Hauptzeit. */
export function turning({ d, vc, f, ap, kc, L }) {
  const n = rpm(vc, d);
  const vf = n * f;
  return {
    n,
    vf,
    Q: vc * ap * f, // cm³/min
    Pc: (vc * ap * f * kc) / 60000, // kW
    th: L > 0 ? L / vf : NaN,
  };
}

/** Fräsen: vf = n·z·fz; Q = ap·ae·vf/1000; Pc = Q·kc/60000. */
export function milling({ D, z, vc, fz, ap, ae, kc, L }) {
  const n = rpm(vc, D);
  const vf = n * z * fz;
  const Q = (ap * ae * vf) / 1000;
  return { n, vf, Q, Pc: (Q * kc) / 60000, th: L > 0 ? L / vf : NaN };
}

/** Bohren ins Volle: vf = n·f; Pc = f·D·vc·kc / 240000 (Richtformel). */
export function drilling({ D, vc, f, kc, L }) {
  const n = rpm(vc, D);
  const vf = n * f;
  return {
    n,
    vf,
    Q: (Math.PI * D * D / 4) * vf / 1000,
    Pc: (f * D * vc * kc) / 240000,
    th: L > 0 ? L / vf : NaN,
  };
}

/** Empfohlener Bohrvorschub aus Faktor·D, begrenzt auf sinnvolle Werte. */
export function drillFeed(factor, D) {
  return Math.min(0.6, Math.max(0.02, Math.round(factor * D * 1000) / 1000));
}
