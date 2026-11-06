import type { TimeConfig } from './types';

/**
 * Rechnet einen Zug der Aktionsphase ab (Konzept §4.1):
 * Überlauf über die Zugzeit kostet Bank; mit Gutschrift wird ungenutzte Zugzeit gutgeschrieben
 * (nicht beim Passen, außer `creditPass`), gedeckelt bei der Obergrenze. Die Bank darf negativ werden.
 * Eine Bank über der Obergrenze (Startbank > Obergrenze) wird durch Gutschrift nicht gekürzt.
 */
export function settleTurn(bankMs: number, usedMs: number, config: TimeConfig, opts: { readonly pass: boolean }): number {
  const turnMs = config.turnSec * 1000;
  const afterOverflow = bankMs - Math.max(0, usedMs - turnMs);
  if (!config.credit || (opts.pass && !config.creditPass)) return afterOverflow;
  const credited = afterOverflow + Math.max(0, turnMs - usedMs);
  return Math.max(afterOverflow, Math.min(credited, config.bankCapSec * 1000));
}

/** Bank inklusive laufendem Überzug des aktuellen Zuges. */
export function liveBank(bankMs: number, elapsedMs: number, config: TimeConfig): number {
  return bankMs - Math.max(0, elapsedMs - config.turnSec * 1000);
}
