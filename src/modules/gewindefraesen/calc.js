// Gewindefräsen mit Zirkularinterpolation (Helix): Drehzahl, Vorschübe, Bahnradius und NC-Programm.
// Die Steuerung programmiert die Fräsermittelpunktsbahn; der Vorschub an der Schneide (Kontur)
// unterscheidet sich davon: innen ist der Mittelpunktsvorschub kleiner, außen größer.

/**
 * @param {object} o
 * @param {number} o.d       Gewinde-Nenndurchmesser (Außen-Ø bei Innengewinde = Fräsbahn außen)
 * @param {number} o.p       Steigung
 * @param {boolean} o.internal  Innengewinde
 * @param {number} o.D       Fräser-Ø (Schneiden-Ø)
 * @param {number} o.z       Schneidenzahl
 * @param {number} o.vc      Schnittgeschwindigkeit m/min
 * @param {number} o.fz      Zahnvorschub mm
 * @param {number} o.L       Gewindelänge
 * @param {boolean} [o.multi] Mehrzahnfräser (eine Umdrehung deckt die Länge), sonst Einzahn/Gewindegang für Gang
 */
export function threadMill({ d, p, internal = true, D, z, vc, fz, L, multi = false }) {
  if (!(d > 0) || !(p > 0) || !(D > 0) || !(z >= 1) || !(vc > 0) || !(fz > 0)) return null;
  if (internal && D >= d) return { error: 'Fräser-Ø muss kleiner als der Gewinde-Ø sein.' };
  const n = (vc * 1000) / (Math.PI * D);
  const vfContour = n * z * fz;
  const pathDia = internal ? d - D : d + D;
  const vfCenter = vfContour * (pathDia / d);
  const R = pathDia / 2;
  const turns = multi ? 1 : Math.ceil(L / p) + 1;
  const pathLen = turns * Math.hypot(Math.PI * pathDia, p);
  const time = pathLen / vfCenter; // min, ohne An- und Abfahren
  // Profiltiefe (metrisch ISO): Mutter H1 = 0,541·P, Bolzen h3 = 0,613·P
  const depth = internal ? 0.5413 * p : 0.6134 * p;
  return { n, vfContour, vfCenter, pathDia, R, turns, time, depth };
}

const f = (v, d = 3) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '') || '0';

/**
 * Beispielprogramm (DIN 66025 / ISO, Fanuc-ähnlich) im Gleichlauf, Spindel M03.
 * Rechtsgewinde innen: von unten nach oben mit G03. Außen: von oben nach unten mit G02.
 * Linksgewinde: Z-Richtung umgekehrt. Ohne Radiuskorrektur, Nullpunkt in der Gewindemitte, Z0 = Oberkante.
 */
export function ncProgram({ d, p, internal = true, left = false, D, L, multi = false }, r, title = '') {
  const R = r.R;
  const climbUp = internal !== left; // innen rechts / außen links: von unten nach oben
  const z0 = climbUp ? -L : 0;
  const dz = climbUp ? p : -p;
  // Gleichlauf mit M03: innen gegen den Uhrzeigersinn (G03), außen im Uhrzeigersinn (G02).
  // Die Gewinderichtung ergibt sich aus der Z-Richtung (Rechtsgewinde innen nach oben, außen nach unten).
  const g = internal ? 'G03' : 'G02';
  const approach = internal ? 0 : R + D;
  const lines = [
    `(${title || `Gewinde ${internal ? 'innen' : 'aussen'} ${left ? 'links' : 'rechts'}`})`,
    `(Fraeser D${f(D)}, Bahnradius R${f(R)}, Gleichlauf)`,
    `G90 G17 G40`,
    `S${Math.round(r.n)} M03`,
    `G00 X${f(approach)} Y0`,
    `G00 Z${f(climbUp ? z0 : 2)}`,
  ];
  if (!climbUp) lines.push(`G01 Z${f(z0)} F${Math.round(r.vfCenter * 2)}`);
  lines.push(`G01 X${f(R)} Y0 F${Math.round(r.vfCenter / 2)} (radial anfahren)`);
  let z = z0;
  for (let i = 0; i < r.turns; i++) {
    z += dz;
    lines.push(`${g} X${f(R)} Y0 Z${f(z)} I${f(-R)} J0 F${Math.round(r.vfCenter)}`);
  }
  lines.push(`G01 X${f(approach)} Y0 (radial abfahren)`, `G00 Z50`, `M30`);
  if (multi) lines.splice(1, 0, `(Mehrzahnfraeser: eine Umdrehung)`);
  return lines.join('\n');
}
