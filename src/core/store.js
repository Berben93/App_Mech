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

/**
 * Einstellungen der ganzen App.
 *   theme     auto | light | dark
 *   units     metric | inch (Ergebnisse zusätzlich bzw. vorrangig in Zoll)
 *   workshop  Werkstattmodus: große Schrift, hoher Kontrast, große Tasten
 *   steps     Rechenweg standardmäßig aufgeklappt
 *   expert    Expertenansicht: alles sofort sichtbar (sonst einfache Ansicht mit „Mehr anzeigen“)
 *   lang      auto | de | en | tr | pl
 */
const DEFAULT_SETTINGS = { theme: 'auto', units: 'metric', workshop: false, steps: false, expert: false, lang: 'auto' };

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...load('settings', {}) };
}

export function setSetting(name, value) {
  const s = getSettings();
  s[name] = value;
  save('settings', s);
  return s;
}
