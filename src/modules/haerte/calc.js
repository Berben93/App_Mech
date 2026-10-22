// Härte-Umwertung durch lineare Interpolation in der Tabelle nach DIN EN ISO 18265.
import { HARDNESS, SCALES } from './data.js';

export function scale(key) {
  return SCALES.find((s) => s.key === key) || null;
}

/** Interpoliert in Spalte `to` für den Wert `value` in Spalte `from` (beide Spalten müssen belegt sein). */
function interpolate(from, value, to) {
  const rows = HARDNESS.filter((r) => r[from] !== null && r[to] !== null);
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (value >= a[from] && value <= b[from]) {
      const t = (value - a[from]) / (b[from] - a[from]);
      return a[to] + t * (b[to] - a[to]);
    }
  }
  if (rows.length && value === rows[rows.length - 1][from]) return rows[rows.length - 1][to];
  return null;
}

/**
 * Rechnet einen Härtewert in alle anderen Skalen um.
 * @returns {{HV, HB, HRC, HRB, Rm}} – nicht definierte Werte sind null; null, wenn außerhalb der Tabelle
 */
export function convertHardness(value, fromKey) {
  const s = scale(fromKey);
  if (!s || !Number.isFinite(value)) return null;
  // Erst nach HV (in der Tabelle vollständig), dann von HV in die anderen Spalten
  const hv = s.col === 0 ? value : interpolate(s.col, value, 0);
  if (hv === null || hv < HARDNESS[0][0] || hv > HARDNESS[HARDNESS.length - 1][0]) return null;
  const out = {};
  for (const t of SCALES) out[t.key] = t.col === 0 ? hv : interpolate(0, hv, t.col);
  out[s.key] = value;
  return out;
}

/** Erkennt Eingaben wie "45 HRC", "HB 250", "800 N/mm²", "Rm 1000". */
export function parseHardness(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  let m = /^(\d+(?:\.\d+)?)\s*(hrc|hrb|hv|hbw?|n\/mm2|n\/mm²|mpa)$/i.exec(t);
  if (m) return { value: parseFloat(m[1]), key: keyOf(m[2]) };
  m = /^(hrc|hrb|hv|hbw?|rm)\s*(\d+(?:\.\d+)?)$/i.exec(t);
  if (m) return { value: parseFloat(m[2]), key: keyOf(m[1]) };
  return null;
}

function keyOf(unit) {
  const u = unit.toLowerCase();
  if (u === 'hrc') return 'HRC';
  if (u === 'hrb') return 'HRB';
  if (u === 'hv') return 'HV';
  if (u === 'hb' || u === 'hbw') return 'HB';
  return 'Rm';
}
