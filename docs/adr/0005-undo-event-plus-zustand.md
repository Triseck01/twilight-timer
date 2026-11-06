# ADR 0005: Undo/Redo speichert Event + resultierenden Zustand

Datum: 2026-11-06 · Status: angenommen (Entscheidung des Nutzers)

## Kontext
Konzept §5.5 sieht Schnappschüsse vor. Diskutiert wurde ein reines Event-Log (Zustand per Replay). Nachteil: Jede spätere Korrektur der Logik würde Bankzeiten gespeicherter Spiele beim Laden still verändern.

## Entscheidung
Jeder Verlaufseintrag speichert **das Ereignis und den Zustand danach**. Undo/Redo bewegt einen Cursor; eine neue Aktion nach Undo verwirft den Redo-Zweig. Die Ereignisliste dient Statistik (v1.x) ohne Replay.

## Folgen
Wird in M1 umgesetzt; Akzeptanzkriterien von M1 bauen darauf auf.
