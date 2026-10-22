import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFraction, parseLength, mmToInchText, hasInchMark } from '../src/core/inchinput.js';
import { normalizeEntry, mergeEntries, toCSV, parseCSV, parseImport, encodeLink, decodeLink, derived } from '../src/modules/schnittdaten/calc.js';
import { makeRound, CATEGORIES, generatorCount } from '../src/modules/quiz/calc.js';
import { measure, matchThread, confidence } from '../src/modules/fotomessung/calc.js';
import { setDictionary, translate, t } from '../src/core/i18n.js';
import en from '../src/i18n/en.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≉ ${b}`);

test('Zoll-Eingabe: Brüche, Einheiten, Rückweg', () => {
  near(parseFraction('1 1/4'), 1.25);
  near(parseFraction('1-1/4'), 1.25);
  near(parseFraction('3/8'), 0.375);
  near(parseFraction('0,5'), 0.5);
  assert.ok(Number.isNaN(parseFraction('1/0')));
  near(parseLength('2 1/2', true).mm, 63.5);
  near(parseLength('1"', false).mm, 25.4);
  assert.deepEqual(parseLength('12 mm', true), { mm: 12, unit: 'mm' });
  assert.deepEqual(parseLength('12', false), { mm: 12, unit: 'mm' });
  assert.equal(parseLength('abc', true), null);
  assert.equal(mmToInchText('25,4'), '1');
  assert.equal(mmToInchText('12', '.'), '0.4724');
  assert.ok(hasInchMark('1/2"') && hasInchMark('3 in') && !hasInchMark('12'));
});

const entry = (o = {}) => ({ machine: 'DMG CTX', tool: 'CNMG 120408', material: '42CrMo4', proc: 'turn', d: 40, vc: 220, f: 0.25, ap: 2, note: 'IK; "40 bar"', by: 'Max', updated: '2026-10-01T10:00:00.000Z', id: 'a1', ...o });

test('Schnittdaten: Prüfung, Drehzahl, Zusammenführen', () => {
  assert.equal(normalizeEntry({ machine: 'X', d: 10 }), null, 'ohne vc ungültig');
  assert.equal(normalizeEntry({ d: 10, vc: 100 }), null, 'ohne Maschine/Werkzeug/Werkstoff ungültig');
  const e = normalizeEntry(entry({ d: '40', vc: '220' }));
  assert.equal(e.d, 40);
  near(derived(e).n, (220 * 1000) / (Math.PI * 40));
  const newer = entry({ vc: 240, updated: '2026-10-05T10:00:00.000Z' });
  const older = entry({ vc: 180, updated: '2026-09-01T10:00:00.000Z' });
  const r = mergeEntries([normalizeEntry(entry())], [newer, older, entry({ id: 'b2', tool: 'Fräser' })]);
  assert.equal(r.added, 1);
  assert.equal(r.changed, 1);
  assert.equal(r.same, 1);
  assert.equal(r.list.find((x) => x.id === 'a1').vc, 240);
});

test('Schnittdaten: CSV hin und zurück (deutsch und englisch)', () => {
  const list = [normalizeEntry(entry()), normalizeEntry(entry({ id: 'b2', proc: 'mill', z: 4, ae: 8, f: 0.06 }))];
  for (const opts of [{}, { sep: ',', dec: '.' }]) {
    const back = parseCSV(toCSV(list, opts));
    assert.equal(back.length, 2);
    assert.deepEqual(back.map((x) => [x.id, x.vc, x.f, x.note, x.proc, x.updated]), list.map((x) => [x.id, x.vc, x.f, x.note, x.proc, x.updated]));
  }
  assert.equal(parseImport(JSON.stringify({ entries: list })).length, 2);
  assert.throws(() => parseImport('kein csv'));
});

test('Schnittdaten: Link kodieren und lesen', async () => {
  const list = [normalizeEntry(entry()), normalizeEntry(entry({ id: 'b2', note: 'Ä ö ü ß €' }))];
  const code = await encodeLink(list);
  assert.match(code, /^[zj][\w-]+$/);
  const back = await decodeLink(code);
  assert.deepEqual(back.map((x) => [x.id, x.vc, x.note]), list.map((x) => [x.id, x.vc, x.note]));
});

test('Quiz: gültige Runden, gleiche Saat = gleiche Runde', () => {
  assert.ok(generatorCount() >= 15);
  for (let seed = 1; seed <= 40; seed++) {
    const round = makeRound({ count: 10, seed });
    assert.equal(round.length, 10);
    assert.equal(new Set(round.map((q) => q.q)).size, 10, 'keine doppelten Fragen');
    for (const q of round) {
      assert.ok(q.options.length >= 2, q.q);
      assert.equal(new Set(q.options).size, q.options.length, `Optionen doppelt: ${q.q}`);
      assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
      assert.ok(q.explain && q.link.startsWith('#/m/'), q.q);
    }
  }
  assert.deepEqual(makeRound({ seed: 7 }).map((q) => q.q), makeRound({ seed: 7 }).map((q) => q.q));
  for (const c of CATEGORIES) assert.ok(makeRound({ cats: [c.id], count: 3, seed: 3 }).every((q) => q.cat === c.id));
});

test('Fotomessung: Maßstab und Gewindeerkennung', () => {
  // 2-Euro-Münze 25,75 mm = 515 px → 0,05 mm/px
  const m = measure({ ref: [{ x: 0, y: 0 }, { x: 515, y: 0 }], refMm: 25.75, dia: [{ x: 0, y: 0 }, { x: 0, y: 238 }], pitch: [{ x: 0, y: 0 }, { x: 175, y: 0 }], count: 5 });
  near(m.mmPerPx, 0.05);
  near(m.d, 11.9);
  near(m.p, 1.75);
  const hits = matchThread({ d: m.d, p: m.p });
  assert.equal(hits[0].name, 'M12');
  assert.equal(confidence(hits[0], hits[1]), 'good');
  assert.equal(matchThread({ d: 10.2, p: 1.75, internal: true })[0].name, 'M12', 'Mutter über D₁');
  assert.equal(matchThread({ d: 6.3, p: 25.4 / 20 })[0].name, '1/4"-20 UNC');
  assert.ok(Number.isNaN(measure({ ref: [], refMm: 25.75 }).mmPerPx));
});

test('Übersetzung: exakt, mit Zahlen, Muster, Teile', () => {
  setDictionary(en);
  assert.equal(translate('Einstellungen'), 'Settings');
  assert.equal(translate('Frage 3 von 10'), 'Question 3 of 10');
  assert.equal(translate('Richtwert vc für Messing, Kupfer, Bronze mit Hartmetall:'), 'Guide value vc for Brass, copper, bronze with Carbide:');
  assert.equal(translate('Rundstab · Edelstahl'), 'Round bar · Stainless steel');
  assert.equal(translate('ganz unbekannter Satz'), 'ganz unbekannter Satz');
  assert.equal(t('Eintrag „{name}“ löschen?', { name: 'Fräser' }), 'Delete entry "Fräser"?');
  // Jede Übersetzung behält Zahlen-Platzhalter und Muster-Namen
  for (const [de, tr] of Object.entries(en)) {
    const count = (s) => (s.match(/\{#\}/g) || []).length;
    assert.equal(count(de), count(tr), de);
  }
  setDictionary(null);
  assert.equal(translate('Einstellungen'), 'Einstellungen');
});
