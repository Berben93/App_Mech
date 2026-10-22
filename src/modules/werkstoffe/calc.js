// Suche in der Werkstoffdatenbank nach Werkstoffnummer, Kurzname, alter Bezeichnung oder AISI.
import { MATERIALS } from './data.js';
import { normalize } from '../../core/dom.js';

const compact = (s) => normalize(s).replace(/[\s\-_.,/()≈]/g, '');

export function findMaterial(wnr) {
  return MATERIALS.find((m) => m.wnr === wnr) || null;
}

/** Bewertet, wie gut ein Werkstoff zur Anfrage passt (0 = gar nicht). */
export function matchScore(m, query) {
  const q = compact(query);
  if (q.length < 2) return 0;
  const exact = [m.wnr, m.name, m.old, ...m.aisi.split('/')].map(compact);
  if (exact.includes(q)) return 100;
  // "304" soll nicht "304L" oder "1.4301" treffen, "aisi 304" schon
  const aisiQ = q.replace(/^(aisi|sae|uns|aa)/, '');
  if (m.aisi.split(/[\s/]+/).map(compact).includes(aisiQ)) return 95;
  if (q.length >= 3 && exact.some((t) => t.startsWith(q))) return 70;
  if (q.length >= 3 && compact(`${m.use} ${m.state}`).includes(q)) return 30;
  return 0;
}

export function searchMaterials(query, list = MATERIALS) {
  return list
    .map((m) => ({ m, score: matchScore(m, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => ({ ...x.m, score: x.score }));
}
