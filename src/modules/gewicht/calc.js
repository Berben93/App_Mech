import { SHAPES } from './data.js';

/**
 * Masse eines Teils.
 * @param {string} shapeId
 * @param {object} dims  Maße in mm (Feldnamen der Form)
 * @param {number} length Länge in mm (bei Kugel ignoriert)
 * @param {number} rho   Dichte in g/cm³
 * @returns {{area:number|null, volume:number, mass:number, perMeter:number|null}} mm², cm³, kg, kg/m
 */
export function weight(shapeId, dims, length, rho) {
  const shape = SHAPES.find((s) => s.id === shapeId);
  if (!shape) return null;
  if (shape.volume) {
    const v = shape.volume(dims);
    return { area: null, volume: v / 1000, mass: (v * rho) / 1e6, perMeter: null };
  }
  const a = shape.area(dims);
  const v = a * length;
  return { area: a, volume: v / 1000, mass: (v * rho) / 1e6, perMeter: (a * 1000 * rho) / 1e6 };
}
