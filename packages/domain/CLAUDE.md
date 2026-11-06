# packages/domain – Regeln

> **Zweck:** Regeln und Karte der reinen Spiellogik. Gilt zusätzlich zur Root-`CLAUDE.md`.

## Regeln
- **Keine Laufzeitabhängigkeiten**, kein Angular, kein DOM, kein `localStorage` (ADR 0003, Test in `tests/repo/toolchain.test.mjs`).
- **Keine Uhr lesen:** Zeit kommt als `atMs` im Ereignis oder als `nowMs` für Anzeigen. ESLint verbietet `Date.now`, `new Date()`, `performance`, `window`, `document`.
- **Reine Funktionen**, unveränderliche Daten; Zustand ist reines JSON (`types.ts`).
- Fehler werden als `Result` zurückgegeben (`{ ok: false, error: { code, message } }`), nie geworfen. Ungültige Ereignisse ändern nichts.
- Regelgrundlage: Konzept §3 (Spielregeln) und §4 (Zeitmodell). Bei Abweichung zwischen Code und Konzept: anhalten und den Nutzer fragen.
- Tests: Vitest, `*.spec.ts` neben dem Code; Property-Tests mit fast-check. Coverage-Schwelle 95 % (`vitest.config.ts`), `npm test` prüft sie.
- Export nur über `src/index.ts`.

## Modulkarte
| Datei | Inhalt | Hängt ab von |
|---|---|---|
| `types.ts` | Datenmodell, Ereignisse, Fehlercodes, `History`, `ClockView` | – |
| `config.ts` | Voreinstellungen, `updateConfig` (→ „Eigene“) | types |
| `cards.ts` | 8 Strategiekarten, zweisprachige Namen | – |
| `order.ts` | Wahl-, Aktions-, Sekundär-, Abstimmungsreihenfolge, `nextActor` | types |
| `clock.ts` | Uhr aus Zeitstempeln (`baseMs` + `runningSince`) | types |
| `time.ts` | `settleTurn` (Formel §4.1), `liveBank` | types |
| `game.ts` | Zustandsmaschine: `createGame`, `applyEvent`, `clockView` | alle obigen |
| `history.ts` | Undo/Redo: `dispatch`, `undo`, `redo` | game, clock |
| `format.ts` | `formatDuration` (m:ss, Überzeit mit „-“) | – |

## Ablauf (Schritte in `GameState.step`)
`pick` (Strategie, je 5:00) → `turn` ⇄ `secondary` (Aktion) → `agendaQuestion` (nur solange Agenda nicht aktiv) → `status` → `agendaIntro(1)` → `vote` … → `agendaIntro(2)` → `vote` … → nächste Runde `pick`.

## Modellentscheidungen (M1, nicht im Konzept ausbuchstabiert)
- **`agendaIntro`** vor jeder Agenda: Uhr läuft erst ab „Abstimmung starten“ (`startVoting`), damit Vorlesen nicht dem ersten Abstimmenden angerechnet wird.
- **Gutschrift kürzt nie:** Liegt die Bank über der Obergrenze (Startbank > Obergrenze), bleibt sie; Gutschrift füllt nur bis zur Obergrenze.
- **Pause/Fortsetzen sind keine Undo-Schritte**; Spielaktionen sind während der Pause gesperrt. Undo während der Pause bleibt pausiert.
- **Undo/Redo-Zeitregel:** Die Uhr des Zielzustands steht auf ihrem Wert zum Zeitpunkt des rückgängig gemachten Ereignisses und läuft ab dem Undo weiter. Undo zum selben Zeitpunkt liefert exakt den vorherigen Zustand.
- **Verlauf:** höchstens 30 Undo-Schritte (`HISTORY_LIMIT`).
- **Handelswaren:** +1 auf jede nicht gewählte Karte am Ende der Strategiephase; wer eine Karte wählt, nimmt ihre Handelswaren (Zähler → 0).
- **Gerätezeit springt zurück:** vergangene Zeit wird nie negativ (`elapsedMs` ≥ 0).
