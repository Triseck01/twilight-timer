# ADR 0007: Sprache über ein eigenes Laufzeit-Wörterbuch

Datum: 2026-11-06 · Status: angenommen

## Kontext
Nutzerentscheidung (M2-L): Oberfläche standardmäßig nur Deutsch, per Schalter Englisch; Völker- und Strategiekartennamen immer zweisprachig (eingestellte Sprache zuerst). Ersetzt Konzept §1 Punkt 10. Angulars eigenes i18n (`@angular/localize`) übersetzt zur Build-Zeit: je Sprache ein eigener Build unter eigener Adresse, Umschalten nur per Seitenwechsel, getrennte Speicherstände.

## Entscheidung
- Eigenes, kleines Laufzeit-Wörterbuch: `apps/web/src/app/core/i18n/messages.ts` (`DE` als Referenz, `EN: Record<MessageKey, string>` – fehlende Übersetzung = Typfehler), Dienst `I18n` (Signal `lang`, `t(key, params)`, gespeichert in localStorage, setzt `<html lang>`), Seitentitel über `I18nTitleStrategy`.
- Namen von Völkern, Karten und Farben liefert die Domain (`factionLabel/cardLabel/colorLabel(id, lang)`).
- Repo-Test `tests/repo/i18n-templates.test.mjs` verhindert fest eingetragene Texte in Vorlagen.

## Folgen
- Keine zusätzliche Bibliothek, sofortiger Wechsel ohne Neuladen.
- Kein Pluralsystem und keine Zahlenformatierung nach Gebietsschema; bei Bedarf später ergänzen (oder auf eine Bibliothek wechseln, neue ADR).
