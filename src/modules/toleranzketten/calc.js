// Maßketten: Schlussmaß nach dem arithmetischen (Worst Case) und dem statistischen Verfahren (RSS).
import { tolerance } from '../passungen/calc.js';
import { num } from '../../core/dom.js';

/**
 * Toleranzangabe lesen. Erlaubt: "±0,1", "+0,1/-0,05", "0/-0.1", "+0.2", "h7", "H7", "js6", leer = 0.
 * @returns {{es:number, ei:number, iso?:string}|null} Abmaße in mm
 */
export function parseTol(text, nominal) {
  const t = String(text ?? '').trim().replace(/\s+/g, '').replace(/−/g, '-').replace(/,/g, '.');
  if (!t) return { es: 0, ei: 0 };
  let m = /^(?:±|\+-|\+\/-)(\d*\.?\d+)$/.exec(t);
  if (m) return { es: +m[1], ei: -m[1] };
  m = /^([+-]?\d*\.?\d+)\/([+-]?\d*\.?\d+)$/.exec(t);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    return { es: Math.max(a, b), ei: Math.min(a, b) };
  }
  m = /^([+-]\d*\.?\d+)$/.exec(t);
  if (m) {
    const a = parseFloat(m[1]);
    return a >= 0 ? { es: a, ei: 0 } : { es: 0, ei: a };
  }
  if (/^[a-zA-Z]{1,2}\d{1,2}$/.test(t) && nominal > 0) {
    const iso = tolerance(t, nominal);
    if (iso) return { es: iso.upper / 1000, ei: iso.lower / 1000, iso: t };
  }
  return null;
}

/**
 * @param {Array<{dir:1|-1, n:number, es:number, ei:number}>} links  dir +1 = vergrößerndes, −1 = verkleinerndes Maß
 */
export function chain(links) {
  if (!links.length) return null;
  let N = 0; let ES = 0; let EI = 0; let C = 0; let sumSq = 0;
  for (const l of links) {
    const T = l.es - l.ei;
    const mid = (l.es + l.ei) / 2;
    N += l.dir * l.n;
    if (l.dir > 0) { ES += l.es; EI += l.ei; } else { ES -= l.ei; EI -= l.es; }
    C += l.dir * mid;
    sumSq += T * T;
  }
  const Tstat = Math.sqrt(sumSq);
  return {
    N,
    arith: { ES, EI, T: ES - EI, max: N + ES, min: N + EI },
    stat: { ES: C + Tstat / 2, EI: C - Tstat / 2, T: Tstat, max: N + C + Tstat / 2, min: N + C - Tstat / 2, C },
  };
}

/** Kettenglieder als kompakter URL-Text: "+50:±0.1;-20:h7". */
export function encodeLinks(rows) {
  return rows.map((r) => `${r.dir > 0 ? '+' : '-'}${r.n}:${r.tol}`).join(';');
}

export function decodeLinks(text) {
  if (!text) return null;
  const rows = String(text).split(';').map((part) => {
    const m = /^([+-])([^:]*):(.*)$/.exec(part);
    return m ? { dir: m[1] === '+' ? 1 : -1, n: m[2], tol: m[3] } : null;
  }).filter(Boolean);
  return rows.length ? rows : null;
}

/** Zeilen (Texte) in Kettenglieder (Zahlen) umwandeln; ungültige Zeilen liefern einen Fehler. */
export function toLinks(rows) {
  return rows.map((r, i) => {
    const n = num(r.n);
    const t = n > 0 ? parseTol(r.tol, n) : null;
    return { i: i + 1, dir: r.dir, n, ...(t || {}), ok: !!t && n > 0 };
  });
}
