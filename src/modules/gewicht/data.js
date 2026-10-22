// Werkstoffe mit Dichte in g/cm³ (= kg/dm³). Eigene Werkstoffe kommen aus dem Gerätespeicher dazu.

export const MATERIALS = [
  { id: 's235', name: 'Baustahl S235JR', wnr: '1.0038', rho: 7.85 },
  { id: 'c45', name: 'C45', wnr: '1.0503', rho: 7.85 },
  { id: '42crmo4', name: '42CrMo4', wnr: '1.7225', rho: 7.72 },
  { id: '1.2379', name: 'X153CrMoV12', wnr: '1.2379', rho: 7.70 },
  { id: '1.4301', name: 'Edelstahl X5CrNi18-10 (V2A)', wnr: '1.4301', rho: 7.90 },
  { id: '1.4404', name: 'Edelstahl X2CrNiMo17-12-2', wnr: '1.4404', rho: 8.00 },
  { id: '1.4571', name: 'Edelstahl X6CrNiMoTi17-12-2 (V4A)', wnr: '1.4571', rho: 8.00 },
  { id: 'gjl', name: 'Grauguss EN-GJL-250', wnr: '5.1301', rho: 7.20 },
  { id: 'gjs', name: 'Sphäroguss EN-GJS-400', wnr: '5.3105', rho: 7.10 },
  { id: 'al995', name: 'Aluminium Al99,5', wnr: '3.0255', rho: 2.70 },
  { id: 'aw6082', name: 'Aluminium EN AW-6082 (AlSi1MgMn)', wnr: '3.2315', rho: 2.70 },
  { id: 'aw5083', name: 'Aluminium EN AW-5083 (AlMg4,5Mn)', wnr: '3.3547', rho: 2.66 },
  { id: 'aw7075', name: 'Aluminium EN AW-7075 (AlZn5,5MgCu)', wnr: '3.4365', rho: 2.81 },
  { id: 'cuzn39pb3', name: 'Messing CuZn39Pb3', wnr: '2.0401', rho: 8.47 },
  { id: 'cu', name: 'Kupfer Cu-ETP', wnr: '2.0065', rho: 8.93 },
  { id: 'cusn8', name: 'Bronze CuSn8', wnr: '2.1030', rho: 8.80 },
  { id: 'ti5', name: 'Titan Grade 5 (Ti6Al4V)', wnr: '3.7165', rho: 4.43 },
  { id: 'zn', name: 'Zink', wnr: '', rho: 7.13 },
  { id: 'pb', name: 'Blei', wnr: '', rho: 11.34 },
  { id: 'pom', name: 'POM', wnr: '', rho: 1.41 },
  { id: 'pa6', name: 'PA 6', wnr: '', rho: 1.14 },
  { id: 'pehd', name: 'PE-HD', wnr: '', rho: 0.95 },
  { id: 'ptfe', name: 'PTFE', wnr: '', rho: 2.17 },
  { id: 'pvc', name: 'PVC hart', wnr: '', rho: 1.40 },
  { id: 'peek', name: 'PEEK', wnr: '', rho: 1.32 },
];

/**
 * Querschnittsformen. fields: [Name, Beschriftung, Standardwert].
 * area(v) liefert die Fläche in mm²; volume(v) (nur Kugel) direkt mm³.
 */
export const SHAPES = [
  { id: 'rund', name: 'Rundstab', fields: [['d', 'Durchmesser d', 50]], area: (v) => (Math.PI * v.d ** 2) / 4 },
  {
    id: 'rohr', name: 'Rohr', fields: [['D', 'Außen-Ø D', 60], ['s', 'Wanddicke s', 5]],
    area: (v) => (v.s * 2 < v.D ? (Math.PI / 4) * (v.D ** 2 - (v.D - 2 * v.s) ** 2) : NaN),
  },
  { id: 'vierkant', name: 'Vierkant', fields: [['a', 'Kantenlänge a', 40]], area: (v) => v.a ** 2 },
  { id: 'flach', name: 'Flach / Blech', fields: [['b', 'Breite b', 100], ['h', 'Dicke h', 10]], area: (v) => v.b * v.h },
  { id: 'sechskant', name: 'Sechskant', fields: [['s', 'Schlüsselweite s', 30]], area: (v) => (Math.sqrt(3) / 2) * v.s ** 2 },
  {
    id: 'rechteckrohr', name: 'Rechteckrohr', fields: [['b', 'Breite b', 80], ['h', 'Höhe h', 40], ['s', 'Wanddicke s', 4]],
    area: (v) => (2 * v.s < Math.min(v.b, v.h) ? v.b * v.h - (v.b - 2 * v.s) * (v.h - 2 * v.s) : NaN),
  },
  {
    id: 'winkel', name: 'Winkel', fields: [['a', 'Schenkel a', 50], ['b', 'Schenkel b', 50], ['s', 'Dicke s', 5]],
    area: (v) => (v.s < Math.min(v.a, v.b) ? v.s * (v.a + v.b - v.s) : NaN),
  },
  { id: 'kugel', name: 'Kugel', fields: [['d', 'Durchmesser d', 50]], volume: (v) => (Math.PI * v.d ** 3) / 6 },
];
