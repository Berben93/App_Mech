import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { linearTolerance, radiusTolerance, angleTolerance, formTolerances } from '../src/modules/allgemeintoleranzen/calc.js';
import { metric, unified, pipe, trapez, parseThread } from '../src/modules/gewinde/calc.js';
import { tighteningTorque } from '../src/modules/schrauben/calc.js';
import { rpm, turning, milling, drilling } from '../src/modules/schnittwerte/calc.js';
import { theoreticalRoughness, maxFeedForRa, nClassFor } from '../src/modules/rauheit/calc.js';
import { weight } from '../src/modules/gewicht/calc.js';
import { convert, parseNumber, parseQuantity } from '../src/modules/einheiten/calc.js';

const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} erwartet ${expected} ± ${tol}, erhalten ${actual}`);

test('ISO 2768-1 Längenmaße', () => {
  assert.equal(linearTolerance(50, 'm'), 0.3);
  assert.equal(linearTolerance(30, 'm'), 0.2); // 30 gehört zu "über 6 bis 30"
  assert.equal(linearTolerance(30.01, 'm'), 0.3);
  assert.equal(linearTolerance(0.5, 'f'), 0.05);
  assert.equal(linearTolerance(2, 'v'), null);
  assert.equal(linearTolerance(5000, 'm'), null);
  assert.equal(radiusTolerance(10, 'c'), 2);
  assert.equal(angleTolerance(25, 'm'), 30);
  assert.deepEqual(formTolerances(50, 'K'), { straightness: 0.2, perpendicularity: 0.4, symmetry: 0.6 });
});

test('Metrische Gewinde', () => {
  const m12 = metric(12);
  assert.equal(m12.p, 1.75);
  assert.equal(m12.tapDrill, 10.2);
  near(m12.d2, 10.863, 0.001);
  near(m12.d3, 9.853, 0.001);
  near(m12.D1, 10.106, 0.001);
  assert.deepEqual(m12.clearance, [13, 13.5, 14.5]);
  assert.equal(metric(10).tapDrill, 8.5);
  assert.equal(metric(8, 1).type, 'MF');
  assert.equal(metric(8, 1).tapDrill, 7);
  assert.equal(metric(7), null);
});

test('Zoll-, Rohr- und Trapezgewinde', () => {
  const u = unified('1/4', 'UNC');
  assert.equal(u.tpi, 20);
  assert.equal(u.tapDrill, 5.1);
  assert.equal(unified('1/2', 'UNF').tpi, 20);
  const g = pipe('1/2');
  assert.equal(g.tpi, 14);
  near(g.p, 1.814, 0.001);
  assert.equal(g.tapDrill, 19);
  const tr = trapez(20);
  assert.equal(tr.p, 4);
  assert.equal(tr.d3, 15.5);
  assert.equal(tr.D1, 16);
  assert.equal(tr.D4, 20.5);
});

test('Gewinde im Suchtext', () => {
  assert.deepEqual(parseThread('M12'), { kind: 'metric', d: 12, p: undefined });
  assert.deepEqual(parseThread('m12x1,5'), { kind: 'metric', d: 12, p: 1.5 });
  assert.deepEqual(parseThread('Tr 20x4'), { kind: 'trapez', d: 20, p: 4 });
  assert.deepEqual(parseThread('G1/2'), { kind: 'pipe', size: '1/2' });
  assert.deepEqual(parseThread('1/4-20'), { kind: 'unified', size: '1/4', series: 'UNC' });
  assert.deepEqual(parseThread('1/2 UNF'), { kind: 'unified', size: '1/2', series: 'UNF' });
  assert.equal(parseThread('Messing'), null);
});

test('Anziehdrehmoment nahe an VDI-2230-Tabellenwerten (µ 0,12)', () => {
  // Tabellenwerte VDI 2230 Blatt 1, Schaftschraube Regelgewinde, µG = µK = 0,12, ν = 0,9
  near(tighteningTorque({ d: 12, p: 1.75, cls: '8.8' }).MA, 85, 3, 'M12 8.8');
  near(tighteningTorque({ d: 12, p: 1.75, cls: '8.8' }).FM / 1000, 43, 1, 'M12 8.8 FM');
  near(tighteningTorque({ d: 10, p: 1.5, cls: '8.8' }).MA, 49, 2.5, 'M10 8.8');
  near(tighteningTorque({ d: 16, p: 2, cls: '10.9' }).MA, 310, 15, 'M16 10.9');
  near(tighteningTorque({ d: 8, p: 1.25, cls: '12.9' }).MA, 43, 2.5, 'M8 12.9');
  assert.equal(tighteningTorque({ d: 12, p: 1.75, cls: 'xx' }), null);
});

test('Schnittwerte', () => {
  near(rpm(200, 50), 1273.24, 0.01);
  const t = turning({ d: 50, vc: 200, f: 0.2, ap: 2, kc: 2000, L: 100 });
  near(t.vf, 254.6, 0.1);
  assert.equal(t.Q, 80);
  near(t.Pc, 2.667, 0.001);
  const m = milling({ D: 16, z: 4, vc: 200, fz: 0.1, ap: 8, ae: 4, kc: 2000, L: 200 });
  near(m.n, 3978.9, 0.1);
  near(m.vf, 1591.5, 0.1);
  near(m.Q, 50.93, 0.01);
  const d = drilling({ D: 10, vc: 100, f: 0.2, kc: 2000, L: 30 });
  near(d.n, 3183.1, 0.1);
  near(d.Pc, 1.667, 0.001);
});

test('Rauheit', () => {
  const r = theoreticalRoughness(0.2, 0.8);
  near(r.Rth, 6.25, 0.001);
  near(r.Ra, 1.604, 0.001);
  near(maxFeedForRa(1.6, 0.8), 0.1997, 0.0005);
  assert.equal(nClassFor(1.6).n, 'N7');
  assert.equal(nClassFor(1.7).n, 'N8');
});

test('Gewicht', () => {
  near(weight('rund', { d: 50 }, 1000, 7.85).mass, 15.413, 0.001);
  near(weight('rohr', { D: 60, s: 5 }, 1000, 7.85).mass, 6.782, 0.001);
  near(weight('flach', { b: 100, h: 10 }, 1000, 2.7).mass, 2.7, 1e-9);
  near(weight('sechskant', { s: 30 }, 1000, 7.85).mass, 6.119, 0.001);
  near(weight('kugel', { d: 100 }, 0, 7.85).mass, 4.110, 0.001);
  assert.ok(Number.isNaN(weight('rohr', { D: 10, s: 6 }, 1000, 7.85).mass));
});

test('Einheiten', () => {
  near(convert(1, 'laenge', 'in', 'mm'), 25.4, 1e-9);
  near(convert(100, 'druck', 'psi', 'bar'), 6.89476, 1e-6);
  near(convert(100, 'temperatur', '°C', '°F'), 212, 1e-9);
  near(convert(0, 'temperatur', '°C', 'K'), 273.15, 1e-9);
  near(convert(10, 'moment', 'lbf·ft', 'Nm'), 13.558, 0.001);
  assert.equal(parseNumber('1 1/4'), 1.25);
  assert.equal(parseNumber('3/8'), 0.375);
  assert.deepEqual(parseQuantity('1/2 zoll'), { value: 0.5, cat: 'laenge', unit: 'in', to: null });
  assert.deepEqual(parseQuantity('25 mm in zoll'), { value: 25, cat: 'laenge', unit: 'mm', to: 'in' });
  assert.deepEqual(parseQuantity('2 in'), { value: 2, cat: 'laenge', unit: 'in', to: null });
  assert.equal(parseQuantity('1.4301'), null);
});

test('Service Worker enthält alle App-Dateien und die Version aus package.json', () => {
  const sw = readFileSync('sw.js', 'utf8');
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.match(sw, new RegExp(`const VERSION = '${pkg.version.replace(/\./g, '\\.')}'`));
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = [...walk('src'), ...walk('assets'), 'index.html', 'manifest.webmanifest'];
  for (const f of files) assert.ok(sw.includes(`'./${f.replace(/\\/g, '/')}'`), `${f} fehlt in sw.js`);
});
