import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itValue, tolerance, fit, parseFitQuery } from '../src/modules/passungen/calc.js';

// Vergleichswerte aus ISO 286-2 (in µm)
const CASES = [
  [25, 'H7', 21, 0], [25, 'g6', -7, -20], [25, 'f7', -20, -41], [25, 'h6', 0, -13],
  [25, 'k6', 15, 2], [25, 'm6', 21, 8], [25, 'n6', 28, 15], [25, 'p6', 35, 22],
  [25, 'r6', 41, 28], [25, 's6', 48, 35], [25, 'u6', 61, 48], [30, 't6', 54, 41],
  [25, 'js6', 6.5, -6.5], [25, 'js7', 10, -10], [25, 'j6', 9, -4],
  [50, 'g6', -9, -25], [50, 'r6', 50, 34], [100, 's6', 93, 71], [10, 'k6', 10, 1],
  [25, 'G7', 28, 7], [25, 'F8', 53, 20], [25, 'E8', 73, 40], [25, 'D9', 117, 65], [25, 'C11', 240, 110],
  [40, 'K7', 7, -18], [40, 'M7', 0, -25], [40, 'N7', -8, -33], [40, 'P7', -17, -42], [40, 'S7', -34, -59],
  [15, 'K6', 2, -9], [15, 'M6', -4, -15], [25, 'K8', 10, -23], [25, 'N9', 0, -52],
  [2, 'N9', -4, -29], [2, 'M7', -2, -12], [2, 'P7', -6, -16], [25, 'J7', 12, -9], [25, 'JS7', 10, -10],
  [3, 'H7', 10, 0], [3.01, 'H7', 12, 0], [500, 'H7', 63, 0],
];

for (const [d, tol, upper, lower] of CASES) {
  test(`${d} ${tol} = ${upper}/${lower} µm`, () => {
    const t = tolerance(tol, d);
    assert.ok(t, 'Toleranz nicht gefunden');
    assert.equal(t.upper, upper);
    assert.equal(t.lower, lower);
  });
}

test('IT-Werte', () => {
  assert.equal(itValue(7, 25), 21);
  assert.equal(itValue(11, 100), 220);
  assert.equal(itValue(7, 0), null);
  assert.equal(itValue(7, 501), null);
});

test('Passung H7/g6 bei 25 mm', () => {
  const f = fit(25, 'H7', 'g6');
  assert.equal(f.max, 41);
  assert.equal(f.min, 7);
  assert.equal(f.kind, 'spiel');
});

test('Passungsarten', () => {
  assert.equal(fit(25, 'H7', 'k6').kind, 'uebergang');
  assert.equal(fit(25, 'H7', 's6').kind, 'uebermass');
  assert.equal(fit(25, 'g6', 'H7'), null);
});

test('t ist unter 24 mm nicht genormt', () => {
  assert.equal(tolerance('t6', 20), null);
});

test('Suchtext für Passungen', () => {
  assert.deepEqual(parseFitQuery('25 H7/g6'), { nominal: 25, hole: 'H7', shaft: 'g6' });
  assert.deepEqual(parseFitQuery('Ø12,5H7'), { nominal: 12.5, hole: 'H7', shaft: null });
  assert.equal(parseFitQuery('M12'), null);
});
