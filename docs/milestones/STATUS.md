# Meilenstein-Status

> **Zweck:** Aktueller Meilenstein, Akzeptanzkriterien und Freigaben des Nutzers. Änderungen nur mit Bestätigung des Nutzers.

**Aktuell:** M0b – leere PWA per HTTPS (GitHub Pages) auf dem iPad installierbar
**Als Nächstes:** M1 – Kernlogik ohne Oberfläche

| Meilenstein | Kriterien freigegeben | Abnahme |
|---|---|---|
| M0a Projektgrundlage | ✅ 2026-11-06 durch Nutzer | ✅ 2026-11-06 (Commit `527a4b6`) |
| M0b PWA auf dem iPad | ✅ 2026-11-06 durch Nutzer | AC1–AC9 ✅ (Deploy `ad38a44`), AC10 iPad-Test offen |
| M1 Kernlogik ohne Oberfläche | – | – |
| M2–M9 | siehe Konzept §8 | – |

## M0a – Akzeptanzkriterien (freigegeben 2026-11-06)

| # | Kriterium | Prüfung |
|---|---|---|
| AC1 | Frischer Klon auf macOS: `npm ci` + `npm run verify` grün | CI (`.github/workflows/ci.yml`, macOS) + lokal durch Nutzer |
| AC2 | Falsche Node-Version → `npm ci` bricht verständlich ab | `tests/repo/node-version.test.mjs` |
| AC3 | `scripts/bootstrap.sh` prüft Homebrew/Node 26, nennt Befehle, fragt vor Installation | `tests/repo/bootstrap.test.mjs` |
| AC4 | Hook blockiert Dev-Server, erlaubt Test/Build | `tests/repo/dev-server-hook.test.mjs` |
| AC5 | Monorepo `apps/web` (Angular 22.2) + `packages/domain`; Web nutzt Domain-Funktion; Build grün | `tests/repo/toolchain.test.mjs`, `apps/web/src/app/app.spec.ts`, `ng build` |
| AC6 | Lint verbietet `Date.now`/`window`/`document` in `domain` | `tests/repo/domain-lint.test.mjs` |
| AC7 | TypeScript 6.0.x gepinnt + ADRs | `tests/repo/toolchain.test.mjs` |
| AC8 | `CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `BRAIN.md`, `README.md` mit Zweckzeile; README nennt Befehle | `tests/repo/docs-and-settings.test.mjs` + Durchsicht |
| AC9 | `docs/milestones/**` nur mit Bestätigung | `tests/repo/docs-and-settings.test.mjs` |

Nicht in M0a: PWA/Service Worker, GitHub Pages, Spiellogik, Skills, TDD-Gate-Hook.
