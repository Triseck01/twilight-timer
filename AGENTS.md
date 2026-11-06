# AGENTS.md – Projektkarte

> **Zweck:** Die Topologie des Projekts für jeden Agenten: Anker, Brücken, Konventionen. Beschreibt das *Projekt*, nicht das Verhalten des Agenten (das steht in `AGENT.md`).

## Produkt in einem Satz
PWA-Timer für Twilight Imperium 4 auf dem iPad (Querformat, offline), der den Rundenablauf nach den Regeln führt und Zeitlimits mit Bank-Modell durchsetzt. Kein Backend (ADR 0004).

## Topologie

```
twilight-timer/
├─ apps/web/              Angular 22.2 PWA (UI, Plattform: Ton, Wake Lock, localStorage)
│   ├─ CLAUDE.md          offizielle Angular-Best-Practices
│   └─ e2e/               Playwright-Tests (WebKit, iPad quer) + Test-Server für den Build
├─ packages/domain/       reine Spiellogik (TS, keine Abhängigkeiten, keine Uhr, kein DOM)
│   └─ CLAUDE.md          Reinheitsregeln
├─ tests/repo/            Repo-Tests (node --test): Hook, Bootstrap, Toolchain, Doku
├─ scripts/bootstrap.sh   lokale Einrichtung macOS
├─ .claude/               settings.json, hooks/, agents/
├─ docs/                  adr/, milestones/, planning/
└─ ti4-timer-konzept-v2.md  Produktkonzept (Quelle der Anforderungen)
```

## Anker (Invarianten, die nicht brechen dürfen)
1. **Zeit nur über Zeitstempel**, nie durch Tick-Zählen (Konzept §4.1, §7.4).
2. **`domain` ist rein:** Zeit kommt als Parameter (`nowMs` / Event-Zeitstempel). Lint erzwingt es (ADR 0003).
3. **Bank-Formel** aus Konzept §4.1; Bank darf negativ werden. Sekundärphase und Pause: keine laufende Uhr.
4. **Undo/Redo:** Event + Zustand pro Eintrag; Zeit zwischen Fehlklick und Undo wird niemandem angerechnet (ADR 0005, Konzept §5.5).
5. **Alle Spieler haben dieselben Zeiten**; Konfiguration wird beim Anlegen eines Spiels kopiert.

## Brücken (Schnittstellen, an denen Zustand lebt)
| Brücke | Von → Nach | Risiko |
|---|---|---|
| `@twilight-timer/domain` Export | domain → web | Angular importiert TS-Quellcode direkt (`exports` → `src/index.ts`) |
| Persistenz | web ↔ localStorage | Schema-Version, Wiederherstellen der laufenden Uhr aus `runningSince` (M7) |
| Uhr | Browser-Zeit → domain | nur in `apps/web` gelesen und übergeben |
| Service Worker | GitHub Pages → iPad-Cache | veraltete Version, Cache-Version erhöhen (M0b/M9) |

## Konventionen
- Sprache: Code und Bezeichner Englisch; Doku, Kommentare und Testnamen Deutsch. Oberfläche standardmäßig Deutsch, umschaltbar auf Englisch (ADR 0007); nur Völker- und Kartennamen zweisprachig („Führungsstärke / Leadership“).
- Angular: siehe `apps/web/CLAUDE.md` (standalone, Signals, zoneless, OnPush-Standard, Signal Forms, Control Flow).
- Exakte Versionen (`.npmrc`: `save-exact=true`); Lockfile wird committet.
- Tests liegen neben dem Code (`*.spec.ts`); Repo-Tests in `tests/repo/`.
- Commits klein, ein Meilensteinschritt pro Commit; nicht auf `main` pushen ohne Nachfrage.
