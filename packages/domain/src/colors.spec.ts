import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, colorLabel } from './colors';

describe('Spielerfarben (Entscheidung des Nutzers)', () => {
  it('genau 8 Farben in fester Reihenfolge', () => {
    expect(PLAYER_COLORS.map((c) => c.id)).toEqual(['black', 'red', 'blue', 'green', 'gold', 'purple', 'neon-orange', 'neon-pink']);
  });

  it('zweisprachige Namen und gültige Hex-Werte', () => {
    expect(colorLabel('neon-orange')).toBe('Neonorange / Neon orange');
    expect(colorLabel('black')).toBe('Schwarz / Black');
    for (const c of PLAYER_COLORS) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(colorLabel('weiss')).toBe('');
  });
});
