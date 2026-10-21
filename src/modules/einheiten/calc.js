import { CATEGORIES } from './data.js';

export function category(id) {
  return CATEGORIES.find((c) => c.id === id) || null;
}

function toCelsius(v, unit) {
  if (unit === '°F') return (v - 32) * (5 / 9);
  if (unit === 'K') return v - 273.15;
  return v;
}

function fromCelsius(c, unit) {
  if (unit === '°F') return c * (9 / 5) + 32;
  if (unit === 'K') return c + 273.15;
  return c;
}

/** Wert von einer Einheit in eine andere derselben Kategorie umrechnen. */
export function convert(value, catId, from, to) {
  const cat = category(catId);
  if (!cat || !Number.isFinite(value)) return NaN;
  if (catId === 'temperatur') return fromCelsius(toCelsius(value, from), to);
  const f = cat.units.find((u) => u[0] === from);
  const t = cat.units.find((u) => u[0] === to);
  if (!f || !t) return NaN;
  return (value * f[1]) / t[1];
}

/** Bruch oder Dezimalzahl lesen: "1 1/4", "3/8", "0,5". */
export function parseNumber(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  let m = /^(-?\d+)\s+(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = /^(-?\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[1]) / Number(m[2]);
  const v = Number(s);
  return s !== '' && Number.isFinite(v) ? v : NaN;
}

/** Einheit anhand von Kürzel oder Alias finden: {cat, unit}. */
export function findUnit(token) {
  const t = String(token ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  for (const cat of CATEGORIES) {
    for (const [name, , aliases = []] of cat.units) {
      if (name.toLowerCase() === t || aliases.includes(t)) return { cat: cat.id, unit: name };
    }
  }
  return null;
}

/** "25 mm", "1/2 zoll", "100 psi", "3/8\"" erkennen. */
export function parseQuantity(text) {
  const m = /^\s*(-?\d+\s+\d+\/\d+|\d+\/\d+|-?\d+(?:[.,]\d+)?)\s*(.+?)\s*(?:in\s+(.+))?$/i.exec(String(text ?? ''));
  if (!m) return null;
  const value = parseNumber(m[1]);
  // "in" allein ist Zoll; "25 mm in zoll" ist Ziel-Einheit
  let unitText = m[2];
  let target = m[3] ? findUnit(m[3]) : null;
  if (m[3] && !target) unitText = `${m[2]} in ${m[3]}`;
  const unit = findUnit(unitText);
  if (!unit || !Number.isFinite(value)) return null;
  if (target && target.cat !== unit.cat) target = null;
  return { value, ...unit, to: target?.unit || null };
}

/** Zollbrüche in 1/64-Schritten bis 1" mit mm-Wert. */
export function inchFractions(max = 1, step = 64) {
  const rows = [];
  for (let i = 1; i <= max * step; i += 1) {
    let n = i;
    let d = step;
    while (n % 2 === 0 && d > 1) { n /= 2; d /= 2; }
    rows.push({ label: d === 1 ? `${n}"` : `${n}/${d}"`, inch: i / step, mm: (i / step) * 25.4, denom: d });
  }
  return rows;
}
