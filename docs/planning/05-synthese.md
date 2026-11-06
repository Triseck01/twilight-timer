# Synthese der Planungsdiskussion (Runde 1 + 2)

Stand: 2026-11-06 · Quellen: `01-engineer-position.md`, `02-architect-position.md`, `03-engineer-response.md`, `04-architect-response.md`
Status: **Entwurf, wartet auf Nutzerentscheidungen (Abschnitt 3)**

Hinweis: `02-architect-position.md` enthält die überholte Aussage „Angular 23 erscheint diesen Monat“. Korrekt: v23 ca. Juni 2027 (12-Monats-Zyklus).

## 1. Konsens (beide Experten, verifiziert)

| Thema | Entscheidung |
|---|---|
| Backend | **Keins in v1.0.** Alle Funktionen (§1–§8 Konzept) laufen offline im Browser. `apps/api` (Fastify) später per ADR möglich. |
| Frontend | **Angular 22.2** (Support bis 2028-06): standalone, zoneless, OnPush, Signals, Signal Forms, offizieller Style Guide, `@angular/pwa`, kein SSR. |
| Domänenlogik | `packages/domain`: reines TypeScript, ohne Framework/DOM. Zeit wird injiziert (Zeitstempel im Event, `nowMs` für Anzeige); Lint-Regel verbietet `Date.now`/`window`. |
| Monorepo | npm workspaces + Turborepo 2.11: `apps/web`, `packages/domain`, `deploy/`. |
| Toolchain | **Node 26 LTS** via mise (`.node-version`, `engine-strict`); lokales Node 25.3 ist EOL und von Angular 22 nicht unterstützt. **TypeScript `~6.0`** fest gepinnt (Angular 22 verlangt `>=6.0 <6.1`), ADR + Dependabot-Regel gegen TS 7. Bootstrap-Script fragt vor jeder Installation. Docker lokal nicht nötig. |
| Tests | Vitest überall. M1: fast-check-Property-Tests (Zeit-/Bank-Invarianten), Beispieltabellen für Reihenfolgen, Coverage-Schwelle nur für `domain`. Playwright (nur WebKit, iPad-Emulation) ab M2. Echtes iPad in M8/M9 Pflicht. |
| Produktion | Statischer Build; kein Node zur Laufzeit. Webserver Caddy mit versionierter Konfiguration (CSP, Security-Header). |
| Dev-Server | Claude startet nie einen. Erzwungen per `PreToolUse`-Hook (deny-Regeln allein reichen laut Doku nicht). |
| Konzept-Drift | ADR markiert §2, §7.1, §9, §12 des Konzepts als überholt; CLAUDE.md verweist darauf. |

## 2. Aufgelöste Streitpunkte

| Punkt | Ergebnis |
|---|---|
| Umfang `.claude/` | Schlank: **2 Hooks** (Dev-Server-Sperre, TDD-Gate), **3 Skills** (`/ac`, `/tdd`, `/handoff`), **2 Subagenten** (die bestehenden). Gestrichen: Format-/Verify-/SessionStart-Hooks, `test-author`, `ti4-rules-expert` (→ v1.x bei Bedarf). |
| TDD-Gate-Umgehung | Gate liest Freigabezeile im Meilenstein-Dokument; **Änderungen an `docs/milestones/**` erfordern Nutzerbestätigung** (`ask`-Permission), sonst könnte Claude sich selbst freischalten. Zusätzlich CI-Check: jedes Akzeptanzkriterium hat einen Test. Gate aktiv ab M1; M0a-Gerüst ausgenommen. |
| Meilenstein M0 | **M0a**: Toolchain, Bootstrap, CI, Dev-Server-Hook, Probe „Angular importiert `domain`-Quellcode direkt“ (Fallback: `tsc`-Build). **M0b**: leere PWA per HTTPS auf dem iPad installierbar. Skills/Gate/Regeldocs kommen mit M1. |
| Deployment | Kein Docker-Image/GHCR für statische Dateien. Caddy direkt auf dem Server, Deploy per `rsync` mit eingeschränktem Key aus GitHub Actions. |
| Angular 22 vs 23 | 22 – v23 erst ~Juni 2027. |

## 3. Offene Nutzerentscheidungen

1. **Undo-Modell** – Engineer: Event-Log (Snapshots nur Cache). Architekt: pro Eintrag Event + resultierender Zustand, damit Logik-Fixes gespeicherte Spiele nicht still verändern. *Empfehlung: Event + Zustand* (erfüllt Konzept §5.5 wörtlich, Statistik ohne Replay).
2. **Hosting** – GitHub Pages (öffentliches Repo, keine eigenen Header → CSP nur per `<meta>`) und/oder externer Server (welcher? Domain mit HTTPS?). *Empfehlung: Pages nur für M0b-iPad-Test, Ziel externer Server mit Caddy.*
3. **Agenten-Dateien** – Engineer: nur `CLAUDE.md` (≤150 Zeilen) + `BRAIN.md` (≤80 Zeilen). Architekt: zusätzlich `AGENT.md` + `AGENTS.md` (deine Vorlage). *Empfehlung: CLAUDE.md + BRAIN.md; deine Verhaltensregeln aus der Vorlage wandern in einen Abschnitt der CLAUDE.md.* Und: darf `BRAIN.md` im öffentlichen Repo liegen?
4. **Toolchain-Installation** – mise + Node 26 auf diesem Mac installieren (Script fragt nach)? Alternative: Homebrew `node@26`.

### Entscheidungen des Nutzers (2026-11-06)

1. Undo: **Event + resultierender Zustand** pro Eintrag.
2. Hosting: **Kein eigener Server geplant.** Für das iPad reicht ein HTTPS-Host für statische Dateien → **GitHub Pages** (Repo öffentlich bei kostenlosem Konto). Externer Server bleibt optional; `deploy/` wird erst bei Bedarf angelegt. Folge: CSP nur per `<meta>`-Tag.
3. Agenten-Dateien: **alle vier** – `CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `BRAIN.md`, jeweils mit Zweckzeile, keine Duplikate. [OFFEN: BRAIN.md im öffentlichen Repo ok?]
4. Node 26 via **Homebrew**: `brew upgrade node` (Formel `node` = 26.13.0, Alias `node@26`). `.node-version` + `engines` im Repo prüfen die Version trotzdem.

## 4. Nächster Schritt (nach Entscheidungen)

Akzeptanzkriterien für **M0a** formulieren → Nutzerfreigabe → Tests (u. a. Hook-Test: `ng serve` wird blockiert; `npm run verify` grün auf frischem Clone) → Gerüst.
