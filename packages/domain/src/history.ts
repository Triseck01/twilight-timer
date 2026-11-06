import { elapsedMs } from './clock';
import { applyEvent, withStepClock } from './game';
import type { GameEvent, GameState, History, Result } from './types';

/** Maximale Zahl an Undo-Schritten (Konzept §5.5: etwa 30). */
export const HISTORY_LIMIT = 30;

export function createHistory(state: GameState): History {
  return { entries: [{ event: null, state }], cursor: 0 };
}

export function current(history: History): GameState {
  return history.entries[history.cursor]!.state;
}

/**
 * Wendet ein Ereignis an. Spielaktionen erzeugen einen Eintrag (Ereignis + Zustand danach, ADR 0005)
 * und verwerfen den Redo-Zweig. Pause/Fortsetzen ändern nur den aktuellen Eintrag und sind kein Undo-Schritt.
 */
export function dispatch(history: History, event: GameEvent): Result<History> {
  const result = applyEvent(current(history), event);
  if (!result.ok) return result;
  if (event.type === 'pause' || event.type === 'resume') return { ok: true, value: replaceCurrent(history, result.value) };
  const entries = [...history.entries.slice(0, history.cursor + 1), { event, state: result.value }];
  const trimmed = entries.length > HISTORY_LIMIT + 1 ? entries.slice(entries.length - HISTORY_LIMIT - 1) : entries;
  return { ok: true, value: { entries: trimmed, cursor: trimmed.length - 1 } };
}

/** Geht einen Schritt zurück. Die Zeit zwischen dem rückgängig gemachten Ereignis und `atMs` wird niemandem angerechnet. */
export function undo(history: History, atMs: number): Result<History> {
  if (history.cursor === 0) return { ok: false, error: { code: 'NOTHING_TO_UNDO', message: 'Nichts zum Rückgängigmachen.' } };
  const undone = history.entries[history.cursor]!.event!;
  return { ok: true, value: moveTo(history, history.cursor - 1, undone.atMs, atMs) };
}

/** Geht einen Schritt vor. Die Zeit zwischen dem ursprünglichen Ereignis und `atMs` wird niemandem angerechnet. */
export function redo(history: History, atMs: number): Result<History> {
  if (history.cursor >= history.entries.length - 1) {
    return { ok: false, error: { code: 'NOTHING_TO_REDO', message: 'Nichts zum Wiederholen.' } };
  }
  const redone = history.entries[history.cursor + 1]!.event!;
  return { ok: true, value: moveTo(history, history.cursor + 1, redone.atMs, atMs) };
}

/**
 * Setzt den Cursor auf `index`. Die Uhr des Zielzustands wird auf ihren Stand bei `fromMs` eingefroren
 * und läuft ab `toMs` weiter (bzw. bleibt angehalten, wenn gerade pausiert ist).
 */
function moveTo(history: History, index: number, fromMs: number, toMs: number): History {
  const now = current(history);
  const target = history.entries[index]!.state;
  const rebased =
    fromMs === toMs && !now.pause
      ? target
      : withStepClock(target, (clock) =>
          clock.runningSince === null ? clock : { baseMs: elapsedMs(clock, fromMs), runningSince: now.pause ? null : toMs },
        );
  // Pausen gehören nicht zum Spielablauf: Pausenstatus, -dauer und -zahl bleiben beim Undo/Redo erhalten.
  const state: GameState = {
    ...rebased,
    pause: now.pause,
    pausedTotalMs: now.pausedTotalMs,
    stats: { ...rebased.stats, pauseCount: now.stats.pauseCount },
  };
  return replaceCurrent({ entries: history.entries, cursor: index }, state);
}

function replaceCurrent(history: History, state: GameState): History {
  const entries = history.entries.map((e, i) => (i === history.cursor ? { event: e.event, state } : e));
  return { entries, cursor: history.cursor };
}
