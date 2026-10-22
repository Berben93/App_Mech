// Eigene Schnittdaten: Einträge, CSV, Austausch per Datei oder Link. Ohne DOM (getestet).
import { rpm } from '../schnittwerte/calc.js';

export const PROCS = { turn: 'Drehen', mill: 'Fräsen', drill: 'Bohren' };

/** Felder eines Eintrags; Zahlen als Zahl oder null. */
export const NUM_FIELDS = ['d', 'z', 'vc', 'f', 'ap', 'ae'];

const toNum = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim().replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function newId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Eintrag säubern: fehlende Felder ergänzen, Zahlen lesen. Ungültig → null. */
export function normalizeEntry(e) {
  if (!e || typeof e !== 'object') return null;
  const proc = PROCS[e.proc] ? e.proc : Object.keys(PROCS).find((k) => PROCS[k].toLowerCase() === String(e.proc ?? '').trim().toLowerCase()) || 'turn';
  const out = {
    id: String(e.id || newId()).slice(0, 40),
    machine: String(e.machine ?? '').trim().slice(0, 80),
    tool: String(e.tool ?? '').trim().slice(0, 120),
    material: String(e.material ?? '').trim().slice(0, 120),
    proc,
    note: String(e.note ?? '').trim().slice(0, 500),
    by: String(e.by ?? '').trim().slice(0, 60),
    updated: e.updated && !Number.isNaN(Date.parse(e.updated)) ? new Date(e.updated).toISOString() : new Date().toISOString(),
  };
  for (const k of NUM_FIELDS) out[k] = toNum(e[k]);
  if (!(out.vc > 0) || !(out.d > 0)) return null;
  if (!out.machine && !out.tool && !out.material) return null;
  return out;
}

/** Drehzahl und Vorschubgeschwindigkeit aus dem Eintrag. */
export function derived(e) {
  const n = rpm(e.vc, e.d);
  const vf = e.f > 0 ? n * e.f * (e.proc === 'mill' ? (e.z > 0 ? e.z : 1) : 1) : NaN;
  return { n, vf };
}

/**
 * Einträge zusammenführen (gleiche ID: neuere Änderung gewinnt).
 * Liefert { list, added, changed, same }.
 */
export function mergeEntries(existing, incoming) {
  const map = new Map(existing.map((e) => [e.id, e]));
  let added = 0;
  let changed = 0;
  let same = 0;
  for (const raw of incoming) {
    const e = normalizeEntry(raw);
    if (!e) continue;
    const old = map.get(e.id);
    if (!old) { map.set(e.id, e); added++; } else if (Date.parse(e.updated) > Date.parse(old.updated)) { map.set(e.id, e); changed++; } else same++;
  }
  return { list: sortEntries([...map.values()]), added, changed, same };
}

export function sortEntries(list) {
  return [...list].sort((a, b) => a.machine.localeCompare(b.machine, 'de') || a.tool.localeCompare(b.tool, 'de') || a.material.localeCompare(b.material, 'de'));
}

// CSV für Excel/LibreOffice (deutsch: Semikolon und Dezimalkomma)
export const CSV_HEAD = ['Maschine', 'Werkzeug', 'Werkstoff', 'Verfahren', 'Ø mm', 'Schneiden z', 'vc m/min', 'f mm/U bzw. fz mm', 'ap mm', 'ae mm', 'n 1/min', 'vf mm/min', 'Notiz', 'Von', 'Geändert', 'ID'];

function csvCell(v, sep) {
  const s = String(v ?? '');
  return /["\n\r]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(entries, { sep = ';', dec = ',' } = {}) {
  const n = (v, digits = 4) => (v === null || v === undefined || !Number.isFinite(v) ? '' : String(Math.round(v * 10 ** digits) / 10 ** digits).replace('.', dec));
  const rows = entries.map((e) => {
    const d = derived(e);
    return [e.machine, e.tool, e.material, PROCS[e.proc], n(e.d), n(e.z), n(e.vc), n(e.f), n(e.ap), n(e.ae), n(d.n, 0), n(d.vf, 0), e.note, e.by, e.updated, e.id];
  });
  // BOM, damit Excel Umlaute richtig liest
  return `﻿${[CSV_HEAD, ...rows].map((r) => r.map((c) => csvCell(c, sep)).join(sep)).join('\r\n')}\r\n`;
}

/** CSV-Zeilen lesen (Anführungszeichen, Zeilenumbrüche in Zellen). */
export function parseCSVRows(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : (firstLine.includes('\t') ? '\t' : ',');
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** CSV (eigener Export oder ähnlich aufgebaut) in Einträge umwandeln. */
export function parseCSV(text) {
  const rows = parseCSVRows(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const idx = {
    machine: col('maschine', 'machine'), tool: col('werkzeug', 'tool'), material: col('werkstoff', 'material'),
    proc: col('verfahren', 'process'), d: col('ø', 'd ', 'durchmesser', 'diameter'), z: col('schneiden', 'z', 'teeth'),
    vc: col('vc'), f: col('f ', 'f mm', 'fz', 'vorschub', 'feed'), ap: col('ap'), ae: col('ae'),
    note: col('notiz', 'note', 'bemerkung'), by: col('von', 'by', 'autor'), updated: col('geändert', 'updated', 'datum'), id: col('id'),
  };
  return rows.slice(1).map((r) => normalizeEntry(Object.fromEntries(Object.entries(idx).filter(([, i]) => i >= 0).map(([k, i]) => [k, r[i]])))).filter(Boolean);
}

// Austauschformat: Datei (JSON) und Link (Base64url, wenn möglich komprimiert)
export function toExport(entries) {
  return { app: 'tabellenbuch', type: 'schnittdaten', v: 1, exported: new Date().toISOString(), entries };
}

/** JSON- oder CSV-Text einer Datei lesen. Liefert Einträge oder wirft einen Fehler. */
export function parseImport(text) {
  const t = String(text ?? '').trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    const data = JSON.parse(t);
    const list = Array.isArray(data) ? data : data.entries;
    if (!Array.isArray(list)) throw new Error('Keine Schnittdaten in der Datei');
    return list.map(normalizeEntry).filter(Boolean);
  }
  const list = parseCSV(t);
  if (!list.length) throw new Error('Keine Schnittdaten in der Datei');
  return list;
}

// Kurzform für Links: Felder als Array, damit der Link kurz bleibt
const KEYS = ['id', 'machine', 'tool', 'material', 'proc', 'd', 'z', 'vc', 'f', 'ap', 'ae', 'note', 'by', 'updated'];

function b64urlFromBytes(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(text) {
  const s = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function encodeLink(entries) {
  const json = JSON.stringify(entries.map((e) => KEYS.map((k) => (k === 'updated' && e[k] ? `${e[k].slice(0, 19)}Z` : e[k] ?? null))));
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') return `z${b64urlFromBytes(await pipe(bytes, new CompressionStream('deflate-raw')))}`;
  return `j${b64urlFromBytes(bytes)}`;
}

export async function decodeLink(text) {
  const kind = text[0];
  let bytes = bytesFromB64url(text.slice(1));
  if (kind === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
  else if (kind !== 'j') throw new Error('Unbekanntes Format');
  const rows = JSON.parse(new TextDecoder().decode(bytes));
  return rows.map((r) => normalizeEntry(Object.fromEntries(KEYS.map((k, i) => [k, r[i]])))).filter(Boolean);
}
