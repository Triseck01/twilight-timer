# BRAIN.md – Semantisches Gedächtnis

> **Zweck:** Verdichtete, überprüfte Erkenntnisse, die über Sitzungen hinweg gelten. Ein Eintrag pro Fakt, mit Datum und Beleg. Falsch gewordene Einträge löschen statt ergänzen. Max. ~80 Zeilen.

## Toolchain (Stand 2026-11-06)
- **Node 26.13.0 LTS** via Homebrew (`brew upgrade node`; Formel `node` = 26, Alias `node@26`). Node 25 ist EOL (2026-06-01) und wird von Angular 22 abgelehnt (`^22.22.3 || ^24.15.0 || >=26`).
- **npm 11.20:** `devEngines` mit `onFail: "error"` bricht `npm install` **und** `npm ci` mit `EBADDEVENGINES` ab – mit Node 25 geprüft.
- **npm 11.20 blockiert Install-Skripte**, bis man sie freigibt (`npm install-scripts ls/approve`). Betroffen: `msgpackr-extract` (optionales Native-Addon, über `@angular/build`); läuft ohne, daher **nicht** freigegeben.
- Corepack wird seit Node 25 nicht mehr mitgeliefert → npm statt pnpm.
- **TypeScript 6.0.3** gepinnt (ADR 0002). TS 6 hat `strict: true` als Standard.
- Angular 22.2: Framework-Pakete 22.2.4, CLI/Build 22.2.6. Angular 23 erst ~Juni 2027.

## Angular
- `ng new --ai-config=claude-code` erzeugt `CLAUDE.md` mit offiziellen Best Practices → `apps/web/CLAUDE.md` (nicht von Hand umschreiben; bei Angular-Updates neu erzeugen und vergleichen).
- `ng new` erzeugt außerdem `.mcp.json` (Angular-CLI-MCP-Server); bewusst noch nicht übernommen – bei Bedarf im Root ergänzen.
- Standard in v22: standalone, zoneless, OnPush, Vitest als Testrunner (`@angular/build:unit-test`, jsdom).
- **Direkter Import von TS-Quellcode aus `packages/domain` funktioniert** in `ng build` und `ng test` (geprüft 2026-11-06). Kein Build-Schritt für `domain` nötig.
- `angular.json` liegt in `apps/web`; `$schema` zeigt auf `../../node_modules/…` (Pakete werden ins Root gehoben).

## Claude Code
- Hook mit Exit 2 blockiert **vor** den Permission-Regeln, auch gegen `allow` (code.claude.com/docs/en/permissions).
- Pfadregeln: `Edit(/docs/**)` = relativ zum Projektroot (Ort der Settings-Datei); `ask` hat Vorrang vor `allow`.
- Neue Subagent-Dateien in `.claude/agents/` sind erst in einer neuen Sitzung als `subagent_type` verfügbar.

## Hosting
- GitHub Pages erlaubt keine eigenen HTTP-Header → CSP nur per `<meta>`.
- Repo muss bei kostenlosem Konto öffentlich sein.
