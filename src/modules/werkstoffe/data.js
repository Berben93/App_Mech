// Werkstoffdatenbank: übliche Werkstoffe der Zerspanung mit Bezeichnungen und Kennwerten.
// Festigkeiten sind Mindest- bzw. typische Werte für den genannten Zustand (EN 10025, 10083, 10084,
// 10088, 573/755, 1561/1563, 12164/12163, ASTM B348). Für Abnahmen gilt das Werkszeugnis.
//
//   rm, re      Zugfestigkeit bzw. Streck-/Dehngrenze in N/mm² (Text, weil oft Bereiche)
//   hb          typische Härte im Lieferzustand
//   mach        Zerspanbarkeit 1 (schlecht) … 5 (sehr gut)
//   weld        Schweißeignung: gut | bedingt | schlecht
//   iso         Zerspanungsgruppe P/M/K/N/S/H, cut = Werkstoff im Modul Schnittwerte, rho = Dichte g/cm³

export const GROUPS = [
  { id: 'bau', name: 'Baustahl' },
  { id: 'auto', name: 'Automatenstahl' },
  { id: 'verg', name: 'Vergütungsstahl' },
  { id: 'eins', name: 'Einsatzstahl' },
  { id: 'wz', name: 'Werkzeugstahl' },
  { id: 'rost', name: 'Nichtrostender Stahl' },
  { id: 'guss', name: 'Gusseisen' },
  { id: 'al', name: 'Aluminium' },
  { id: 'cu', name: 'Kupfer, Messing, Bronze' },
  { id: 'ti', name: 'Titan, Nickel' },
];

export const MATERIALS = [
  { wnr: '1.0038', name: 'S235JR', old: 'St37-2', aisi: 'A283 Gr.C / ≈ A36', group: 'bau', state: '+AR (warmgewalzt)', rm: '360–510', re: '≥ 235', hb: '≈ 120 HB', mach: 3, weld: 'gut', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Stahlbau, Rahmen, Konsolen' },
  { wnr: '1.0570', name: 'S355J2', old: 'St52-3', aisi: '≈ A572 Gr.50', group: 'bau', state: '+N', rm: '470–630', re: '≥ 355', hb: '≈ 160 HB', mach: 3, weld: 'gut', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Höher belastete Schweißkonstruktionen' },
  { wnr: '1.0715', name: '11SMn30', old: '9SMn28', aisi: '1215', group: 'auto', state: '+C (blank gezogen)', rm: '460–710', re: '≥ 375', hb: '≈ 150 HB', mach: 5, weld: 'schlecht', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Drehteile in großer Stückzahl' },
  { wnr: '1.0718', name: '11SMnPb30', old: '9SMnPb28', aisi: '12L14', group: 'auto', state: '+C', rm: '460–710', re: '≥ 375', hb: '≈ 150 HB', mach: 5, weld: 'schlecht', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Drehteile, sehr kurze Späne (bleihaltig)' },
  { wnr: '1.0503', name: 'C45', old: 'C45', aisi: '1045', group: 'verg', state: '+N', rm: '≥ 620', re: '≥ 340', hb: '≈ 190 HB', mach: 3, weld: 'bedingt', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Wellen, Bolzen, Achsen' },
  { wnr: '1.1191', name: 'C45E', old: 'Ck45', aisi: '1045', group: 'verg', state: '+QT (16–40 mm)', rm: '650–800', re: '≥ 430', hb: '≈ 210 HB', mach: 3, weld: 'bedingt', iso: 'P', cut: 'p-unleg', rho: 7.85, use: 'Vergütete Wellen, induktiv härtbar' },
  { wnr: '1.7225', name: '42CrMo4', old: '42CrMo4', aisi: '4140', group: 'verg', state: '+QT (16–40 mm)', rm: '1000–1200', re: '≥ 750', hb: '≈ 300 HB (28–34 HRC)', mach: 2, weld: 'schlecht', iso: 'P', cut: 'p-leg', rho: 7.72, use: 'Hoch belastete Wellen, Zahnräder, Schrauben' },
  { wnr: '1.6582', name: '34CrNiMo6', old: '34CrNiMo6', aisi: '4340', group: 'verg', state: '+QT (16–40 mm)', rm: '1100–1300', re: '≥ 900', hb: '≈ 330 HB', mach: 2, weld: 'schlecht', iso: 'P', cut: 'p-leg', rho: 7.85, use: 'Große, hoch beanspruchte Bauteile' },
  { wnr: '1.7131', name: '16MnCr5', old: '16MnCr5', aisi: '5115', group: 'eins', state: '+A (weichgeglüht)', rm: '≈ 550', re: '≈ 350', hb: '≤ 207 HB', mach: 3, weld: 'bedingt', iso: 'P', cut: 'p-leg', rho: 7.85, use: 'Einsatzgehärtete Zahnräder, Bolzen (58–62 HRC Randschicht)' },
  { wnr: '1.2312', name: '40CrMnMoS8-6', old: '40CrMnMoS8-6', aisi: '≈ P20+S', group: 'wz', state: 'vergütet', rm: '≈ 1000', re: '≈ 850', hb: '280–325 HB', mach: 3, weld: 'schlecht', iso: 'P', cut: 'p-leg', rho: 7.85, use: 'Formenbau, Rahmen von Werkzeugen' },
  { wnr: '1.2842', name: '90MnCrV8', old: '90MnCrV8', aisi: 'O2', group: 'wz', state: '+A / gehärtet', rm: '≈ 770 (geglüht)', re: '–', hb: '≤ 229 HB / 58–62 HRC', mach: 3, weld: 'schlecht', iso: 'P', cut: 'p-hochleg', rho: 7.85, use: 'Schnitt- und Stanzwerkzeuge, Lehren' },
  { wnr: '1.2379', name: 'X153CrMoV12', old: 'X155CrVMo12-1', aisi: 'D2', group: 'wz', state: '+A / gehärtet', rm: '≈ 850 (geglüht)', re: '–', hb: '≤ 255 HB / 58–62 HRC', mach: 2, weld: 'schlecht', iso: 'P', cut: 'p-hochleg', rho: 7.70, use: 'Schneid- und Umformwerkzeuge, verschleißfest' },
  { wnr: '1.3343', name: 'HS6-5-2C', old: 'S6-5-2', aisi: 'M2', group: 'wz', state: '+A / gehärtet', rm: '≈ 900 (geglüht)', re: '–', hb: '≤ 269 HB / 63–66 HRC', mach: 2, weld: 'schlecht', iso: 'P', cut: 'p-hochleg', rho: 8.10, use: 'HSS-Werkzeuge, Stempel' },
  { wnr: '1.4301', name: 'X5CrNi18-10', old: 'V2A', aisi: '304', group: 'rost', state: '+AT (lösungsgeglüht)', rm: '500–700', re: '≥ 190', hb: '≈ 180 HB', mach: 2, weld: 'gut', iso: 'M', cut: 'm-aust', rho: 7.90, use: 'Lebensmittel, Behälter, allgemein rostfrei' },
  { wnr: '1.4305', name: 'X8CrNiS18-9', old: 'V2A (Automaten)', aisi: '303', group: 'rost', state: '+AT', rm: '500–750', re: '≥ 190', hb: '≈ 180 HB', mach: 3, weld: 'schlecht', iso: 'M', cut: 'm-aust', rho: 7.90, use: 'Rostfreie Drehteile' },
  { wnr: '1.4404', name: 'X2CrNiMo17-12-2', old: 'V4A', aisi: '316L', group: 'rost', state: '+AT', rm: '500–700', re: '≥ 200', hb: '≈ 180 HB', mach: 2, weld: 'gut', iso: 'M', cut: 'm-aust', rho: 8.00, use: 'Chemie, Meerwasser, Pharma' },
  { wnr: '1.4571', name: 'X6CrNiMoTi17-12-2', old: 'V4A', aisi: '316Ti', group: 'rost', state: '+AT', rm: '500–700', re: '≥ 200', hb: '≈ 180 HB', mach: 1, weld: 'gut', iso: 'M', cut: 'm-aust', rho: 8.00, use: 'Chemie, Wärmetauscher' },
  { wnr: '1.4462', name: 'X2CrNiMoN22-5-3', old: 'Duplex', aisi: 'S32205 (UNS)', group: 'rost', state: '+AT', rm: '650–880', re: '≥ 450', hb: '≈ 250 HB', mach: 1, weld: 'gut', iso: 'M', cut: 'm-aust', rho: 7.80, use: 'Offshore, Chemie, hohe Festigkeit' },
  { wnr: '1.4021', name: 'X20Cr13', old: 'X20Cr13', aisi: '420', group: 'rost', state: '+QT700', rm: '700–850', re: '≥ 500', hb: '≈ 230 HB', mach: 3, weld: 'schlecht', iso: 'M', cut: 'm-aust', rho: 7.70, use: 'Pumpenwellen, Messer, härtbar' },
  { wnr: '1.4104', name: 'X14CrMoS17', old: 'X14CrMoS17', aisi: '430F', group: 'rost', state: '+QT650', rm: '650–850', re: '≥ 500', hb: '≈ 220 HB', mach: 4, weld: 'schlecht', iso: 'M', cut: 'm-aust', rho: 7.70, use: 'Rostfreie Drehteile, magnetisch' },
  { wnr: '1.4057', name: 'X17CrNi16-2', old: 'X17CrNi16-2', aisi: '431', group: 'rost', state: '+QT800', rm: '800–950', re: '≥ 600', hb: '≈ 260 HB', mach: 2, weld: 'schlecht', iso: 'M', cut: 'm-aust', rho: 7.70, use: 'Hoch belastete rostfreie Wellen' },
  { wnr: 'EN-JL1040', name: 'EN-GJL-250', old: 'GG-25', aisi: 'ASTM A48 Class 35/40', group: 'guss', state: 'Guss', rm: '250–350', re: '–', hb: '180–220 HB', mach: 4, weld: 'schlecht', iso: 'K', cut: 'k-gjl', rho: 7.20, use: 'Maschinenbetten, Gehäuse (dämpft gut)' },
  { wnr: 'EN-JS1030', name: 'EN-GJS-400-15', old: 'GGG-40', aisi: 'ASTM A536 60-40-18', group: 'guss', state: 'Guss', rm: '≥ 400', re: '≥ 250', hb: '135–180 HB', mach: 4, weld: 'schlecht', iso: 'K', cut: 'k-gjs', rho: 7.10, use: 'Gehäuse, Naben, zähe Gussteile' },
  { wnr: 'EN-JS1060', name: 'EN-GJS-600-3', old: 'GGG-60', aisi: 'ASTM A536 80-55-06', group: 'guss', state: 'Guss', rm: '≥ 600', re: '≥ 370', hb: '190–270 HB', mach: 3, weld: 'schlecht', iso: 'K', cut: 'k-gjs', rho: 7.20, use: 'Kurbelwellen, Zahnräder aus Guss' },
  { wnr: '3.3547', name: 'EN AW-5083', old: 'AlMg4,5Mn0,7', aisi: '5083 (AA)', group: 'al', state: 'H111', rm: '275–350', re: '≥ 125', hb: '≈ 75 HB', mach: 3, weld: 'gut', iso: 'N', cut: 'n-al', rho: 2.66, use: 'Platten, Vorrichtungen, seewasserbeständig' },
  { wnr: '3.3206', name: 'EN AW-6060', old: 'AlMgSi0,5', aisi: '6060 (AA)', group: 'al', state: 'T6', rm: '≥ 190', re: '≥ 150', hb: '≈ 65 HB', mach: 3, weld: 'gut', iso: 'N', cut: 'n-al', rho: 2.70, use: 'Strangpressprofile' },
  { wnr: '3.2315', name: 'EN AW-6082', old: 'AlMgSi1', aisi: '6082 (AA)', group: 'al', state: 'T6', rm: '≥ 310', re: '≥ 260', hb: '≈ 95 HB', mach: 4, weld: 'gut', iso: 'N', cut: 'n-al', rho: 2.70, use: 'Frästeile, Konstruktion (Schweißnaht verliert Festigkeit)' },
  { wnr: '3.1645', name: 'EN AW-2007', old: 'AlCuMgPb', aisi: '2007 (AA)', group: 'al', state: 'T4', rm: '≥ 370', re: '≥ 240', hb: '≈ 110 HB', mach: 5, weld: 'schlecht', iso: 'N', cut: 'n-al', rho: 2.85, use: 'Automatendrehteile' },
  { wnr: '3.4365', name: 'EN AW-7075', old: 'AlZnMgCu1,5', aisi: '7075 (AA)', group: 'al', state: 'T651', rm: '≥ 540', re: '≥ 470', hb: '≈ 150 HB', mach: 4, weld: 'schlecht', iso: 'N', cut: 'n-al', rho: 2.81, use: 'Hochfeste Teile, Luftfahrt, Formenbau' },
  { wnr: '2.0060', name: 'Cu-ETP', old: 'E-Cu58', aisi: 'C11000', group: 'cu', state: 'R250', rm: '250–300', re: '≥ 200', hb: '≈ 75 HB', mach: 1, weld: 'bedingt', iso: 'N', cut: 'n-cu', rho: 8.93, use: 'Stromschienen, Elektroden (schmiert)' },
  { wnr: '2.0401', name: 'CuZn39Pb3', old: 'Ms58', aisi: 'C38500', group: 'cu', state: 'R430', rm: '≥ 430', re: '≥ 250', hb: '≈ 110 HB', mach: 5, weld: 'schlecht', iso: 'N', cut: 'n-cu', rho: 8.47, use: 'Drehteile, Armaturen (Referenz Zerspanbarkeit 100 %)' },
  { wnr: '2.0321', name: 'CuZn37', old: 'Ms63', aisi: 'C27400', group: 'cu', state: 'R370', rm: '≥ 370', re: '≥ 200', hb: '≈ 100 HB', mach: 2, weld: 'bedingt', iso: 'N', cut: 'n-cu', rho: 8.44, use: 'Kaltumformen, Tiefziehen' },
  { wnr: '2.1030', name: 'CuSn8', old: 'CuSn8', aisi: 'C52100', group: 'cu', state: 'R390', rm: '≥ 390', re: '≥ 260', hb: '≈ 120 HB', mach: 2, weld: 'bedingt', iso: 'N', cut: 'n-cu', rho: 8.80, use: 'Lagerbuchsen, Federn' },
  { wnr: '2.1090', name: 'CuSn7Zn4Pb7-C', old: 'Rg7', aisi: 'C93200', group: 'cu', state: 'Guss', rm: '≥ 230', re: '≥ 120', hb: '≈ 70 HB', mach: 4, weld: 'schlecht', iso: 'N', cut: 'n-cu', rho: 8.80, use: 'Gleitlager, Buchsen' },
  { wnr: '3.7035', name: 'Ti Grade 2', old: 'Ti 2', aisi: 'ASTM B348 Gr.2', group: 'ti', state: 'geglüht', rm: '≥ 345', re: '≥ 275', hb: '≈ 160 HB', mach: 2, weld: 'gut', iso: 'S', cut: 's-ti', rho: 4.51, use: 'Chemie, Medizintechnik (Schutzgas beim Schweißen)' },
  { wnr: '3.7165', name: 'TiAl6V4', old: 'Ti Grade 5', aisi: 'ASTM B348 Gr.5', group: 'ti', state: 'geglüht', rm: '≥ 895', re: '≥ 828', hb: '≈ 330 HB', mach: 1, weld: 'bedingt', iso: 'S', cut: 's-ti', rho: 4.43, use: 'Luftfahrt, Implantate, Rennsport' },
  { wnr: '2.4856', name: 'NiCr22Mo9Nb', old: 'Inconel 625', aisi: 'N06625 (UNS)', group: 'ti', state: 'geglüht', rm: '≥ 760', re: '≥ 345', hb: '≈ 200 HB', mach: 1, weld: 'gut', iso: 'S', cut: 's-ni', rho: 8.44, use: 'Hochtemperatur, Meerwasser' },
  { wnr: '2.4668', name: 'NiCr19Fe19Nb5Mo3', old: 'Inconel 718', aisi: 'N07718 (UNS)', group: 'ti', state: 'ausgehärtet', rm: '≥ 1240', re: '≥ 1030', hb: '≈ 400 HB', mach: 1, weld: 'bedingt', iso: 'S', cut: 's-ni', rho: 8.19, use: 'Turbinen, hochwarmfeste Verbindungselemente' },
];

export const MACH_LABEL = ['', 'schlecht', 'mäßig', 'mittel', 'gut', 'sehr gut'];
