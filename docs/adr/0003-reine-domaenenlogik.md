# ADR 0003: Reine Domänenlogik mit injizierter Zeit

Datum: 2026-11-06 · Status: angenommen

## Kontext
Zeitmodell (§4), Reihenfolgen (§3), Zustandsmaschine und Undo/Redo sind der Kern und müssen deterministisch testbar sein. Safari drosselt Timer im Hintergrund (§7.4), daher zählt nur der Zeitstempel.

## Entscheidung
- Alle Spiellogik liegt in `packages/domain`: reines TypeScript, **keine Laufzeitabhängigkeiten**, kein Angular, kein DOM.
- Zeit wird **übergeben**, nie gelesen: Ereignisse tragen ihren Zeitstempel, Anzeigefunktionen erhalten `nowMs`.
- Erzwungen per ESLint (`eslint.config.mjs`): `Date.now`, `new Date()` ohne Argument, `performance`, `window`, `document`, `localStorage` sind in `packages/domain` Fehler. Test: `tests/repo/domain-lint.test.mjs`.
- Angular importiert den TypeScript-Quellcode direkt (`"exports": { ".": "./src/index.ts" }`); in M0a erfolgreich geprüft, kein eigener Build-Schritt für `domain`.

## Folgen
Ein späteres Backend (z. B. Fastify) könnte `domain` unverändert nutzen.
