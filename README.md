# 🏺 TÖPFERKURS – Ben & Adrian WG-App

Eigenständige, mobiloptimierte WG-Zentrale in `toepferkurs/`. Kein React-Build, kein externes Tracking, keine SaaS-App-Plattform.

**Website:** [adrian-richter.com/toepferkurs/](https://adrian-richter.com/toepferkurs/)

## Funktionen (Version 1)

- 🛒 Einkaufszettel mit gemeinsamen, Ben- und Adrian-Artikeln; Fleisch wird standardmäßig Ben zugeordnet
- 🍺 **Bier ist immer auf der Einkaufsliste**: abgehaktes Bier wird als gekauft markiert, für den nächsten Einkauf erscheint sofort ein neuer Pflichtposten
- 🥑 Produkticons für Nüsse, Avocado, Zwiebeln, Pizza(-Kit), Trauben, Karotten, Gurken, Erdbeeren; eigenes SVG-Joghurt-/Quarkbecher-Piktogramm
- 🧻 Interaktiver Vorrats-Check („Ist noch genug Kackpappe da?“)
- 🥫 Vorratsübersicht, Bestandsänderungen, automatischer Einkaufszettel bei niedrigem Bestand
- 🍳 Mahlzeiten mit Zutatenverbrauch und Verlauf
- 🗓️ Monatskalender für Arbeitszeiten, Termine, Parties und Events
- 🧽 Wiederkehrender Putzplan mit rotierender Zuständigkeit und Erledigt-Historie; 17 vorbelegte Tätigkeiten inklusive Staubsaugen, Boden wischen, Dusche entkalken, Kühlschrank reinigen, Spiegel putzen und Pfand wegbringen. Eigene SVG-Icons für Staubsauger und Wischmopp, weitere Vorschläge als Schnellvorlagen. Bestehende Nutzerdaten und Putz-Historien bleiben bei der einmaligen Erweiterung erhalten.
- 🧾 Einkaufshistorie mit Kosten, Zahler, 50/50-Aufteilung und individuellen Extra-Beträgen
- 📷 Belegfoto mit optionaler **browserinterner** experimenteller TextDetector-Erkennung; bei Nichtunterstützung manuelle Eingabe
- 💾 JSON-Datenexport und -import
- 📱 Progressive Web App: manifest + Service Worker für optionalen Offlinezugriff

## 🌐 Gemeinsamer WG-Speicher (Backend vorbereitet)

Die Website unterstützt jetzt **optional** einen zentralen Datenbestand. Der Client ist in `sync.js` integriert und der eigene Server in [backend/README.md](backend/README.md) dokumentiert.

**Stand der Bereitstellung:** Die API ist auf GitHub **nur als Quellcode vorbereitet**. Solange sie nicht auf einem echten PHP-Server mit privatem Code und SQLite-Datei eingerichtet wurde, speichert die Website weiterhin **ausschließlich im lokalen Browser**. Das Statusbanner zeigt den Zustand an. **Es gibt aktuell noch keine bestätigte Live-Synchronisierung.**

### Einrichtung und Migration

1. Die private PHP-/SQLite-API auf bestehendem HTTPS-Webhosting bereitstellen, siehe [backend/README.md](backend/README.md).
2. Am **PC mit den bisherigen Einträgen** die Website öffnen. Über `💾 → WG-Synchronisierung` API-Adresse und gemeinsamen Zugangscode eingeben.
3. Wenn der Server noch leer ist, die PC-Daten **einmalig hochladen**.
4. Auf Handy und Bens Gerät dieselbe API-Adresse und denselben WG-Code verwenden. `WG-Stand übernehmen` auswählen, oder bei zwei bereits gepflegten Geräten die Stände zusammenführen.
5. Das Banner muss `🌐 WG-Daten verbunden` zeigen. Bei Serverausfällen wird lokal weitergearbeitet und später synchronisiert.

Die App speichert einen bestätigten Server-Versionsstand, führt Änderungen anhand stabiler IDs zusammen und verhindert mit SQLite-Transaktionen, dass ältere Daten unbemerkt neuere Serverdaten überschreiben. Beim ersten Beitritt wird ein Backup des vorherigen lokalen Standes gespeichert und kann heruntergeladen werden.

### Sicherheit

Es gibt einen **gemeinsamen WG-Zugangscode**, keine einzelnen Nutzerkonten. Er wird nach Verbindung auf den Geräten lokal gespeichert; Daten selbst liegen zentral hinter der passwortgeschützten API. Der Server-Codeschlüssel darf **nicht im öffentlichen GitHub-Repository** stehen. Ohne Server ist weiterhin ein lokales JSON-Backup sinnvoll.

## Belege

Belegfotos werden aktuell nicht gespeichert oder extern hochgeladen. Die OCR nutzt ausschließlich die optionale Browser-API `TextDetector` und funktioniert in vielen Browsern **nicht**. Erkannte Beträge müssen vor dem Speichern geprüft werden. Es gibt keine zuverlässige automatische Produkt-/Barcode-Datenbank und keine vollständige Bild-OCR-Pipeline.

## Entwicklungsstruktur

- `index.html` – Seitenlayout
- `style.css` – responsive Styles
- `app.js` – Geschäftslogik und lokaler Speicher
- `sync.js` – optionale gemeinsame Synchronisierung, Konfliktbehandlung und Migration
- `backend/` – selbst gehostete PHP-API mit privater SQLite-Datenbank
- `manifest.webmanifest`, `icon.svg`, `sw.js` – PWA

Ohne aktivierte Serververbindung bleiben Daten in `localStorage['toepferkurs.wg.v1']`. Mit Serververbindung sind sie zentral gespeichert und werden zusätzlich lokal gespiegelt. GitHub Pages liefert weiterhin nur statische Dateien aus.
