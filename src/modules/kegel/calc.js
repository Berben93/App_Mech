// Kegel und Trigonometrie. Winkel in Grad.
const RAD = Math.PI / 180;

/**
 * Kegel aus großem Ø D, kleinem Ø d und Kegellänge L.
 * Liefert Kegelverhältnis C = (D − d)/L, Einstellwinkel α/2 (Oberschlitten) und Kegelwinkel α.
 */
export function cone({ D, d, L }) {
  if (!(L > 0) || !(D >= d) || !(d >= 0)) return null;
  const C = (D - d) / L;
  const half = Math.atan((D - d) / (2 * L)) / RAD;
  return { C, ratio: C > 0 ? 1 / C : Infinity, half, angle: 2 * half };
}

/** Fehlendes Maß aus Kegelverhältnis 1:x: gibt D, d oder L zurück, je nachdem was fehlt. */
export function coneFromRatio({ x, D, d, L }) {
  const C = 1 / x;
  if (D === undefined) return d + C * L;
  if (d === undefined) return D - C * L;
  return (D - d) / C;
}

/** Reitstockverstellung beim Kegeldrehen zwischen Spitzen: VR = (D − d)/2 · Lw/L. */
export function tailstockOffset({ D, d, L, Lw }) {
  return ((D - d) / 2) * (Lw / L);
}

/**
 * Rechtwinkliges Dreieck: aus zwei Angaben (a Gegenkathete, b Ankathete, c Hypotenuse, alpha Winkel
 * gegenüber a) die übrigen berechnen.
 */
export function rightTriangle({ a, b, c, alpha }) {
  const has = (v) => Number.isFinite(v) && v > 0;
  let A = a; let B = b; let C = c; let al = alpha;
  if (has(al) && al >= 90) return null;
  if (has(A) && has(B)) { C = Math.hypot(A, B); al = Math.atan2(A, B) / RAD; }
  else if (has(A) && has(C)) { if (A >= C) return null; B = Math.sqrt(C * C - A * A); al = Math.asin(A / C) / RAD; }
  else if (has(B) && has(C)) { if (B >= C) return null; A = Math.sqrt(C * C - B * B); al = Math.acos(B / C) / RAD; }
  else if (has(al) && has(A)) { B = A / Math.tan(al * RAD); C = A / Math.sin(al * RAD); }
  else if (has(al) && has(B)) { A = B * Math.tan(al * RAD); C = B / Math.cos(al * RAD); }
  else if (has(al) && has(C)) { A = C * Math.sin(al * RAD); B = C * Math.cos(al * RAD); }
  else return null;
  return { a: A, b: B, c: C, alpha: al, beta: 90 - al, slope: A / B, percent: (A / B) * 100, ratio: B / A };
}

/**
 * Lochkreis: n Bohrungen auf Durchmesser D, erste Bohrung bei Winkel start (0° = +X, gegen Uhrzeigersinn).
 * Liefert Koordinaten relativ zur Mitte (cx, cy) und den Abstand benachbarter Bohrungen (Sehne).
 */
export function boltCircle({ D, n, start = 0, cx = 0, cy = 0 }) {
  if (!(D > 0) || !(n >= 1) || !Number.isInteger(n)) return null;
  const r = D / 2;
  const holes = Array.from({ length: n }, (_, i) => {
    const ang = start + (360 / n) * i;
    const x = cx + r * Math.cos(ang * RAD);
    const y = cy + r * Math.sin(ang * RAD);
    return { i: i + 1, angle: ang % 360, x: Math.abs(x) < 1e-9 ? 0 : x, y: Math.abs(y) < 1e-9 ? 0 : y };
  });
  return { holes, pitch: n > 1 ? D * Math.sin(Math.PI / n) : 0, step: 360 / n };
}

/** Sinuslineal: Endmaßhöhe h = L · sin α bzw. Winkel aus h. */
export function sineBar({ L, alpha, h }) {
  if (!(L > 0)) return null;
  if (Number.isFinite(alpha)) return { h: L * Math.sin(alpha * RAD), alpha };
  if (Number.isFinite(h) && h <= L) return { h, alpha: Math.asin(h / L) / RAD };
  return null;
}

/**
 * Endmaßkombination aus einem Satz mit 46 Stück (DIN EN ISO 3650):
 * 1,001–1,009; 1,01–1,09; 1,1–1,9; 1–9; 10–100 (in 10er-Schritten).
 * Gibt die Endmaße zurück (möglichst wenige, je Reihe eins), Rest in µm-Genauigkeit.
 */
export function gaugeBlocks(height) {
  let rest = Math.round(height * 1000); // µm
  if (!(rest >= 1000)) return null;
  const blocks = [];
  const take = (v) => { blocks.push(v / 1000); rest -= v; };
  const thou = rest % 10; // 0,001er
  if (thou) take(1000 + thou);
  const hund = Math.floor((rest % 100) / 10); // 0,01er
  if (hund && rest >= 1000 + hund * 10) take(1000 + hund * 10);
  const tenth = Math.floor((rest % 1000) / 100); // 0,1er
  if (tenth && rest >= 1000 + tenth * 100) take(1000 + tenth * 100);
  if (rest % 1000 !== 0) return null;
  const mm = rest / 1000;
  const tens = Math.floor(mm / 10) * 10;
  const ones = mm - tens;
  const tensBlocks = [];
  let t = tens;
  while (t > 100) { tensBlocks.push(100); t -= 100; }
  if (t) tensBlocks.push(t);
  for (const b of tensBlocks) take(b * 1000);
  if (ones) take(ones * 1000);
  // Jedes Endmaß gibt es im Satz nur einmal
  return rest === 0 && new Set(blocks).size === blocks.length ? blocks : null;
}
