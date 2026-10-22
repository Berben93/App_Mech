// Kleine Helfer für DOM und Zahlenformat. Bewusst ohne Framework,
// damit die App ohne Build-Schritt und komplett offline läuft.
import { isInch, toImperial } from './units.js';
import { getSettings } from './store.js';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $$(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

/** Zahl deutsch formatieren. `digits` = feste Nachkommastellen, sonst bis zu `max`. */
export function fmt(value, digits, max = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  if (!Number.isFinite(value)) return '∞';
  const opts = digits === undefined
    ? { maximumFractionDigits: max }
    : { minimumFractionDigits: digits, maximumFractionDigits: digits };
  return value.toLocaleString('de-DE', opts);
}

/** Abmaß mit Vorzeichen, z. B. +0,021 oder −0,007. */
export function fmtSigned(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  if (value === 0) return '0';
  const s = fmt(Math.abs(value), digits);
  return (value > 0 ? '+' : '−') + s;
}

/** Eingabe mit Komma oder Punkt lesen. */
export function num(input) {
  if (typeof input === 'number') return input;
  const v = parseFloat(String(input ?? '').trim().replace(',', '.'));
  return Number.isFinite(v) ? v : NaN;
}

/** Werte aller benannten Felder eines Formulars als Objekt. */
export function formValues(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') out[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else out[el.name] = el.value;
  }
  return out;
}

export function options(list, selected) {
  return list.map((o) => {
    const [value, label] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(value)}"${String(value) === String(selected) ? ' selected' : ''}>${esc(label)}</option>`;
  }).join('');
}

/** Tabelle aus Kopfzeile und Zeilen; Zellen sind bereits escaped/HTML. */
export function table(head, rows, cls = '') {
  return `<div class="table-wrap"><table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead>`
    + `<tbody>${rows.map((r) => `<tr${r.cls ? ` class="${r.cls}"` : ''}>${(r.cells || r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/**
 * Ergebniszeile: Bezeichnung, Wert, Einheit.
 * Im Zoll-Modus wird der Wert umgerechnet; der metrische Wert steht klein darunter.
 */
export function result(label, value, unit = '', big = false) {
  const imp = unit && isInch() ? toImperial(String(value), unit) : null;
  const shown = imp
    ? `${imp.text} <small>${imp.unit}</small><small class="alt">${value} ${unit}</small>`
    : `${value}${unit ? ` <small>${unit}</small>` : ''}`;
  return `<div class="result${big ? ' result-big' : ''}"><span class="result-label">${label}</span>`
    + `<span class="result-value">${shown}</span></div>`;
}

/**
 * Aufklappbarer Rechenweg für Azubis.
 * steps: [{ title, formula, values, result }] – alles bereits als HTML (escaped).
 *   formula  allgemeine Formel, z. B. "n = v<sub>c</sub>·1000 / (π·d)"
 *   values   mit eingesetzten Werten, z. B. "n = 200·1000 / (π·50)"
 *   result   Ergebnis mit Einheit, z. B. "1273 1/min"
 */
export function steps(list, title = 'Rechenweg') {
  const items = list.filter(Boolean);
  if (!items.length) return '';
  const open = getSettings().steps ? ' open' : '';
  return `<details class="steps"${open}><summary>${title}</summary><ol>${items.map((s) => `<li>
      ${s.title ? `<span class="step-title">${s.title}</span>` : ''}
      ${s.formula ? `<code class="step-formula">${s.formula}</code>` : ''}
      ${s.values ? `<code class="step-values">${s.values}</code>` : ''}
      ${s.result ? `<span class="step-result">= ${s.result}</span>` : ''}
    </li>`).join('')}</ol></details>`;
}

/** Für Vergleiche: klein, ohne Akzente, ß → ss. */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u00ad/g, '')
    .replace(/ß/g, 'ss')
    .trim();
}
