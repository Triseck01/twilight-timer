# Twilight Timer

> **Zweck:** Einstieg für Menschen: was das Projekt ist, wie man es einrichtet, testet und startet.

Zug- und Phasen-Timer für **Twilight Imperium 4** (Basisspiel, Prophecy of Kings, Thunder's Edge). Läuft als Web-App (PWA) auf dem iPad im Querformat, offline, ohne Backend. Produktkonzept: [`ti4-timer-konzept-v2.md`](ti4-timer-konzept-v2.md).

## Voraussetzungen

- macOS mit [Homebrew](https://brew.sh)
- Node.js **26** (LTS) – wird vom Bootstrap-Skript geprüft
- Docker ist **nicht** nötig

## Einrichtung

```bash
scripts/bootstrap.sh
```

Das Skript prüft Homebrew und Node 26. Fehlt etwas, nennt es den Befehl (`brew install node` bzw. `brew upgrade node`) und **fragt vor jeder Installation**. Danach installiert es die Projektpakete mit `npm ci`.

Manuell:

```bash
brew upgrade node   # oder: brew install node  → Node 26
npm ci
```

Mit der falschen Node-Version bricht `npm ci` mit `EBADDEVENGINES` ab.

## Befehle

| Zweck | Befehl |
|---|---|
| Dev-Server starten | `npm run dev` → http://localhost:4200 |
| Alles prüfen (Lint, Typen, Tests, Build, Repo-Tests) | `npm run verify` |
| Unit-Tests aller Pakete | `npm test` |
| Repo-Tests (Hook, Bootstrap, Toolchain, Doku) | `npm run test:repo` |
| Lint / Typprüfung | `npm run lint` · `npm run typecheck` |
| Produktions-Build | `npm run build` → `apps/web/dist/web/browser` |
| Nur ein Paket | `npx turbo run test --filter=@twilight-timer/domain` |

Die App ist veröffentlicht unter **https://triseck01.github.io/twilight-timer/** (jeder Push auf `main` mit grünem `verify`). Unten links zeigt sie ihre Version (Commit-Kennung). Liegt eine neue Version bereit, erscheint „Neue Version / New version – neu laden“.

Auf dem iPad installieren: Seite in Safari öffnen → Teilen → „Zum Home-Bildschirm“.

Icons nach Änderung an `apps/web/public/icons/icon.svg` neu erzeugen:

```bash
node scripts/generate-icons.mjs
```

Auf dem iPad im selben WLAN testen (ohne Service Worker, da kein HTTPS):

```bash
npm run dev -w @twilight-timer/web -- --host 0.0.0.0
```

## Aufbau

| Ordner | Inhalt |
|---|---|
| `apps/web` | Angular-22-App (Oberfläche, Ton, Display wachhalten, Speichern) |
| `packages/domain` | Spiellogik in reinem TypeScript (Zeitmodell, Reihenfolgen, Zustandsmaschine, Undo/Redo) |
| `tests/repo` | Tests für Repository-Regeln |
| `scripts` | Einrichtung |
| `docs/adr` | Architekturentscheidungen |
| `docs/milestones` | Meilensteine, Akzeptanzkriterien, Freigaben |
| `docs/planning` | Planungsdiskussion (Engineer und Architekt) |

## Arbeiten mit Claude Code

- Regeln und Befehle für Claude: [`CLAUDE.md`](CLAUDE.md) (importiert `AGENTS.md`, `AGENT.md`, `BRAIN.md`).
- Claude startet **nie** einen Dev-Server (Hook `.claude/hooks/block-dev-server.mjs`).
- Entwicklung test-getrieben: Akzeptanzkriterien → Freigabe → rote Tests → Code.
- Subagenten: `.claude/agents/software-engineer.md`, `.claude/agents/claude-code-architect.md`.

## Technik

Angular 22.2 · TypeScript 6.0 · Node 26 · npm workspaces · Turborepo 2.11 · Vitest · ESLint 10 (angular-eslint). Begründungen in [`docs/adr`](docs/adr/README.md).
