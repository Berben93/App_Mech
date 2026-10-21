// Globale Suche über alle Module. Jedes Modul kann eigene Treffer liefern
// (z. B. erkennt das Gewinde-Modul "M12"); zusätzlich wird über Titel und
// Schlagworte der Module gesucht.
import { MODULES } from './registry.js';
import { normalize } from './dom.js';

export function searchAll(query, modules = MODULES) {
  const q = String(query ?? '').trim();
  if (!q) return [];
  const nq = normalize(q);
  const hits = [];

  for (const mod of modules) {
    if (typeof mod.search === 'function') {
      try {
        for (const hit of mod.search(q) || []) hits.push({ ...hit, module: mod });
      } catch (err) {
        console.error(`Suche in ${mod.id} fehlgeschlagen`, err);
      }
    }
    const words = [mod.title, mod.subtitle, ...(mod.keywords || [])].map(normalize);
    let score = 0;
    for (const w of words) {
      if (w === nq) score = Math.max(score, 60);
      else if (w.startsWith(nq)) score = Math.max(score, 45);
      else if (nq.length >= 2 && w.includes(nq)) score = Math.max(score, 30);
    }
    if (score) hits.push({ module: mod, title: mod.title, text: mod.subtitle, params: {}, score });
  }

  return hits.sort((a, b) => b.score - a.score);
}
