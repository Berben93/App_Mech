// Schlüsselweiten und Festigkeitsklassen. Maße in mm, Festigkeiten in N/mm².

/**
 * Je Gewinde-Nenndurchmesser:
 *   sw      Sechskant nach ISO 4014/4017/4032
 *   swDin   abweichende Schlüsselweite nach alter DIN 931/933/934 (nur wo anders)
 *   isk     Innensechskant Zylinderschraube ISO 4762
 *   isk10642 Innensechskant Senkschraube ISO 10642
 *   isk7380 Innensechskant Linsenkopf ISO 7380
 *   dk      Kopfdurchmesser Zylinderschraube ISO 4762
 */
export const SCREW_SIZES = [
  { d: 1.6, sw: 3.2, isk: 1.5, dk: 3 },
  { d: 2, sw: 4, isk: 1.5, dk: 3.8 },
  { d: 2.5, sw: 5, isk: 2, dk: 4.5 },
  { d: 3, sw: 5.5, isk: 2.5, isk10642: 2, isk7380: 2, dk: 5.5 },
  { d: 4, sw: 7, isk: 3, isk10642: 2.5, isk7380: 2.5, dk: 7 },
  { d: 5, sw: 8, isk: 4, isk10642: 3, isk7380: 3, dk: 8.5 },
  { d: 6, sw: 10, isk: 5, isk10642: 4, isk7380: 4, dk: 10 },
  { d: 8, sw: 13, isk: 6, isk10642: 5, isk7380: 5, dk: 13 },
  { d: 10, sw: 16, swDin: 17, isk: 8, isk10642: 6, isk7380: 6, dk: 16 },
  { d: 12, sw: 18, swDin: 19, isk: 10, isk10642: 8, isk7380: 8, dk: 18 },
  { d: 14, sw: 21, swDin: 22, isk: 12, isk10642: 10, dk: 21 },
  { d: 16, sw: 24, isk: 14, isk10642: 10, isk7380: 10, dk: 24 },
  { d: 18, sw: 27, isk: 14, dk: 27 },
  { d: 20, sw: 30, isk: 17, isk10642: 12, dk: 30 },
  { d: 22, sw: 34, swDin: 32, isk: 17, dk: 33 },
  { d: 24, sw: 36, isk: 19, dk: 36 },
  { d: 27, sw: 41, isk: 19, dk: 40 },
  { d: 30, sw: 46, isk: 22, dk: 45 },
  { d: 33, sw: 50, isk: 24, dk: 50 },
  { d: 36, sw: 55, isk: 27, dk: 54 },
  { d: 42, sw: 65, isk: 32, dk: 63 },
  { d: 48, sw: 75, isk: 36, dk: 72 },
  { d: 56, sw: 85, isk: 41, dk: 84 },
  { d: 64, sw: 95, isk: 46, dk: 96 },
];

/**
 * Festigkeitsklassen nach ISO 898-1 (Stahl) und ISO 3506-1 (nichtrostend).
 * rp: Streckgrenze bzw. 0,2-%-Dehngrenze; bei 8.8 abhängig vom Durchmesser.
 */
export const PROPERTY_CLASSES = [
  { key: '5.6', rp: () => 300, rm: () => 500 },
  { key: '6.8', rp: () => 480, rm: () => 600 },
  { key: '8.8', rp: (d) => (d <= 16 ? 640 : 660), rm: (d) => (d <= 16 ? 800 : 830) },
  { key: '10.9', rp: () => 940, rm: () => 1040 },
  { key: '12.9', rp: () => 1100, rm: () => 1220 },
  { key: 'A2-70', rp: () => 450, rm: () => 700, note: 'nichtrostend' },
  { key: 'A4-70', rp: () => 450, rm: () => 700, note: 'nichtrostend' },
  { key: 'A4-80', rp: () => 600, rm: () => 800, note: 'nichtrostend' },
];

/** Typische Gesamtreibwerte µ je Oberfläche und Schmierung (Richtwerte nach VDI 2230). */
export const FRICTION = [
  { mu: 0.08, label: '0,08 – MoS₂-Paste' },
  { mu: 0.1, label: '0,10 – verzinkt, geölt' },
  { mu: 0.12, label: '0,12 – Standard, leicht geölt' },
  { mu: 0.14, label: '0,14 – verzinkt, trocken' },
  { mu: 0.16, label: '0,16 – blank, trocken' },
  { mu: 0.2, label: '0,20 – Edelstahl, trocken' },
];
