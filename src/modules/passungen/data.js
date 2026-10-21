// ISO 286-1 / ISO 286-2: Grundtoleranzen und Grundabmaße für Nennmaße bis 500 mm.
// Alle Werte in µm. Bereiche gelten "über ... bis einschließlich".

/** Hauptbereiche für die Grundtoleranzen IT1 bis IT18. */
export const IT_RANGES = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];

/** IT_TABLE[grad][bereichIndex] in µm (Grad 1 bis 18). */
export const IT_TABLE = {
  1: [0.8, 1, 1, 1.2, 1.5, 1.5, 2, 2.5, 3.5, 4.5, 6, 7, 8],
  2: [1.2, 1.5, 1.5, 2, 2.5, 2.5, 3, 4, 5, 7, 8, 9, 10],
  3: [2, 2.5, 2.5, 3, 4, 4, 5, 6, 8, 10, 12, 13, 15],
  4: [3, 4, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20],
  5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27],
  6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63],
  8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155],
  10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400],
  12: [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
  13: [140, 180, 220, 270, 330, 390, 460, 540, 630, 720, 810, 890, 970],
  14: [250, 300, 360, 430, 520, 620, 740, 870, 1000, 1150, 1300, 1400, 1550],
  15: [400, 480, 580, 700, 840, 1000, 1200, 1400, 1600, 1850, 2100, 2300, 2500],
  16: [600, 750, 900, 1100, 1300, 1600, 1900, 2200, 2500, 2900, 3200, 3600, 4000],
  17: [1000, 1200, 1500, 1800, 2100, 2500, 3000, 3500, 4000, 4600, 5200, 5700, 6300],
  18: [1400, 1800, 2200, 2700, 3300, 3900, 4600, 5400, 6300, 7200, 8100, 8900, 9700],
};

/** Feinere Zwischenbereiche, die einige Grundabmaße benötigen. */
export const FINE_RANGES = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];

// Hilfsfunktion: Werte je Hauptbereich auf die Zwischenbereiche ausrollen.
const MAIN_TO_FINE = FINE_RANGES.map((upper) => IT_RANGES.findIndex((u) => upper <= u));
const spread = (mainValues) => MAIN_TO_FINE.map((i) => mainValues[i]);

/**
 * Oberes Abmaß es der Wellen a–h (negativ, gilt für alle Grade), je Zwischenbereich.
 * Bohrungen A–H: EI = −es.
 */
export const SHAFT_ES = {
  c: [-60, -70, -80, -95, -95, -110, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480],
  d: spread([-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230]),
  e: spread([-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135]),
  f: spread([-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68]),
  g: spread([-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20]),
  h: spread([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
};

/** Unteres Abmaß ei der Wellen k–u (positiv), je Zwischenbereich. null = nicht genormt. */
export const SHAFT_EI = {
  // k: gilt für Grade 4 bis 7; sonst 0
  k: spread([0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5]),
  m: spread([2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23]),
  n: spread([4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40]),
  p: spread([6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]),
  r: [10, 15, 19, 23, 23, 28, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132],
  s: [14, 19, 23, 28, 28, 35, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252],
  t: [null, null, null, null, null, null, 41, 48, 54, 66, 75, 91, 104, 122, 134, 146, 166, 180, 196, 218, 240, 268, 294, 330, 360],
  u: [18, 23, 28, 33, 33, 41, 48, 60, 70, 87, 102, 124, 144, 170, 190, 210, 236, 258, 284, 315, 350, 390, 435, 490, 540],
};

/** Unteres Abmaß ei der Wellen j5/j6 und j7 (negativ), je Hauptbereich. */
export const SHAFT_J = {
  5: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
  6: [-2, -2, -2, -3, -4, -5, -7, -9, -11, -13, -16, -18, -20],
  7: [-4, -4, -5, -6, -8, -10, -12, -15, -18, -21, -26, -28, -32],
};

/** Oberes Abmaß ES der Bohrungen J6, J7, J8 (positiv), je Hauptbereich. */
export const HOLE_J = {
  6: [2, 5, 5, 6, 8, 10, 13, 16, 18, 22, 25, 29, 33],
  7: [4, 6, 8, 10, 12, 14, 18, 22, 26, 30, 36, 39, 43],
  8: [6, 10, 12, 15, 20, 24, 28, 34, 41, 47, 55, 60, 66],
};

export const SHAFT_LETTERS = ['c', 'd', 'e', 'f', 'g', 'h', 'js', 'j', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u'];
export const HOLE_LETTERS = SHAFT_LETTERS.map((l) => l.toUpperCase());

/** Häufige Passungen im Einheitsbohrungssystem mit typischer Anwendung. */
export const COMMON_FITS = [
  { fit: 'H11/c11', use: 'Weite Spielpassung, grobe Lagerungen, Landmaschinen' },
  { fit: 'H9/d9', use: 'Lose Laufsitze, Transmissionen' },
  { fit: 'H8/e8', use: 'Leichter Laufsitz, mehrfach gelagerte Wellen' },
  { fit: 'H7/f7', use: 'Laufsitz, Gleitlager, Kupplungsnaben (verschiebbar)' },
  { fit: 'H7/g6', use: 'Enger Laufsitz, Wechselräder, Führungen' },
  { fit: 'H7/h6', use: 'Gleitsitz, von Hand verschiebbar, Zentrierungen' },
  { fit: 'H7/js6', use: 'Übergang, Naben mit leichtem Schlag fügbar' },
  { fit: 'H7/k6', use: 'Übergang, Riemenscheiben, Zahnräder, Kugellager-Innenring' },
  { fit: 'H7/m6', use: 'Übergang, festere Naben, Passstifte' },
  { fit: 'H7/n6', use: 'Übergang/Übermaß, Lagerbuchsen, Kupplungen' },
  { fit: 'H7/p6', use: 'Leichtes Übermaß, mit Presse fügbar' },
  { fit: 'H7/r6', use: 'Übermaß, Presssitz, Lagerbuchsen in Gehäusen' },
  { fit: 'H7/s6', use: 'Festsitz, Schrumpfen oder Pressen' },
  { fit: 'H7/u6', use: 'Starker Presssitz, nur durch Schrumpfen' },
  { fit: 'G7/h6', use: 'Einheitswelle: enger Laufsitz' },
  { fit: 'F8/h7', use: 'Einheitswelle: Laufsitz' },
];
