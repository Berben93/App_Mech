# Tabellenbuch (Arbeitstitel)

Werkstatt-Tabellenbuch für die Zerspanung als installierbare Web-App (PWA).
Läuft offline, ohne Werbung und ohne Konto. Alle Daten bleiben auf dem Gerät.

## Phase 1: Kern-Module

| Modul | Inhalt |
| --- | --- |
| ISO-Passungen | Abmaße, Grenzmaße, Spiel/Übermaß und Passungsart nach ISO 286 bis 500 mm, Live-Grafik der Toleranzfelder, IT-Tabelle |
| Allgemeintoleranzen | ISO 2768-1 (f, m, c, v: Längen, Radien/Fasen, Winkel) und ISO 2768-2 (H, K, L) |
| Gewinde | M, MF, UNC, UNF, G, Tr mit Kernloch, Durchmessern, Durchgangsbohrung ISO 273 und Profilgrafik |
| Schnittwerte | Drehen, Fräsen, Bohren: Drehzahl, Vorschubgeschwindigkeit, Zeitspanvolumen, Leistung, Hauptzeit; vc-Richtwerte je ISO-Werkstoffgruppe |
| Schlüsselweiten & Drehmomente | Anziehdrehmoment und Vorspannkraft nach VDI 2230 (wählbarer Reibwert und Festigkeitsklasse), SW ISO/DIN, Innensechskant |
| Rauheit | N-Klassen, Ra/Rz, erreichbare Rauheit je Verfahren, theoretische Rauheit und max. Vorschub beim Drehen |
| Gewichtsrechner | Rund, Rohr, Vierkant, Flach/Blech, Sechskant, Rechteckrohr, Winkel, Kugel; eigene Werkstoffe werden lokal gespeichert |
| Einheiten | Länge, Kraft, Drehmoment, Druck, Masse, Temperatur, Geschwindigkeit, Vorschub, Leistung, Fläche, Volumen, Winkel; Zollbrüche |

Dazu: globale Suche (z. B. `M12`, `25 H7/g6`, `Ra 1,6`, `1.4301`, `G1/2`, `1/2 zoll`, `SW 17`, `Drehmoment M10`, `2768-m 50`),
heller/dunkler/automatischer Modus, teilbare Links (alle Eingaben stehen in der URL).

## Starten

Keine Abhängigkeiten, kein Build-Schritt. Ein beliebiger statischer Webserver reicht:

```sh
npm start            # http://localhost:5173
npm test             # Rechenlogik und Datentabellen prüfen
```

Für Installation und Offline-Betrieb muss die App über HTTPS (oder `localhost`) ausgeliefert werden.
Der Workflow `.github/workflows/pages.yml` veröffentlicht sie bei jedem Push auf `main` über GitHub Pages
(einmalig unter Settings → Pages als Quelle „GitHub Actions“ wählen).

## Aufbau

```
index.html, manifest.webmanifest, sw.js   App-Shell, PWA-Manifest, Service Worker (Offline-Cache)
src/app.js                                Routing (#/m/<modul>?…), Startseite, Suche, Theme
src/core/                                 Helfer (DOM, Speicher, Suche, Modul-Liste)
src/modules/<modul>/data.js               Tabellenwerte
src/modules/<modul>/calc.js               Rechenlogik ohne DOM (getestet)
src/modules/<modul>/index.js              Ansicht und Suchtreffer des Moduls
tests/                                    node:test
```

Ein neues Modul bekommt einen Ordner unter `src/modules/` und einen Eintrag in `src/core/registry.js`.
Neue Dateien zusätzlich in `sw.js` eintragen und dort `VERSION` (= Version in `package.json`) erhöhen;
ein Test prüft beides.

## Hinweis

Werte sind sorgfältig aus den Normen und üblichen Richtwerten übernommen und gegen Normtabellen getestet,
ersetzen aber keine Norm. Schnittwerte und Drehmomente sind Richtwerte; Herstellerangaben haben Vorrang.
