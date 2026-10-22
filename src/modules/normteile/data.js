// Normteile: Passfedern, Sicherungsringe, Zylinderstifte, Scheiben, O-Ring-Schnurstärken.

// Passfedern DIN 6885-1 (Form A/B). Wellen-Ø über … bis, b × h, Wellennuttiefe t1, Nabennuttiefe t2.
export const KEYS = [
  { from: 6, to: 8, b: 2, h: 2, t1: 1.2, t2: 1 },
  { from: 8, to: 10, b: 3, h: 3, t1: 1.8, t2: 1.4 },
  { from: 10, to: 12, b: 4, h: 4, t1: 2.5, t2: 1.8 },
  { from: 12, to: 17, b: 5, h: 5, t1: 3, t2: 2.3 },
  { from: 17, to: 22, b: 6, h: 6, t1: 3.5, t2: 2.8 },
  { from: 22, to: 30, b: 8, h: 7, t1: 4, t2: 3.3 },
  { from: 30, to: 38, b: 10, h: 8, t1: 5, t2: 3.3 },
  { from: 38, to: 44, b: 12, h: 8, t1: 5, t2: 3.3 },
  { from: 44, to: 50, b: 14, h: 9, t1: 5.5, t2: 3.8 },
  { from: 50, to: 58, b: 16, h: 10, t1: 6, t2: 4.3 },
  { from: 58, to: 65, b: 18, h: 11, t1: 7, t2: 4.4 },
  { from: 65, to: 75, b: 20, h: 12, t1: 7.5, t2: 4.9 },
  { from: 75, to: 85, b: 22, h: 14, t1: 9, t2: 5.4 },
  { from: 85, to: 95, b: 25, h: 14, t1: 9, t2: 5.4 },
  { from: 95, to: 110, b: 28, h: 16, t1: 10, t2: 6.4 },
  { from: 110, to: 130, b: 32, h: 18, t1: 11, t2: 7.4 },
  { from: 130, to: 150, b: 36, h: 20, t1: 12, t2: 8.4 },
  { from: 150, to: 170, b: 40, h: 22, t1: 13, t2: 9.4 },
  { from: 170, to: 200, b: 45, h: 25, t1: 15, t2: 10.4 },
  { from: 200, to: 230, b: 50, h: 28, t1: 17, t2: 11.4 },
];
export const KEY_LENGTHS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45, 50, 56, 63, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 220, 250];

// Sicherungsringe für Wellen DIN 471: Wellen-Ø d1, Ringdicke s, Nut-Ø d2, Nutbreite m (H13).
export const RINGS_SHAFT = [
  { d1: 3, s: 0.4, d2: 2.8, m: 0.5 },
  { d1: 4, s: 0.4, d2: 3.8, m: 0.5 },
  { d1: 5, s: 0.6, d2: 4.8, m: 0.7 },
  { d1: 6, s: 0.7, d2: 5.7, m: 0.8 },
  { d1: 8, s: 0.8, d2: 7.6, m: 0.9 },
  { d1: 10, s: 1, d2: 9.6, m: 1.1 },
  { d1: 12, s: 1, d2: 11.5, m: 1.1 },
  { d1: 14, s: 1, d2: 13.4, m: 1.1 },
  { d1: 15, s: 1, d2: 14.3, m: 1.1 },
  { d1: 16, s: 1, d2: 15.2, m: 1.1 },
  { d1: 17, s: 1, d2: 16.2, m: 1.1 },
  { d1: 18, s: 1.2, d2: 17, m: 1.3 },
  { d1: 20, s: 1.2, d2: 19, m: 1.3 },
  { d1: 22, s: 1.2, d2: 21, m: 1.3 },
  { d1: 25, s: 1.2, d2: 23.9, m: 1.3 },
  { d1: 28, s: 1.5, d2: 26.6, m: 1.6 },
  { d1: 30, s: 1.5, d2: 28.6, m: 1.6 },
  { d1: 32, s: 1.5, d2: 30.3, m: 1.6 },
  { d1: 35, s: 1.5, d2: 33, m: 1.6 },
  { d1: 40, s: 1.75, d2: 37.5, m: 1.85 },
  { d1: 45, s: 1.75, d2: 42.5, m: 1.85 },
  { d1: 50, s: 2, d2: 47, m: 2.15 },
  { d1: 55, s: 2, d2: 52, m: 2.15 },
  { d1: 60, s: 2, d2: 57, m: 2.15 },
];

// Sicherungsringe für Bohrungen DIN 472: Bohrungs-Ø d1, Ringdicke s, Nut-Ø d2, Nutbreite m (H13).
export const RINGS_BORE = [
  { d1: 8, s: 0.8, d2: 8.4, m: 0.9 },
  { d1: 9, s: 0.8, d2: 9.4, m: 0.9 },
  { d1: 10, s: 1, d2: 10.4, m: 1.1 },
  { d1: 12, s: 1, d2: 12.5, m: 1.1 },
  { d1: 14, s: 1, d2: 14.6, m: 1.1 },
  { d1: 15, s: 1, d2: 15.7, m: 1.1 },
  { d1: 16, s: 1, d2: 16.8, m: 1.1 },
  { d1: 17, s: 1, d2: 17.8, m: 1.1 },
  { d1: 18, s: 1, d2: 19, m: 1.1 },
  { d1: 19, s: 1, d2: 20, m: 1.1 },
  { d1: 20, s: 1, d2: 21, m: 1.1 },
  { d1: 22, s: 1, d2: 23, m: 1.1 },
  { d1: 24, s: 1.2, d2: 25.2, m: 1.3 },
  { d1: 25, s: 1.2, d2: 26.2, m: 1.3 },
  { d1: 26, s: 1.2, d2: 27.2, m: 1.3 },
  { d1: 28, s: 1.2, d2: 29.4, m: 1.3 },
  { d1: 30, s: 1.2, d2: 31.4, m: 1.3 },
  { d1: 32, s: 1.2, d2: 33.7, m: 1.3 },
  { d1: 35, s: 1.5, d2: 37, m: 1.6 },
  { d1: 38, s: 1.5, d2: 40, m: 1.6 },
  { d1: 40, s: 1.75, d2: 42.5, m: 1.85 },
  { d1: 45, s: 1.75, d2: 47.5, m: 1.85 },
  { d1: 47, s: 1.75, d2: 49.5, m: 1.85 },
  { d1: 50, s: 2, d2: 53, m: 2.15 },
  { d1: 55, s: 2, d2: 58, m: 2.15 },
  { d1: 60, s: 2, d2: 63, m: 2.15 },
];

// Zylinderstifte ISO 2338 (m6, ungehärtet) / ISO 8734 (gehärtet): d, Fase c ≈, Längenbereich l.
export const PINS = [
  { d: 1, c: 0.2, l: [4, 10] },
  { d: 1.5, c: 0.3, l: [4, 16] },
  { d: 2, c: 0.35, l: [6, 20] },
  { d: 2.5, c: 0.4, l: [6, 24] },
  { d: 3, c: 0.5, l: [8, 30] },
  { d: 4, c: 0.63, l: [8, 40] },
  { d: 5, c: 0.8, l: [10, 50] },
  { d: 6, c: 1.2, l: [12, 60] },
  { d: 8, c: 1.6, l: [14, 80] },
  { d: 10, c: 2, l: [18, 95] },
  { d: 12, c: 2.5, l: [22, 140] },
  { d: 16, c: 3, l: [26, 180] },
  { d: 20, c: 3.5, l: [35, 200] },
];
export const PIN_LENGTHS = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 120, 140, 160, 180, 200];

// Flache Scheiben: ISO 7089 (normal, = DIN 125-A) und ISO 7093 (große Reihe).
// d Gewinde, d1 Innen-Ø, d2 Außen-Ø, h Dicke.
export const WASHERS = [
  { d: 2, n: { d1: 2.2, d2: 5, h: 0.3 }, l: null },
  { d: 2.5, n: { d1: 2.7, d2: 6, h: 0.5 }, l: null },
  { d: 3, n: { d1: 3.2, d2: 7, h: 0.5 }, l: { d1: 3.2, d2: 9, h: 0.8 } },
  { d: 4, n: { d1: 4.3, d2: 9, h: 0.8 }, l: { d1: 4.3, d2: 12, h: 1 } },
  { d: 5, n: { d1: 5.3, d2: 10, h: 1 }, l: { d1: 5.3, d2: 15, h: 1.2 } },
  { d: 6, n: { d1: 6.4, d2: 12, h: 1.6 }, l: { d1: 6.4, d2: 18, h: 1.6 } },
  { d: 8, n: { d1: 8.4, d2: 16, h: 1.6 }, l: { d1: 8.4, d2: 24, h: 2 } },
  { d: 10, n: { d1: 10.5, d2: 20, h: 2 }, l: { d1: 10.5, d2: 30, h: 2.5 } },
  { d: 12, n: { d1: 13, d2: 24, h: 2.5 }, l: { d1: 13, d2: 37, h: 3 } },
  { d: 14, n: { d1: 15, d2: 28, h: 2.5 }, l: null },
  { d: 16, n: { d1: 17, d2: 30, h: 3 }, l: { d1: 17, d2: 50, h: 3 } },
  { d: 20, n: { d1: 21, d2: 37, h: 3 }, l: { d1: 22, d2: 60, h: 4 } },
  { d: 24, n: { d1: 25, d2: 44, h: 4 }, l: null },
  { d: 30, n: { d1: 31, d2: 56, h: 4 }, l: null },
  { d: 36, n: { d1: 37, d2: 66, h: 5 }, l: null },
];

// Übliche O-Ring-Schnurstärken d2 (metrisch und AS 568 / ISO 3601-1).
export const ORING_SECTIONS = [1, 1.5, 1.78, 2, 2.5, 2.62, 3, 3.53, 4, 5, 5.33, 6, 6.99];

// Einbauarten mit Richtwerten für die Verpressung (Anteil der Schnurstärke) und Nutbreite (Faktor × d2).
export const ORING_TYPES = [
  { id: 'kolben', label: 'Kolben (Nut in der Welle, radial)', squeeze: { stat: 0.2, dyn: 0.12 }, width: 1.35 },
  { id: 'stange', label: 'Stange (Nut in der Bohrung, radial)', squeeze: { stat: 0.2, dyn: 0.12 }, width: 1.35 },
  { id: 'axial', label: 'Axial (Flansch, Deckel)', squeeze: { stat: 0.25, dyn: 0.25 }, width: 1.4 },
];
