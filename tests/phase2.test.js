import { test } from 'node:test';
import assert from 'node:assert/strict';

import { convertHardness, parseHardness } from '../src/modules/haerte/calc.js';
import { matchScore, searchMaterials } from '../src/modules/werkstoffe/calc.js';
import { MATERIALS } from '../src/modules/werkstoffe/data.js';
import { kFactor, compensation, bend, minRadius, dieWidth, pressForce } from '../src/modules/biegen/calc.js';
import { countersink, counterbore, coneDepth, undercut } from '../src/modules/senkungen/calc.js';
import { keyFor, ringFor, washerFor, oringGroove } from '../src/modules/normteile/calc.js';
import { cone, rightTriangle, boltCircle, sineBar, gaugeBlocks, tailstockOffset } from '../src/modules/kegel/calc.js';
import { jobCost } from '../src/modules/kosten/calc.js';
import { parseTol, chain, encodeLinks, decodeLinks } from '../src/modules/toleranzketten/calc.js';
import { positionDeviation, findSymbol } from '../src/modules/formlage/calc.js';
import { SYMBOLS } from '../src/modules/formlage/data.js';
import { threadMill, ncProgram } from '../src/modules/gewindefraesen/calc.js';
import { toImperial } from '../src/core/units.js';
import { addHistory } from '../src/core/favorites.js';
import { searchAll } from '../src/core/search.js';
import { MODULES } from '../src/core/registry.js';

const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} erwartet ${expected} ± ${tol}, erhalten ${actual}`);

test('Härte: Tabellenpunkte und Interpolation (ISO 18265)', () => {
  const r = convertHardness(45.3, 'HRC');
  near(r.HV, 450, 0.5);
  near(r.HB, 428, 0.5);
  near(r.Rm, 1455, 1);
  near(convertHardness(200, 'HV').HB, 190, 1e-9);
  assert.equal(convertHardness(200, 'HV').HRC, null);
  near(convertHardness(250, 'HB').HV, 263, 1); // zwischen 260 (247) und 265 (252)
  near(convertHardness(800, 'Rm').HV, 250, 1e-9);
  assert.equal(convertHardness(70, 'HRC'), null);
  assert.deepEqual(parseHardness('45 HRC'), { value: 45, key: 'HRC' });
  assert.deepEqual(parseHardness('HB 250'), { value: 250, key: 'HB' });
  assert.deepEqual(parseHardness('800 N/mm²'), { value: 800, key: 'Rm' });
  assert.equal(parseHardness('M12'), null);
});

test('Werkstoffe: Suche nach Nummer, Name und AISI', () => {
  const find = (q) => searchMaterials(q)[0]?.wnr;
  assert.equal(find('1.4301'), '1.4301');
  assert.equal(find('42CrMo4'), '1.7225');
  assert.equal(find('4140'), '1.7225');
  assert.equal(find('AISI 304'), '1.4301');
  assert.equal(find('316L'), '1.4404');
  assert.equal(matchScore(MATERIALS.find((m) => m.wnr === '1.4301'), '30'), 0);
  for (const m of MATERIALS) {
    assert.ok(m.mach >= 1 && m.mach <= 5, m.wnr);
    assert.ok(['gut', 'bedingt', 'schlecht'].includes(m.weld), m.wnr);
  }
  assert.equal(new Set(MATERIALS.map((m) => m.wnr)).size, MATERIALS.length);
});

test('Biegen nach DIN 6935', () => {
  near(kFactor(2, 2), 0.65, 1e-9);
  near(kFactor(20, 2), 1, 1e-9);
  // Tabellenwerte DIN 6935 Beiblatt (90°): s = 2, r = 2 → v = −3,8; s = 1, r = 1 → v = −1,9
  near(compensation(2, 2, 90), -3.84, 0.01);
  near(compensation(1, 1, 90), -1.92, 0.01);
  near(bend({ s: 2, r: 2, beta: 90, a: 50, b: 30 }).L, 76.16, 0.01);
  near(compensation(2, 2, 120), Math.PI * (60 / 180) * (2 + 0.65) - 8 * Math.tan(Math.PI / 6), 1e-9);
  assert.equal(compensation(2, 2, 170), 0);
  assert.equal(minRadius(2, '390'), 2.5);
  assert.equal(minRadius(3, '640'), 5);
  assert.equal(minRadius(2, 'cr'), 2);
  assert.equal(dieWidth(2), 16);
  near(pressForce({ rm: 450, s: 2, l: 1000, V: 16 }), 159.75, 0.01);
});

test('Senkungen und Gewindefreistiche DIN 76', () => {
  assert.equal(countersink(6).d2, 12.6);
  assert.equal(counterbore(8).d2, 15);
  near(coneDepth(12.6, 6.6, 90).depth, 3, 1e-9);
  near(coneDepth(10, 0, 60).tipZ, 5 / Math.tan(Math.PI / 6), 1e-9);
  const a = undercut(12, 1.75, 'A');
  assert.deepEqual([a.dg, a.g1, a.g2, a.r], [9.4, 3.9, 6.1, 1]);
  const c = undercut(12, 1.75, 'C');
  assert.deepEqual([c.dg, c.g1, c.g2, c.tol], [12.5, 7, 9.1, 'H13']);
  assert.equal(undercut(8, 1.25, 'B').g2, 3.2);
  assert.equal(undercut(8, 1.3, 'A'), null);
});

test('Normteile', () => {
  const k = keyFor(30);
  assert.deepEqual([k.b, k.h, k.t1, k.t2], [8, 7, 4, 3.3]);
  assert.equal(keyFor(30.5).b, 10);
  assert.equal(ringFor(20, 'welle').d2, 19);
  assert.equal(ringFor(20, 'bohrung').d2, 21);
  assert.equal(ringFor(47, 'bohrung').m, 1.85);
  assert.equal(washerFor(8).n.d2, 16);
  const g = oringGroove({ type: 'kolben', dyn: false, d2: 2.5, D: 40 });
  near(g.depth, 2, 1e-9);
  near(g.grooveDia, 36, 1e-9);
  assert.ok(g.fill > 0.6 && g.fill < 0.85);
  near(oringGroove({ type: 'stange', dyn: true, d2: 3.53, D: 20, d1: 20.22 }).stretch, (20 - 20.22) / 20.22, 1e-9);
});

test('Kegel und Trigonometrie', () => {
  const c = cone({ D: 30, d: 25, L: 50 });
  near(c.half, 2.8624, 0.0001);
  near(c.ratio, 10, 1e-9);
  near(tailstockOffset({ D: 30, d: 25, L: 50, Lw: 200 }), 10, 1e-9);
  const t = rightTriangle({ a: 3, b: 4 });
  near(t.c, 5, 1e-9);
  near(t.alpha, 36.8699, 0.0001);
  near(rightTriangle({ alpha: 30, c: 10 }).a, 5, 1e-9);
  assert.equal(rightTriangle({ a: 6, c: 5 }), null);
  const bc = boltCircle({ D: 100, n: 6 });
  near(bc.pitch, 50, 1e-9);
  near(bc.holes[1].x, 25, 1e-9);
  near(bc.holes[1].y, 43.3013, 0.0001);
  near(sineBar({ L: 100, alpha: 30 }).h, 50, 1e-9);
  near(sineBar({ L: 200, h: 100 }).alpha, 30, 1e-9);
  assert.deepEqual(gaugeBlocks(58.402), [1.002, 1.4, 50, 6]);
  const sum = gaugeBlocks(34.202).reduce((a, b) => a + b, 0);
  near(sum, 34.202, 1e-9);
  assert.equal(gaugeBlocks(250), null);
});

test('Fertigungszeit und Kosten', () => {
  const r = jobCost({ m: 50, tr: 60, th: 4.5, tn: 1, z: 10, rate: 85, mat: 3.2, ext: 0, margin: 15 });
  near(r.te, 6.05, 1e-9);
  near(r.T, 362.5, 1e-9);
  near(r.production, 513.54, 0.01);
  near(r.price, (513.5416667 + 160) * 1.15, 0.01);
  assert.equal(jobCost({ m: 0, th: 1, rate: 50 }), null);
});

test('Toleranzketten arithmetisch und statistisch', () => {
  assert.deepEqual(parseTol('±0,1'), { es: 0.1, ei: -0.1 });
  assert.deepEqual(parseTol('0/-0,05'), { es: 0, ei: -0.05 });
  assert.deepEqual(parseTol('+0,1/−0,05'), { es: 0.1, ei: -0.05 });
  assert.deepEqual(parseTol('h11', 30), { es: 0, ei: -0.13, iso: 'h11' });
  assert.equal(parseTol('xyz', 30), null);
  const c = chain([
    { dir: 1, n: 80, es: 0.1, ei: -0.1 },
    { dir: -1, n: 30, es: 0, ei: -0.13 },
    { dir: -1, n: 20, es: 0, ei: -0.05 },
    { dir: -1, n: 28, es: 0.05, ei: -0.05 },
  ]);
  assert.equal(c.N, 2);
  near(c.arith.ES, 0.33, 1e-9);
  near(c.arith.EI, -0.15, 1e-9);
  near(c.stat.T, Math.sqrt(0.2 ** 2 + 0.13 ** 2 + 0.05 ** 2 + 0.1 ** 2), 1e-9);
  near(c.stat.C, 0.09, 1e-9);
  const rows = [{ dir: 1, n: '50', tol: '±0,1' }, { dir: -1, n: '20', tol: 'h7' }];
  assert.deepEqual(decodeLinks(encodeLinks(rows)), rows);
});

test('Form und Lage', () => {
  assert.equal(SYMBOLS.length, 14);
  const p = positionDeviation({ dx: 0.03, dy: 0.04, tol: 0.08 });
  near(p.dev, 0.1, 1e-9);
  assert.equal(p.ok, false);
  const m = positionDeviation({ dx: 0.03, dy: 0.04, tol: 0.08, mmc: 8, actual: 8.03 });
  near(m.allowed, 0.11, 1e-9);
  assert.equal(m.ok, true);
  assert.equal(findSymbol('Ebenheit')[0].id, 'ebenheit');
});

test('Gewindefräsen', () => {
  const r = threadMill({ d: 12, p: 1.75, internal: true, D: 9.5, z: 3, vc: 120, fz: 0.06, L: 18 });
  near(r.n, 4020.7, 0.1);
  near(r.vfContour, 723.7, 0.1);
  near(r.R, 1.25, 1e-9);
  near(r.vfCenter, 723.7 * 2.5 / 12, 0.1);
  assert.equal(r.turns, 12);
  assert.ok(threadMill({ d: 12, p: 1.75, D: 12, z: 3, vc: 120, fz: 0.06, L: 18 }).error);
  const prog = ncProgram({ d: 12, p: 1.75, internal: true, D: 9.5, L: 18 }, r);
  assert.match(prog, /G03 X1\.25 Y0 Z-16\.25 I-1\.25 J0/);
  const ext = threadMill({ d: 20, p: 2.5, internal: false, D: 10, z: 4, vc: 100, fz: 0.05, L: 10, multi: true });
  assert.match(ncProgram({ d: 20, p: 2.5, internal: false, D: 10, L: 10 }, ext), /G02 X15 Y0 Z-2\.5 I-15 J0/);
});

test('Zoll-Umrechnung der Ergebnisse', () => {
  assert.deepEqual(toImperial('25,4', 'mm'), { text: '1', unit: 'in' });
  assert.deepEqual(toImperial('13 / 13,5', 'mm'), { text: '0,5118 / 0,5315', unit: 'in' });
  assert.deepEqual(toImperial('−0,0254', 'mm'), { text: '−0,001', unit: 'in' });
  assert.deepEqual(toImperial('1.000', 'Nm'), { text: '737,6', unit: 'lbf·ft' });
  assert.equal(toImperial('12', '°'), null);
  assert.equal(toImperial('<span>1</span>', 'mm'), null);
});

test('Verlauf: gleiches Modul ersetzt den obersten Eintrag', () => {
  let h = addHistory({ hash: '#/m/a?x=1', module: 'a', label: 'A1' }, []);
  h = addHistory({ hash: '#/m/a?x=2', module: 'a', label: 'A2' }, h);
  h = addHistory({ hash: '#/m/b', module: 'b', label: 'B' }, h);
  h = addHistory({ hash: '#/m/a?x=2', module: 'a', label: 'A2' }, h);
  assert.deepEqual(h.map((e) => e.label), ['A2', 'B']);
});

test('Globale Suche findet Phase-2-Module', () => {
  assert.equal(MODULES.length, 21);
  assert.equal(new Set(MODULES.map((m) => m.id)).size, 21);
  const top = (q) => searchAll(q)[0];
  assert.equal(top('45 HRC').module.id, 'haerte');
  assert.equal(top('42CrMo4').module.id, 'werkstoffe');
  assert.equal(top('MK 3').module.id, 'kegel');
  assert.equal(top('DIN 471 20').module.id, 'normteile');
  assert.equal(top('Freistich M12').module.id, 'senkungen');
  assert.equal(top('Gewindefräsen').module.id, 'gewindefraesen');
  const m12 = searchAll('M12').map((h) => h.module.id);
  assert.equal(m12[0], 'gewinde');
  assert.ok(m12.includes('senkungen') && m12.includes('normteile'));
});
