// Umrechnungsfaktoren: Wert in Basiseinheit = Wert × factor. Temperatur wird gesondert gerechnet.

export const CATEGORIES = [
  {
    id: 'laenge', name: 'Länge', units: [
      ['mm', 1], ['µm', 0.001], ['cm', 10], ['m', 1000], ['in', 25.4, ['zoll', '"', 'inch']], ['ft', 304.8, ['fuß']], ['yd', 914.4], ['thou', 0.0254, ['mil']],
    ],
  },
  {
    id: 'kraft', name: 'Kraft', units: [
      ['N', 1], ['kN', 1000], ['daN', 10], ['kp', 9.80665], ['lbf', 4.4482216],
    ],
  },
  {
    id: 'moment', name: 'Drehmoment', units: [
      ['Nm', 1], ['Ncm', 0.01], ['kNm', 1000], ['kpm', 9.80665], ['lbf·ft', 1.3558179, ['ftlb', 'lbft', 'ft-lb', 'ft·lbf']], ['lbf·in', 0.1129848, ['inlb', 'lbin', 'in-lb']],
    ],
  },
  {
    id: 'druck', name: 'Druck, Spannung', units: [
      ['bar', 1], ['mbar', 0.001], ['Pa', 1e-5], ['kPa', 0.01], ['MPa', 10], ['N/mm²', 10, ['n/mm2']], ['psi', 0.0689476], ['ksi', 68.9476], ['at', 0.980665], ['atm', 1.01325],
    ],
  },
  {
    id: 'masse', name: 'Masse', units: [
      ['kg', 1], ['g', 0.001], ['t', 1000], ['lb', 0.45359237, ['lbs', 'pfund']], ['oz', 0.028349523],
    ],
  },
  { id: 'temperatur', name: 'Temperatur', units: [['°C', null, ['c', 'grad']], ['°F', null, ['f']], ['K', null]] },
  {
    id: 'geschw', name: 'Geschwindigkeit', units: [
      ['m/min', 1], ['m/s', 60], ['km/h', 1000 / 60], ['ft/min', 0.3048, ['sfm', 'sfpm']], ['mm/min', 0.001], ['in/min', 0.0254, ['ipm']],
    ],
  },
  { id: 'vorschub', name: 'Vorschub', units: [['mm/U', 1, ['mm/rev']], ['in/U', 25.4, ['in/rev', 'ipr']]] },
  {
    id: 'leistung', name: 'Leistung', units: [
      ['kW', 1], ['W', 0.001], ['PS', 0.73549875], ['hp', 0.74569987],
    ],
  },
  {
    id: 'flaeche', name: 'Fläche', units: [
      ['mm²', 1, ['mm2']], ['cm²', 100, ['cm2']], ['m²', 1e6, ['m2', 'qm']], ['in²', 645.16, ['in2', 'sq in']],
    ],
  },
  {
    id: 'volumen', name: 'Volumen', units: [
      ['cm³', 1, ['cm3', 'ccm']], ['mm³', 0.001, ['mm3']], ['l', 1000, ['dm³', 'dm3', 'liter']], ['m³', 1e6, ['m3']], ['in³', 16.387064, ['in3']], ['gal (US)', 3785.41178, ['gal']],
    ],
  },
  {
    id: 'winkel', name: 'Winkel', units: [
      ['°', 1, ['grad', 'deg']], ['′', 1 / 60, ["'", 'min']], ['″', 1 / 3600, ['"', 'sek']], ['rad', 180 / Math.PI], ['gon', 0.9],
    ],
  },
];
