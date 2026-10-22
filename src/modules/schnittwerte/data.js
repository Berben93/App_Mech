// Richtwerte für Schnittgeschwindigkeiten (m/min) je Werkstoffgruppe und Verfahren.
// Bereiche [min, max] für beschichtetes Hartmetall (hm) und HSS/HSS-E (hss); null = nicht empfohlen.
// kc: spezifische Schnittkraft in N/mm² bei mittlerer Spanungsdicke (für die Leistungsabschätzung).
// Quelle: übliche Herstellerkataloge und Tabellenbücher; Werkzeughersteller-Angaben haben Vorrang.

export const ISO_GROUPS = {
  P: { name: 'Stahl', color: '#2563eb' },
  M: { name: 'Nichtrostender Stahl', color: '#eab308' },
  K: { name: 'Gusseisen', color: '#dc2626' },
  N: { name: 'NE-Metalle', color: '#16a34a' },
  S: { name: 'Hochwarmfest, Titan', color: '#b45309' },
  H: { name: 'Gehärtet', color: '#6b7280' },
};

export const MATERIALS = [
  {
    id: 'p-unleg', iso: 'P', name: 'Baustahl, unlegiert (S235, C45)', kc: 1900,
    turn: { hm: [200, 300], hss: [30, 45] }, mill: { hm: [180, 280], hss: [25, 35] }, drill: { hm: [80, 120], hss: [25, 35] },
    f: { turn: 0.25, mill: 0.12, drill: 0.02 },
  },
  {
    id: 'p-leg', iso: 'P', name: 'Vergütungsstahl, legiert (42CrMo4)', kc: 2200,
    turn: { hm: [150, 250], hss: [20, 30] }, mill: { hm: [150, 220], hss: [18, 25] }, drill: { hm: [70, 100], hss: [15, 25] },
    f: { turn: 0.22, mill: 0.1, drill: 0.018 },
  },
  {
    id: 'p-hochleg', iso: 'P', name: 'Werkzeugstahl, hochlegiert (1.2379)', kc: 2600,
    turn: { hm: [100, 180], hss: [12, 20] }, mill: { hm: [100, 160], hss: [10, 18] }, drill: { hm: [50, 80], hss: [8, 15] },
    f: { turn: 0.2, mill: 0.08, drill: 0.015 },
  },
  {
    id: 'm-aust', iso: 'M', name: 'Rostfrei austenitisch (1.4301, 1.4571)', kc: 2400,
    turn: { hm: [130, 200], hss: [15, 25] }, mill: { hm: [100, 180], hss: [12, 20] }, drill: { hm: [40, 70], hss: [8, 12] },
    f: { turn: 0.2, mill: 0.08, drill: 0.015 },
  },
  {
    id: 'k-gjl', iso: 'K', name: 'Grauguss (EN-GJL-250)', kc: 1100,
    turn: { hm: [150, 250], hss: [20, 30] }, mill: { hm: [150, 250], hss: [18, 28] }, drill: { hm: [80, 120], hss: [18, 25] },
    f: { turn: 0.25, mill: 0.15, drill: 0.025 },
  },
  {
    id: 'k-gjs', iso: 'K', name: 'Sphäroguss (EN-GJS-500)', kc: 1500,
    turn: { hm: [120, 200], hss: [15, 25] }, mill: { hm: [120, 200], hss: [15, 22] }, drill: { hm: [70, 100], hss: [15, 20] },
    f: { turn: 0.22, mill: 0.12, drill: 0.02 },
  },
  {
    id: 'n-al', iso: 'N', name: 'Aluminium-Knetlegierung (AlMgSi)', kc: 750,
    turn: { hm: [300, 1000], hss: [100, 250] }, mill: { hm: [300, 1000], hss: [100, 200] }, drill: { hm: [150, 300], hss: [60, 100] },
    f: { turn: 0.25, mill: 0.1, drill: 0.025 },
  },
  {
    id: 'n-cu', iso: 'N', name: 'Messing, Kupfer, Bronze', kc: 800,
    turn: { hm: [200, 400], hss: [50, 100] }, mill: { hm: [200, 350], hss: [40, 80] }, drill: { hm: [100, 200], hss: [35, 60] },
    f: { turn: 0.2, mill: 0.08, drill: 0.02 },
  },
  {
    id: 's-ti', iso: 'S', name: 'Titanlegierung (Ti6Al4V)', kc: 1600,
    turn: { hm: [40, 80], hss: [8, 15] }, mill: { hm: [40, 70], hss: [6, 12] }, drill: { hm: [25, 45], hss: [5, 10] },
    f: { turn: 0.15, mill: 0.06, drill: 0.012 },
  },
  {
    id: 's-ni', iso: 'S', name: 'Nickelbasis (Inconel 718)', kc: 2800,
    turn: { hm: [25, 60], hss: null }, mill: { hm: [20, 50], hss: null }, drill: { hm: [15, 30], hss: null },
    f: { turn: 0.12, mill: 0.05, drill: 0.01 },
  },
  {
    id: 'h-45', iso: 'H', name: 'Gehärteter Stahl 45–55 HRC', kc: 4000,
    turn: { hm: [60, 150], hss: null }, mill: { hm: [50, 100], hss: null }, drill: { hm: [25, 50], hss: null },
    f: { turn: 0.1, mill: 0.05, drill: 0.01 },
  },
];

export const PROCESSES = [
  { key: 'turn', label: 'Drehen' },
  { key: 'mill', label: 'Fräsen' },
  { key: 'drill', label: 'Bohren' },
];

export const TOOLS = [
  { key: 'hm', label: 'Hartmetall' },
  { key: 'hss', label: 'HSS' },
];
