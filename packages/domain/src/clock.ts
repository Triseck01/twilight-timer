import type { Clock } from './types';

/** Uhren rechnen nur mit Zeitstempeln, nie mit Ticks (Konzept §4.1, §7.4). */
export function startClock(atMs: number): Clock {
  return { baseMs: 0, runningSince: atMs };
}

/** Vergangene Zeit; springt die Gerätezeit zurück, nie negativ. */
export function elapsedMs(clock: Clock, nowMs: number): number {
  const running = clock.runningSince === null ? 0 : Math.max(0, nowMs - clock.runningSince);
  return clock.baseMs + running;
}

export function stopClock(clock: Clock, atMs: number): Clock {
  return clock.runningSince === null ? clock : { baseMs: elapsedMs(clock, atMs), runningSince: null };
}

export function resumeClock(clock: Clock, atMs: number): Clock {
  return clock.runningSince === null ? { ...clock, runningSince: atMs } : clock;
}
