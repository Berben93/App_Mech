// Genormte Kegel. Morsekegel nach DIN 228 / ISO 296: D1 = Durchmesser am Kegelende (Messebene), C = Kegelverhältnis 1:x.
export const MORSE = [
  { name: 'MK 0', D: 9.045, x: 19.212 },
  { name: 'MK 1', D: 12.065, x: 20.047 },
  { name: 'MK 2', D: 17.78, x: 20.02 },
  { name: 'MK 3', D: 23.825, x: 19.922 },
  { name: 'MK 4', D: 31.267, x: 19.254 },
  { name: 'MK 5', D: 44.399, x: 19.002 },
  { name: 'MK 6', D: 63.348, x: 19.18 },
];

/** Weitere übliche Kegelverhältnisse 1:x. */
export const TAPERS = [
  { name: 'Metrischer Kegel', x: 20 },
  { name: 'Steilkegel SK/ISO (7:24)', x: 24 / 7 },
  { name: 'Kegelstift (ISO 2339)', x: 50 },
  { name: 'Kegelreibahle Kegelstift', x: 50 },
  { name: 'Werkzeugkegel 1:10', x: 10 },
  { name: 'Rohrgewinde kegelig R (1:16)', x: 16 },
  { name: 'Kegel 1:5', x: 5 },
  { name: 'Zentrierbohrung 60°', angle: 60 },
];

/** Übliche Sinuslineal-Längen in mm. */
export const SINE_BARS = [100, 200, 250];
