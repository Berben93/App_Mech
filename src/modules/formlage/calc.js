// Hilfsrechnungen zu Form- und Lagetoleranzen.
import { SYMBOLS } from './data.js';
import { normalize } from '../../core/dom.js';

/**
 * Positionsabweichung einer Bohrung aus gemessenen Abweichungen in X und Y:
 * Ø-Abweichung = 2 · √(Δx² + Δy²). Mit MMR wächst die Toleranz um (Ist-Ø − MMR-Ø) bei Bohrungen.
 */
export function positionDeviation({ dx, dy, tol, mmc, actual, hole = true }) {
  const dev = 2 * Math.hypot(dx, dy);
  const bonus = mmc > 0 && actual > 0 ? Math.max(0, hole ? actual - mmc : mmc - actual) : 0;
  const allowed = tol + bonus;
  return { dev, bonus, allowed, ok: dev <= allowed + 1e-12 };
}

export function findSymbol(query) {
  const q = normalize(query);
  if (q.length < 3) return [];
  return SYMBOLS.filter((s) => normalize(s.name).split(/[\s/()]+/).some((w) => w.startsWith(q)) || normalize(s.id).startsWith(q));
}
