// Gewindeberechnungen aus dem Grundprofil. Maße in mm.
import { METRIC_COARSE, METRIC_FINE, UNIFIED, PIPE_G, TRAPEZ, CLEARANCE, TAP_DRILL_OVERRIDE } from './data.js';

const r3 = (v) => Math.round(v * 1000) / 1000;
const INCH = 25.4;

/**
 * 60°-Gewinde (metrisch ISO und Unified) nach ISO 68-1:
 * H = 0,866025·P; d2 = d − 0,649519·P; d3 = d − 1,226869·P; D1 = d − 1,082532·P.
 * Kernlochbohrung als Faustwert d − P.
 */
export function profile60(d, p) {
  return {
    d,
    p,
    H: r3(0.866025 * p),
    d2: r3(d - 0.649519 * p),
    d3: r3(d - 1.226869 * p),
    D1: r3(d - 1.082532 * p),
    h3: r3(0.613435 * p),
    tapDrill: Math.round((d - p) * 100) / 100,
  };
}

/** Metrisches Gewinde. Ohne Steigung wird das Regelgewinde genommen. */
export function metric(d, p) {
  const coarse = METRIC_COARSE.find((t) => t.d === d);
  const pitch = p ?? coarse?.p;
  if (!pitch) return null;
  const isCoarse = !!coarse && coarse.p === pitch;
  const known = isCoarse || METRIC_FINE.some((t) => t.d === d && t.p === pitch);
  return {
    type: isCoarse ? 'M' : 'MF',
    name: isCoarse ? `M${fmtNum(d)}` : `M${fmtNum(d)}×${fmtNum(pitch)}`,
    known,
    ...profile60(d, pitch),
    ...(TAP_DRILL_OVERRIDE[`${d}x${pitch}`] ? { tapDrill: TAP_DRILL_OVERRIDE[`${d}x${pitch}`] } : {}),
    clearance: CLEARANCE[d] || null,
  };
}

/** Unified-Gewinde UNC/UNF in mm umgerechnet. */
export function unified(size, series) {
  const t = UNIFIED.find((u) => u.size === size);
  const tpi = t?.[series.toLowerCase()];
  if (!tpi) return null;
  const d = t.dIn * INCH;
  const p = INCH / tpi;
  const prof = profile60(r3(d), r3(p));
  return {
    type: series.toUpperCase(),
    name: `${size}"-${tpi} ${series.toUpperCase()}`,
    tpi,
    dIn: t.dIn,
    ...prof,
    // Kernloch auf 0,1 mm gerundet, wie in der Werkstatt üblich
    tapDrill: Math.round((d - p) * 10) / 10,
  };
}

/** Whitworth-Rohrgewinde G (55°): H = 0,960491·P, Gewindetiefe h = 0,640327·P. */
export function pipe(size) {
  const t = PIPE_G.find((g) => g.size === size);
  if (!t) return null;
  const p = INCH / t.tpi;
  return {
    type: 'G',
    name: `G ${size}`,
    tpi: t.tpi,
    d: t.d,
    p: r3(p),
    H: r3(0.960491 * p),
    h: r3(0.640327 * p),
    d2: r3(t.d - 0.640327 * p),
    D1: t.d1,
    tapDrill: t.drill,
  };
}

/** Trapezgewinde nach ISO 2904: Spiel ac je nach Steigung. */
export function trapez(d, p) {
  const t = TRAPEZ.find((x) => x.d === d && (p === undefined || x.p === p));
  const pitch = p ?? t?.p;
  if (!pitch) return null;
  let ac = 0.5;
  if (pitch <= 1.5) ac = 0.15;
  else if (pitch <= 5) ac = 0.25;
  else if (pitch > 12) ac = 1;
  const h3 = 0.5 * pitch + ac;
  return {
    type: 'Tr',
    name: `Tr${fmtNum(d)}×${fmtNum(pitch)}`,
    known: !!t,
    d,
    p: pitch,
    ac,
    h3: r3(h3),
    d2: r3(d - 0.5 * pitch),
    d3: r3(d - 2 * h3),
    D1: r3(d - pitch),
    D4: r3(d + 2 * ac),
    tapDrill: r3(d - pitch),
  };
}

function fmtNum(v) {
  return String(v).replace('.', ',');
}

/** Suchtext erkennen: M12, M12x1,5, 1/4-20, 1/2 UNC, G1/2, Tr20x4. */
export function parseThread(text) {
  const q = String(text ?? '').trim().replace(/\s+/g, ' ');
  let m = /^M\s?(\d+(?:[.,]\d+)?)(?:\s?[x×*]\s?(\d+(?:[.,]\d+)?))?$/i.exec(q);
  if (m) {
    const d = parseFloat(m[1].replace(',', '.'));
    const p = m[2] ? parseFloat(m[2].replace(',', '.')) : undefined;
    return { kind: 'metric', d, p };
  }
  m = /^Tr\s?(\d+(?:[.,]\d+)?)(?:\s?[x×*]\s?(\d+(?:[.,]\d+)?))?$/i.exec(q);
  if (m) return { kind: 'trapez', d: parseFloat(m[1].replace(',', '.')), p: m[2] ? parseFloat(m[2].replace(',', '.')) : undefined };
  m = /^G\s?(\d+(?: \d\/\d+|\/\d+)?)"?$/i.exec(q);
  if (m) return { kind: 'pipe', size: m[1] };
  m = /^(#?\d+(?: \d\/\d+|\/\d+)?)"?\s?(?:-\s?(\d+)|\s?(UNC|UNF))(?:\s?(UNC|UNF))?$/i.exec(q);
  if (m) {
    const size = m[1];
    const t = UNIFIED.find((u) => u.size === size);
    if (!t) return null;
    let series = (m[3] || m[4] || '').toUpperCase();
    if (!series && m[2]) {
      const tpi = Number(m[2]);
      series = t.unc === tpi ? 'UNC' : t.unf === tpi ? 'UNF' : '';
    }
    return series ? { kind: 'unified', size, series } : null;
  }
  return null;
}
