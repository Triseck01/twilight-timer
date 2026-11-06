# packages/domain – Regeln

> **Zweck:** Regeln für die reine Spiellogik. Gilt zusätzlich zur Root-`CLAUDE.md`.

- **Keine Laufzeitabhängigkeiten**, kein Angular, kein DOM, kein `localStorage` (ADR 0003, Test in `tests/repo/toolchain.test.mjs`).
- **Keine Uhr lesen:** Zeit kommt als `nowMs` oder als Zeitstempel im Ereignis. ESLint verbietet `Date.now`, `new Date()`, `performance`, `window`, `document`.
- **Reine Funktionen**, unveränderliche Daten; Zustandsübergänge als `apply(state, event)` (ab M1).
- Regelgrundlage: Konzept §3 (Spielregeln) und §4 (Zeitmodell). Bei Abweichung zwischen Code und Konzept: anhalten und den Nutzer fragen.
- Tests: Vitest, `*.spec.ts` neben dem Code. Ab M1 Property-Tests (fast-check) für Zeit- und Bank-Invarianten.
- Export nur über `src/index.ts`.
