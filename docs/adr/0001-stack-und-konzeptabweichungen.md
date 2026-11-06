# ADR 0001: Stack und überholte Konzeptabschnitte

Datum: 2026-11-06 · Status: angenommen · Grundlage: `docs/planning/05-synthese.md`

## Kontext
`ti4-timer-konzept-v2.md` legt in §2, §7.1, §9 und §12 Vanilla JS ohne Build-Schritt, Entwicklung auf einem Windows-PC und `node --test` fest. Der Nutzer hat am 2026-11-06 einen neuen technischen Rahmen vorgegeben: Angular, Node, Turborepo-Monorepo, lokale Entwicklung muss immer funktionieren.

## Entscheidung
- **Produktanforderungen** (§1, §3–§6, §8 Meilensteine) des Konzepts **gelten weiter**.
- **Überholt** sind: §2 Zeile „Technik“ und „Entwicklung“, **§7.1** (Vanilla JS, kein Build), §7.2 (Modulstruktur), §9 (Windows-PC, `node --test` als einziges Testwerkzeug), §12 Weg 1 (Windows).
- Neuer Stack: Angular 22.2 (PWA, zoneless, Signals) in `apps/web`, framework-freie Logik in `packages/domain`, npm workspaces + Turborepo 2.11, Node 26 LTS, Vitest, Entwicklung auf macOS, Zielgerät iPad.
- Die Struktur aus §7.2 lebt sinngemäß weiter: `logic/*` → `packages/domain/src`, `ui/` + `platform/` → `apps/web/src`.

## Folgen
CLAUDE.md verweist auf diese ADR, damit spätere Sitzungen nicht dem alten Plan folgen.
