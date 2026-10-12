# Veröffentlichung und Suche

Öffentlich geprüft: HTTPS antwortet mit HTTP 200 und Server GitHub.com.
Die Apex-Domain löst auf 185.199.108.153 auf; www hat den CNAME
adrian-richter.github.io. Der ausgelieferte Stand ist vom 5. Oktober 2026.
Aktuell ist keine STRATO-DNS-Änderung begründet.

Stand: 12. Oktober 2026. Die Arbeit basiert auf dem aktuellen GitHub-main in
adrian-richter/adrian-richter.github.io; vorhandene lokale Relaunch-Dateien wurden
nicht überschrieben. CNAME bleibt adrian-richter.com. Es gibt keinen neuen Host,
kein Framework und keine zusätzlichen Trackingdienste.

## Vor Veröffentlichung

- Pull Request prüfen und nach Freigabe in main zusammenführen. GitHub Pages muss
  main / root als Quelle verwenden oder über den bestehenden Pages-Workflow bauen.
- Im GitHub-Repository unter Settings → Pages den Domainstatus, HTTPS und den
  tatsächlichen Deploymentstand prüfen. Die Websuche lieferte beim Abruf noch
  Inhalte der 2022er Website; das kann ein veralteter Suchindex sein.
- STRATO-DNS nur ändern, wenn Pages-Domainprüfung oder DNS-Abgleich einen Fehler
  zeigt. CNAME-Datei belegt die gewünschte Domain, nicht die aktuellen DNS-Werte.
- Formular ist unverändert: FormSubmit an info@adrian-richter.com. Aktivierung
  und erfolgreicher Postfacheingang sind nicht bestätigt. Siehe FORMULAR-SETUP.md.
  Ein kontrollierter Versandtest muss vor Bewerbung der Kontaktseite erfolgen.

## Search Console nach Deployment

1. Bestehenden Search-Console-Zugang verwenden. Vorhandener Verifizierungstag
   wurde erhalten; keine DNS-Verifizierung erfinden oder überschreiben.
2. Sitemap https://adrian-richter.com/sitemap.xml einreichen.
3. Startseite und beide Leistungsseiten per URL-Prüfung auf Erreichbarkeit,
   Indexierbarkeit und von Google gewählte Canonical kontrollieren.
4. Mobile Core Web Vitals und Ladezeiten anhand realer Daten beobachten.
   Vorher/nachher Suchanfragen, Impressionen und qualifizierte Anfragen vergleichen.
5. Anbieterangaben und öffentliche Firmenprofile konsistent halten; zusätzliche
   Referenzbeschreibungen nur mit belegbaren eigenen Beiträgen ergänzen.

Keine Platz-1- oder KI-Nennungs-Garantie. GEO beruht hier auf klaren, im HTML
verfügbaren Antworten und nachvollziehbaren Leistungsinformationen. Keine
versteckten Keywords, erfundenen Rezensionen, FAQ-Rich-Result-Versprechen oder
nahezu identischen Stadt-Landingpages. Schema beschreibt nur sichtbare Leistungen
und den bereits vorhandenen Anbieter. Rechtstexte wurden inhaltlich erhalten.

Grundlagen:
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/appearance/ai-features

## Bild und Bewegung

Freigestelltes Porträt und mechanische Variante liegen als transparente WebP vor.
PNG-Master dienen als Bearbeitungsquelle und werden nicht von der Seite geladen.
Gleiche Bildflächen und Positionierung; generative Varianten können trotz gleicher
Geometrie kleine Detailabweichungen haben. Der weiche Maskenrand gleicht sie aus.
Maus-Reveal und Button-Umschaltung; Touch-Scroll bleibt frei. Reduced-motion
unterbindet automatische Bewegung und Pointer-Effekt, der Button bleibt bedienbar.
Sechs CSS-Partikel, keine Animationsbibliothek, keine Scroll-Übernahme.
