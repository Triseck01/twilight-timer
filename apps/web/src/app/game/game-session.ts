import { computed, inject, Service, signal } from '@angular/core';
import {
  canRedo,
  canUndo,
  createGame,
  createHistory,
  current,
  dispatch,
  redo,
  undo,
  type GameEvent,
  type GameSetup,
  type History,
  type Result,
  type TimeConfig,
} from '@twilight-timer/domain';
import { NOW } from '../core/ticker';

/** Ereignis ohne Zeitstempel; den setzt die Sitzung beim Absenden. */
export type EventInput = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'atMs'> : never) : never;

/** Das laufende Spiel (Verlauf mit Undo/Redo). Speichern im Browser folgt mit M7. */
@Service()
export class GameSession {
  private readonly now = inject(NOW);
  private readonly history = signal<History | null>(null);

  readonly game = computed(() => {
    const h = this.history();
    return h ? current(h) : null;
  });
  readonly canUndo = computed(() => {
    const h = this.history();
    return h !== null && canUndo(h);
  });
  readonly canRedo = computed(() => {
    const h = this.history();
    return h !== null && canRedo(h);
  });

  /** Legt ein Spiel an; die Konfiguration wird dabei kopiert (Domain). */
  start(setup: GameSetup, config: TimeConfig, atMs: number): Result<unknown> {
    const result = createGame(setup, config, atMs);
    if (result.ok) this.history.set(createHistory(result.value));
    return result;
  }

  /** Sendet ein Ereignis mit dem aktuellen Zeitstempel. Ungültige Ereignisse ändern nichts. */
  dispatch(event: EventInput): Result<unknown> {
    return this.apply((h) => dispatch(h, { ...event, atMs: this.now() } as GameEvent));
  }

  /** Pausiert ein laufendes, nicht pausiertes Spiel (beim Verlassen der Spielansicht, M3-H). */
  pauseIfRunning(): void {
    const g = this.game();
    if (g && !g.pause) this.dispatch({ type: 'pause' });
  }

  /** Verwirft das laufende Spiel (nach Rückfrage beim Start eines neuen Spiels). */
  discard(): void {
    this.history.set(null);
  }

  /** „Zurück ins Spiel“ nach dem Spielende: nimmt Siegerwahl und „Spiel beenden“ zurück. */
  backToGame(): void {
    for (let i = 0; i < 3 && this.game()?.step.kind === 'finished'; i++) this.undo();
  }

  undo(): Result<unknown> {
    return this.apply((h) => undo(h, this.now()));
  }

  redo(): Result<unknown> {
    return this.apply((h) => redo(h, this.now()));
  }

  private apply(fn: (h: History) => Result<History>): Result<unknown> {
    const h = this.history();
    if (!h) return { ok: false, error: { code: 'INVALID_STEP', message: 'Kein laufendes Spiel.' } };
    const result = fn(h);
    if (result.ok) this.history.set(result.value);
    return result;
  }
}
