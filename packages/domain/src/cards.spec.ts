import { describe, expect, it } from 'vitest';
import { STRATEGY_CARDS, cardLabel } from './cards';

describe('Strategiekarten (§5.6)', () => {
  it('acht Karten, Nummer = Initiative 1–8', () => {
    expect(STRATEGY_CARDS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each([
    [1, 'Leadership / Führungsstärke'],
    [2, 'Diplomacy / Diplomatie'],
    [3, 'Politics / Politik'],
    [4, 'Construction / Infrastruktur'],
    [5, 'Trade / Handel'],
    [6, 'Warfare / Kriegsführung'],
    [7, 'Technology / Technologie'],
    [8, 'Imperial / Imperium'],
  ])('Karte %i heißt „%s“', (n, label) => {
    expect(cardLabel(n)).toBe(label);
  });

  it('unbekannte Kartennummer → leerer Text statt Absturz', () => {
    expect(cardLabel(9)).toBe('');
  });
});
