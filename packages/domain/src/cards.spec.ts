import { describe, expect, it } from 'vitest';
import { STRATEGY_CARDS, cardLabel } from './cards';

describe('Strategiekarten (§5.6)', () => {
  it('acht Karten, Nummer = Initiative 1–8', () => {
    expect(STRATEGY_CARDS.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it.each([
    [1, 'Führungsstärke / Leadership'],
    [2, 'Diplomatie / Diplomacy'],
    [3, 'Politik / Politics'],
    [4, 'Infrastruktur / Construction'],
    [5, 'Handel / Trade'],
    [6, 'Kriegsführung / Warfare'],
    [7, 'Technologie / Technology'],
    [8, 'Imperium / Imperial'],
  ])('Karte %i heißt auf Deutsch „%s“ (Deutsch zuerst, Standard)', (n, label) => {
    expect(cardLabel(n)).toBe(label);
    expect(cardLabel(n, 'de')).toBe(label);
  });

  it('auf Englisch: Englisch zuerst', () => {
    expect(cardLabel(1, 'en')).toBe('Leadership / Führungsstärke');
  });

  it('unbekannte Kartennummer → leerer Text statt Absturz', () => {
    expect(cardLabel(9)).toBe('');
  });
});
