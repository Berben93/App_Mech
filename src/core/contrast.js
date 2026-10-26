// Kontraste nach WCAG 2.1: Modulfarben so anpassen, dass Text in Modulfarbe und
// Text auf Flächen in Modulfarbe lesbar bleibt (AA 4,5:1, im Werkstattmodus AAA 7:1).
// Der Farbton bleibt erhalten; zu helle Farben werden abgedunkelt, im Dunkelmodus aufgehellt.

/** Hintergründe der App, gegen die Text in Modulfarbe stehen kann (siehe styles.css). */
export const SURFACES = {
  light: ['#ffffff', '#f4f5f7', '#eef0f3'],
  dark: ['#0f1115', '#181b21', '#22262e'],
};

/** Schrift auf Flächen in Modulfarbe (Buttons, Badges): hell weiß, dunkel fast schwarz. */
export const ON_ACCENT = { light: '#ffffff', dark: '#0f1115' };

function rgb(hex) {
  const h = String(hex).replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}

function hex([r, g, b]) {
  return `#${[r, g, b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`;
}

/** Relative Leuchtdichte (WCAG). */
export function luminance(color) {
  const [r, g, b] = rgb(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben (1 bis 21). */
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Modulfarbe für das aktuelle Design: so wenig wie nötig zu Schwarz (hell) bzw.
 * Weiß (dunkel) hin mischen, bis sie auf allen Hintergründen und mit der Schrift
 * auf der Farbfläche den Mindestkontrast erreicht.
 */
export function accentFor(color, dark = false, min = 4.5) {
  const base = rgb(color);
  const target = dark ? [255, 255, 255] : [0, 0, 0];
  const against = [...SURFACES[dark ? 'dark' : 'light'], ON_ACCENT[dark ? 'dark' : 'light']];
  for (let step = 0; step <= 100; step++) {
    const c = hex(base.map((x, i) => x + (target[i] - x) * (step / 100)));
    if (against.every((bg) => contrast(c, bg) >= min)) return c;
  }
  return dark ? '#ffffff' : '#000000';
}

/** Schwarz oder Weiß als Schrift auf einer beliebigen Farbfläche, je nachdem, was besser lesbar ist. */
export function textOn(color) {
  return contrast(color, '#ffffff') >= contrast(color, '#0f1115') ? '#ffffff' : '#0f1115';
}

/** Ist gerade der Dunkelmodus aktiv (Einstellung oder Gerät)? */
export function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Modulfarbe passend zu Design und Werkstattmodus (dort AAA-Kontrast). */
export function accent(color) {
  const workshop = typeof document !== 'undefined' && 'workshop' in document.documentElement.dataset;
  return accentFor(color, isDarkTheme(), workshop ? 7 : 4.5);
}
