# Meilenstein-Status

> **Zweck:** Aktueller Meilenstein, Akzeptanzkriterien und Freigaben des Nutzers. Änderungen nur mit Bestätigung des Nutzers.

**Aktuell:** M2 – Einstellungen und Spiel anlegen (umgesetzt, wartet auf Abnahme)
**Als Nächstes:** M3 – Strategiephase

| Meilenstein | Kriterien freigegeben | Abnahme |
|---|---|---|
| M0a Projektgrundlage | ✅ 2026-11-06 durch Nutzer | ✅ 2026-11-06 (Commit `527a4b6`) |
| M0b PWA auf dem iPad | ✅ 2026-11-06 durch Nutzer | ✅ 2026-11-06 am iPad: Installation, Vollbild, offline, Update-Hinweis (`ad38a44` → `d2bd8ce`) |
| M1 Kernlogik ohne Oberfläche | ✅ 2026-11-06 durch Nutzer | ✅ 2026-11-06 inkl. M1-S (Commits `ab9660a`, `e43a71e`) |
| M2 Einstellungen, Neues Spiel | ✅ 2026-11-06 durch Nutzer | umgesetzt (inkl. Logos, ADR 0006) – Abnahme offen |
| M3–M9 | siehe Konzept §8 | – |

## M0a – Akzeptanzkriterien (freigegeben 2026-11-06)

| # | Kriterium | Prüfung |
|---|---|---|
| AC1 | Frischer Klon auf macOS: `npm ci` + `npm run verify` grün | CI (`.github/workflows/ci.yml`, macOS) + lokal durch Nutzer |
| AC2 | Falsche Node-Version → `npm ci` bricht verständlich ab | `tests/repo/node-version.test.mjs` |
| AC3 | `scripts/bootstrap.sh` prüft Homebrew/Node 26, nennt Befehle, fragt vor Installation | `tests/repo/bootstrap.test.mjs` |
| AC4 | Hook blockiert Dev-Server, erlaubt Test/Build | `tests/repo/dev-server-hook.test.mjs` |
| AC5 | Monorepo `apps/web` (Angular 22.2) + `packages/domain`; Web nutzt Domain-Funktion; Build grün | `tests/repo/toolchain.test.mjs`, `apps/web/src/app/app.spec.ts`, `ng build` |
| AC6 | Lint verbietet `Date.now`/`window`/`document` in `domain` | `tests/repo/domain-lint.test.mjs` |
| AC7 | TypeScript 6.0.x gepinnt + ADRs | `tests/repo/toolchain.test.mjs` |
| AC8 | `CLAUDE.md`, `AGENTS.md`, `AGENT.md`, `BRAIN.md`, `README.md` mit Zweckzeile; README nennt Befehle | `tests/repo/docs-and-settings.test.mjs` + Durchsicht |
| AC9 | `docs/milestones/**` nur mit Bestätigung | `tests/repo/docs-and-settings.test.mjs` |

Nicht in M0a: PWA/Service Worker, GitHub Pages, Spiellogik, Skills, TDD-Gate-Hook.

## M1 – Akzeptanzkriterien (freigegeben 2026-11-06)

Regelentscheidungen des Nutzers: zweiter Wahldurchgang (3–4 Spieler) in derselben Reihenfolge; bei zwei Karten zählt die niedrigere Kartennummer. Signal bei Überzeit in der Aktionsphase → M8.

| # | Kriterium |
|---|---|
| AC1 | Voreinstellungen Bank mit Gutschrift (Standard), Hybrid, Nur Zeiten, Eigene mit Werten aus §4.1/§4.6; jede Feldänderung → „Eigene“ |
| AC2 | Konfiguration wird beim Anlegen kopiert; spätere Änderungen wirken nicht auf laufende Spiele |
| AC3 | Zugabrechnung nach Formel §4.1: Überlauf kostet Bank; Gutschrift nur wenn an, nicht beim Passen (außer „Pass gutschreiben“), gedeckelt |
| AC4 | Bank darf negativ werden |
| AC5 | Live-Anzeige nur aus Zeitstempeln (`nowMs`), deterministisch |
| AC6 | Pausen kosten niemanden Zeit (alle Phasen); Pausendauer separat gezählt |
| AC7 | Wahl ab Sprecher im Uhrzeigersinn, unabhängig von der Vorrunde; 3–4 Spieler: zwei Durchgänge, gleiche Reihenfolge |
| AC8 | Aktionsreihenfolge nach Initiative, niedrigere von zwei Karten; Naalu-Token = Initiative 0 |
| AC9 | Sekundär: links vom Aktiven im Uhrzeigersinn, inkl. Gepasster; Abstimmung: links vom Sprecher, Sprecher zuletzt |
| AC10 | Phasen Strategie → Aktion → Status → Agenda (wenn aktiv) → nächste Runde; Abfrage „Agendaphase aktiv?“; „Ja“ dauerhaft, gilt schon in derselben Runde |
| AC11 | Passen gesperrt bis alle eigenen Karten benutzt; Gepasste übersprungen; letzter Spieler je Aktion neue Zugzeit; Phase endet, wenn alle gepasst |
| AC12 | „Primär erledigt“ rechnet ab; Sekundärphase ohne Zugzeit/Bank, nur hochlaufend; „Sekundär abgeschlossen“ → nächster nach Initiative |
| AC13 | Strategie 5:00, Agenda 3:00 pro Stimme fest ohne Bank, zwei Agenden; Status ohne Uhr; nicht gewählte Karten +1 Handelsgut |
| AC14 | Undo/Redo stellt Zustand und Bank exakt wieder her; Zeit zwischen Fehlklick und Undo niemandem angerechnet; neue Aktion verwirft Redo; Eintrag = Event + Zustand |
| AC15 | Ungültige Aktionen → klarer Fehler, Zustand unverändert, kein Absturz |
| AC16 | Spielzustand verlustfrei als JSON speicher- und ladbar |

Prüfung: Beispieltabellen (3–8 Spieler), Property-Tests (fast-check), Branch-Coverage ≥ 95 % in `domain`, Durchlauf 5 Spieler × 2 Runden.

## M1-S – Statistik mitzählen (freigegeben 2026-11-06)

Entscheidungen des Nutzers: Sekundärphase keinem Spieler zurechnen (Tischzeit); Statusphase als Tischzeit; Endauswertung mit Zeit pro Spieler pro Runde; Auszeichnungen später (mit der Anzeige).

| # | Kriterium |
|---|---|
| S1 | Pro Spieler und Runde: Strategie-/Aktions-/Agendazeit, Züge, längster Zug, Züge über Zugzeit + Überzeit, gutgeschriebene Zeit, gewählte Karten, Wahlen/Stimmen über Limit, Pass-Position |
| S2 | Pro Spieler: Tiefststand der Bank |
| S3 | Pro Runde (Tisch): Dauer je Phase (Strategie, Aktion, Sekundär, Status, Agenda); Sekundärzeit gesamt und pro Karte |
| S4 | Spiel: Startzeit, Runde der Agenda-Freischaltung, Pausendauer und Pausenzahl; Pausen in keinem anderen Wert |
| S5 | Zwischenstand zum Zeitpunkt jetzt inkl. laufendem Abschnitt |
| S6 | Endauswertung: Übersicht, Spieler × Runde, pro Spieler, pro Runde |
| S7 | Undo/Redo: Statistik konsistent, Zeit zwischen Fehlklick und Undo zählt nirgends |
| S8 | JSON verlustfrei; nur Summen, kein Einzelzug-Log |

Umsetzung M1-S: `packages/domain/src/stats.ts`, 19 Tests (Szenario von Hand nachgerechnet, Property-Invarianten), 6/7 Mutationen erkannt, die siebte war gleichwertiger Code (vereinfacht).

### Anzeige der Statistik (später, ab M5 oder eigener Meilenstein nach M7)
- **Zwischenstand** (Button „Statistik“, Overlay, Uhr läuft weiter): Spieldauer netto/brutto, Runde, Pausendauer; pro Spieler Gesamtzeit, Ø pro Zug, Bank, Züge über Limit; aktuelle Runde nach Phasen.
- **Endauswertung:** Übersicht; Tabelle Spieler × Runde (aufklappbar nach Phase); pro Spieler Summen, Anteil, Züge/Ø/längster Zug, Überzeit, Bank (Ende, Tiefststand, Gutschrift), Karten pro Runde, Ø Wahl/Stimme, Pass-Position; pro Runde Phasendauern und Sekundärzeit pro Karte; Export.
- **Auszeichnungen** (Wunsch des Nutzers, später): schnellster Spieler, „Der Grübler“, Bankkönig, sparsamster Strategiewähler.

## M2 – Akzeptanzkriterien (freigegeben 2026-11-06)

Entscheidungen des Nutzers: Farben Schwarz, Rot, Blau, Grün, Gold, Lila, Neonorange, Neonpink (je einmal); Sitzreihenfolge per ▲▼; kein Vorausfüllen; Neues Spiel in Schritten; Sprecher Runde 1 = Position 1; Volk pro Spieler (Pflicht, je einmal) aus Basisspiel, PoK, Keleres, Thunder's Edge, Discordant Stars, Uncharted Space; Namen Englisch / Deutsch wo vorhanden; Naalu-Schalter entfällt (aus Volkswahl abgeleitet); **keine Live-Zeile** zur Spieldauer (Abweichung von Konzept §4.6, Schätzung nicht belastbar); Playwright (WebKit) erlaubt.

| # | Kriterium |
|---|---|
| D1 | Völkerkatalog (Name EN / DE, Erweiterung) nach geprüfter Liste |
| D2 | Genau ein Volk pro Spieler; Volk und Farbe je höchstens einmal; Volk aus gewählter Erweiterung |
| D3 | Naalu gespielt → Initiative-0-Token bei diesem Spieler; sonst kein Token |
| D4 | Sprecher Runde 1 = Position 1 |
| E1 | Startbildschirm: Neues Spiel, Einstellungen |
| E2 | Einstellungen: 4 Voreinstellungen, −/+ in festen Schritten, Schalter, abhängige Felder, „Eigene“, Standard wiederherstellen |
| E3 | Einstellungen überstehen Neuladen; beschädigte Daten → Standard |
| N1 | Schritt 1: Erweiterungen (PoK an, TE, DS, US), Handelswaren (an) |
| N2 | Schritt 2: 3–8 Spieler (ohne PoK 3–6), Name, Farbe, Volk (gruppiert, Suche), ▲▼, Sprecher markiert, Belegtes ausgegraut |
| N3 | Weiter gesperrt mit Hinweis; Zurück behält Eingaben |
| N4 | Schritt 3: Zusammenfassung, Spiel starten → Platzhalter |
| Q1 | Playwright WebKit iPad quer: Einstellung nach Reload, 5-Spieler-Spiel anlegen |
| Q2 | axe ohne Fehler; Farbe nie einziges Merkmal; Schwarz gut erkennbar |
| Q3 | Kurze Begriffe zweisprachig |
