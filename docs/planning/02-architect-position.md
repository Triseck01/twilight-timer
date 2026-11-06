# 02 – Positionspapier Claude-Code-Architekt (Runde 1)

Stand: 2026-11-06 · Rolle: claude-code-architect · Status: Diskussionsgrundlage, nichts umgesetzt
Kennzeichnung: **[V: Quelle]** verifiziert · **[A]** Annahme/Empfehlung · **[U]** Nutzerentscheidung nötig

---

## 0. Verifizierte Ausgangslage (Fakten, die den Plan prägen)

| Fakt | Beleg |
|---|---|
| Aktuelles LTS: **Node 26.13.0 „Lithium“**; Node 24 „Krypton“ und Node 22 „Jod“ noch LTS; Node 25 ist eine ungerade Linie (kein LTS) | [V: nodejs.org/dist/index.json, 2026-11-06] |
| **Angular latest = 22.2.x** (`@angular/core` 22.2.4, CLI 22.2.6); 23 noch nicht erschienen (nur `next` 22.3) | [V: `npm view @angular/core dist-tags`] |
| Angular-CLI 22 `engines.node`: `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` → **die lokale Node 25.3.0 ist NICHT unterstützt** | [V: `npm view @angular/cli@22 engines`] |
| Angular: Vitest seit v21 Default-Testrunner, zoneless Default, Signal Forms experimentell | [V: infoq.com/news/2025/11/angular-21-released; `@angular/build` peerDeps vitest ^4 \|\| ^5] |
| **Corepack wird ab Node 25 nicht mehr mitgeliefert**; npm bleibt gebündelt | [V: nodejs.org/docs/latest/api/corepack.html] |
| Volta ist seit 2025-11 unmaintained, empfiehlt mise | [V: lilting.ch/en/articles/volta-discontinued-migration-guide] |
| Turborepo 2.11.x; offizielles npm-Beispiel nutzt `devEngines.packageManager` + `workspaces: ["apps/*","packages/*"]`, `turbo` als root-devDependency, Lockfile im Root Pflicht | [V: turborepo.dev/docs/crafting-your-repository/structuring-a-repository; `npm view turbo`] |
| CLAUDE.md: Root lädt beim Start, **Unterordner-CLAUDE.md lädt on demand**, `@import` (max. 4 Hops, relativ zur Datei), Ziel **< 200 Zeilen**; `.claude/rules/*.md` mit `paths:`-Frontmatter lädt nur bei passenden Dateien; Imports sparen **keinen** Kontext | [V: code.claude.com/docs/en/memory] |
| AGENTS.md wird **nur** gelesen, wenn kein CLAUDE.md existiert – sonst explizit per `@AGENTS.md` importieren | [V: code.claude.com/docs/en/memory#agents-md] |
| Permissions: Reihenfolge deny → ask → allow; Bash-Regeln splitten `&&`, `;`, `\|`; **deny ist keine Sicherheitsgrenze** (andere Aufrufformen rutschen durch) → für harte Sperren PreToolUse-Hook | [V: code.claude.com/docs/en/permissions] |
| Hooks: `PreToolUse` blockiert per Exit 2 (stderr = Grund) oder JSON `permissionDecision: "deny"`; Feld `if: "Bash(ng serve*)"`; `${CLAUDE_PROJECT_DIR}` | [V: code.claude.com/docs/en/hooks] |
| Skills = `.claude/skills/<name>/SKILL.md`, ersetzen `.claude/commands/`; Frontmatter `disable-model-invocation`, `allowed-tools`, `context: fork`, `$ARGUMENTS` | [V: code.claude.com/docs/en/skills] |

**Konsequenz:** Wir pinnen **Node 26 LTS**, nicht 25. Ohne Toolchain-Pinning bricht `ng` auf genau dieser Maschine.

**Nutzerklärungen (eingearbeitet):** Konzept §7.1 nicht bindend · Backend nur, wenn nötig – „kein Backend“ ist zulässiges Ergebnis, Layout darf keins voraussetzen · Entwicklungsrechner = **dieser Mac**, Zielgerät = iPad (Safari/PWA); Windows nicht erforderlich · TDD-Gate (AC → Freigabe → rote Tests → Code) **bestätigt**.

---

## 1. Monorepo, Paketmanager, Bootstrap

### 1.1 Layout [A]
```
twilight-timer/
├─ apps/
│  ├─ web/            Angular 22 PWA (@angular/service-worker), das eigentliche Produkt
│  └─ (api/)          existiert NICHT; Workspace-Glob `apps/*` lässt Platz, Anlage nur per ADR (§7)
├─ packages/
│  ├─ domain/         reines TypeScript, KEIN Angular/DOM: time, order, stateMachine,
│  │                  history, config, cards  ← der Anker des Systems (Konzept §7.2)
│  └─ config/         geteilte tsconfig/eslint/prettier-Basis (optional, erst bei 2. Konsument)
├─ docs/  .claude/  scripts/  .github/
├─ CLAUDE.md  AGENTS.md  AGENT.md  BRAIN.md  README.md  CHANGELOG.md
├─ package.json  package-lock.json  turbo.json  mise.toml  .node-version  .gitattributes
```
- `packages/domain` als **Just-in-Time-Package** (`exports` → `.ts`), keine Barrels, kein `../` über Paketgrenzen [V: Turborepo-Doku]. Er hat **null Abhängigkeiten nach außen** → kleiner Blast-Radius, schnell testbar, framework-austauschbar.
- `.gitattributes` mit `* text=auto eol=lf` – billige Versicherung, falls später doch Windows dazukommt [A].
- Kein Code im Repo setzt ein Backend voraus: Domain und Web kennen nur ein `StoragePort` (localStorage-Adapter); ein künftiger Sync wäre ein weiterer Adapter.

### 1.2 Paketmanager: **npm** (Empfehlung) [A]
- npm ist mit Node gebündelt [V]; pnpm bräuchte ohne Corepack einen zusätzlichen Installschritt [V: Corepack-Entfernung]. Für ein 2–3-Paket-Repo sind pnpm-Vorteile (Disk, Strictness) marginal.
- Pinning-Schichten (jede hat eine Aufgabe, keine Dopplung):
  - `.node-version` = `26` → gelesen von mise, fnm, GitHub `setup-node` (`node-version-file`) [A: mise/fnm lesen `.node-version`; setup-node verifiziert in der Praxis].
  - `mise.toml` `[tools] node = "26"` → Single Source für den Bootstrap.
  - `package.json` `engines.node: ">=26 <27"` + `devEngines.runtime`/`devEngines.packageManager {name:"npm", onFail:"error"}` → harter Fehler bei falscher Toolchain (npm ≥ 10.9 kennt devEngines, `download` nicht) [V: zenn.dev-Artikel, Turborepo-Beispiel; Detailverhalten A].
  - `packageManager: "npm@11.x"` zusätzlich, weil ältere Turbo-Versionen ihn für npm-Workspaces verlangten [A, vom Engineer gegen Turbo 2.11 prüfen].

### 1.3 Bootstrap ohne npm/Docker (Ziel: macOS) [A]
Ein Befehl, idempotent, im README ganz oben:
- **macOS:** `./scripts/bootstrap.sh` (POSIX-sh, braucht nur curl) → installiert mise falls fehlend (`curl https://mise.run | sh`, alternativ `brew install mise`), aktiviert es für die Shell, `mise install` (Node 26 + gebündeltes npm) → `npm ci` → `npm run doctor`.
- Auf diesem Mac konkret: mise neben der vorhandenen Node 25.3 installieren; mise setzt im Repo-Ordner Node 26 per PATH, globale Installation bleibt unberührt.
- `npm run doctor` = `node scripts/doctor.mjs`: prüft Node-/npm-Version, Lockfile, mise-Aktivierung, gibt konkrete Fixes aus.
- **Fallback ohne mise:** fnm (`brew install fnm`) [A], liest dieselbe `.node-version`.
- **Windows:** nicht erforderlich; da mise auch Windows kann, genügt später ein `bootstrap.ps1` ohne Strukturänderung.
- **Optional:** `.devcontainer/devcontainer.json` (Node-26-Image) für Docker-Nutzer/Codespaces – nie Voraussetzung.
- Claude führt Bootstrap **nicht** selbst aus (installiert Software global) → nur Befehle nennen.

---

## 2. CLAUDE.md-Hierarchie und Gedächtnis

### 2.1 Wer trägt was – eine Quelle pro Fakt [A]
| Datei | Zweck | Geladen | Budget |
|---|---|---|---|
| `AGENTS.md` | **Tool-neutrale Projektanleitung:** Befehle, Layout, Konventionen, DoD | via `@AGENTS.md` aus CLAUDE.md | ≤ 120 Z. |
| `AGENT.md` | **Verhalten des Agenten:** Topologie zuerst, TDD-Gate, nie Dev-Server, High-Signal-Fragen, Stay-in-lane, Token-Disziplin, Security = reale Bedrohungen | via `@AGENT.md` | ≤ 60 Z. |
| `BRAIN.md` | **Semantisches Gedächtnis:** Topologie-Karte (Anker/Brücken/Blast-Radius), Glossar DE/EN, gelernte Fakten mit Datum+Beleg, Verweise auf ADRs | via `@BRAIN.md` | ≤ 120 Z., Rest in `docs/` |
| `CLAUDE.md` (Root) | nur Imports + Claude-spezifisches (Skills, Subagents, Hooks, „aktueller Meilenstein → docs/milestones/STATUS.md“) | Start | ≤ 40 Z. |
| `packages/domain/CLAUDE.md` | Invarianten der Logik; `@../../docs/domain/rules.md` + `@../../docs/domain/time-model.md` | on demand | ≤ 60 Z. + Importe |
| `apps/web/CLAUDE.md` | Angular-Regeln (standalone, Signals, zoneless, OnPush, `@if/@for`, inject(), Vitest/TestBed), iPad-Eigenheiten §7.4 | on demand | ≤ 80 Z. |
| (`apps/api/CLAUDE.md`) | nur falls je ein Backend per ADR entsteht | on demand | – |
| `docs/adr/NNNN-*.md` | Begründete Entscheidungen (MADR-Format), unveränderlich, nur „superseded by“ | nie automatisch | – |

- **Domänenregeln §3/§4** werden einmalig nach `docs/domain/rules.md` / `time-model.md` extrahiert (mit [Q]/[W]/[A]/[OFFEN] aus dem Konzept) und **nur** im Domain-Paket importiert → kein Kontextverbrauch bei UI-Arbeit, trotzdem immer da, wenn Logik berührt wird [V: on-demand-Loading]. Zusätzlich `.claude/rules/domain.md` mit `paths: ["packages/domain/**","apps/web/src/app/game/**"]`, der nur auf diese Dokumente verweist.
- Angular-Best-Practices: Angular CLI kann AI-Konfiguration erzeugen (`ng new … --ai-config=claude`) [A: Flag vom Engineer verifizieren]; Inhalt in `apps/web/CLAUDE.md` übernehmen statt im Root.
- Konzept wandert nach `docs/concept/ti4-timer-konzept-v2.md`, eingefroren; ADR-0001 markiert §7.1/§7.2/§12 als überholt.
- **Duplikatregel:** CLAUDE/AGENTS/BRAIN verlinken, sie kopieren nie Inhalte aus ADRs oder `docs/domain`. `/doctor prompt-audit` periodisch auf Widersprüche [V: memory-Doku].
- Risiko Namenskollision **AGENT.md vs. AGENTS.md** (verwechselbar für Mensch und Modell) → [U] Q5.

### 2.2 BRAIN.md-Struktur [A]
`## Topologie` (Anker: `packages/domain/src/state-machine.ts`; Brücken: `GameStore` (Signals) ↔ domain; Persistenz-Adapter) · `## Invarianten` (Zeit nur per Zeitstempel; Sekundär = Uhr steht; Undo setzt Uhr neu) · `## Gelernt` (Datum, Fakt, Beleg, Ort) · `## Offene Fragen` (Link Konzept §11). Einträge > 3 Zeilen → nach `docs/` auslagern, Link zurücklassen.

---

## 3. `.claude/`-Setup

### 3.1 `settings.json` (versioniert) – Skizze [A, Syntax V]
```jsonc
{
  "permissions": {
    "allow": ["Bash(npm test*)", "Bash(npm run test*)", "Bash(npm run lint*)",
              "Bash(npm run typecheck*)", "Bash(npm run build*)", "Bash(npm run verify*)",
              "Bash(npm run doctor)", "Bash(npx turbo run test *)", "Bash(npx turbo run lint *)",
              "Bash(npx turbo run build *)", "Bash(npx ng test *)", "Bash(npx ng generate *)",
              "Bash(git status*)", "Bash(git diff*)", "Bash(git log*)"],
    "ask":   ["Bash(npm install *)", "Bash(npm i *)", "Bash(npm uninstall *)", "Bash(npx ng update *)",
              "Bash(git commit *)", "Bash(git push *)", "Bash(gh *)"],
    "deny":  ["Bash(npm run dev*)", "Bash(npm start*)", "Bash(npm run start*)", "Bash(npm run serve*)",
              "Bash(npm run preview*)", "Bash(ng serve*)", "Bash(npx ng serve*)", "Bash(npx ng s *)",
              "Bash(turbo dev*)", "Bash(turbo run dev*)", "Bash(npx turbo dev*)", "Bash(npx turbo run dev*)",
              "Bash(npx vite*)", "Bash(npx http-server*)", "Bash(npx serve*)", "Bash(node --watch*)",
              "Bash(docker compose up*)", "Read(./.env)", "Read(./.env.*)"]
  }
}
```
### 3.2 Hooks – alle als Node-Skripte (`.mjs`): kein `jq` nötig, testbar mit `node --test`, plattformneutral [A]
| Event | Matcher/`if` | Skript | Wirkung |
|---|---|---|---|
| PreToolUse | `Bash` | `block-dev-server.mjs` | Regex auf `tool_input.command` (serve/dev/watch/preview/start, auch via `npm --prefix`, `turbo … --filter`), Exit 2 + „Nur Befehl nennen: `npm run dev:web`“. Doppelte Sicherung, weil deny keine Grenze ist [V]. |
| PreToolUse | `Edit\|Write` | `tdd-gate.mjs` | Edit an Produktionscode (`apps/**/src/**`, `packages/**/src/**`, nicht `*.spec.ts`) nur, wenn `docs/milestones/STATUS.md` einen aktiven Meilenstein mit `AC: freigegeben` und `Phase: green\|refactor` führt; sonst Block (Exit 2) mit Hinweis auf `/ac` bzw. `/tdd`. Setzt das vom User bestätigte TDD-Gate technisch durch; Ausnahme-Pfade (Config, Doku, Scaffolding in M0a) per Allowlist im Skript. |
| PostToolUse | `Edit\|Write` | `format-file.mjs` | Prettier + `eslint --fix` nur auf die geänderte Datei (schnell, kein Typecheck). |
| Stop | – | `verify-hint.mjs` | Wenn Code geändert: `turbo run typecheck test --affected` [A: Flag prüfen]; Fehler → Rückmeldung an Claude. Zusätzlich Hinweis, falls `src/` geändert, aber weder `BRAIN.md`, `docs/` noch `CHANGELOG.md` (Doku-Anreicherung). Nicht blockierend. |
| SessionStart | – | `session-context.mjs` | Gibt aktuellen Meilenstein, `git status -s`, Node-Version-Abgleich aus → Strukturgedächtnis statt Chat-Gedächtnis. |

### 3.3 Subagents (`.claude/agents/`, max. 4) [A]
- **behalten:** `software-engineer` (Implementierung), `claude-code-architect` (nur Struktur/Prozess, kein Produktcode).
- **neu:** `ti4-rules-expert` – nur Read/Grep/WebFetch, Quelle `docs/domain/*` + LRR, antwortet mit [Q]/[W]/[A]; schreibt nie Code. `test-author` – leitet aus freigegebenen AC fehlschlagende Tests ab (nur `*.spec.ts`, `e2e/**`), kennt AC-IDs; trennt „Test schreiben“ vom „Grünmachen“ (Anti-Self-Grading).
- **nicht:** eigener Reviewer → eingebautes `/code-review` nutzen.

### 3.4 Skills (`.claude/skills/<name>/SKILL.md`) [A, Format V]
| Skill | Invocation | Zweck |
|---|---|---|
| `/milestone [Mx\|status]` | nur User | Scope aus `docs/milestones/Mx.md` laden, STATUS setzen, nächsten Schritt nennen |
| `/ac Mx` | nur User | Akzeptanzkriterien (Given/When/Then, IDs `AC-M1-07`) entwerfen, **stoppen** und Freigabe einholen |
| `/tdd AC-ID…` | User + Modell | Red → (Test-Commit) → Green → Refactor; Gate-Status in STATUS.md pflegen |
| `/adr "Titel"` | User + Modell | ADR aus Template, Index aktualisieren, BRAIN-Einzeiler |
| `/learn` | User + Modell | Erkenntnis an die *richtige* Stelle (Tabelle §6) schreiben |
| `/handoff` | nur User | Sitzungsende: STATUS, BRAIN „Gelernt“, CHANGELOG-Unreleased, offene Fragen |
| `/dev-commands` | User + Modell | gibt die korrekten Start-Befehle aus (statt sie auszuführen) |

---

## 4. Meilenstein-Workflow (Konzept §8 auf neuen Stack)

**Schleife je Meilenstein:** `/milestone Mx` → `/ac Mx` → **User-Freigabe** (Zeile `AC: freigegeben YYYY-MM-DD` in `docs/milestones/Mx.md`) → `test-author`: rote Tests, Commit `test(Mx): red AC-…` → `/tdd` Green → Refactor → `/handoff` + Doku → **Abnahme-Gate** → Tag `mx-done`, CHANGELOG-Eintrag.
Globales Gate jedes Meilensteins: `npm run verify` (= `turbo run lint typecheck test build`) grün lokal auf dem Mac **und** in CI (`ubuntu-latest`).

| M | Ort | Testart | Abnahme-Gate (zusätzlich zu verify) |
|---|---|---|---|
| **M0a** Repo & Toolchain | Root, scripts, .claude, docs, CI | Smoke-Test `doctor`, Hook-Tests (Node-Skripte mit `node --test`) | Frischer Clone auf dem Mac (ohne vorinstalliertes Node 26): Bootstrap → `npm run verify` grün; Hook blockt `ng serve` nachweislich; ADR-0001…0004 vorhanden |
| **M0b** PWA-Gerüst & Deploy | apps/web, .github | Vitest (App-Shell), Lighthouse-/Manifest-Check in CI | URL per HTTPS am iPad aufrufbar, „Zum Home-Bildschirm“, startet offline leer |
| M1 Kernlogik | packages/domain | Vitest Unit (+ optional fast-check Property-Tests für Bank-Invariante „Gesamt ≤ Startbank + Züge × Zugzeit“) | Alle M1-Kriterien aus §8 als benannte Tests |
| M2 Einstellungen/Neues Spiel | apps/web | Komponenten-Tests + Playwright (WebKit) | 5-Spieler-Spiel anlegbar, Reload behält Settings |
| M3 Strategie | domain + web | Unit + e2e | Runde 2 beginnt beim Sprecher |
| M4 Aktion | web | e2e komplette Phase | 5 Spieler ohne Blockade inkl. Sekundär |
| M5 Status/Agenda | domain + web | Unit + e2e | Rundenzyklus, Abstimmungsreihenfolge |
| M6 Eingriffe | domain + web | Unit je Eingriff × Undo | jeder Eingriff undo-bar |
| M7 Persistenz | web (Storage-Adapter) | Unit mit Fake-Clock, e2e Reload | Reload mitten im Zug korrekt |
| M8 Warnungen/Ton/Wake Lock | web/platform | Unit (Schwellen), **manuelle Geräteliste** | iPad: Ton + 15 min Display an |
| M9 Gerätetest/1.0 | – | manuelle Checkliste `docs/runbooks/ipad-test.md` | Liste abgehakt, Tag `v1.0.0` |

Hinweis: `@angular/service-worker` (ngsw) übernimmt Cache-Versionierung per Build-Hash → Konzept-Risiko „Cache-Version erhöhen“ entfällt weitgehend; `SwUpdate` liefert den Update-Hinweis [A].

---

## 5. Deployment
- **Artefakt = statischer Build** `apps/web/dist/web/browser`. Läuft auf jedem HTTPS-Static-Host; das ist die Basis für „lokal immer lauffähig“.
- **Stufe 1 (empfohlen für v1):** GitHub Actions → GitHub Pages (`--base-href /twilight-timer/`), kostenlos, HTTPS; erfordert öffentliches Repo [Konzept §12].
- **Stufe 2 (externer Server):** `Dockerfile` multi-stage (Node 26 build → schlankes Serve-Image, z. B. Caddy für Auto-HTTPS + CSP-Header; **kein Node zur Laufzeit nötig**), Image nach GHCR bei Tag `v*`; Server zieht per `docker compose pull && up -d`. Docker **nur** in CI/Server, nie lokal nötig. Alternative ohne Docker: `rsync` des Builds in ein beliebiges Webroot.
- **CI-Workflows:** `ci.yml` (PR/Push: `ubuntu-latest`, `setup-node` mit `node-version-file: .node-version`, `npm ci`, `turbo run verify`, Playwright WebKit), `deploy-pages.yml` (main), `release-image.yml` (Tag). Turbo-Cache lokal; Remote-Cache unnötig.
- **iPad-Lokaltest vom Mac:** LAN-IP ist kein Secure Context → kein SW/Wake Lock. Optionen: Preview-Deploy (Pages) oder `ng serve --ssl` mit mkcert-Root-Zertifikat auf dem iPad [A]; Debugging per Safari-Web-Inspector über Kabel (Mac ist jetzt Hauptrechner, kein eruda-Umweg nötig). In `docs/runbooks/ipad-debug.md`.
- Security-Posture (reale Bedrohungen): keine Secrets, keine Nutzerdaten-Server, CSP-Header am Server, Dependabot + `npm audit --omit=dev` in CI; kein Auth-Overengineering.

---

## 6. Dokumentationssatz und „Doku immer anreichern“
| Ort | Inhalt |
|---|---|
| `README.md` | Was, Bootstrap (3 Befehle/OS), Dev-Befehle (vom User auszuführen), Deploy-Kurzfassung |
| `docs/concept/` | eingefrorenes Konzept v2 |
| `docs/domain/` | rules.md, time-model.md, glossary.md (DE/EN-Kartennamen) |
| `docs/architecture/overview.md` | Topologie-Diagramm (Mermaid), Datenfluss Domain ↔ Store ↔ UI, Blast-Radius-Tabelle |
| `docs/adr/` | 0001 Stack (Angular+Node statt Vanilla), 0002 npm+mise/Node 26, 0003 Domain als framework-freies Paket, 0004 Deploy-Pfad, 0005 TDD-Gate-Mechanik |
| `docs/milestones/` | STATUS.md (aktiv, Phase, AC-Status) + M0…M9.md (Scope, AC, Abnahme) |
| `docs/runbooks/` | local-dev.md (mise-Aktivierung, Node-25-Falle), deploy.md, ipad-debug.md, ipad-test.md |
| `docs/planning/` | diese Diskussionspapiere |
| `CHANGELOG.md` | Keep a Changelog, ein Eintrag pro Meilenstein |

**Anreicherungsregel (in AGENT.md, durchgesetzt):** Definition of Done = Tests grün **+** Doku-Delta. Neue Erkenntnis → `/learn` entscheidet den Ort nach Tabelle oben (Fakt über Code → BRAIN „Gelernt“; Entscheidung → ADR; Regelklärung → docs/domain; Bedienung → runbooks). Stop-Hook erinnert, `/handoff` erzwingt am Sitzungsende.

---

## 7. Haltung zu Node + Angular
- **Angular: akzeptabel, mit Gewinn für die KI-Arbeit.** Opinionated (CLI-Schematics, Style-Guide, eine Art pro Problem) = weniger Entscheidungen, stabile Konventionen über Sitzungen; ngsw löst PWA-Caching besser als handgebauter SW; Vitest/zoneless/Signals passen zum Zeitstempel-Modell. Kosten: Build-Schritt, 6-Monats-Major-Takt (Angular 23 vermutlich in Kürze [A]), größeres Bundle (für iPad irrelevant).
- **Node-Backend: für v1 nicht begründet → kein Backend.** Funktionsprüfung gegen Konzept §1–§8: Zeitrechnung, Reihenfolgen, Undo, Persistenz (localStorage), JSON-Export/-Import, Ton, Wake Lock, Offline – **alles clientseitig**; der Offline-Zwang (iPad am Spieltisch ohne Netz) verbietet sogar Server-Abhängigkeit im Spielpfad. Ein Backend brächte Angriffsfläche, Betrieb und Testaufwand ohne Nutzerwert (YAGNI). Node bleibt **Toolchain** (Angular CLI, Turbo, Vitest, Hooks, Skripte). Ein Backend würde erst sinnvoll bei: Sync zwischen Geräten, Statistik teilen, zweitem Bildschirm/Live-Ansicht – dann `apps/api` per ADR, Framework-Wahl erst dann.
- **Turborepo ohne Backend:** bleibt sinnvoll, weil `packages/domain` und `apps/web` getrennte Pakete mit eigenem Test-/Build-Graph sind; Overhead gering. (Ohne Backend wäre auch ein Einzelprojekt vertretbar – User wünscht Monorepo, daher beibehalten.)
- **Schutz vor Fehlentscheidung:** Weil `packages/domain` framework-frei ist, ist der Frontend-Stack später austauschbar; das ist der eigentliche Architekturanker.

---

## 8. Offene Fragen an den User (max. 6)
1. **Kein Backend in v1 bestätigen?** Empfehlung: ja; `apps/api` nur per ADR, wenn Sync/Live-Ansicht gewünscht wird. Ist eins dieser Features für v1.x geplant?
2. **Hosting v1:** GitHub Pages (öffentliches Repo) und Docker/Static-Server später [Empfehlung] – oder direkt externer Server? Wenn ja: welcher (VPS/Domain/HTTPS-Anbieter)?
3. **Toolchain:** Node 26 LTS pinnen und auf diesem Mac per **mise** bereitstellen (die installierte 25.3 wird von Angular 22 abgelehnt) – einverstanden? npm statt pnpm ok?
4. **Angular-Version:** Start auf 22.2 (stabil heute) und 23 als eigener Chore per `ng update` – oder auf 23 warten?
5. **Dateinamen & Sichtbarkeit:** `AGENT.md` neben `AGENTS.md` behalten oder umbenennen (z. B. `docs/agent/CONDUCT.md`)? Dürfen `BRAIN.md`/Planungsdocs in einem **öffentlichen** Repo liegen?
6. **TDD-Gate-Mechanik:** Gate ist bestätigt; soll der Hook Produktionscode-Edits ohne freigegebene AC **hart blockieren** [Empfehlung] oder nur warnen? Und gilt M0a (Scaffolding/Config) als Ausnahme?

---
Quellen: code.claude.com/docs/en/{memory,hooks,skills,permissions} · nodejs.org/dist/index.json · nodejs.org/docs/latest/api/corepack.html · turborepo.dev/docs/crafting-your-repository/structuring-a-repository · infoq.com/news/2025/11/angular-21-released · lilting.ch/en/articles/volta-discontinued-migration-guide · zenn.dev/ryo_manba/articles/devengines-runtime-management · npm registry (`npm view`, 2026-11-06)
