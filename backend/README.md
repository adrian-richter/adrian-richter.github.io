# 🏺 TÖPFERKURS: gemeinsamer Speicher

Diese PHP-API bildet den **gemeinsamen Speicher für beide Mitbewohner**. Sie benötigt **PHP 8.2+ mit `pdo_sqlite`**, HTTPS und ein beschreibbares Verzeichnis außerhalb des Webroots. Es sind **keine externen App-Baukästen und keine Benutzerkonten** notwendig.

**Wichtig:** Die aktuelle Website läuft auf GitHub Pages. GitHub Pages führt **kein PHP** aus. Dateien in diesem Ordner werden deshalb nur als Quellcode gespeichert; **sie sind dort noch kein laufender Server**. Diese API muss separat auf einem PHP-Webhosting (z. B. bestehendem STRATO-Webspace) hochgeladen werden.

## Installation auf eigenem PHP-Webspace

1. Richte auf einem vorhandenen Webspace eine HTTPS-Adresse ein, z. B. `https://DEINE-API-DOMAIN/wg-api/`. **Keine Domain oder DNS-Ziele ohne Prüfung verändern.**
2. Lade ausschließlich `api.php` als `index.php` in den öffentlichen Ordner `wg-api/` hoch.
3. Erstelle **außerhalb** des öffentlich erreichbaren Webroots ein privates Verzeichnis `wg-private`. Lade die Datei `config.example.php` unter dem Namen `toepferkurs-config.php` dorthin (nicht in GitHub hochladen).
4. Setze in dieser privaten Konfiguration `shared_secret` auf einen **eigenen zufälligen Code mit mindestens 24 Zeichen**, z. B. mit einem Passwortmanager generiert. Der Code darf nicht in der Website oder in GitHub stehen.
5. `database_file` muss in das beschreibbare private Verzeichnis zeigen. `allowed_origin` muss **exakt** `https://adrian-richter.com` sein.
6. Der Server erwartet die Konfigurationsdatei standardmäßig zwei Ebenen über dem Verzeichnis von `index.php` unter `wg-private/toepferkurs-config.php`. Wenn die Ordnerstruktur beim Hoster anders ist, verwende die Umgebungsvariable `TOEPFERKURS_CONFIG` mit absolutem Dateipfad, oder passe die entsprechende Zeile in `api.php` an.
7. Kontrolliere im Browser die API-Adresse. Ohne WG-Code muss ein `401`-Fehler kommen; das ist korrekt. Ohne Konfiguration kommt `503`.
8. Öffne am **PC mit den bisherigen Einträgen** TÖPFERKURS → 💾 → WG-Synchronisierung. Gib API-URL und gemeinsamen Code ein. Wenn die Datenbank leer ist, veröffentliche **einmalig den PC-Datenbestand**.
9. Verbinde dann das Handy und Bens Gerät mit derselben API-URL und demselben Code. Dort den **bestehenden WG-Stand laden**, nicht lokale Musterdaten in die WG hochladen.

## API-Protokoll

- `OPTIONS`: CORS-Preflight; nur `https://adrian-richter.com` wird zugelassen.
- `GET`: Header `Authorization: Bearer <shared_secret>`, Antwort `{"revision":1,"state":{...}}` oder `{"revision":0,"state":null}`.
- `PUT`: Header wie oben und `Content-Type: application/json`, Payload `{"base_revision":1,"state":{...}}`. Optimistische Synchronisierung mit atomarer SQLite-Transaktion.
- Bei widersprüchlicher Revision liefert der Server `409` und den aktuellen Stand. Der Browser versucht konfliktfreie Änderungen aus beiden Geräten zusammenzuführen, statt einfach die alte Liste zu überschreiben.

## Sicherheit und Datenaufbewahrung

- Keine Zugangsdaten oder WG-Daten in öffentliche GitHub-Dateien einchecken.
- Nur HTTPS nutzen, privaten Code nicht weitergeben und auf fremden Geräten nicht dauerhaft speichern.
- Private SQLite-Datei regelmäßig serverseitig sichern.
- Ein gemeinsamer Code bedeutet **keine Benutzeridentität**: Beide können alles ändern. Das ist bewusst so, passt aber nur zu einer vertrauten WG.
- Der API-Server speichert ausschließlich den bestätigten JSON-WG-Stand. **Kassenzettelfotos werden weiterhin nicht hochgeladen.**

## Testhinweise

Sobald PHP-Hosting verbunden ist, API-Status, CORS, Login, zwei gleichzeitige Änderungen, Wiederverbinden nach Offline-Phasen, Backups sowie das Übernehmen der bestehenden PC-Daten im Browser testen.
