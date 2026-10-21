// ISO 2768-1 (Längen, Radien/Fasen, Winkel) und ISO 2768-2 (Form und Lage).
// Bereiche "über ... bis einschließlich"; null = für diese Klasse nicht festgelegt.

export const CLASSES_1 = [
  { key: 'f', name: 'fein' },
  { key: 'm', name: 'mittel' },
  { key: 'c', name: 'grob' },
  { key: 'v', name: 'sehr grob' },
];

/** Längenmaße: untere Grenze, obere Grenze, ± Grenzabmaße in mm für f, m, c, v. */
export const LINEAR = [
  { from: 0.5, to: 3, f: 0.05, m: 0.1, c: 0.2, v: null },
  { from: 3, to: 6, f: 0.05, m: 0.1, c: 0.3, v: 0.5 },
  { from: 6, to: 30, f: 0.1, m: 0.2, c: 0.5, v: 1 },
  { from: 30, to: 120, f: 0.15, m: 0.3, c: 0.8, v: 1.5 },
  { from: 120, to: 400, f: 0.2, m: 0.5, c: 1.2, v: 2.5 },
  { from: 400, to: 1000, f: 0.3, m: 0.8, c: 2, v: 4 },
  { from: 1000, to: 2000, f: 0.5, m: 1.2, c: 3, v: 6 },
  { from: 2000, to: 4000, f: null, m: 2, c: 4, v: 8 },
];

/** Rundungshalbmesser und Fasenhöhen. */
export const RADIUS = [
  { from: 0.5, to: 3, f: 0.2, m: 0.2, c: 0.4, v: 0.4 },
  { from: 3, to: 6, f: 0.5, m: 0.5, c: 1, v: 1 },
  { from: 6, to: Infinity, f: 1, m: 1, c: 2, v: 2 },
];

/** Winkelmaße nach Länge des kürzeren Schenkels, Werte in Winkelminuten. */
export const ANGLE = [
  { from: 0, to: 10, f: 60, m: 60, c: 90, v: 180 },
  { from: 10, to: 50, f: 30, m: 30, c: 60, v: 120 },
  { from: 50, to: 120, f: 20, m: 20, c: 30, v: 60 },
  { from: 120, to: 400, f: 10, m: 10, c: 15, v: 30 },
  { from: 400, to: Infinity, f: 5, m: 5, c: 10, v: 20 },
];

export const CLASSES_2 = ['H', 'K', 'L'];

/** Geradheit und Ebenheit nach Nennmaß. */
export const STRAIGHTNESS = [
  { from: 0, to: 10, H: 0.02, K: 0.05, L: 0.1 },
  { from: 10, to: 30, H: 0.05, K: 0.1, L: 0.2 },
  { from: 30, to: 100, H: 0.1, K: 0.2, L: 0.4 },
  { from: 100, to: 300, H: 0.2, K: 0.4, L: 0.8 },
  { from: 300, to: 1000, H: 0.3, K: 0.6, L: 1.2 },
  { from: 1000, to: 3000, H: 0.4, K: 0.8, L: 1.6 },
];

/** Rechtwinkligkeit nach Länge des kürzeren Schenkels. */
export const PERPENDICULARITY = [
  { from: 0, to: 100, H: 0.2, K: 0.4, L: 0.6 },
  { from: 100, to: 300, H: 0.3, K: 0.6, L: 1 },
  { from: 300, to: 1000, H: 0.4, K: 0.8, L: 1.5 },
  { from: 1000, to: 3000, H: 0.5, K: 1, L: 2 },
];

/** Symmetrie nach Nennmaß. */
export const SYMMETRY = [
  { from: 0, to: 100, H: 0.5, K: 0.6, L: 0.6 },
  { from: 100, to: 300, H: 0.5, K: 0.6, L: 1 },
  { from: 300, to: 1000, H: 0.5, K: 0.8, L: 1.5 },
  { from: 1000, to: 3000, H: 0.5, K: 1, L: 2 },
];

/** Lauf (Rund- und Planlauf), unabhängig vom Nennmaß. */
export const RUNOUT = { H: 0.1, K: 0.2, L: 0.5 };
