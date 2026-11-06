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

## Domain (M1)
- Modellentscheidungen und Modulkarte: `packages/domain/CLAUDE.md` (dort pflegen, hier nicht duplizieren).
- `lib: ES2022` ohne DOM/Node-Typen → kein `structuredClone` in Domain-Tests; JSON-Kopie nutzen.
- `Omit<Union, K>` kollabiert die Union; für Ereignisse ohne `atMs` eine verteilte Variante nutzen (`full-game.spec.ts`).
- Testgüte per Hand-Mutation geprüft (2026-11-06): 9 eingebaute Fehler (Bank-Abschneiden, Pass-Gutschrift, Undo-Zeit, Abstimmungs-/Initiativreihenfolge, Pause, Handelswaren, Redo-Zweig) wurden alle erkannt.

## Web (M2)
- `@Service()` (Angular 22) funktioniert mit `inject()` in Feldinitialisierern; `SettingsStore` nutzt es.
- `localStorage` nur über das Token `STORAGE` (`core/storage.ts`), Zugriffe in try/catch; Daten immer mit `parseConfig` (domain) prüfen.
- Playwright testet den **Produktions-Build** unter `/twilight-timer/` über `e2e/static-server.mjs` (nur 127.0.0.1, SPA-Fallback wie Pages, Pfad-Traversal-Schutz); Service Worker im Test blockiert. Kein Dev-Server nötig.
- axe-Prüfung (`e2e/fixtures.ts`) fand bei Probe einen zu schwachen Kontrast sofort → Farben nur über Tokens in `styles.scss` ändern.
- Turbo bricht bei einem Fehler alle laufenden Tasks ab (`⊘ Building...`) – Ursache steht beim zuerst gescheiterten Task.

## Völker und Logos (M2)
- Deutsche Namen der 30 offiziellen Völker aus offiziellen Asmodee-PDFs (Codex II Karten, Regelheft, LRR DE, Codex III, Thunder's Edge) – Belege in docs/planning/07.
- Logos: Fandom-Bilder-CDN (`static.wikia.nocookie.net`) blockt automatische Downloads per Cloudflare-Prüfung; Umgehen ist nicht zulässig. Keine der Dateien hat eine freie Lizenz.
- `exactOptionalPropertyTypes`: optionales Feld weglassen statt `undefined` setzen.

## Sprache (M2-L)
- `t` aus `I18n` liest das Sprach-Signal → Vorlagen aktualisieren sich beim Umschalten ohne Pipe. Komponenten: `protected readonly t = inject(I18n).t`.
- Tests: `localStorage` von jsdom bleibt innerhalb einer Testdatei bestehen → bei Sprachtests `localStorage.clear()` in `beforeEach` oder `STORAGE` auf `null` setzen.
- Vorlagen-Scanner: Tag-Erkennung muss Anführungszeichen beachten (`[disabled]="a >= b"`).

## Spielansicht (M3)
- Live-Anzeige über `Ticker` (Signal `now`, 4×/s + `visibilitychange`); Zeitquelle `NOW`-Token, in Tests ersetzt (`game/game-test-helpers.ts`). Ereignisse bekommen den Zeitstempel in `GameSession.dispatch`.
- **Restzeit rundet vom Nullpunkt weg** (`Countdown`): 5:00 die erste volle Sekunde, „0:00“ erst bei Ablauf, Überzeit sofort „-0:01“. Hochzählende Anzeigen (Pause, Sekundär) runden ab (`formatDuration`).
- axe-Regel `label-content-name-mismatch` (WCAG 2.5.3): `aria-label` muss den sichtbaren Text enthalten – bei Knöpfen mit vollständigem sichtbarem Text kein `aria-label` setzen.
- Playwright `page.clock.install()` + `runFor()`: Zeit läuft echt weiter → Erwartungen mit kleiner Toleranz (Regex). Nicht `pauseAt`, sonst stehen auch Angulars Zeitgeber.
- Abfragen innerhalb der Spielansicht (z. B. Kartenwahl) als nicht-modaler Dialog über der Hauptspalte – die Pause-Spalte muss erreichbar bleiben. Fokus über `ElementRef` der Komponente setzen, nicht über das globale `document`.
- Spielerfarbe als Fläche: Hintergrund `color-mix(… 22 %, bg)` + Rahmen in voller Farbe, Text bleibt hell (Kontrast für alle 8 Farben).

## Aktionsphase (M4)
- Große Uhr: Zugzeit; danach Bank live (`clockView.bankMs`), rot erst bei Bank < 0. Tisch-Timer der Sekundärphase: `Countdown mode="up"` (rundet ab, nie rot).
- Layout-Regel: Bedienelemente einer Phase müssen auf dem iPad quer ohne Scrollen sichtbar sein → Browser-Test `e2e/action-layout.e2e.ts` (fand abgeschnittenen „Rest: alle Nein“).
- Test-Hilfen: `toActionPhase`, `at(session, ms, event)` in `game/game-test-helpers.ts`.

## Claude Code
- **Commit/Push nur nach erfolgreichem `verify`** – Befehle mit `npm run verify && git commit …` verketten, nie über `grep`/`;` (2026-11-06: fehlerhafter Commit `9126657` gepusht; CI hat die Veröffentlichung verhindert).
- angular-eslint verlangt bei `(click)` auf Nicht-Knöpfen Tastatur + Fokus → Hintergrundflächen als `<button tabindex="-1">` mit `aria-label`.
- Hook mit Exit 2 blockiert **vor** den Permission-Regeln, auch gegen `allow` (code.claude.com/docs/en/permissions).
- Pfadregeln: `Edit(/docs/**)` = relativ zum Projektroot (Ort der Settings-Datei); `ask` hat Vorrang vor `allow`.
- Neue Subagent-Dateien in `.claude/agents/` sind erst in einer neuen Sitzung als `subagent_type` verfügbar.

## Hosting
- Live: https://triseck01.github.io/twilight-timer/ (Pages-Quelle „GitHub Actions“, erster Deploy 2026-11-06, `ad38a44`).
- Git-Push über HTTPS mit repo-lokalem Credential-Helper `!gh auth git-credential` (kein SSH-Key vorhanden; Schlüsselbund hatte veralteten Zugang). Push von Workflow-Dateien braucht den `gh`-Scope `workflow`.
- CI-Hinweise: macOS-arm64-Runner können länger in der Warteschlange stehen; `ubuntu-latest` wechselt ab 2026-10-19 auf Ubuntu 26.
- GitHub Pages erlaubt keine eigenen HTTP-Header → CSP nur per `<meta>`.
- Repo muss bei kostenlosem Konto öffentlich sein.
