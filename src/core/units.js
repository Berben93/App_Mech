// Globaler Zoll/Metrisch-Schalter. Die Rechnung bleibt metrisch; Ergebnisse
// mit einer bekannten Einheit werden im Zoll-Modus umgerechnet angezeigt
// (Zoll-Wert groß, metrischer Wert klein darunter).
import { getSettings } from './store.js';

// Einheit → [Faktor, Zieleinheit, Nachkommastellen]
export const IMPERIAL = {
  mm: [1 / 25.4, 'in', 4],
  'µm': [1 / 0.0254, 'µin', 0],
  m: [3.280839895, 'ft', 3],
  'mm²': [1 / 645.16, 'in²', 4],
  'm/min': [3.280839895, 'ft/min', 0],
  'mm/min': [1 / 25.4, 'in/min', 2],
  'mm/U': [1 / 25.4, 'in/U', 4],
  'cm³/min': [0.0610237441, 'in³/min', 2],
  kg: [2.2046226218, 'lb', 3],
  'kg/m': [0.6719689751, 'lb/ft', 3],
  N: [0.2248089431, 'lbf', 1],
  kN: [224.8089431, 'lbf', 0],
  Nm: [0.7375621493, 'lbf·ft', 1],
  'N/mm²': [145.0377377, 'psi', 0],
  MPa: [145.0377377, 'psi', 0],
  kW: [1.3410220896, 'hp', 2],
  'g/cm³': [0.0361272920, 'lb/in³', 4],
};

export function isInch() {
  return getSettings().units === 'inch';
}

// Deutsche Zahl im Text, z. B. 1.234,5 oder −0,021 oder +3
const NUMBER = /([+−-]?)(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/g;

function parseDe(text) {
  return parseFloat(text.replace(/\./g, '').replace(',', '.'));
}

function formatDe(value, digits) {
  return value.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/**
 * Wandelt alle Zahlen eines (bereits formatierten) Ergebnistextes in Zoll-Einheiten um.
 * Liefert null, wenn die Einheit nicht umrechenbar ist oder der Text HTML enthält.
 */
export function toImperial(valueText, unit) {
  const conv = IMPERIAL[unit];
  if (!conv || /[<>]/.test(valueText)) return null;
  const [factor, target, digits] = conv;
  let found = false;
  const text = String(valueText).replace(NUMBER, (_, sign, n) => {
    found = true;
    const v = parseDe(n) * factor;
    return `${sign}${formatDe(v, digits)}`;
  });
  return found ? { text, unit: target } : null;
}
