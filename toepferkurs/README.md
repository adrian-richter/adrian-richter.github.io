# 🏺 TÖPFERKURS – Ben & Adrian WG-App

Eigenständige, mobiloptimierte WG-Zentrale in `toepferkurs/`. Kein React-Build, kein externes Tracking, keine SaaS-App-Plattform.

**Website:** [adrian-richter.com/toepferkurs/](https://adrian-richter.com/toepferkurs/)

## Funktionen (Version 1)

- 🛒 Einkaufszettel mit gemeinsamen, Ben- und Adrian-Artikeln; Fleisch wird standardmäßig Ben zugeordnet
- 🧻 Interaktiver Vorrats-Check („Ist noch genug Kackpappe da?“)
- 🥫 Vorratsübersicht, Bestandsänderungen, automatischer Einkaufszettel bei niedrigem Bestand
- 🍳 Mahlzeiten mit Zutatenverbrauch und Verlauf
- 🗓️ Monatskalender für Arbeitszeiten, Termine, Parties und Events
- 🧽 Wiederkehrender Putzplan mit rotierender Zuständigkeit und Erledigt-Historie
- 🧾 Einkaufshistorie mit Kosten, Zahler, 50/50-Aufteilung und individuellen Extra-Beträgen
- 📷 Belegfoto mit optionaler **browserinterner** experimenteller TextDetector-Erkennung; bei Nichtunterstützung manuelle Eingabe
- 💾 JSON-Datenexport und -import
- 📱 Progressive Web App: manifest + Service Worker für optionalen Offlinezugriff

## Wichtige Einschränkung: Noch keine gemeinsame Datenbank

Version 1 speichert Inhalte **ausschließlich im localStorage des jeweiligen Browsers**. Daten von Ben und Adrian synchronisieren sich **nicht automatisch** zwischen Smartphones, Tablets oder Computern. Die JSON-Backup-Funktion erlaubt manuellen Datentransfer, überschreibt aber beim Import den gesamten aktuellen Datenbestand. Lokale Daten können durch Löschen von Browserdaten verloren gehen; regelmäßig exportieren.

**Für Version 2:** Eigener abgesicherter API-Server (etwa PHP mit MySQL/SQLite auf vorhandenem Webhosting oder Node mit SQLite/PostgreSQL auf eigenem Server), Benutzerkonten für beide Mitbewohner, Authentifizierung, Autorisierung, serverseitige Validierung, HTTPS, Datenbank-Backups und datensparsame Belegverarbeitung. Eine GitHub-Pages-Seite alleine kann keine gemeinsam beschreibbare Datenbank bereitstellen.

## Belege

Belegfotos werden aktuell nicht gespeichert oder extern hochgeladen. Die OCR nutzt ausschließlich die optionale Browser-API `TextDetector` und funktioniert in vielen Browsern **nicht**. Erkannte Beträge müssen vor dem Speichern geprüft werden. Es gibt keine zuverlässige automatische Produkt-/Barcode-Datenbank und keine vollständige Bild-OCR-Pipeline.

## Entwicklungsstruktur

- `index.html` – Seitenlayout
- `style.css` – responsive Styles
- `app.js` – Geschäftslogik und Speicher
- `manifest.webmanifest`, `icon.svg`, `sw.js` – PWA

Alle Daten sind in `localStorage['toepferkurs.wg.v1']` gespeichert. GitHub Pages liefert nur statische Dateien aus. Kein Buildprozess nötig.
