// Zoll-Eingaben direkt in den Längenfeldern.
//
// Längenfelder (Beschriftung endet auf "(mm)" oder data-unit="mm") werden erkannt.
// Im Zoll-Modus zeigt das Feld Zoll an und nimmt Zoll an ("0,5", "1/2", "1 1/4", 1/2"),
// liefert dem Modul über `value` aber weiter Millimeter. So bleiben Rechnung und
// teilbare Links metrisch. Mit "mm" am Ende geht auch im Zoll-Modus ein metrischer Wert.
// Im metrischen Modus wird eine Eingabe mit Zollzeichen (1/2", 0,75 in, 2 zoll) umgerechnet.

const INCH = 25.4;

/** Zahl, Bruch oder gemischter Bruch: "0,5", "3/8", "1 1/4", "1-1/4". */
export function parseFraction(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  let m = /^(\d+)(?:\s+|-)(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[3]) ? Number(m[1]) + Number(m[2]) / Number(m[3]) : NaN;
  m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : NaN;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

/**
 * Längeneingabe lesen. Liefert { mm, unit } mit unit 'mm' | 'in' oder null, wenn nicht lesbar.
 * Ohne Einheit gilt Zoll, wenn `inchMode` gesetzt ist, sonst mm.
 */
export function parseLength(text, inchMode = false) {
  const raw = String(text ?? '').trim();
  if (!raw) return null;
  let unit = inchMode ? 'in' : 'mm';
  let body = raw;
  const mmMatch = /^(.*?)\s*mm$/i.exec(raw);
  const inMatch = /^(.*?)\s*(?:"|''|″|in|inch|zoll)$/i.exec(raw);
  if (mmMatch) { unit = 'mm'; body = mmMatch[1]; } else if (inMatch) { unit = 'in'; body = inMatch[1]; }
  const v = parseFraction(body);
  if (!Number.isFinite(v)) return null;
  return { mm: unit === 'in' ? v * INCH : v, unit };
}

/** Hat die Eingabe ein ausdrückliches Zollzeichen? */
export function hasInchMark(text) {
  return /(?:"|''|″|\d\s*(?:in|inch|zoll))\s*$/i.test(String(text ?? '').trim());
}

/** mm-Zahl als Zoll-Text für das Feld, z. B. 12 → "0,4724" (dec = Dezimalzeichen). */
export function mmToInchText(mmText, dec = ',') {
  const v = parseFraction(mmText);
  if (!Number.isFinite(v)) return String(mmText ?? '');
  const inch = Math.round((v / INCH) * 10000) / 10000;
  return String(inch).replace('.', dec);
}

const round = (v) => String(Math.round(v * 10000) / 10000);

const LABEL_MM = /\(mm\)\s*$/;

function isLengthField(input) {
  if (input.dataset.unit) return input.dataset.unit === 'mm';
  if (input.type !== 'text' && input.type !== 'search' && input.type !== '') return false;
  const span = input.closest('label.field')?.querySelector(':scope > span');
  if (!span) return false;
  const text = span.textContent;
  // Steigung bleibt in mm (Zollgewinde rechnet man über Gänge je Zoll)
  return LABEL_MM.test(text) && !/Steigung|pitch/i.test(text);
}


/**
 * Längenfelder unterhalb von `root` vorbereiten. `inchMode`: Zoll-Modus aktiv.
 * `dec`: Dezimalzeichen der Anzeige. Mehrfaches Aufrufen schadet nicht.
 */
export function enhanceLengthInputs(root, inchMode, dec = ',') {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  for (const input of root.querySelectorAll('input:not([data-len])')) {
    if (!isLengthField(input)) continue;
    input.dataset.len = inchMode ? 'in' : 'mm';
    const rawGet = () => proto.get.call(input);
    const rawSet = (v) => proto.set.call(input, v);
    // Zuletzt vom Programm gesetzter Wert: Anzeige → mm (vermeidet Rundungsdrift 12 → 11,999)
    let cache = null;
    const hint = document.createElement('small');
    hint.className = 'len-hint';
    hint.hidden = true;
    input.closest('label.field')?.append(hint);

    const toMm = (shown) => {
      if (cache && cache.shown === shown) return cache.mm;
      if (!inchMode && !hasInchMark(shown)) return shown;
      const p = parseLength(shown, inchMode);
      return p ? round(p.mm) : '';
    };
    const showHint = () => {
      const shown = rawGet();
      const p = parseLength(shown, inchMode);
      const conv = p && p.unit === 'in';
      hint.hidden = !conv;
      if (conv) hint.textContent = `= ${String(Math.round(p.mm * 1000) / 1000).replace('.', dec)} mm`;
    };

    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => toMm(rawGet()),
      set: (v) => {
        const mm = String(v ?? '');
        const shown = inchMode && mm !== '' ? mmToInchText(mm, dec) : mm;
        cache = { shown, mm };
        rawSet(shown);
        showHint();
      },
    });

    if (inchMode) {
      const span = input.closest('label.field')?.querySelector(':scope > span');
      if (span) {
        for (const node of span.childNodes) {
          if (node.nodeType === 3 && LABEL_MM.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(LABEL_MM, '(in)');
        }
      }
      input.removeAttribute('list');
      input.title = 'Zoll, z. B. 0,5 oder 1/2 oder 1 1/4. Mit „mm“ am Ende metrisch.';
      const start = rawGet();
      if (start !== '') input.value = start;
    }
    input.addEventListener('input', showHint);
    showHint();
  }
}
