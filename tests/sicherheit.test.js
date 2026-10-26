// Datenschutz, Sicherheit und Barrierefreiheit: Regeln, die beim Weiterbauen nicht kaputtgehen dürfen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { contrast, accentFor, textOn, SURFACES, ON_ACCENT } from '../src/core/contrast.js';
import { ISO_GROUPS } from '../src/modules/schnittwerte/data.js';
import { safeText, toCSV, parseCSV, parseImport, normalizeEntry, decodeLink, MAX_ENTRIES, MAX_IMPORT_BYTES } from '../src/modules/schnittdaten/calc.js';

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const SRC = walk('src').filter((f) => /\.(js|css)$/.test(f));
const PAGES = ['index.html', 'rechtliches.html'];

/** Alle Modulfarben aus den Moduldateien. */
const MODULE_COLORS = walk('src/modules').filter((f) => f.endsWith('index.js'))
  .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/^\s{2}color: '(#[0-9a-f]{6})'/gm)].map((m) => m[1]));

/** Farbvariable aus einem Block von styles.css lesen. */
function cssVar(block, name) {
  const m = new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`).exec(block);
  assert.ok(m, `--${name} fehlt`);
  return m[1];
}
const CSS = readFileSync('src/styles.css', 'utf8');
const LIGHT = CSS.slice(CSS.indexOf(':root {'), CSS.indexOf(':root[data-theme="dark"]'));
const DARK = CSS.slice(CSS.indexOf(':root[data-theme="dark"]'), CSS.indexOf('@media (prefers-color-scheme: dark)'));

test('Keine externen Ressourcen: kein Code, keine Schriften, keine Verbindungen zu fremden Servern', () => {
  for (const f of SRC) {
    const s = readFileSync(f, 'utf8');
    if (f.includes(join('src', 'i18n'))) continue;
    assert.doesNotMatch(s, /https?:\/\//, `${f} enthält eine externe Adresse`);
    assert.doesNotMatch(s, /\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/, `${f} baut eine Netzverbindung auf`);
    assert.doesNotMatch(s, /\beval\(|new Function\(|document\.write\(/, `${f} führt Text als Code aus`);
    assert.doesNotMatch(s, /\bfetch\(/, `${f} lädt Daten aus dem Netz`);
    assert.doesNotMatch(s, /document\.cookie|getUserMedia|geolocation/, `${f} nutzt Cookies, Kamera-Stream oder Standort`);
  }
  for (const f of PAGES) {
    const s = readFileSync(f, 'utf8');
    // Externe Links (<a href>) sind erlaubt, externe Quellen für Skripte, Styles, Bilder nicht
    assert.doesNotMatch(s, /<(script|link|img|iframe|source|video|audio)\b[^>]*(src|href)="(https?:)?\/\//i, `${f} lädt etwas von außen`);
  }
});

test('Content-Security-Policy auf allen Seiten, kein Inline-JavaScript', () => {
  for (const f of PAGES) {
    const s = readFileSync(f, 'utf8');
    const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(s)?.[1];
    assert.ok(csp, `${f} ohne CSP`);
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'(;|$)/, `${f}: Skripte nur aus der App`);
    assert.match(csp, /object-src 'none'/);
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.doesNotMatch(s, /<script>(?!<\/script>)/, `${f} hat ein Inline-Skript`);
    assert.doesNotMatch(s, /\son[a-z]+="/i, `${f} hat Inline-Event-Handler`);
    assert.match(s, /<meta name="referrer" content="no-referrer">/);
  }
  for (const f of SRC) assert.doesNotMatch(readFileSync(f, 'utf8'), /\son(click|error|load|input|change)=["\\]/, `${f} erzeugt Inline-Event-Handler`);
});

test('Impressum, Datenschutz, Haftungshinweis und Quellen sind verlinkt und offline verfügbar', () => {
  const legal = readFileSync('rechtliches.html', 'utf8');
  for (const id of ['impressum', 'datenschutz', 'haftung', 'quellen', 'barrierefreiheit']) assert.match(legal, new RegExp(`id="${id}"`));
  assert.match(legal, /GitHub/, 'Hosting durch GitHub muss genannt sein');
  assert.match(readFileSync('src/app.js', 'utf8'), /rechtliches\.html#datenschutz/);
  assert.match(readFileSync('index.html', 'utf8'), /rechtliches\.html#datenschutz/);
  assert.match(readFileSync('sw.js', 'utf8'), /'\.\/rechtliches\.html'/);
  assert.match(readFileSync('.github/workflows/pages.yml', 'utf8'), /rechtliches\.html/);
});

test('Datenschutzerklärung nennt alle Daten, die die App auf dem Gerät speichert', () => {
  const keys = new Set();
  for (const f of SRC) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:STORE_KEY|STATS_KEY|AUTHOR_KEY|COIN_KEY) = '([\w-]+)'/g)) keys.add(m[1]);
    for (const m of s.matchAll(/\b(?:load|save)\('([\w-]+)'/g)) keys.add(m[1]);
  }
  // Bekannte Schlüssel und wo die Erklärung sie beschreibt; ein neuer Schlüssel muss hier und in rechtliches.html ergänzt werden
  const described = { settings: 'Einstellungen', favorites: 'Favoriten', history: 'Verlauf', cutdata: 'eigene Schnittdaten', 'cutdata-author': 'Namen im Team', materials: 'eigene Werkstoffe', quiz: 'Quiz-Ergebnisse', 'photo-coin': 'Referenz-Münze' };
  const legal = readFileSync('rechtliches.html', 'utf8');
  for (const k of keys) {
    assert.ok(described[k], `Neuer Speicher-Schlüssel „${k}“: in der Datenschutzerklärung beschreiben und hier eintragen`);
    assert.ok(legal.includes(described[k]), `„${described[k]}“ fehlt in rechtliches.html`);
  }
});

test('Kontrast: Modulfarben werden für hell, dunkel und Werkstattmodus lesbar (WCAG AA bzw. AAA)', () => {
  assert.ok(MODULE_COLORS.length >= 20, 'Modulfarben nicht gefunden');
  for (const color of [...MODULE_COLORS, '#1d4ed8']) {
    for (const dark of [false, true]) {
      for (const min of [4.5, 7]) {
        const a = accentFor(color, dark, min);
        const theme = dark ? 'dark' : 'light';
        for (const bg of [...SURFACES[theme], ON_ACCENT[theme]]) {
          assert.ok(contrast(a, bg) >= min, `${color} → ${a} auf ${bg}: ${contrast(a, bg).toFixed(2)} < ${min}`);
        }
      }
    }
  }
  // Bereits dunkle Farben bleiben unverändert
  assert.equal(accentFor('#1d4ed8', false), '#1d4ed8');
});

test('Kontrast: Grundfarben in styles.css und Plaketten der ISO-Gruppen', () => {
  for (const [block, theme] of [[LIGHT, 'light'], [DARK, 'dark']]) {
    const surfaces = ['bg', 'surface', 'surface-2'].map((n) => cssVar(block, n));
    assert.deepEqual([...surfaces].sort(), [...SURFACES[theme]].sort(), 'contrast.js SURFACES passt nicht zu styles.css');
    for (const n of ['text', 'muted', 'good', 'warn', 'bad']) {
      for (const bg of surfaces) assert.ok(contrast(cssVar(block, n), bg) >= 4.5, `${theme} --${n} auf ${bg}`);
    }
    // Rahmen von Eingabefeldern: mind. 3:1 (WCAG 1.4.11)
    for (const bg of surfaces) assert.ok(contrast(cssVar(block, 'field-line'), bg) >= 3, `${theme} --field-line auf ${bg}`);
    assert.equal(cssVar(block, 'on-accent'), ON_ACCENT[theme]);
  }
  for (const g of Object.values(ISO_GROUPS)) assert.ok(contrast(textOn(g.color), g.color) >= 4.5, `ISO-Gruppe ${g.name}`);
});

test('Barrierefreiheit: Sprunglink, Fokus, reduzierte Bewegung, Zoom erlaubt', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /class="skip-link"/);
  assert.match(html, /<html lang="de">/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale/, 'Zoomen darf nicht gesperrt sein');
  assert.match(CSS, /:focus-visible \{ outline: 3px solid/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  for (const f of SRC) assert.doesNotMatch(readFileSync(f, 'utf8'), /behavior: 'smooth'/, `${f}: smooth() aus dom.js verwenden`);
  assert.match(readFileSync('src/core/dom.js', 'utf8'), /class="table-wrap" tabindex="0"/, 'Tabellen per Tastatur scrollbar');
});

test('CSV-Export entschärft Formeln (CSV-Injection), Import stellt den Text wieder her', () => {
  assert.equal(safeText('=HYPERLINK("http://x")'), '\'=HYPERLINK("http://x")');
  assert.equal(safeText('+49 123'), "'+49 123");
  assert.equal(safeText('-5'), "'-5");
  assert.equal(safeText('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(safeText('CNMG 120408'), 'CNMG 120408');
  const e = normalizeEntry({ machine: '=1+1', tool: '@cmd', material: '42CrMo4', note: '-IK 40 bar', by: '+Max', d: 50, vc: 200, f: 0.2 });
  const csv = toCSV([e]);
  const line = csv.split('\r\n')[1];
  for (const cell of line.split(';')) assert.doesNotMatch(cell.replace(/^"/, ''), /^[=+@]/, `Zelle „${cell}“ würde als Formel gelesen`);
  const back = parseCSV(csv)[0];
  assert.equal(back.machine, '=1+1');
  assert.equal(back.tool, '@cmd');
  assert.equal(back.note, '-IK 40 bar');
  assert.equal(back.by, '+Max');
});

test('Import: Grenzen für Dateigröße, Anzahl und Format', async () => {
  assert.throws(() => parseImport(`[${'1,'.repeat(MAX_IMPORT_BYTES / 2)}1]`), /zu groß/);
  const many = Array.from({ length: MAX_ENTRIES + 50 }, (_, i) => ({ id: `x${i}`, machine: 'M', d: 10, vc: 100 }));
  assert.equal(parseImport(JSON.stringify(many)).length, MAX_ENTRIES);
  assert.throws(() => parseImport('{"entries": 5}'), /Keine Schnittdaten/);
  assert.throws(() => parseImport('null'), /Keine Schnittdaten/);
  // Link mit unerwartetem Inhalt
  const b64 = (s) => Buffer.from(s).toString('base64url');
  await assert.rejects(decodeLink(`j${b64('{"a":1}')}`), /Unbekanntes Format/);
  assert.deepEqual(await decodeLink(`j${b64('[1,"x",null]')}`), []);
  await assert.rejects(decodeLink(`q${b64('[]')}`), /Unbekanntes Format/);
});
