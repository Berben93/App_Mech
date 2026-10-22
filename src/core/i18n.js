// Sprachen: Deutsch ist die Quellsprache. Englisch kommt aus dem Wörterbuch
// src/i18n/en.js (weitere Sprachen als src/i18n/<sprache>.js), deren Schlüssel die deutschen Texte sind.
//
// Übersetzt wird die fertige Ansicht: Ein MutationObserver ersetzt Textknoten und die Attribute
// title, placeholder und aria-label. Module bleiben dadurch einsprachig geschrieben.
// Zahlen in Texten werden beim Nachschlagen durch {#} ersetzt („Frage {#} von {#}“) und danach
// wieder eingesetzt; Schlüssel mit {name} sind Muster, deren Teile ihrerseits übersetzt werden.
import { getSettings } from './store.js';

export const LANGS = [
  ['de', 'Deutsch'],
  ['en', 'English'],
];

/** Gewählte Sprache; "auto" folgt dem Gerät (außerhalb des Browsers immer Deutsch). */
export function lang() {
  const s = getSettings().lang;
  if (LANGS.some(([k]) => k === s)) return s;
  if (typeof document === 'undefined') return 'de';
  const nav = (navigator.languages || [navigator.language || 'de']).map((l) => String(l).slice(0, 2).toLowerCase());
  return nav.find((l) => LANGS.some(([k]) => k === l)) || 'de';
}

/** Zahlenformat: Englisch mit Punkt und ohne Tausendertrennung, sonst deutsch. */
export function numberLocale() {
  return lang() === 'en' ? 'en-US' : 'de-DE';
}

export function decimalSep() {
  return lang() === 'en' ? '.' : ',';
}

let dict = null;
let exact = new Map();
let patterns = [];
let phraseRe = null;

const NUM = /\d+(?:[.,]\d+)*/g;
const SEP = /( · |: |\. | – | → )/;
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wörterbuch setzen (auch für Tests). `d` = { deutsch: übersetzung }. */
export function setDictionary(d) {
  dict = d || null;
  exact = new Map();
  patterns = [];
  const phrases = [];
  for (const [de, tr] of Object.entries(d || {})) {
    if (/\{[a-z]\w*\}/.test(de)) {
      // Teile in Reihenfolge: Name (beliebiger Text) oder # (Zahl)
      const groups = [];
      const src = de.split(/(\{[a-z]\w*\}|\{#\})/).map((part) => {
        if (part === '{#}') { groups.push('#'); return '(\\d+(?:[.,]\\d+)*)'; }
        const m = /^\{([a-z]\w*)\}$/.exec(part);
        if (m) { groups.push(m[1]); return '(.+?)'; }
        return escRe(part);
      }).join('');
      patterns.push({ re: new RegExp(`^${src}$`), groups, tr });
    } else {
      exact.set(de, tr);
      if (!de.includes('{#}') && de.length >= 4 && /\p{L}{3}/u.test(de)) phrases.push(de);
    }
  }
  phrases.sort((a, b) => b.length - a.length);
  phraseRe = phrases.length ? new RegExp(`(?<![\\p{L}\\d])(?:${phrases.map(escRe).join('|')})(?![\\p{L}\\d])`, 'gu') : null;
}

/** Deutsche Zahl aus dem Quelltext für Englisch umschreiben („0,12“ → „0.12“). */
function fixNumber(n) {
  return lang() === 'en' && /^\d+,\d+$/.test(n) ? n.replace(',', '.') : n;
}

function fill(template, nums) {
  let i = 0;
  return template.replace(/\{#\}/g, () => fixNumber(nums[i++] ?? ''));
}

/** Einen Text übersetzen. Ohne Treffer bleibt er unverändert. */
export function translate(text, depth = 0) {
  if (!dict) return text;
  const t = norm(text);
  if (!t || !/\p{L}/u.test(t)) return text;
  const hit = exact.get(t);
  if (hit !== undefined) return hit;
  const nums = t.match(NUM);
  if (nums) {
    const key = t.replace(NUM, '{#}');
    const h = exact.get(key);
    if (h !== undefined) return fill(h, nums);
  }
  if (depth < 2) {
    for (const p of patterns) {
      const m = p.re.exec(t);
      if (!m) continue;
      const parts = {};
      const numParts = [];
      p.groups.forEach((g, i) => {
        if (g === '#') numParts.push(m[i + 1]);
        else parts[g] = translate(m[i + 1], depth + 1);
      });
      const out = fill(p.tr.replace(/\{([a-z]\w*)\}/g, (_, n) => parts[n] ?? ''), numParts);
      if (out !== t) return out;
    }
    // „Name: Erklärung“ zuerst als zwei ganze Teile versuchen
    const colon = t.indexOf(': ');
    if (colon > 0) {
      const rest = t.slice(colon + 2);
      const tr = translate(rest, depth + 1);
      if (tr !== rest) return `${translate(t.slice(0, colon), depth + 1)}: ${tr}`;
    }
    // Zusammengesetzte Texte („Rundstab · Edelstahl …“) in Teilen übersetzen
    const segs = t.split(SEP);
    if (segs.length > 1) {
      const out = segs.map((s, i) => {
        if (i % 2) return s;
        // Satzende mitnehmen, damit „Satz.“ als Schlüssel passt
        if (segs[i + 1] === '. ') {
          const tr = translate(`${s}.`, depth + 1);
          if (tr !== `${s}.`) return tr.replace(/\.$/, '');
        }
        return translate(s, depth + 1);
      }).join('');
      if (out !== t) return out;
    }
  }
  // Notlösung: bekannte Begriffe im Satz ersetzen
  if (phraseRe) {
    const out = t.replace(phraseRe, (w) => exact.get(w));
    if (out !== t) return out;
  }
  return text;
}

/** Für Texte im Code (Toasts, Dialoge, Bild-Export): `t('Text {name}', { name })`. */
export function t(text, vars) {
  let s = vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')) : text;
  if (dict) s = translate(s);
  return s;
}

const ATTRS = ['title', 'placeholder', 'aria-label'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'PRE', 'TEXTAREA']);
// Übersetzte Knoten merken, damit der Observer nicht erneut übersetzt
const done = new WeakMap();

function translateNode(node) {
  if (node.nodeType === 3) {
    const v = node.nodeValue;
    if (done.get(node) === v) return;
    const tr = translate(v);
    if (tr !== v) {
      const lead = v.match(/^\s*/)[0];
      const trail = v.match(/\s*$/)[0];
      node.nodeValue = lead + tr + trail;
    }
    done.set(node, node.nodeValue);
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.tagName) || node.closest?.('[translate="no"]')) return;
  for (const a of ATTRS) {
    const v = node.getAttribute(a);
    if (v && done.get(node)?.[a] !== v) {
      const tr = translate(v);
      if (tr !== v) node.setAttribute(a, tr);
      done.set(node, { ...(done.get(node) || {}), [a]: node.getAttribute(a) });
    }
  }
  for (const c of node.childNodes) translateNode(c);
}

/** Ansicht dauerhaft übersetzen (Text, Attribute, Fenstertitel). */
export function translateDocument(root = document.body) {
  if (!dict) return;
  translateNode(root);
  document.title = translate(document.title);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'childList') m.addedNodes.forEach(translateNode);
      else if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => {
      const tr = translate(document.title);
      if (tr !== document.title) document.title = tr;
    }).observe(titleEl, { childList: true });
  }
}

/** Wörterbuch der gewählten Sprache laden (Deutsch braucht keins). */
export async function initI18n() {
  const l = lang();
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  if (l === 'de') return l;
  try {
    const mod = await import(`../i18n/${l}.js`);
    setDictionary(mod.default);
  } catch (err) {
    console.warn('Sprachdatei nicht geladen', err);
  }
  return l;
}
