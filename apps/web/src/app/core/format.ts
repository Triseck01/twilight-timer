import { formatDuration } from '@twilight-timer/domain';

/** Lange Dauern für Auswertungen: „h:mm:ss“ ab einer Stunde, sonst „m:ss“ (abgerundet). */
export function formatLong(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  if (total < 3600) return formatDuration(total);
  const h = Math.floor(total / 3600);
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
