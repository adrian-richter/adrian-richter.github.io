# Projektanfrage: Versand und Inbetriebnahme

Die Seite `projekt-starten.html` sendet Anfragen über FormSubmit an
`info@adrian-richter.com`. Das ist für die bestehende statische GitHub-Pages-
Website geeignet, weil dort kein eigener PHP- oder Node-Mailserver läuft.

## Einmalige Aktivierung nach dem Deployment

1. `https://adrian-richter.com/projekt-starten.html` aufrufen.
2. Eine eindeutig als Test markierte Anfrage ohne vertrauliche Daten absenden.
3. Im Postfach `info@adrian-richter.com` die Aktivierungsnachricht von FormSubmit
   öffnen und den Bestätigungslink anklicken. Falls sie fehlt, Spam-Ordner prüfen.
4. Danach eine zweite Testanfrage senden und Eingang, Antwortadresse,
   Danke-Seite und optional einen kleinen Dateianhang prüfen.

Vor der Bestätigung hält FormSubmit normale Formulardaten laut Anbieter bis zu
30 Tage zur Aktivierung bereit. Dateianhänge werden in dieser Wartephase nicht
vorgehalten. Deshalb sollte die Aktivierung unmittelbar nach Veröffentlichung
erfolgen.

## Technische Eckpunkte

- Empfänger: `info@adrian-richter.com`
- Betreff: `Neue Projektanfrage über adrian-richter.com`
- Erfolgsseite: `https://adrian-richter.com/danke.html`
- Dateitypen: PDF, DOC, DOCX, PNG, JPG, SVG und ZIP
- Maximale Upload-Größe: 10 MB insgesamt
- Spam-Schutz: Honeypot; Google reCAPTCHA ist bewusst deaktiviert
- Formular und Dateiupload werden per HTTPS an FormSubmit übertragen

Wird die Empfängeradresse im `action`-Attribut des Formulars geändert, muss die
neue Adresse erneut per Aktivierungs-E-Mail bestätigt werden.

## Datenschutz

Die neue Seite `datenschutz.html` beschreibt den Formularversand und verlinkt
die Datenschutzhinweise von FormSubmit. Vor der Veröffentlichung sollten die
gesamten Rechtstexte der Website mit den vollständigen Anbieterangaben und der
tatsächlichen betrieblichen Situation abgeglichen werden.
