# Positionspapier Software Engineer (Runde 1)

Stand: 2026-11-06 · Autor: Software-Engineer-Agent · Grundlage: `ti4-timer-konzept-v2.md` + neuer Nutzer-Brief (Node + Angular, Turborepo, externer Server) + Klarstellungen: §7.1 nicht bindend, „kein Backend“ zulässig, Entwicklung auf macOS, Ziel iPad Safari/PWA, TDD-Gate bestätigt

Kennzeichnung: **[V: Quelle]** verifiziert · **[A]** Annahme/Einschätzung · **[ENTSCHEIDUNG]** braucht den Nutzer

---

## 0. Kernaussagen (TL;DR)

1. **Empfehlung: kein Backend in v1.0.** Jede Funktion des Konzepts läuft offline im iPad; der externe Server liefert nur den statischen Angular-Build per HTTPS aus (Caddy/nginx). Node bleibt Entwicklungswerkzeug (CLI, Tests, Build), kein Laufzeitprozess. Ein Fastify-Backend kommt erst, wenn Sync/Mehrgeräte ausdrücklich gewollt sind.
2. **Angular 22 behalten**, aber konsequent modern: standalone, zoneless, Signals, OnPush (jetzt Default), Built-in Control Flow, Vitest, `@angular/pwa`. Kein SSR.
3. **Domänenlogik in ein framework-freies TS-Paket `packages/domain`** (reine Funktionen, injizierte Uhr, keine Abhängigkeiten). Das ist der Anker; UI und Server sind austauschbar.
4. **Falls später ein Backend kommt: Fastify 5** (nicht NestJS). Node **26 LTS** als einzige Toolchain-Version (lokale v25.3.0 ist EOL und von Angular 22 nicht unterstützt).
5. **npm-Workspaces statt pnpm** (Corepack ist seit Node 25 nicht mehr gebündelt; npm kommt mit Node). Node-Version per `.node-version` + `mise`/Homebrew, Docker nur optional.
6. **TypeScript auf `~6.0` pinnen** – das aktuelle `typescript@latest` (7.0.2) ist mit Angular 22 inkompatibel.

---

## 1. Was muss ein Backend für dieses Produkt leisten?

Ausgangslage: Ein iPad, offline-first, localStorage, eine Gruppe am Tisch. Zeitmessung ist zeitstempelbasiert auf dem Gerät (§4.1, §7.3). Jede Server-Abhängigkeit im Spielablauf wäre ein **neuer Ausfallpunkt mitten im Spiel** (WLAN im Spielzimmer).

| Rolle | Nutzen für v1.0 | Kosten / Blast Radius |
|---|---|---|
| Statische Dateien ausliefern (HTTPS, PWA) | **nötig** (SW + Wake Lock brauchen HTTPS) [V: angular.dev/ecosystem/service-workers] | gering; jeder Webserver/Reverse-Proxy kann das, Node nicht zwingend |
| Spiele persistieren/synchronisieren | gering (ein Gerät); JSON-Export deckt Backup ab (§M7) | hoch: Konfliktauflösung, Auth, Datenschutz (Spielernamen), Offline-Queue, Schema-Migration zweiseitig |
| Multi-Device-Ansicht (2. Bildschirm/Handys) | nice-to-have, nicht im Konzept | sehr hoch: Echtzeit (WebSocket/SSE), Uhren-Synchronisation zwischen Geräten, Autorität über den Zustand |
| Statistik (v1.x) | kann komplett lokal aus dem Event-Log berechnet werden | mittel, falls serverseitig aggregiert |

**Prüfung „kein Backend“ gegen jede Konzeptfunktion:**

| Funktion (Konzept) | ohne Backend erfüllbar? |
|---|---|
| Einstellungen, Spiel anlegen, alle Phasen, Undo/Redo, Pause (§4, §5) | ja, reiner Client-Zustand |
| Persistenz, Fortsetzen nach Reload (M7) | ja, localStorage (Größenordnung KB) |
| JSON-Export/-Import, Backup (M7) | ja, Datei-Download/-Upload im Browser |
| Offline-Start, Updates (M0, M9) | ja, Service Worker + statische Dateien |
| Ton, Wake Lock (M8) | ja, Browser-APIs; brauchen nur HTTPS |
| Statistik (v1.x) | ja, lokal aus dem Spielverlauf |
| Gerätewechsel mitten im Spiel / Mehrgeräte-Ansicht | **nein** – einzige Funktion, die einen Server braucht; steht nicht im Konzept |

**Empfehlung: kein Backend in v1.0** [A, aus obiger Tabelle abgeleitet]
- Der „externe Server“ wird zu **statischem Hosting**: Caddy (Auto-TLS) oder nginx liefert `apps/web/dist/.../browser` aus; Cache-Regeln: `index.html`/`ngsw.json` no-cache, gehashte Bundles immutable, SPA-Fallback auf `index.html`. Kein Node-Prozess in Produktion → kleinste Angriffsfläche, nichts zu patchen außer dem Webserver.
- Blast Radius der Entscheidung ist klein und umkehrbar: Weil die Logik in `packages/domain` liegt (§4), kann `apps/api` (Fastify) später ohne Umbau dazukommen und dieselben Typen/Reducer nutzen.
- Turborepo bleibt sinnvoll: `apps/web` + `packages/domain` (+ später `apps/api`) mit gecachten `build/test/typecheck`-Tasks.
- **Abweichung vom Brief** („Node-Backend“) bewusst: Der Nutzer hat bestätigt, dass „kein Backend“ zulässig ist. Node bleibt die Entwicklungs-Toolchain.
- Gegenargument geprüft: „Node-Server, damit lokal = Produktion“ – nicht nötig, `ng serve` bzw. ein lokaler Static-Server des Builds deckt das ab; Produktionsnähe optional per `Dockerfile` (Caddy-Image).
- Wechselkriterium: Sobald F1 mit „Sync/Mehrgeräte“ beantwortet wird → Fastify-API mit Auth (siehe §3, §6).

---

## 2. Frontend: Angular 22 vs. Alternativen

**Versionen:** `@angular/core` 22.2.4, `@angular/cli` 22.2.6 [V: npm registry 2026-11-06]. v22 ist „Active“ seit 2026-06-03, LTS bis 2028-06 [V: angular.dev/reference/releases]. v23 erwartet ~Juni 2027.

**Anforderungsprofil:** ~5 Ansichten, große Touch-Ziele, eine hochfrequent aktualisierte Zahl, offline, iPad Safari, kleine Datenmenge.

| Option | Pro | Contra |
|---|---|---|
| **Angular 22** | Offizieller Style Guide, CLI, DI, Vitest integriert, `@angular/service-worker` als First-Party-PWA, Signals + zoneless = feingranulare Updates, Nutzerwunsch | größtes Bundle (nach erstem Laden per SW gecacht → irrelevant [A]); Overkill für 5 Screens |
| Svelte 5 / SolidJS | kleinste Bundles, sehr direkte Reaktivität | kein First-Party-PWA-Modul, weniger strikte Leitplanken für Claude-Code-Sessions |
| Vanilla (Konzept §7.1) | null Abhängigkeiten | widerspricht Brief; Struktur/Tests selbst bauen |

**Empfehlung: Angular 22.** Das Timing-Problem ist kein Framework-Problem: die Anzeige berechnet `restzeit = f(zustand, jetzt)` aus Zeitstempeln; das Framework rendert nur eine Zahl ≤ 4×/s. Der Nutzen der Angular-Leitplanken (einheitliche Struktur über viele KI-Sessions) überwiegt. [A]

**Relevante offizielle Leitlinien (verifiziert):**
- **Zoneless ist Default seit v21** [V: angular.dev/guide/zoneless] → kein `zone.js`. Ticker-Signal löst kein app-weites Change Detection aus.
- **OnPush ist Default in v22** (alter Default heißt jetzt `Eager`) [V: infoq.com/news/2026/08/angular-v22-released].
- **Signal Forms stabil in v22** [V: infoq, alternativeto] → für Einstellungen/„Neues Spiel“ verwenden (Live-Zeile §4.6 als `computed`).
- **Vitest ist Default-Testrunner**, `jsdom` vorinstalliert; Browser-Modus via `@vitest/browser-playwright` [V: angular.dev/guide/testing]. Karma nur noch Legacy.
- **Style Guide:** Dateinamen mit Bindestrich ohne Typ-Suffix (`player-card.ts`), Feature-Ordner statt `components/`/`services/`, `inject()` statt Konstruktor-Injection, `protected` für Template-Member, `readonly` für `input()/output()`, `[class.x]` statt `NgClass` [V: angular.dev/style-guide].
- Standalone Components, `@if/@for/@switch` [A: seit v17 Standard, nicht erneut geprüft].
- **PWA:** `ng add @angular/pwa` → `@angular/service-worker`, `ngsw-config.json`; Update-Flow über `SwUpdate` mit Hinweis „Neue Version“ (deckt Risiko „alte Version im Cache“ §10 ab) [V: angular.dev/ecosystem/service-workers].
- **Kein SSR** (`ng new --ssr=false`): kein SEO-Bedarf, SSR würde Offline-Logik (localStorage, `Date.now`) verkomplizieren. [A]
- Webpack-Builder ist deprecated → nur `@angular/build` (esbuild/Vite) [V: infoq].
- UI-Bibliothek: kein Angular Material nötig; höchstens `@angular/cdk` (Overlay/A11y) für Menü „Manuelle Eingriffe“ und Pause-Overlay. [A]

**Plattform-Adapter** (Ton, Wake Lock, Storage, Uhr) als Angular-Services hinter Interfaces → in Tests durch Fakes ersetzbar.

---

## 3. Node-Version und Backend-Framework (für später)

**Node:** Node 26 „Lithium“ ist **Active LTS seit 2026-10-28**, EOL 2029-04-30; Node 24 ist seit 2026-10-20 Maintenance; Node 25 ist seit 2026-06-01 **EOL** [V: github.com/nodejs/Release schedule.json].
**Angular 22 verlangt Node `^22.22.3 || ^24.15.0 || >=26.0.0`** [V: `npm view @angular/build@22.2.4 engines`] → **die lokale Mac-Installation (v25.3.0) ist weder unterstützt noch gepflegt.** Muss auf 26 gehoben werden.

| Framework | Bewertung |
|---|---|
| plain `node:http` | genügt für Static, aber Cache-Header, Range, MIME, Security selbst bauen → fehleranfällig |
| **Fastify 5.12** [V: npm] | ausgereift, `@fastify/static`, `@fastify/helmet`, JSON-Schema-Validierung, pino-Logging, `inject()` für Tests ohne offenen Port. **Empfehlung, falls ein Backend kommt.** |
| Hono 4.13 [V: npm] | sehr schlank, runtime-agnostisch (Node/Bun/Edge). Gute Alternative, falls Hosting später serverless wird. |
| NestJS 12 [V: npm] | Angular-ähnlich, aber DI/Modul-Overhead für einen Static-Server + Healthcheck unverhältnismäßig. Erst bei echter API mit vielen Endpunkten erwägenswert. |

Backend-Code kann mit Node-26-Type-Stripping direkt als `.ts` laufen (stabil seit 24.12/25.2; keine Enums/Parameter-Properties) [V: nodejs.org/api/typescript via Suchergebnis]. Für Produktion trotzdem `tsc`-Build + `tsc --noEmit`-Typecheck in Turbo, da Stripping nicht typprüft. [A]

---

## 4. Domänenlogik: `packages/domain`

**These:** Zeitmodell (§4), Reihenfolgen (§3), Zustandsmaschine und Undo/Redo sind der eigentliche Wert des Produkts. Sie gehören in ein **framework-freies, abhängigkeitsfreies TypeScript-Paket**. Gründe: (a) DRY, falls Server später Sync/Statistik macht, (b) Tests ohne DOM in Millisekunden, (c) Framework-Wechsel ohne Logikverlust (Blast Radius ≈ 0).

**Struktur [A]:**
```
packages/domain/src/
  time/        clock.ts (Uhr-Interface), turn-clock.ts (Formel §4.1), presets.ts
  order/       pick-order.ts, initiative.ts, secondary-order.ts, vote-order.ts
  game/        events.ts (Union-Typ), reducer.ts, selectors.ts, guards.ts (z. B. canPass)
  history/     history.ts (Undo/Redo-Cursor)
  persist/     schema.ts (Versionierung, Migration, Import-Validierung)
```

**Designregeln:**
- **Reiner Reducer:** `apply(state, event, nowMs) → state`. Kein `Date.now()` im Paket; die Zeit wird immer übergeben → deterministisch, testbar, Race-frei.
- **Ticks sind nur Anzeige:** `selectors.remaining(state, nowMs)`. Kein Zustand wird durch Ticks verändert (Konzept §7.3 bestätigt).
- **Vorschlag (abweichend vom Konzept §5.5):** Historie als **Event-Log mit Cursor** statt Snapshots. Zustand = `fold(events[0..cursor])`; Undo = Cursor −1 plus Uhr-Neustart (`runningSince = now`); neue Aktion verwirft Redo-Zweig. Vorteile: Statistik (v1.x) und späterer Sync fallen fast gratis ab; Persistenz = Event-Array. Nachteil: Replay-Kosten (bei < 1000 Events vernachlässigbar [A]). Alternativ Snapshots wie im Konzept – beides erfüllt §5.5. → Frage F4.
- **Undo-Semantik präzisieren:** Beim Undo wird die abgerechnete Zeit des rückgängig gemachten Zuges wiederhergestellt; die Zeit zwischen Fehlklick und Undo wird niemandem angerechnet (§5.5). Testfall Pflicht.
- Spieler-IDs als Strings, keine `enum`s (kompatibel mit Node-Type-Stripping) [A].

**Test-Runner:** **Vitest** (5.1 [V: npm]) für Domain, API und Angular → ein Runner, eine Syntax, ein Coverage-Format in Turbo. `node --test` wäre abhängigkeitsfrei, aber zweite Test-Welt ohne Gewinn. Property-Based Tests mit **fast-check 4.10** [V: npm] (`@fast-check/vitest`).

**Invarianten für Property-Based Tests** (zufällige Eventfolgen mit zufälligen, monotonen Zeitstempeln):
1. **Zeit-Obergrenze:** pro Spieler `Σ verbrauchte Zugzeit ≤ Startbank + Züge × Zugzeit (+ Gutschrift bis Cap)`, §4.1.
2. **Bank-Cap:** nach jeder Gutschrift `bank ≤ bankObergrenze`; Bank darf negativ werden, Cap nie überschritten.
3. **Pass ohne Gutschrift:** mit `passGutschreiben=false` ändert ein Pass die Bank nie nach oben.
4. **Pause/Sekundär neutral:** Einfügen einer beliebig langen Pause oder Sekundärphase ändert keine Bank und keinen Zugverbrauch.
5. **Undo/Redo:** `redo(undo(s)) ≡ s` (bis auf `runningSince`); `undo` nach `apply(e)` stellt Bank/Phase/Reihenfolge exakt wieder her.
6. **Reload-Äquivalenz:** `deserialize(serialize(s))` an Zeitpunkt t liefert dieselbe Restzeit wie der durchlaufende Zustand.
7. **Reihenfolgen:** Aktionsreihenfolge ist Permutation der nicht-gepassten Spieler, aufsteigend nach min(Initiative), Naalu-Token = 0 zuerst; Wahlreihenfolge beginnt immer beim Sprecher, unabhängig von Vorrunde; Abstimmung: Sprecher zuletzt.
8. **Guards:** Passen ist unmöglich, solange eine eigene Karte unbenutzt ist; kein Spieler hat zwei Züge hintereinander, außer alle anderen haben gepasst.
9. **Totalität:** Jedes Event in jedem Zustand liefert entweder neuen Zustand oder einen typisierten Fehler – nie eine Exception.

---

## 5. Teststrategie und TDD-Workflow

| Ebene | Werkzeug | Inhalt |
|---|---|---|
| Domain-Unit + Property | Vitest + fast-check | §4-Formeln, Reihenfolgen, Reducer, Invarianten oben. Ziel: ≥ 95 % Branch-Coverage [A] |
| Angular Komponenten/Services | Vitest (jsdom, Default) + Angular TestBed; Uhr als Fake-Provider | Rendering je Phase, Button-Labels, Farbwarnungen bei 30/10 s, Pause-Overlay |
| Angular Browser-Modus (selektiv) | Vitest Browser-Modus mit Playwright, **WebKit** | Dinge, die jsdom nicht kann (Audio-Unlock, Layout) |
| Hosting-Konfiguration | Playwright gegen lokalen Static-Server des Prod-Builds | Cache-Header, CSP, SPA-Fallback, Offline-Start (API-Tests mit `fastify.inject()` erst, wenn ein Backend kommt) |
| E2E | **Playwright 1.65** [V: npm] mit Projekten `webkit` (iPad-Emulation, Landscape) + `chromium` | M2–M7-Abnahmen als Szenarien: komplette Runde, Reload mitten im Zug (`page.clock` für Zeitsprünge), Offline-Start nach SW-Installation |
| Gerätetest | echtes iPad (M9-Liste) | Wake Lock, Ton/Stummschalter, Home-Screen-Modus – **WebKit in Playwright ≠ iOS Safari** [A], daher nicht ersetzbar |

**TDD-Workflow pro Meilenstein (Nutzerregel):**
1. `docs/acceptance/Mx-*.md`: nummerierte Akzeptanzkriterien (Given/When/Then), je Kriterium eine Test-ID.
2. Nutzer bestätigt.
3. Tests schreiben → `npx turbo run test` muss **rot** sein (Commit „test(Mx): red“).
4. Implementieren bis grün; Refactor; Commit.
5. CI (GitHub Actions): `turbo run lint typecheck test build` + Playwright webkit. Kein Merge bei Rot.

---

## 6. Sicherheit / Threat Model (externer Server)

Assets: Verfügbarkeit der App am Spielabend, Integrität des ausgelieferten Codes, Spielernamen (geringe Sensibilität).

| Bedrohung | Relevanz | Maßnahme |
|---|---|---|
| Manipulation des ausgelieferten JS (Server kompromittiert) | hoch – SW cached bösartigen Code dauerhaft | Server härten: nur 80/443 offen, SSH-Key-only, Deploy per CI mit eigenem Deploy-Key; ohne Backend kein Node-Prozess in Produktion (nur Caddy/nginx); falls später Node: Non-Root, bindet an `127.0.0.1` hinter Proxy |
| Supply Chain (npm) | hoch | `package-lock.json` committen, `npm ci`, Dependabot/Renovate, `npm audit` in CI, wenige Runtime-Deps (Domain: 0), Versionen exakt pinnen |
| XSS über Spielernamen / JSON-Import | mittel | Angular escaped standardmäßig; **kein** `bypassSecurityTrust*`/`innerHTML`; strikte CSP (`script-src 'self'`); Import mit Schema-Validierung in `packages/domain/persist` |
| Manipulation von localStorage | irrelevant (eigenes Gerät) | nur Robustheit: defekter/alter Zustand → Migration oder sauberer Neustart, nie Absturz |
| Stale/inkonsistente Version durch SW | mittel (Verfügbarkeit) | `ngsw.json`/`index.html` no-cache, `SwUpdate`-Hinweis, Update nicht mitten im Zug erzwingen |
| Offene Debug-/Dev-Ports | mittel | Dev-Server nie auf dem externen Server; Produktionsbuild only; `eruda` nur hinter `?debug` und nicht im Prod-Bundle [A] |
| Spätere Sync-API ohne Auth | hoch, falls eingeführt | erst mit Auth (z. B. Spiel-Token), Rate-Limit, Größenlimit, Schema-Validierung – **nicht in v1.0** |

Security-Header im Webserver (Caddyfile/nginx, versioniert in `deploy/`): CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (Wake Lock erlauben). Später bei Node: `@fastify/helmet`.

---

## 7. Monorepo, Tooling, lokale Entwicklung

```
apps/web        Angular 22 PWA
packages/domain reine TS-Logik (0 Runtime-Deps)
packages/tsconfig  gemeinsame tsconfig-Basis
deploy/         Caddyfile (Header, Cache-Regeln), optional Dockerfile
(apps/api       Fastify 5 – erst nach F1 = Sync/Mehrgeräte)
```
- **Turborepo 2.11.10** [V: npm] mit Tasks `build`, `test`, `lint`, `typecheck` (`dependsOn: ["^build"]`), Caching lokal.
- **Package Manager: npm-Workspaces.** Begründung: npm kommt mit Node; pnpm bräuchte Corepack, das seit Node 25 nicht mehr mitgeliefert wird [V: nodejs.org/api/corepack, socket.dev] → zusätzlicher Installationsschritt ohne echten Gewinn bei 2–3 Paketen. Turbo unterstützt npm 8+ stabil [V: turborepo.dev]. `"packageManager": "npm@11.x"` im Root.
- **TypeScript `~6.0.x` repo-weit pinnen**: Angular 22 verlangt `>=6.0 <6.1` [V: npm peerDeps @angular/build]; `typescript@latest` ist 7.0.2 [V: npm] → ohne Pin bricht `npm install` bzw. der Build.
- **Domain-Paket-Konsum durch Angular:** Paket baut ESM + `.d.ts` per `tsc`; Angular importiert über Workspace-Symlink. Ob `@angular/build` rohe `.ts` aus Workspace-Paketen kompiliert, ist [A, prüfen in M0]; der Build-Schritt ist die sichere Variante.
- **Lint/Format:** `angular-eslint` + `typescript-eslint` (flat config), Prettier. [A: Versionen in M0 prüfen]
- **Node-Version für alle:** `.node-version` = `26`, `engines.node: ">=26 <27"`, `.npmrc engine-strict=true`.
- **„Kein npm/Docker vorausgesetzt“** – npm ist Teil von Node, das Problem ist also „richtiges Node fehlt“ (auf diesem Mac: v25.3.0, EOL und nicht von Angular 22 unterstützt):
  - macOS: `brew install mise && mise install` (liest `.node-version`, projektlokal, ändert das globale Node nicht) [A]; alternativ `brew install node@26`.
  - `scripts/bootstrap.sh`: prüft Node-Version, gibt exakte Installationsbefehle aus, führt `npm ci` aus. **Kein** stilles Installieren von Systemsoftware.
  - Docker: nur optional für produktionsnahen Test (Caddy-Image mit dem Build), nie Voraussetzung.
- **Befehle (werden dokumentiert, nicht von Claude gestartet):** `npm run dev` (= `turbo run dev`), `npm test`, `npm run build`, `npm run e2e`.
- **iPad im LAN testen:** SW/Wake Lock brauchen HTTPS außer auf `localhost` [V: angular.dev SW-Guide] → `ng serve --ssl` mit selbstsigniertem Zertifikat wird vom iPad meist abgelehnt; praktikabel: Preview-Deploy auf den externen Server oder Tunnel. [A] → Risiko R4.

---

## 8. Risiken

| # | Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| R1 | Node 25 lokal (EOL, außerhalb Angular-Range) | `npm ci`/CLI scheitert | `.node-version` + `engine-strict`, Bootstrap-Skript, Node 26 LTS via mise |
| R2 | TS-7-Auto-Upgrade bricht Angular | Build rot | exakter Pin `~6.0`, Renovate-Regel |
| R3 | Over-Engineering (Backend, NestJS, Sync) vor v1.0 | Zeit, Angriffsfläche | kein Backend in v1.0; Sync nur nach expliziter Entscheidung |
| R4 | HTTPS im LAN für iPad-Tests | SW/Wake Lock nicht testbar lokal | Preview-Deploy/Tunnel; Domain-Logik unabhängig davon testbar |
| R5 | Playwright-WebKit ≠ iOS Safari (Audio, Wake Lock, Standalone-Modus) | falsche Sicherheit | M8/M9-Gerätetests bleiben Pflicht |
| R6 | SW-Update mitten im Spiel lädt neu | Spielabbruch (Zustand bleibt, aber Störung) | Update nur auf Nutzerbestätigung, Zustand vor Reload persistieren |
| R7 | Uneindeutige Regeln (Konzept §11) | Zustandsmaschine falsch | als konfigurierbare Defaults + manuelle Eingriffe; nicht blockierend für M1 |
| R8 | Hosting auf „externem Server“ unbekannt (VPS? Shared Host? PaaS?) | Deploy-Konzept nicht planbar | Frage F2 |

**Offene Punkte des Konzepts, die blockieren:** Keiner blockiert M0/M1 vollständig. Für M1 sollte entschieden sein: (a) Reihenfolge 2. Wahldurchgang bei 3–4 Spielern (Default: gleiche Reihenfolge ab Sprecher), (b) Signal-Schema in der Aktionsphase (Default: ja, §4.8 [A]), (c) Snapshot vs. Event-Log (F4). „Gift of Prescience“ und Aktionskarten-Fenster sind über manuelle Eingriffe abgedeckt.

**Widerspruch im Konzept:** §2/§7.1/§12 (GitHub Pages, Vanilla JS, `node --test`) und §9 (Windows-PC als Entwicklungsort) sind laut Nutzer nicht mehr bindend → Konzept bzw. `CLAUDE.md` muss das ausdrücklich vermerken (Entwicklung auf macOS, Ziel iPad Safari/PWA), sonst folgen künftige Sessions dem alten Stand.

---

## 9. Fragen an den Nutzer (max. 6)

- **F1 Backend:** Einverstanden mit **„kein Backend in v1.0“** (statisches Hosting)? Oder ist **Gerätewechsel/Sync** bzw. **Mehrgeräte-Ansicht** (Handys zeigen die Uhr) ein echtes Ziel? Nur Letzteres rechtfertigt Fastify.
- **F2 Externer Server:** Was genau ist das (eigener VPS mit Root/Docker, Shared Hosting, PaaS)? Eigene Domain + HTTPS vorhanden? Bleibt GitHub Pages als Alternative im Spiel (ohne Backend gleichwertig)?
- **F3 Node auf dem Mac:** Darf `mise` (oder `node@26` via Homebrew) installiert werden, um Node 26 LTS projektlokal zu nutzen, ohne das globale Node 25 anzufassen?
- **F4 Undo-Modell:** Event-Log mit Cursor (Statistik/Sync später „gratis“) oder Snapshots wie im Konzept §5.5 (einfacher zu erklären)?
- **F5 Package Manager:** Einverstanden mit npm-Workspaces statt pnpm (weniger Setup, etwas langsamere Installs)?
- **F6 Angular bestätigen:** Angular 22 trotz Overhead für 5 Screens (Empfehlung: ja, wegen Leitplanken und First-Party-PWA) – oder Bereitschaft für Svelte/Solid?

---

## Quellen

- angular.dev/reference/versions, /reference/releases, /guide/zoneless, /guide/testing, /style-guide, /ecosystem/service-workers/getting-started
- infoq.com/news/2026/08/angular-v22-released; alternativeto.net (Angular v22 Signal Forms)
- github.com/nodejs/Release `schedule.json`; nodejs.org/api/corepack (v25); socket.dev (Corepack-Entscheidung des TSC)
- turborepo.dev (Package-Manager-Support); fastify.dev Migration Guide V5
- npm registry (`npm view`, 2026-11-06): @angular/core 22.2.4, @angular/cli 22.2.6, @angular/build engines/peerDeps, turbo 2.11.10, fastify 5.12.8, hono 4.13.16, @nestjs/core 12.3.3, vitest 5.1.0, @playwright/test 1.65.0, fast-check 4.10.2, typescript 7.0.2, pnpm 12.18.0
