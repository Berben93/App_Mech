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

## Phase 2: weitere Module und Bedienung

| Modul | Inhalt |
| --- | --- |
| Härtevergleich | HV, HBW, HRC, HRB und Zugfestigkeit nach DIN EN ISO 18265 mit Skala und Umwertungstabelle |
| Werkstoffe | 38 Werkstoffe mit WNr, EN-Kurzname, alter Bezeichnung, AISI/UNS, Festigkeit, Härte, Zerspanbarkeit, Schweißeignung; Links zu Schnittwerten und Gewicht |
| Blechbiegen | Gestreckte Länge und Ausgleichswert nach DIN 6935, k- und K-Faktor, kleinster Biegeradius, Gesenkweite, Presskraft, Live-Profil |
| Senkungen & Freistiche | Kegelsenkungen ISO 15065, Zylindersenkungen für ISO 4762, Kegelsenkrechner für jeden Winkel, Gewindefreistiche DIN 76-1 Form A–D |
| Normteile | O-Ring-Nuten (radial/axial, statisch/dynamisch), Passfedern DIN 6885, Sicherungsringe DIN 471/472, Zylinderstifte ISO 2338/8734, Scheiben ISO 7089/7093 |
| Kegel & Trigonometrie | Kegelwinkel und Reitstockverstellung, Morsekegel, rechtwinkliges Dreieck/Steigung, Lochkreis-Koordinaten, Sinuslineal mit Endmaßkombination |
| Fertigungszeit & Kosten | Zeit je Einheit, Auftragszeit, Fertigungs- und Selbstkosten, Angebotspreis, Preisstaffel nach Losgröße |
| Toleranzketten | Schlussmaß arithmetisch und statistisch, Toleranzen als ±, Abmaße oder ISO-Kurzzeichen (z. B. h7) |
| Form & Lage | Alle 14 Symbole nach ISO 1101 mit Toleranzzone, Erklärung und Prüfhinweis, Zusatzzeichen, Positionsprüfung mit MMR |
| Gewindefräsen | Drehzahl, Vorschub an Kontur und Fräsermitte, Bahnradius, Umläufe, Beispielprogramm G02/G03 |

Bedienung: Favoriten (☆ im Modul) und Verlauf auf der Startseite, Werkstattmodus (große Schrift, hoher Kontrast,
große Tasten), globaler Zoll/Metrisch-Schalter (Ergebnisse in Zoll, metrischer Wert klein darunter),
Ergebnis teilen als Link, Text, Bild (PNG) oder Etikett (62 mm, Druckdialog) und aufklappbarer Rechenweg mit Formel
und eingesetzten Werten.

Dazu: globale Suche (z. B. `M12`, `25 H7/g6`, `Ra 1,6`, `1.4301`, `G1/2`, `1/2 zoll`, `SW 17`, `Drehmoment M10`, `2768-m 50`,
`45 HRC`, `4140`, `MK 3`, `DIN 471 20`, `Passfeder 30`, `Freistich M12`, `O-Ring 20x2`, `Ebenheit`),
heller/dunkler/automatischer Modus, teilbare Links (alle Eingaben stehen in der URL).

## Phase 3: Werkstatt-Alltag

- **Einfach / Experte** (Einstellungen): Einfach zeigt je Modul nur die wichtigsten Eingaben und Ergebnisse,
  der Rest (Tabellen, Rechenweg, Sonderfälle) liegt hinter „Mehr anzeigen“. Elemente mit Klasse `adv` gehören zum Experten-Teil.
- **Zoll direkt eingeben**: Im Zoll-Modus nehmen Längenfelder (Beschriftung endet auf „(mm)“ oder `data-unit="mm"`)
  Zoll und Brüche wie „1 3/8“ an; mit „mm“ am Ende bleibt der Wert metrisch. Module rechnen weiter in mm.
- **Gewinde per Foto**: Münze als Maßstab, Gewinde-Ø und Steigung antippen, passende M/MF/UNC/UNF/G-Gewinde mit Abweichung.
- **Meine Schnittdaten**: eigene Werte je Maschine und Werkzeug, bleiben auf dem Gerät. Teilen ohne Konto als
  CSV-Datei (öffnet in Excel) oder als Link; beim Import gewinnt die neuere Änderung. Aus „Schnittwerte“ per ★ speichern.
- **Lernen & Quiz**: Fragen werden aus den Tabellen der App erzeugt, mit Erklärung und Link ins Modul.
- **Sprachen Deutsch und Englisch**: `src/i18n/en.js` übersetzt die fertige Ansicht. Schlüssel sind die deutschen Texte,
  Zahlen als `{#}`, Platzhalter wie `{x}` sind Muster. Fehlt ein Text, bleibt er deutsch.

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
src/core/                                 Helfer (DOM, Speicher, Suche, Modul-Liste, Einheiten, Favoriten, Teilen, Sprache, Zoll-Eingabe)
src/i18n/en.js                            englisches Wörterbuch
src/modules/<modul>/data.js               Tabellenwerte
src/modules/<modul>/calc.js               Rechenlogik ohne DOM (getestet)
src/modules/<modul>/index.js              Ansicht und Suchtreffer des Moduls
tests/                                    node:test
```

Ein neues Modul bekommt einen Ordner unter `src/modules/` und einen Eintrag in `src/core/registry.js`.
In `render` meldet `ctx.setParams(params, label)` den Stand (URL, Favoriten, Verlauf); Ergebnisse mit
`result(label, wert, einheit)` werden im Zoll-Modus automatisch umgerechnet, `steps([...])` erzeugt den Rechenweg.
Neue Dateien zusätzlich in `sw.js` eintragen und dort `VERSION` (= Version in `package.json`) erhöhen;
ein Test prüft beides.

## Hinweis

Werte sind sorgfältig aus den Normen und üblichen Richtwerten übernommen und gegen Normtabellen getestet,
ersetzen aber keine Norm. Schnittwerte und Drehmomente sind Richtwerte; Herstellerangaben haben Vorrang.
