// Liste aller Module. Ein neues Modul wird nur hier eingetragen.
//
// Aufbau eines Moduls (Default-Export):
//   id        eindeutige Kennung, Teil der URL (#/m/<id>)
//   title     Name auf der Kachel
//   subtitle  eine Zeile Beschreibung
//   color     Modulfarbe (Kachel, Kopfzeile, Akzente)
//   icon      SVG-Inhalt für ein 24×24-Feld
//   keywords  Suchbegriffe für die globale Suche
//   render(el, params, ctx)  baut die Ansicht in `el`; params kommen aus der URL
//   search(query)            optional: Treffer [{title, text, params, score, html?}]
import passungen from '../modules/passungen/index.js';
import allgemeintoleranzen from '../modules/allgemeintoleranzen/index.js';
import gewinde from '../modules/gewinde/index.js';
import schnittwerte from '../modules/schnittwerte/index.js';
import schrauben from '../modules/schrauben/index.js';
import rauheit from '../modules/rauheit/index.js';
import gewicht from '../modules/gewicht/index.js';
import einheiten from '../modules/einheiten/index.js';

export const MODULES = [
  passungen,
  allgemeintoleranzen,
  gewinde,
  schnittwerte,
  schrauben,
  rauheit,
  gewicht,
  einheiten,
];

export function getModule(id) {
  return MODULES.find((m) => m.id === id) || null;
}
