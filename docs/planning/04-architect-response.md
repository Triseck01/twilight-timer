# 04 – Antwort Architekt auf Engineer-Papier (Runde 2)

Stand: 2026-11-06 · Bezug: `01-engineer-position.md`, `02-architect-position.md`
Kennzeichnung: **[V: Quelle]** verifiziert · **[A]** Annahme · **[KORREKTUR]** Fehler in meinem Papier 02

---

## (a) Zustimmung (je eine Zeile)
1. Kein Backend in v1.0; Wechselkriterium „Sync/Mehrgeräte“ statt Bauchgefühl; Fastify statt NestJS, falls je nötig.
2. `packages/domain` framework-frei, null Runtime-Deps, als Anker; Ticks sind nur Anzeige.
3. Node 26 LTS, npm-Workspaces, `.node-version`, `engines` + `engine-strict=true`.
4. Bootstrap installiert **nicht still** Systemsoftware – übernehme ich (siehe d3); mein `bootstrap.sh` fragt künftig vorher.
5. Kein SSR, `@angular/build` only, Signal Forms für Einstellungen, `inject()`, Style-Guide-Dateinamen.
6. Ein Testrunner (Vitest) für alles; Playwright-WebKit ersetzt das iPad **nicht** (R5).
7. Property-Invarianten 1–9 als Kern der M1-Akzeptanz; Totalität (typisierter Fehler statt Exception).
8. Konzept-Widerspruch (§2/§7.1/§9/§12) muss explizit markiert werden → ADR-0001 + Hinweis im Kopf des eingefrorenen Konzepts.
9. `deploy/` als eigener Ordner für Caddyfile/Dockerfile; `packages/tsconfig` statt meines breiteren `packages/config`.
10. SW-Update nur auf Nutzerbestätigung, nie mitten im Zug (R6).

---

## (b) Widerspruch, Risiken, Gegenvorschläge

### b1 TypeScript `~6.0` und Angular 22 vs. 23
- **[KORREKTUR]** Mein Papier nahm „Angular 23 vermutlich in Kürze“ an. Falsch: Angular hat auf **12-Monats-Majors** umgestellt, v23 ≈ Juni 2027; v22 Active bis 2027-06, LTS bis 2028-06 [V: angular.dev/reference/releases]. `next` ist 22.3.0-next.x, kein 23-Prerelease [V: npm]. → Frage „auf 23 warten?“ entfällt; **Angular 22 ist gesetzt.**
- TS-Pin bestätigt: `@angular/build@22.2.4` peer `typescript: >=6.0 <6.1`, `latest` = 7.0.2 [V: npm]. Engineer hat recht.
- **Risiko, das fehlt:** Der Pin muss an **einer** Stelle leben und automatisiert geschützt sein, sonst „repariert“ eine spätere Session ihn per `npm i typescript@latest`.
  - Gegenvorschlag: `typescript: "~6.0.x"` **nur** im Root-`devDependencies` (Hoisting → eine Version); Dependabot-`ignore` für `typescript` Major ≥ 7 bis Angular es freigibt; Eintrag in BRAIN „Invarianten“ mit Begründung + ADR-0002. `npm install *` steht ohnehin auf `ask` (Papier 02 §3.1).
  - TS 7 (nativer Compiler) als eigener Chore erst, wenn `@angular/build` die Peer-Range öffnet; Signal dafür = Peer-Range, nicht Blogposts.
- „Versionen exakt pinnen“ (Engineer §6) widerspricht `~6.0` und erzeugt Update-Lärm. Vorschlag: exakte Pins nur für Toolchain-Kern (`turbo`, `@angular/*` via `ng update`), sonst `~`; Lockfile ist die eigentliche Fixierung.

### b2 Testumfang M0/M1 (Vitest + fast-check + Playwright)
- Risiko: Playwright-Browser (WebKit + Chromium) in M0 = großer Download, langsame CI, kein Nutzen ohne UI.
- Gegenvorschlag Stufung:
  | M | Werkzeuge | Gate |
  |---|---|---|
  | M0a | Vitest (Domain-Platzhalter), `node --test` nur für Hook-Skripte | verify grün, Hook-Block nachgewiesen |
  | M0b | Vitest (App-Shell rendert); **manuelle** iPad-Abnahme | HTTPS + Home-Screen + offline |
  | M1 | Vitest + **fast-check** (Invarianten 1–6, 8, 9 als AC-IDs); Branch-Coverage ≥ 95 % **nur** für `packages/domain` als Vitest-Threshold | Tests grün, Threshold erfüllt |
  | M2+ | Playwright **webkit-only** (iPad-Landscape); Chromium erst bei konkretem Bedarf | Szenario je Abnahme |
  | Deploy-Ziel fix | Playwright-Hosting-Test (Header/CSP/Offline) gegen Prod-Build | siehe b4 |
  | M8 | Vitest-Browser-Modus nur, falls jsdom für Audio/Wake-Lock nicht reicht | – |
- Invariante 7 (Reihenfolgen) besser als **Beispieltabellen** (Konzept §3 liefert konkrete Fälle) statt Properties – lesbarer für die AC-Freigabe durch den Nutzer.

### b3 Event-Log-Undo vs. Konzept-Snapshots
- Unterschätztes Risiko beim reinen Event-Log: **Replay beim Laden** heißt, jeder spätere Bugfix im Reducer verändert rückwirkend Bank-Stände gespeicherter Spiele; dazu Event-Schema-Migration für persistierte Spiele. Für ein Gerät, ein Spiel, wenige hundert Aktionen ist das Kosten ohne Gegenwert.
- Gegenvorschlag **„Event + Ergebnis-Snapshot“ pro History-Eintrag**: `history: [{ event, stateAfter }]`, Cursor wie gehabt.
  - Undo/Redo = Cursor bewegen, Zustand direkt übernehmen (Konzept §5.5 bleibt wörtlich erfüllt, Uhr-Neustart `runningSince = now`).
  - Statistik v1.x = Events lesen, **kein** Replay nötig; Laden = letzten Snapshot nehmen.
  - Größe: ~500 Einträge × ~1 KB ≈ 0,5 MB, unter localStorage-Grenzen [A]; Undo-Tiefe weiter begrenzbar, Events unbegrenzt.
  - Reducer bleibt identisch `apply(state, event)` → Entscheidung ist in M1 reversibel.
- **Doku-Folgen (Pflicht vor M1-AC, weil Tests davon abhängen):** ADR-0005 „Historienmodell“; `docs/domain/time-model.md` vermerkt Abweichung/Präzisierung zu §5.5; `packages/domain/CLAUDE.md` Invariante „Persistierter Zustand wird nie per Replay berechnet“ (bzw. Gegenteil, je nach Entscheidung); BRAIN-Glossar „Event“, „Snapshot“, „Cursor“.

### b4 Threat Model: Caddy/CSP/Service Worker → Repo-Dateien
- Inhaltlich richtig, aber zu breit für ein Hobby-Tool und nicht an Dateien gebunden. Jede Maßnahme braucht **genau eine Datei und einen Test**, sonst bleibt sie Prosa.
  | Maßnahme | Datei | Prüfung |
  |---|---|---|
  | Header (CSP, HSTS, nosniff, Referrer-, Permissions-Policy inkl. `screen-wake-lock`) | `deploy/Caddyfile` | Playwright-Hosting-Test liest Header |
  | Cache: `index.html`, `ngsw.json`, `ngsw-worker.js` no-cache; Hash-Bundles immutable | `deploy/Caddyfile` | dito |
  | SW-Verhalten, Update-Hinweis | `apps/web/ngsw-config.json`, `SwUpdate`-Service | Vitest + manuell |
  | CSP-Kompatibilität des Angular-Builds | `apps/web/angular.json` (`autoCsp` [A: Option prüfen; Angular inlined kritisches CSS mit Inline-Handler, das `script-src 'self'` bricht]) | Hosting-Test: keine CSP-Violations in Konsole |
  | Notbremse bei kompromittiertem/kaputtem SW | `docs/runbooks/deploy.md` (Angular `safety-worker.js`) [A] | – |
  | Supply Chain | `.github/dependabot.yml`, `ci.yml` (`npm ci`, `npm audit --omit=dev`) | CI |
  | Import-Validierung | `packages/domain/src/persist/schema.ts` | Vitest |
  | Überblick, max. 1 Seite | `docs/security/threat-model.md` | – |
- **Wechselwirkung mit Hosting:** GitHub Pages erlaubt **keine eigenen Header** [A, bekannt] → CSP nur per `<meta>` (kein `frame-ancestors`, kein HSTS-Steuern). Das ist ein Argument für den externen Server mit Caddy als Ziel und Pages nur als Übergang → Entscheidung d2.

### b5 Injiziertes `now` im Domain-API
- `apply(state, event, nowMs)` verteilt Zeit auf zwei Kanäle. Gegenvorschlag: **Zeit ist Teil des Events** – `event = { type, at: number, … }`; Reducer `apply(state, event)`; Selektoren `remaining(state, nowMs)`. Folgen: Event ist vollständige Tatsache (Statistik, Debug, Export), Tests lesen sich als Zeitleiste, kein vergessenes `now`.
- Port: `packages/domain` exportiert nur den **Typ** `Clock { now(): number }`; Implementierung in `apps/web` als `InjectionToken` mit `Date.now` (überlebt Reload, anders als `performance.now`) [A]; Tests: Zahlen bzw. Playwright `page.clock`.
- **Durchsetzung strukturell, nicht per Prosa:** ESLint `no-restricted-properties` (`Date.now`, `performance.now`) und `no-restricted-globals` (`window`, `localStorage`) im Domain-Paket. CLAUDE.md verweist nur auf die Regel.
- Offener Punkt aus Engineer §7: Konsum der Domain-`.ts` durch `@angular/build` – nicht als Nutzerfrage, sondern **M0a-Spike** mit Ergebnis-ADR. Default: `tsconfig`-`paths` in `apps/web` auf `packages/domain/src/index.ts` (kein Watch-Build nötig für `npm run dev`); Fallback: `tsc`-Build wie vom Engineer vorgeschlagen [A].

---

## (c) Selbstkritik: Was aus meinem `.claude/`-Setup für v1 entfällt
Garantien, die bleiben müssen: **(G1) nie Dev-Server starten, (G2) kein Produktionscode ohne freigegebene AC und rote Tests.**

| Element (Papier 02) | Urteil | Begründung |
|---|---|---|
| deny-Liste Dev-Server | **behalten** | billig, erste Linie für G1 |
| PreToolUse `block-dev-server.mjs` | **behalten** | deny ist keine Grenze [V: Permissions-Doku] → nötig für G1 |
| PreToolUse `tdd-gate.mjs` | **behalten, vereinfacht** | nur Lesen eines Flags in `STATUS.md`; Allowlist für Config/Doku/M0a |
| PostToolUse `format-file` | streichen | erzeugt Diff-Rauschen; Lint/Format in `verify` + CI genügt |
| Stop `verify-hint` | streichen | langsam, laut; DoD in AGENT.md + CI decken es |
| SessionStart `session-context` | streichen | ersetzt durch `@docs/milestones/STATUS.md`-Import in CLAUDE.md (≤ 15 Z.), kein Code |
| Subagent `ti4-rules-expert` | streichen | Domänendocs laden on demand; bei Regelfragen ad hoc delegieren |
| Subagent `test-author` | verschieben (v1.x) | Freigabe der AC durch den Nutzer + roter Commit sind die eigentliche Kontrolle |
| Skills `/milestone`, `/dev-commands`, `/adr`, `/learn` | streichen/zusammenlegen | `/dev-commands` → README-Abschnitt; ADR-Template-Datei; `/learn` geht in `/handoff` auf |
| Skills `/ac`, `/tdd`, `/handoff` | **behalten** | kodieren genau den bestätigten TDD-Loop und die Doku-Anreicherung |

Ergebnis v1: **2 Hooks, 3 Skills, 2 Subagents** (bestehende). Weniger Hook-Code = weniger zu testender Code; Erweiterung erst, wenn ein konkreter Fehler in einer Sitzung auftritt (dann Eintrag in BRAIN „Gelernt“).

---

## (d) Zusammengeführte Nutzerentscheidungen (max. 6, mit Default)
1. **Backend:** Kein Backend in v1.0; ist Sync/Mehrgeräte-Ansicht ein echtes Ziel? → *Default: kein Backend, Sync nicht geplant; `apps/api` nur per ADR.*
2. **Hosting:** Was ist der externe Server (VPS mit Docker? Domain?) → *Default: M0b auf GitHub Pages zur schnellen iPad-Abnahme, Ziel externer VPS mit Caddy (wegen echter Security-Header); Pages danach abschalten.*
3. **Toolchain auf diesem Mac:** mise (projektlokal Node 26, globales Node 25 bleibt) + npm-Workspaces + TS-Pin `~6.0` → *Default: ja; `bootstrap.sh` fragt vor der mise-Installation.*
4. **Historienmodell:** reiner Event-Log / Snapshots (Konzept) / Event + Snapshot pro Eintrag → *Default: Event + Snapshot (Undo wie Konzept, Statistik ohne Replay).*
5. **Gedächtnisdateien & Sichtbarkeit:** `AGENT.md` neben `AGENTS.md` (Verwechslungsgefahr) und `BRAIN.md`/`docs/planning` im öffentlichen Repo → *Default: Namen wie gewünscht beibehalten, jede Datei beginnt mit einer Abgrenzungszeile; Repo öffentlich (keine Geheimnisse).*
6. **TDD-Gate-Härte:** Hook blockiert Produktionscode ohne freigegebene AC → *Default: hart blockieren; Ausnahme nur M0a-Scaffolding (`ng new`-Generat, Config, Doku).*

Erledigt ohne Nutzer: Angular 22 (v23 erst ~06/2027), Domain-Konsum per M0a-Spike, Playwright erst ab M2.

---
Quellen: angular.dev/reference/releases · npm registry 2026-11-06 (`@angular/build@22.2.4` peerDeps, `typescript` dist-tags, `@angular/core` time) · code.claude.com/docs/en/permissions · Papiere 01/02
