import { describe, expect, it } from 'vitest';
import { PLAYER_COLORS, colorLabel } from './colors';

describe('Spielerfarben (Entscheidung des Nutzers)', () => {
  it('genau 8 Farben in fester Reihenfolge', () => {
    expect(PLAYER_COLORS.map((c) => c.id)).toEqual(['black', 'red', 'blue', 'green', 'gold', 'purple', 'neon-orange', 'neon-pink']);
  });

  it('Namen einsprachig je eingestellter Sprache (Standard Deutsch); gültige Hex-Werte', () => {
    expect(colorLabel('neon-orange')).toBe('Neonorange');
    expect(colorLabel('neon-orange', 'en')).toBe('Neon orange');
    expect(colorLabel('black', 'en')).toBe('Black');
    for (const c of PLAYER_COLORS) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(colorLabel('weiss')).toBe('');
  });
});
