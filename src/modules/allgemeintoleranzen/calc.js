import { LINEAR, RADIUS, ANGLE, STRAIGHTNESS, PERPENDICULARITY, SYMMETRY } from './data.js';

/** Zeile finden, in die das Maß fällt (über from bis einschließlich to; die erste Zeile schließt from ein). */
export function findRow(rows, value) {
  if (!(value >= rows[0].from) || value > rows[rows.length - 1].to) return null;
  return rows.find((r, i) => value <= r.to && (i === 0 ? value >= r.from : value > r.from)) || null;
}

/** ± Grenzabmaß für ein Längenmaß, oder null. */
export function linearTolerance(nominal, cls) {
  const row = findRow(LINEAR, nominal);
  return row ? row[cls] : null;
}

export function radiusTolerance(nominal, cls) {
  const row = findRow(RADIUS, nominal);
  return row ? row[cls] : null;
}

/** ± Winkelabweichung in Minuten für die Länge des kürzeren Schenkels. */
export function angleTolerance(shortLeg, cls) {
  const row = shortLeg > 0 ? findRow(ANGLE, shortLeg) : null;
  return row ? row[cls] : null;
}

export function formTolerances(nominal, cls) {
  const pick = (rows) => {
    const row = findRow(rows, nominal);
    return row ? row[cls] : null;
  };
  return {
    straightness: pick(STRAIGHTNESS),
    perpendicularity: pick(PERPENDICULARITY),
    symmetry: pick(SYMMETRY),
  };
}

/** Winkelminuten als 1°30′ darstellen. */
export function formatMinutes(min) {
  if (min === null || min === undefined) return '–';
  const d = Math.floor(min / 60);
  const m = min % 60;
  return `±${d}°${m ? `${m}′` : ''}`;
}
