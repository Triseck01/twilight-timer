# BRAIN.md – Semantisches Gedächtnis

> **Zweck:** Verdichtete, überprüfte Erkenntnisse, die über Sitzungen hinweg gelten. Ein Eintrag pro Fakt, mit Datum und Beleg. Falsch gewordene Einträge löschen statt ergänzen. Max. ~80 Zeilen.

## Toolchain (Stand 2026-11-06)
- **Node 26.13.0 LTS** via Homebrew (`brew upgrade node`; Formel `node` = 26, Alias `node@26`). Node 25 ist EOL (2026-06-01) und wird von Angular 22 abgelehnt (`^22.22.3 || ^24.15.0 || >=26`).
- **npm 11.20:** `devEngines` mit `onFail: "error"` bricht `npm install` **und** `npm ci` mit `EBADDEVENGINES` ab – mit Node 25 geprüft.
- **npm 11.20 blockiert Install-Skripte**, bis man sie freigibt (`npm install-scripts ls/approve`). Offen (Stand M0b): `esbuild`, `lmdb`, `@parcel/watcher`, `fsevents`, `msgpackr-extract`. Build, Tests und Icons laufen ohne (vorgefertigte Binärdateien über optionale Abhängigkeiten) → bewusst **nicht** freigegeben.
- Corepack wird seit Node 25 nicht mehr mitgeliefert → npm statt pnpm.
- **TypeScript 6.0.3** gepinnt (ADR 0002). TS 6 hat `strict: true` als Standard.
- Angular 22.2: Framework-Pakete 22.2.4, CLI/Build 22.2.6. Angular 23 erst ~Juni 2027.

## Angular
- `ng new --ai-config=claude-code` erzeugt `CLAUDE.md` mit offiziellen Best Practices → `apps/web/CLAUDE.md` (nicht von Hand umschreiben; bei Angular-Updates neu erzeugen und vergleichen).
- `ng new` erzeugt außerdem `.mcp.json` (Angular-CLI-MCP-Server); bewusst noch nicht übernommen – bei Bedarf im Root ergänzen.
- Standard in v22: standalone, zoneless, OnPush, Vitest als Testrunner (`@angular/build:unit-test`, jsdom).
- **Direkter Import von TS-Quellcode aus `packages/domain` funktioniert** in `ng build` und `ng test` (geprüft 2026-11-06). Kein Build-Schritt für `domain` nötig.
- `angular.json` liegt in `apps/web`; `$schema` zeigt auf `../../node_modules/…` (Pakete werden ins Root gehoben).

## PWA (M0b)
- **CSP ohne `unsafe-inline` für Skripte** braucht `optimization.styles.inlineCritical: false` – sonst setzt Angular `onload="this.media='all'"` an den Stylesheet-Link. `style-src` braucht `'unsafe-inline'` (Komponenten-Styles als `<style>`).
- Build-Version per `define` (`BUILD_VERSION`): Standard `"dev"` in `angular.json`, überschrieben im Build-Skript aus der Umgebungsvariable; `turbo.json` führt `BUILD_VERSION` als `env`, sonst liefert der Turbo-Cache eine alte Version. Deklaration: `apps/web/src/build-version.d.ts`.
- Tests mit Komponenten, die `SwUpdate` nutzen: `provideServiceWorker('ngsw-worker.js', { enabled: false })` im TestBed.
- Angular-SW versioniert über Datei-Hashes (`ngsw.json`) – **kein manuelles Hochzählen** einer Cache-Version nötig (Konzept §7.2/§10 dadurch überholt).
- Icons: Quelle `apps/web/public/icons/icon.svg`, PNGs mit `node scripts/generate-icons.mjs` (`@resvg/resvg-js`) erzeugen und committen.
- Produktions-Build hat `baseHref: /twilight-timer/`; Manifest nutzt `./` für `start_url`/`scope`.

## Claude Code
- Hook mit Exit 2 blockiert **vor** den Permission-Regeln, auch gegen `allow` (code.claude.com/docs/en/permissions).
- Pfadregeln: `Edit(/docs/**)` = relativ zum Projektroot (Ort der Settings-Datei); `ask` hat Vorrang vor `allow`.
- Neue Subagent-Dateien in `.claude/agents/` sind erst in einer neuen Sitzung als `subagent_type` verfügbar.

## Hosting
- Live: https://triseck01.github.io/twilight-timer/ (Pages-Quelle „GitHub Actions“, erster Deploy 2026-11-06, `ad38a44`).
- Git-Push über HTTPS mit repo-lokalem Credential-Helper `!gh auth git-credential` (kein SSH-Key vorhanden; Schlüsselbund hatte veralteten Zugang). Push von Workflow-Dateien braucht den `gh`-Scope `workflow`.
- CI-Hinweise: macOS-arm64-Runner können länger in der Warteschlange stehen; `ubuntu-latest` wechselt ab 2026-10-19 auf Ubuntu 26.
- GitHub Pages erlaubt keine eigenen HTTP-Header → CSP nur per `<meta>`.
- Repo muss bei kostenlosem Konto öffentlich sein.
