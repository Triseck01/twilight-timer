import { computed, Service, signal } from '@angular/core';
import { createGame, createHistory, current, type GameSetup, type History, type Result, type TimeConfig } from '@twilight-timer/domain';

/** Das laufende Spiel (Verlauf mit Undo/Redo). Speichern im Browser folgt mit M7. */
@Service()
export class GameSession {
  private readonly history = signal<History | null>(null);
  readonly game = computed(() => {
    const h = this.history();
    return h ? current(h) : null;
  });

  /** Legt ein Spiel an; die Konfiguration wird dabei kopiert (Domain). */
  start(setup: GameSetup, config: TimeConfig, atMs: number): Result<unknown> {
    const result = createGame(setup, config, atMs);
    if (result.ok) this.history.set(createHistory(result.value));
    return result;
  }
}
