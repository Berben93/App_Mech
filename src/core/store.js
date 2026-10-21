// Lokale Ablage im Browser. Alles bleibt auf dem Gerät, kein Konto nötig.
// Jeder Zugriff ist abgesichert, weil localStorage im privaten Modus fehlen kann.

const PREFIX = 'wtb:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Einstellungen der ganzen App (Theme, später Zoll/Metrisch, Sprache, Werkstattmodus). */
const DEFAULT_SETTINGS = { theme: 'auto' };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}

export function setSetting(name, value) {
  const s = getSettings();
  s[name] = value;
  save('settings', s);
  return s;
}
