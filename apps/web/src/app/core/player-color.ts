import { PLAYER_COLORS } from '@twilight-timer/domain';

/** Hex-Wert einer Spielerfarbe (Domain-ID → CSS). */
export function colorHex(id: string | null): string {
  return PLAYER_COLORS.find((c) => c.id === id)?.hex ?? 'transparent';
}

/** Kante neben dem Farbbalken: bei Schwarz hell, damit der Balken auf dunklem Grund sichtbar bleibt. */
export function colorEdge(id: string | null): string {
  return id === 'black' ? 'var(--tt-muted)' : colorHex(id);
}
