# CLAUDE.md – Twilight Timer

> **Zweck:** Einstiegspunkt für Claude Code: harte Regeln, Befehle, Stand. Details stehen in den importierten Dateien – nichts doppelt pflegen.

@AGENTS.md
@AGENT.md
@BRAIN.md
@docs/milestones/STATUS.md

## Harte Regeln (nicht verhandelbar)

1. **Niemals einen Dev-Server starten** (`npm run dev`, `ng serve`, `turbo dev`, …). Nur den Befehl nennen. Erzwungen durch `.claude/hooks/block-dev-server.mjs`.
2. **TDD-Reihenfolge:** Akzeptanzkriterien → Freigabe durch den Nutzer → Tests schreiben und **rot** sehen → implementieren (grün) → refaktorieren. Freigaben stehen in `docs/milestones/STATUS.md`; diese Datei nur mit Bestätigung des Nutzers ändern (`ask`-Regel in `.claude/settings.json`).
3. **Dokumentation immer anreichern:** Neue Erkenntnis → `BRAIN.md`; neue Architekturentscheidung → neue ADR in `docs/adr/`; neue Befehle → `README.md`. Eine Aufgabe ist erst fertig, wenn Tests grün **und** Doku aktuell sind.
4. **Konzept vs. Technik:** Produktanforderungen aus `ti4-timer-konzept-v2.md` gelten; dessen §2 (Technik), §7.1, §7.2, §9, §12 sind **überholt** → `docs/adr/0001-stack-und-konzeptabweichungen.md`.
5. **Keine Installation am System ohne Rückfrage.** Projektpakete (`npm install` im Repo) sind erlaubt.
6. **TypeScript bleibt 6.0.x** (ADR 0002). Nie `typescript@latest` installieren.

## Befehle

| Zweck | Befehl |
|---|---|
| Einrichtung (macOS) | `scripts/bootstrap.sh` |
| Pakete installieren | `npm ci` |
| Alles prüfen | `npm run verify` (Lint, Typen, Tests, Build, Browser-Tests, Repo-Tests) |
| Browser-Tests | `npm run e2e` (Playwright startet dafür selbst einen Test-Server auf 127.0.0.1:4310 und beendet ihn) |
| Tests | `npm test` · Repo-Tests: `npm run test:repo` |
| Nur ein Workspace | `npx turbo run test --filter=@twilight-timer/domain` |
| Dev-Server (**nur dem Nutzer nennen**) | `npm run dev` → http://localhost:4200 |

## Wo was steht

| Thema | Ort |
|---|---|
| Produkt, Spielregeln (§3), Zeitmodell (§4) | `ti4-timer-konzept-v2.md` |
| Architekturentscheidungen | `docs/adr/` |
| Planungsdiskussion der Experten | `docs/planning/` |
| Meilensteine, Akzeptanzkriterien, Freigaben | `docs/milestones/` |
| Angular-Regeln (offiziell, von `ng new --ai-config` erzeugt) | `apps/web/CLAUDE.md` |
| Regeln für die Domänenlogik | `packages/domain/CLAUDE.md` |
