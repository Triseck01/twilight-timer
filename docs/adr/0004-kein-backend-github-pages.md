# ADR 0004: Kein Backend, Hosting auf GitHub Pages

Datum: 2026-11-06 · Status: angenommen

## Kontext
Beide Experten haben alle Funktionen aus Konzept §1–§8 geprüft: Sie laufen vollständig offline im Browser (localStorage, Service Worker, JSON-Export/-Import). Ein Server wäre nur für Geräte-Sync oder eine Mehrgeräte-Ansicht nötig; beides ist nicht geplant. Für Service Worker und Home-Bildschirm-Installation auf dem iPad braucht es lediglich HTTPS.

## Entscheidung
- **Kein Backend in v1.0.** `apps/*` lässt Platz für ein späteres `apps/api` (dann per neuer ADR).
- **Hosting: GitHub Pages** (Repository `Triseck01/twilight-timer`, öffentlich). Ein eigener Server ist optional und nicht geplant.

## Folgen
- GitHub Pages erlaubt keine eigenen HTTP-Header → Content-Security-Policy nur per `<meta>`-Tag (M0b).
- Risiko: Ein kompromittiertes Deployment würde vom Service Worker gecacht. Gegenmaßnahmen: Deploy nur aus CI, Lockfile + `npm ci`, Validierung importierter JSON-Daten.
