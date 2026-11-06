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

/** Uhr mit Vorlauf (Ankündigung, M7-T): zählt `announceMs` lang negativ, dann ab 0. */
export function announcedClock(atMs: number, announceMs: number): Clock {
  return { baseMs: announceMs > 0 ? -announceMs : 0, runningSince: atMs }; // nie −0 (JSON macht daraus 0)
}

/** Abzurechnende Zeit: ohne Vorlauf (nie negativ). */
export function countedMs(clock: Clock, nowMs: number): number {
  return Math.max(0, elapsedMs(clock, nowMs));
}

export function stopClock(clock: Clock, atMs: number): Clock {
  return clock.runningSince === null ? clock : { baseMs: elapsedMs(clock, atMs), runningSince: null };
}

export function resumeClock(clock: Clock, atMs: number): Clock {
  return clock.runningSince === null ? { ...clock, runningSince: atMs } : clock;
}
