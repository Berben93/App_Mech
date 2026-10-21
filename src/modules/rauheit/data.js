// Rauheitsklassen nach ISO 1302 (Ra in µm) und erreichbare Rauheit je Fertigungsverfahren.

export const N_CLASSES = [
  ['N1', 0.025], ['N2', 0.05], ['N3', 0.1], ['N4', 0.2], ['N5', 0.4], ['N6', 0.8],
  ['N7', 1.6], ['N8', 3.2], ['N9', 6.3], ['N10', 12.5], ['N11', 25], ['N12', 50],
].map(([n, ra]) => ({ n, ra }));

/** Erreichbare Mittenrauwerte Ra in µm: [übliche Grenze fein, übliche Grenze grob]. */
export const PROCESSES = [
  { name: 'Brennschneiden', ra: [12.5, 50] },
  { name: 'Sägen', ra: [6.3, 50] },
  { name: 'Bohren', ra: [1.6, 12.5] },
  { name: 'Fräsen', ra: [0.8, 6.3] },
  { name: 'Drehen', ra: [0.4, 6.3] },
  { name: 'Senkerodieren', ra: [0.8, 6.3] },
  { name: 'Räumen', ra: [0.8, 3.2] },
  { name: 'Reiben', ra: [0.4, 3.2] },
  { name: 'Feindrehen', ra: [0.2, 0.8] },
  { name: 'Rundschleifen', ra: [0.1, 1.6] },
  { name: 'Flachschleifen', ra: [0.2, 1.6] },
  { name: 'Honen', ra: [0.05, 0.4] },
  { name: 'Läppen', ra: [0.025, 0.2] },
  { name: 'Polieren', ra: [0.025, 0.2] },
];
