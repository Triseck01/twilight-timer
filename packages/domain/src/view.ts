import type { GameState, History, PlayerId } from './types';

/** Anzeige-Daten der Strategiephase (M3/S1); `null` außerhalb der Wahl. */
export interface PickStatus {
  readonly pickerId: PlayerId;
  /** Laufende Nummer der Wahl (1-basiert). */
  readonly number: number;
  readonly total: number;
  /** Durchgang (1 oder 2; zwei Durchgänge bei 3–4 Spielern). */
  readonly pass: number;
  readonly passes: number;
  readonly nextId: PlayerId | null;
}

export function pickStatus(state: GameState): PickStatus | null {
  const step = state.step;
  if (step.kind !== 'pick') return null;
  const perPass = state.players.length;
  return {
    pickerId: step.queue[step.index]!,
    number: step.index + 1,
    total: step.queue.length,
    pass: Math.floor(step.index / perPass) + 1,
    passes: step.queue.length / perPass,
    nextId: step.queue[step.index + 1] ?? null,
  };
}

export const canUndo = (history: History): boolean => history.cursor > 0;
export const canRedo = (history: History): boolean => history.cursor < history.entries.length - 1;

/** Anzeige-Daten der Sekundärphase (M4/A6); `null` außerhalb. */
export interface SecondaryStatus {
  readonly activeId: PlayerId;
  readonly card: number;
  readonly queue: readonly PlayerId[];
  readonly index: number;
  readonly answers: readonly boolean[];
  readonly askingId: PlayerId;
}

export function secondaryStatus(state: GameState): SecondaryStatus | null {
  const step = state.step;
  if (step.kind !== 'secondary') return null;
  return {
    activeId: step.activeId,
    card: step.card,
    queue: step.queue,
    index: step.index,
    answers: step.answers,
    askingId: step.queue[step.index]!,
  };
}

/** Anzeige-Daten der Agenda-Zeitfenster (M5/G8–G10); `null` außerhalb. */
export interface AgendaWindowStatus {
  readonly agenda: 1 | 2;
  readonly window: 'when' | 'after';
  readonly queue: readonly PlayerId[];
  readonly index: number;
  readonly answers: readonly boolean[];
  readonly askingId: PlayerId;
}

export function agendaWindowStatus(state: GameState): AgendaWindowStatus | null {
  const step = state.step;
  if (step.kind !== 'agendaWindow') return null;
  return { agenda: step.agenda, window: step.window, queue: step.queue, index: step.index, answers: step.answers, askingId: step.queue[step.index]! };
}
