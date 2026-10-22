// Rechenlogik ISO-Passungen (ISO 286). Ergebnisse in µm.
import { IT_RANGES, IT_TABLE, FINE_RANGES, SHAFT_ES, SHAFT_EI, SHAFT_J, HOLE_J } from './data.js';

export const MAX_NOMINAL = 500;

function rangeIndex(ranges, nominal) {
  if (!(nominal > 0) || nominal > ranges[ranges.length - 1]) return -1;
  return ranges.findIndex((upper) => nominal <= upper);
}

/** Grundtoleranz IT in µm oder null. */
export function itValue(grade, nominal) {
  const i = rangeIndex(IT_RANGES, nominal);
  const row = IT_TABLE[grade];
  return i < 0 || !row ? null : row[i];
}

/** Toleranzklasse wie "H7", "js6", "g6" zerlegen. */
export function parseTolerance(text) {
  const m = /^\s*([a-zA-Z]{1,2})\s*(\d{1,2})\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  const letter = m[1];
  const isHole = letter[0] === letter[0].toUpperCase();
  const lower = letter.toLowerCase();
  // Gemischte Schreibweise wie "Js" als Bohrung "JS" deuten
  return { letter: isHole ? letter.toUpperCase() : lower, grade: Number(m[2]), isHole };
}

// js/JS: ±IT/2; bei IT7–IT11 wird ein ungerader IT-Wert auf die nächst kleinere gerade Zahl gerundet.
function jsHalf(grade, it) {
  const v = grade >= 7 && grade <= 11 && it % 2 === 1 ? it - 1 : it;
  return v / 2;
}

/** Abmaße einer Welle {es, ei, it} in µm oder null, wenn nicht genormt. */
export function shaftDeviation(letter, grade, nominal) {
  const it = itValue(grade, nominal);
  const fi = rangeIndex(FINE_RANGES, nominal);
  const mi = rangeIndex(IT_RANGES, nominal);
  if (it === null || fi < 0) return null;
  let es;
  let ei;
  if (SHAFT_ES[letter]) {
    es = SHAFT_ES[letter][fi];
    ei = es - it;
  } else if (letter === 'js') {
    es = jsHalf(grade, it);
    ei = -es;
  } else if (letter === 'j') {
    if (!SHAFT_J[grade]) return null;
    ei = SHAFT_J[grade][mi];
    es = ei + it;
  } else if (letter === 'k') {
    ei = grade >= 4 && grade <= 7 ? SHAFT_EI.k[fi] : 0;
    es = ei + it;
  } else if (SHAFT_EI[letter]) {
    ei = SHAFT_EI[letter][fi];
    if (ei === null) return null;
    es = ei + it;
  } else {
    return null;
  }
  return { es: round(es), ei: round(ei), it };
}

/** Δ-Wert für Bohrungen K–N (bis IT8) und P–U (bis IT7). */
function delta(grade, nominal) {
  if (nominal <= 3 || grade < 3 || grade > 8) return 0;
  return itValue(grade, nominal) - itValue(grade - 1, nominal);
}

/** Abmaße einer Bohrung {ES, EI, it} in µm oder null. */
export function holeDeviation(letter, grade, nominal) {
  const it = itValue(grade, nominal);
  const fi = rangeIndex(FINE_RANGES, nominal);
  const mi = rangeIndex(IT_RANGES, nominal);
  if (it === null || fi < 0) return null;
  const l = letter.toLowerCase();
  let ES;
  let EI;
  if (SHAFT_ES[l]) {
    EI = -SHAFT_ES[l][fi];
    ES = EI + it;
  } else if (l === 'js') {
    ES = jsHalf(grade, it);
    EI = -ES;
  } else if (l === 'j') {
    if (!HOLE_J[grade]) return null;
    ES = HOLE_J[grade][mi];
    EI = ES - it;
  } else if (l === 'k') {
    ES = grade <= 8 ? -SHAFT_EI.k[fi] + delta(grade, nominal) : 0;
    EI = ES - it;
  } else if (l === 'm') {
    ES = -SHAFT_EI.m[fi] + (grade <= 8 ? delta(grade, nominal) : 0);
    EI = ES - it;
  } else if (l === 'n') {
    if (grade <= 8) ES = -SHAFT_EI.n[fi] + delta(grade, nominal);
    else ES = nominal <= 3 ? -4 : 0;
    EI = ES - it;
  } else if (SHAFT_EI[l]) {
    const ei = SHAFT_EI[l][fi];
    if (ei === null) return null;
    ES = -ei + (grade <= 7 ? delta(grade, nominal) : 0);
    EI = ES - it;
  } else {
    return null;
  }
  return { ES: round(ES), EI: round(EI), it };
}

/** Abmaße für eine Toleranzklasse als einheitliches Objekt {upper, lower, it, isHole}. */
export function tolerance(text, nominal) {
  const t = parseTolerance(text);
  if (!t) return null;
  if (t.isHole) {
    const d = holeDeviation(t.letter, t.grade, nominal);
    return d && { ...t, upper: d.ES, lower: d.EI, it: d.it };
  }
  const d = shaftDeviation(t.letter, t.grade, nominal);
  return d && { ...t, upper: d.es, lower: d.ei, it: d.it };
}

/**
 * Passung aus Bohrung und Welle. Spiel positiv, Übermaß negativ (µm).
 * Liefert auch die Passungsart: 'spiel', 'uebergang' oder 'uebermass'.
 */
export function fit(nominal, holeText, shaftText) {
  const hole = tolerance(holeText, nominal);
  const shaft = tolerance(shaftText, nominal);
  if (!hole || !shaft || !hole.isHole || shaft.isHole) return null;
  const max = hole.upper - shaft.lower;
  const min = hole.lower - shaft.upper;
  let kind = 'uebergang';
  if (min >= 0) kind = 'spiel';
  else if (max <= 0) kind = 'uebermass';
  return { nominal, hole, shaft, max, min, kind };
}

/** "25 H7/g6", "H7/g6", "Ø25H7" usw. erkennen. */
export function parseFitQuery(text) {
  const m = /^\s*(?:[øØ⌀]\s*)?(\d+(?:[.,]\d+)?)?\s*([A-Z]{1,2}\d{1,2})\s*(?:\/\s*([a-z]{1,2}\d{1,2}))?\s*$/.exec(String(text ?? ''));
  // Ohne Nennmaß und ohne Welle wäre z. B. "M12" mehrdeutig (Gewinde oder Toleranz)
  if (!m || (!m[1] && !m[3])) return null;
  return { nominal: m[1] ? parseFloat(m[1].replace(',', '.')) : null, hole: m[2], shaft: m[3] || null };
}

/** Einzelne Wellen-Toleranz wie "25 g6" erkennen. */
export function parseShaftQuery(text) {
  const m = /^\s*(?:[øØ⌀]\s*)?(\d+(?:[.,]\d+)?)\s*([a-z]{1,2}\d{1,2})\s*$/.exec(String(text ?? ''));
  if (!m) return null;
  return { nominal: parseFloat(m[1].replace(',', '.')), shaft: m[2] };
}

function round(v) {
  return Math.round(v * 10) / 10 + 0; // + 0 macht aus −0 eine 0
}
