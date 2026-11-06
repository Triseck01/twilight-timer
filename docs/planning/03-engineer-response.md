# 03 – Antwort Software Engineer auf das Architekten-Papier (Runde 2)

Stand: 2026-11-06 · Bezug: `02-architect-position.md`, `01-engineer-position.md`
Kennzeichnung: **[V: Quelle]** verifiziert · **[A]** Annahme · **[U]** Nutzerentscheidung

---

## (a) Zustimmung

- Kein Backend in v1; `apps/*`-Glob lässt Platz, `apps/api` nur per ADR (§7). Deckt sich mit 01 §1.
- `packages/domain` framework-frei, null Abhängigkeiten, `StoragePort` als einzige Brücke zur Persistenz.
- npm statt pnpm; Node 26 LTS via mise + `.node-version`; `engines` + `engine-strict`.
- Bootstrap-Skript + `npm run doctor`; Claude führt Bootstrap nie selbst aus.
- Domänenregeln nach `docs/domain/*` extrahieren, nur im Domain-Kontext laden (on-demand-Loading [V: code.claude.com/docs/en/memory]).
- `block-dev-server`-Hook zusätzlich zu `deny`, weil `deny` keine Sicherheitsgrenze ist [V: code.claude.com/docs/en/permissions].
- Hooks als `.mjs` mit `node --test`: laufen vor `npm ci`, keine Abhängigkeit – gute Ausnahme vom Vitest-Standard.
- `ti4-rules-expert` als Read-only-Subagent; kein eigener Reviewer (eingebautes `/code-review`).
- ADRs (MADR) + eingefrorenes Konzept unter `docs/concept/`, ADR-0001 markiert §7.1/§7.2/§12 als überholt.
- ngsw übernimmt Cache-Versionierung; `SwUpdate` für Update-Hinweis.
- `.gitattributes eol=lf`; CI auf `ubuntu-latest` mit `node-version-file`.
- `--ai-config=claude` existiert seit CLI v20.2 [V: v21.angular.dev/cli/new]; erzeugt laut Community-Artikel `.claude/CLAUDE.md` [A] → Inhalt nach `apps/web/CLAUDE.md` übernehmen, wie vorgeschlagen.

## (b) Widerspruch, Risiken, Gegenvorschläge

**B1 Faktenkorrekturen**
- „Signal Forms experimentell“ – in **v22 stabil** [V: infoq.com/news/2026/08/angular-v22-released]. Für Einstellungen/„Neues Spiel“ nutzen.
- „Angular 23 vermutlich in Kürze“ – laut Release-Plan **~Juni 2027**; v22 ist Active bis 2027-06, LTS bis 2028-06 [V: angular.dev/reference/releases]. Frage 4 („auf 23 warten?“) entfällt.
- Node 24 ist seit 2026-10-20 nur noch Maintenance-LTS [V: nodejs/Release schedule.json] – für die Pin-Entscheidung irrelevant, aber in BRAIN korrekt festhalten.
- `packageManager` vs. `devEngines.packageManager` in Turbo 2.11 und `turbo run --affected` [A] → beide in M0a mit einem roten Smoke-Test belegen, nicht annehmen.

**B2 Just-in-Time-Package (`exports` → `.ts`)** – Für Vitest unkritisch. Ob `@angular/build` (esbuild) rohe `.ts` aus einem per Symlink eingebundenen Workspace-Paket sauber kompiliert und typprüft, ist unbelegt [A]. Gegenvorschlag: M0a-Spike mit Akzeptanzkriterium „`apps/web` importiert eine Funktion aus `@tt/domain`, `ng build` + `ng test` grün“; Fallback = `tsc`-Build des Pakets mit `dependsOn: ["^build"]`.

**B3 TDD-Gate-Hook – überkonstruiert und umgehbar**
- Der Hook liest `STATUS.md` mit `Phase: green|refactor`. Diese Datei pflegt **der Agent selbst** (via `/tdd`) → er kann sich das Gate selbst öffnen. Das ist Zustandsverwaltung, keine Kontrolle.
- Die Phase „red“ wird nicht geprüft (es wird nicht verifiziert, dass Tests existieren und fehlschlagen); dafür blockiert der Hook legitime Edits (Refactor zwischen Meilensteinen, Bugfix, Typ-Anpassung) → Reibung, Ausnahmelisten wachsen.
- **Gegenvorschlag (2 Bausteine, ohne Phasen-Zustand):**
  1. **Freigabe-Gate (Hook, hart):** Produktionscode-Edit nur, wenn die aktive `docs/milestones/Mx.md` die Zeile `AC: freigegeben YYYY-MM-DD` enthält. Diese Zeile darf nur der Nutzer setzen: `Edit(docs/milestones/**)` in `permissions.ask` → jede Änderung braucht seine Bestätigung im Permission-Dialog (das ist die echte Grenze, nicht eine Datei).
  2. **Red-before-green-Nachweis (CI/`verify`, nicht Hook):** Skript `tdd-check.mjs` prüft (a) jede AC-ID aus `Mx.md` kommt in mindestens einem `*.spec.ts`/`e2e`-Test vor, (b) in der Git-Historie liegt je AC ein Commit `test(Mx): red AC-…` vor dem ersten `feat`-Commit. Prüfbar, deterministisch, nicht vom Agenten fälschbar ohne sichtbare Historie.
- Scaffolding in M0a: Gate gilt erst ab M1 (`STATUS.md` hat keine aktive M ≥ 1 → Hook passiert).

**B4 Anzahl Hooks/Skills/Subagents vs. Token- und Wartungskosten**
- 5 Hooks + 7 Skills + 4 Subagents + 4 Root-Dateien sind ein zweites Produkt, das gewartet und getestet werden muss, bevor eine Sekunde Spiellogik existiert.
- Hooks: **behalten** `block-dev-server`, Freigabe-Gate (B3), `SessionStart` (nur 3 Zeilen: Meilenstein, Node-Version, `git status -s`). **Streichen** `Stop → turbo typecheck test`: läuft bei jedem Stop, kostet Minuten und Tokens bei jeder Rückfrage; `npm run verify` gehört in die DoD/den `/tdd`-Skill. **Abspecken** `PostToolUse`: nur Prettier auf die Datei; `eslint --fix` mit Type-Info pro Edit ist langsam [A] und gehört in `verify`.
- Skills: **3 statt 7** – `/ac` (stoppt für Freigabe), `/tdd` (Red→Green→Refactor inkl. verify), `/handoff` (enthält `/learn` + CHANGELOG + STATUS). `/milestone` geht in `/ac` auf; `/adr` = Template-Datei in `docs/adr/0000-template.md`; `/dev-commands` = README-Abschnitt (statischer Text braucht keinen Skill).
- Subagents: **3 statt 4** (siehe B5). Weitere Skills/Agents erst, wenn ein konkreter Schmerz zweimal aufgetreten ist (in BRAIN „Gelernt“ belegt).

**B5 `test-author`-Trennung**
- Nutzen (Anti-Self-Grading) ist real, aber begrenzt: gleiches Modell, gleiche Kontextquellen; die Übergabe verliert Details (Uhr-Injektion, Fixtures), und der Implementierer liest die Tests ohnehin.
- Die eigentliche unabhängige Instanz ist **der Nutzer**, der AC freigibt, plus der in B3 erzwungene rote Commit.
- Gegenvorschlag: kein dauerhafter `test-author`. Stattdessen im `/tdd`-Skill: Tests werden in einem **eigenen Schritt** geschrieben, rot committet, und die Liste „AC-ID → Testname“ wird dem Nutzer vor „Green“ gezeigt. Optional für M1 (höchste Fachrisiken: Zeitmodell, Undo) einmalig einen Fork als Gegenleser der Tests einsetzen.

**B6 AGENT.md / AGENTS.md / BRAIN.md**
- Der Architekt belegt selbst: Imports sparen keinen Kontext [V: memory-Doku]. CLAUDE (40) + AGENTS (120) + AGENT (60) + BRAIN (120) = **bis 340 Zeilen beim Start**, über dem eigenen Ziel < 200.
- `AGENT.md` vs. `AGENTS.md` sind für Mensch und Modell verwechselbar; `AGENTS.md` wird von Claude Code nur ohne CLAUDE.md gelesen [V] – es gibt heute kein zweites Tool, das es braucht (YAGNI).
- Gegenvorschlag: **`CLAUDE.md` (≤ 150 Z.)** = Befehle, Layout, Verhaltensregeln, TDD-Gate, DoD; **`BRAIN.md` (≤ 80 Z., importiert)** = Topologie, Invarianten, „Gelernt“ (Einträge > 3 Z. → `docs/`); Paket-CLAUDE.md on demand. `AGENTS.md` erst, wenn ein zweites KI-Tool genutzt wird (dann Inhalt aus CLAUDE.md verschieben und dort importieren). Kein `AGENT.md`.

**B7 M0a/M0b-Split** – Split richtig, M0a zu schwer (Toolchain + CI + 5 Hooks + 7 Skills + 4 Agents + ADR-0001…0004 + Doku-Satz). Gegenvorschlag:
- **M0a:** Toolchain (mise, npm-Workspaces, Turbo), leeres `packages/domain` mit 1 Test, `apps/web` per `ng new` (zoneless, `--ssr=false`, Vitest), Import-Spike B2, CI `verify`, `block-dev-server`-Hook + Test, CLAUDE.md/BRAIN.md, ADR-0001/0002. Abnahme wie vorgeschlagen (frischer Clone → `verify` grün; Hook blockt `ng serve`).
- **M0b:** `@angular/pwa`, Deploy, iPad-Abnahme.
- **Erst mit M1:** `/ac`, `/tdd`, Freigabe-Gate, `tdd-check`, `ti4-rules-expert`, `docs/domain/*`.

**B8 Deployment: Caddy-Image + GHCR** – Für ein rein statisches Verzeichnis überdimensioniert: Registry, Container-Runtime auf dem Server, Base-Image-Patching (zusätzliche Supply-Chain-Fläche), `compose pull/up` – alles, um Dateien auszuliefern.
- Gegenvorschlag Stufe 2: Caddy nativ auf dem Server, `deploy/Caddyfile` versioniert (CSP, HSTS, `Permissions-Policy`, no-cache für `index.html`/`ngsw.json`, immutable für Hash-Bundles, SPA-Fallback); GitHub Action `rsync` des Builds mit eingeschränktem Deploy-Key (nur Webroot, `command=`-restricted). Docker-Image **nur**, wenn der Server bereits einen Container-Stack betreibt [U, Frage 2].
- Stufe 1 GitHub Pages: einverstanden, aber Einschränkung dokumentieren: **keine eigenen Response-Header** → CSP nur per `<meta>` (ohne `frame-ancestors`), kein Einfluss auf Cache-Header von `ngsw.json` [A: Pages-Standardcaching ~10 min]. Zwei Base-Hrefs (`/twilight-timer/` vs. `/`) als zwei Build-Konfigurationen, SW-Scope je Ziel testen.
- `ng serve --ssl` + mkcert-Root auf dem iPad: plausibel [A], aber Profil-Installation + manuelle Vertrauensfreigabe am iPad nötig; Preview-Deploy ist robuster.

**B9 fast-check „optional“** – Widerspruch: Die Bank-, Undo- und Reload-Invarianten (01 §4, 9 Stück) sind genau die Fehler, die Beispiel-Tests übersehen (Randzeiten, Pausen an beliebigen Stellen). Für M1 **Pflicht**, nicht optional.

## (c) Undo: Event-Log vs. Snapshots

Das Architekten-Papier legt sich nicht fest (`history.ts`, BRAIN „Undo setzt Uhr neu“). Meine Position bleibt, präzisiert:
- **Quelle der Wahrheit = append-only Event-Log mit Cursor**; Zustand = `fold(events[0..cursor])`; Uhr per `nowMs` injiziert, Undo setzt `runningSince = now` (Zeit zwischen Fehlklick und Undo wird niemandem angerechnet, §5.5).
- Snapshots nur als **Performance-Cache** (z. B. je Phasenbeginn), nicht als Modell. Replay bei < 1000 Events vernachlässigbar [A, in M1 messen].
- Gründe: Statistik v1.x und ein späterer Sync-Adapter sind Projektionen desselben Logs; Persistenz = ein Array; deterministisches Replay ist selbst ein Test-Orakel (Property „Replay ≡ Live-Zustand“).
- Risiko: Schema-Änderung an Events braucht Migration (Upcasting) → `version` pro Event, Migrationstests in `persist/`.
- UX-Grenze „~30 Undo-Schritte“ (§5.5) bleibt als UI-Limit; das Log selbst wird nicht gekürzt.

## (d) Gemeinsame Nutzerentscheidungen (max. 6, mit meinem Default)

1. **Backend:** Kein Backend in v1; `apps/api` (Fastify) nur per ADR bei Sync/Live-Ansicht. → **Default: ja, kein Backend.**
2. **Hosting & Sichtbarkeit:** v1 auf GitHub Pages (öffentliches Repo, inkl. BRAIN/Planungsdocs öffentlich) oder direkt externer Server (welcher, mit Domain/HTTPS, Docker vorhanden?). → **Default: Pages für v1; externer Server später per Caddy + rsync, ohne Docker.**
3. **Toolchain:** Node 26 LTS via mise neben der vorhandenen Node 25.3, npm-Workspaces, TypeScript `~6.0` gepinnt. → **Default: ja.**
4. **TDD-Gate-Mechanik:** Hartes Freigabe-Gate (Hook prüft vom Nutzer bestätigte AC-Zeile, Edits an `docs/milestones/**` nur mit Nachfrage) + Red-before-Green-Nachweis in CI; keine Phasen-Datei; gilt ab M1. → **Default: so umsetzen.**
5. **Umfang Agent-Setup:** `CLAUDE.md` + `BRAIN.md` (kein `AGENT.md`/`AGENTS.md`), 3 Hooks, 3 Skills (`/ac`, `/tdd`, `/handoff`), 3 Subagents (Engineer, Architekt, Regel-Experte), Erweiterung nur bei belegtem Bedarf. → **Default: schlank starten.**
6. **Undo-Modell:** Event-Log mit Cursor (Snapshots nur als Cache) oder reine Snapshots wie Konzept §5.5. → **Default: Event-Log.**

Entfallen gegenüber 02: „auf Angular 23 warten?“ (23 erst ~06/2027, B1).
