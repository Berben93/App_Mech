// Favoriten und Verlauf. Gespeichert wird der Link (Hash) samt Beschriftung,
// damit ein Tipp genau die gespeicherten Eingaben wieder öffnet.
import { load, save } from './store.js';

const MAX_HISTORY = 12;

/** Eintrag: { hash, module, label } */
export function getFavorites() {
  return load('favorites', []);
}

export function isFavorite(hash) {
  return getFavorites().some((f) => f.hash === hash);
}

/** Schaltet einen Favoriten an oder aus; liefert true, wenn er danach gesetzt ist. */
export function toggleFavorite(entry) {
  const list = getFavorites();
  const i = list.findIndex((f) => f.hash === entry.hash);
  if (i >= 0) list.splice(i, 1);
  else list.unshift({ hash: entry.hash, module: entry.module, label: entry.label });
  save('favorites', list);
  return i < 0;
}

export function removeFavorite(hash) {
  save('favorites', getFavorites().filter((f) => f.hash !== hash));
}

/** Eintrag: { hash, module, label, time } – neueste zuerst. */
export function getHistory() {
  return load('history', []);
}

/**
 * Merkt sich den aktuellen Stand eines Moduls. Solange man im selben Modul
 * weiterrechnet, wird der oberste Eintrag nur aktualisiert, damit der Verlauf
 * nicht mit jedem Tastendruck wächst.
 */
export function addHistory(entry, list = getHistory()) {
  const next = list.filter((h, i) => !(i === 0 && h.module === entry.module) && h.hash !== entry.hash);
  next.unshift({ hash: entry.hash, module: entry.module, label: entry.label, time: entry.time ?? Date.now() });
  const out = next.slice(0, MAX_HISTORY);
  save('history', out);
  return out;
}

export function clearHistory() {
  save('history', []);
}
