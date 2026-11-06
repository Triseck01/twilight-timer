# ADR 0006: Völker-Logos aus dem Fandom-Wiki

Datum: 2026-11-06 · Status: angenommen (Entscheidung des Nutzers, gegen Konzept §7.5)

## Kontext
Konzept §7.5 schließt Grafiken von Fantasy Flight Games aus. Der Nutzer wünscht die Völker-Symbole der Wiki-Seiten „Factions“ und „Discordant Stars Factions (UNOFFICIAL)“. Recherche (docs/planning/07): Keine Datei steht unter einer freien Lizenz; 51 ohne Lizenzvermerk, 14 mit `{{undefined}}`. Automatischer Download ist durch eine Bot-Prüfung des Bilderservers blockiert (nicht umgangen); der Nutzer hat die Dateien im Browser gespeichert (WebP, ca. 50–60 px).

## Entscheidung
- Logos werden eingebunden, auf ausdrücklichen Wunsch des Nutzers, trotz Hinweis auf das Urheberrecht (öffentliches Repo und GitHub Pages = Weiterverbreitung; keine Rechtsberatung).
- **Rückbaubar an einer Stelle:** Dateien nur in `apps/web/public/factions/<id>.webp`, Verwendung nur über `apps/web/src/app/core/faction-logo.ts` (erzeugt von `scripts/import-faction-logos.mjs`). Fehlt ein Logo, zeigt die App ein Kürzel.
- Hinweis auf die Rechteinhaber auf dem Startbildschirm und im README.

## Folgen
- Bei einer Aufforderung des Rechteinhabers: Ordner leeren, Skript laufen lassen, deployen (siehe README).
- Die gespeicherten Bilder sind Vorschaubilder (~55 px): für Listen ausreichend, für große Anzeigen unscharf. Alle 64 Völker haben ein Logo; das Kürzel bleibt Ersatz für künftige Völker.
