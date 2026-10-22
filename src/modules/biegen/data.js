// Kleinste Biegeradien für das Kaltbiegen von Stahlblech quer zur Walzrichtung
// (Richtwerte nach DIN 6935 Beiblatt 1). Spalten: Blechdicke s bis …, r min je Zugfestigkeitsgruppe.
export const MIN_RADIUS_STEEL = {
  thickness: [1, 1.5, 2.5, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20],
  groups: [
    { id: '390', label: 'Rm ≤ 390 N/mm² (z. B. DC01, S235)', r: [1, 1.6, 2.5, 3, 5, 6, 8, 10, 12, 16, 20, 25, 28, 36, 40] },
    { id: '490', label: 'Rm 390–490 N/mm² (z. B. S275, S355 weich)', r: [1.2, 2, 3, 4, 5, 8, 10, 12, 16, 20, 25, 28, 32, 40, 45] },
    { id: '640', label: 'Rm 490–640 N/mm² (z. B. S355, C35)', r: [1.6, 2.5, 4, 5, 6, 8, 10, 16, 20, 25, 32, 36, 40, 45, 50] },
  ],
};

/** Faustwerte für andere Werkstoffe: r min ≈ Faktor · s. */
export const MIN_RADIUS_FACTOR = [
  { id: 'cr', label: 'Edelstahl austenitisch (1.4301)', factor: 1, rm: 600 },
  { id: 'al-w', label: 'Aluminium weich (AW-5754 O, AW-1050)', factor: 1, rm: 200 },
  { id: 'al-h', label: 'Aluminium halbhart (AW-5754 H22, AW-5083)', factor: 1.5, rm: 270 },
  { id: 'al-t6', label: 'Aluminium ausgehärtet (AW-6082 T6)', factor: 3, rm: 310 },
  { id: 'cu', label: 'Kupfer, Messing weich', factor: 0.5, rm: 250 },
];

/** Typische Zugfestigkeit je Gruppe für die Presskraft-Abschätzung. */
export const RM_TYPICAL = { 390: 360, 490: 450, 640: 570 };

/** Übliche Gesenkweiten V (mm) an Abkantpressen. */
export const DIE_WIDTHS = [4, 6, 8, 10, 12, 16, 20, 24, 30, 35, 40, 50, 60, 80, 100, 120, 160, 200];
