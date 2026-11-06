import { computed, DestroyRef, DOCUMENT, inject, Service, signal } from '@angular/core';
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
import { GAME_STORAGE, GameRepository, newGameId } from '../core/game-repository';
import { NOW } from '../core/ticker';

/** Ereignis ohne Zeitstempel; den setzt die Sitzung beim Absenden. */
export type EventInput = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'atMs'> : never) : never;

const ACTIVE_KEY = 'twilight-timer.active.v1';
/** Ab dieser Abwesenheit wird das Spiel ab der letzten Aktivität pausiert (M7/P3, Entscheidung des Nutzers). */
export const ABSENCE_MS = 5 * 60_000;
const HEARTBEAT_MS = 5000;

/** Das laufende Spiel (Verlauf mit Undo/Redo). Jede Änderung wird sofort gespeichert (M7). */
@Service()
export class GameSession {
  private readonly now = inject(NOW);
  private readonly repo = inject(GameRepository);
  private readonly storage = inject(GAME_STORAGE);
  private readonly history = signal<History | null>(null);
  private readonly gameId = signal<string | null>(null);
  private createdAt = 0;

  readonly id = this.gameId.asReadonly();
  /** Speichern fehlgeschlagen (voll/blockiert) – Spiel läuft im Arbeitsspeicher weiter (P7). */
  readonly storageError = signal(false);

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

  constructor() {
    this.restoreActive();
    const doc = inject(DOCUMENT);
    const onVisibility = () => {
      if (doc.visibilityState === 'visible') this.checkAbsence();
      this.heartbeat();
    };
    doc.addEventListener('visibilitychange', onVisibility);
    const id = setInterval(() => this.heartbeat(), HEARTBEAT_MS);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(id);
      doc.removeEventListener('visibilitychange', onVisibility);
    });
  }

  /** Legt ein Spiel an und speichert es; die Konfiguration wird kopiert (Domain). */
  start(setup: GameSetup, config: TimeConfig, atMs: number): Result<unknown> {
    const result = createGame(setup, config, atMs);
    if (!result.ok) return result;
    this.gameId.set(newGameId(atMs));
    this.createdAt = atMs;
    this.setActive();
    this.commit(createHistory(result.value));
    return result;
  }

  /** Lädt ein gespeichertes Spiel (Fortsetzen / Ergebnis ansehen). */
  loadGame(id: string): Result<unknown> {
    const r = this.repo.load(id);
    if (!r.ok) return r;
    this.gameId.set(id);
    this.createdAt = r.value.createdAt;
    this.history.set(r.value.history);
    this.setActive();
    this.checkAbsence();
    this.heartbeat();
    return r;
  }

  /** „Spiel fortsetzen“: das zuletzt gespielte laufende Spiel, falls keines geladen ist. */
  continueLatest(): void {
    const g = this.game();
    if (g && g.step.kind !== 'finished') return;
    const latest = this.repo.latestRunning();
    if (latest) this.loadGame(latest.id);
  }

  deleteGame(id: string): void {
    this.repo.remove(id);
    if (this.gameId() === id) this.discardFromMemory();
  }

  /** Entfernt das Spiel nur aus der Sitzung (bleibt gespeichert). */
  discardFromMemory(): void {
    this.history.set(null);
    this.gameId.set(null);
    try {
      this.storage?.removeItem(ACTIVE_KEY);
    } catch {
      // ohne Speicher nichts zu tun
    }
  }

  /** Sendet ein Ereignis mit dem aktuellen Zeitstempel. Ungültige Ereignisse ändern nichts. */
  dispatch(event: EventInput): Result<unknown> {
    return this.apply((h) => dispatch(h, { ...event, atMs: this.now() } as GameEvent));
  }

  /** Pausiert ein laufendes, nicht pausiertes Spiel (beim Verlassen der Spielansicht, M3-H). */
  pauseIfRunning(): void {
    const g = this.game();
    if (g && !g.pause && g.step.kind !== 'finished') this.dispatch({ type: 'pause' });
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

  /** Merkt sich die letzte Aktivität (für die Abwesenheitsregel P3). */
  heartbeat(): void {
    const id = this.gameId();
    if (id) this.repo.markSeen(id, this.now());
  }

  private apply(fn: (h: History) => Result<History>): Result<unknown> {
    const h = this.history();
    if (!h) return { ok: false, error: { code: 'INVALID_STEP', message: 'Kein laufendes Spiel.' } };
    const result = fn(h);
    if (result.ok) this.commit(result.value);
    return result;
  }

  private commit(h: History): void {
    this.history.set(h);
    const id = this.gameId();
    if (!id) return;
    this.storageError.set(!this.repo.save(id, this.createdAt, h, this.now()));
    this.repo.markSeen(id, this.now());
  }

  /** War die App länger als ABSENCE_MS weg, zählt die Zeit seit der letzten Aktivität als Pause (P3). */
  private checkAbsence(): void {
    const g = this.game();
    const id = this.gameId();
    if (!g || !id || g.pause || g.step.kind === 'finished') return;
    const seen = this.repo.lastSeen(id);
    if (seen !== null && this.now() - seen > ABSENCE_MS) {
      this.apply((h) => dispatch(h, { type: 'pause', atMs: seen }));
    }
  }

  private restoreActive(): void {
    let id: string | null;
    try {
      id = this.storage?.getItem(ACTIVE_KEY) ?? null;
    } catch {
      id = null;
    }
    if (!id) return;
    const r = this.repo.load(id);
    if (!r.ok || current(r.value.history).step.kind === 'finished') return;
    this.gameId.set(id);
    this.createdAt = r.value.createdAt;
    this.history.set(r.value.history);
    this.checkAbsence();
  }

  private setActive(): void {
    try {
      const id = this.gameId();
      if (id) this.storage?.setItem(ACTIVE_KEY, id);
    } catch {
      // ohne Speicher kein Wiederherstellen nach Neustart
    }
  }
}
