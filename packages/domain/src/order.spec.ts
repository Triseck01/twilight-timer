import { describe, expect, it } from 'vitest';
import { actionOrder, cardsPerPlayer, nextActor, pickOrder, secondaryOrder, voteOrder } from './order';

const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('Karten pro Spieler', () => {
  it.each([
    [3, 2],
    [4, 2],
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 1],
  ])('%i Spieler → %i Karte(n)', (n, k) => {
    expect(cardsPerPlayer(n)).toBe(k);
  });
});

describe('Wahlreihenfolge (AC7)', () => {
  it('beginnt beim Sprecher, dann im Uhrzeigersinn', () => {
    expect(pickOrder(seats(6), 'p4')).toEqual(['p4', 'p5', 'p6', 'p1', 'p2', 'p3']);
  });

  it.each([5, 6, 7, 8])('%i Spieler: eine Wahl pro Spieler', (n) => {
    const order = pickOrder(seats(n), 'p1');
    expect(order).toEqual(seats(n));
  });

  it.each([3, 4])('%i Spieler: zwei Durchgänge in derselben Reihenfolge', (n) => {
    const order = pickOrder(seats(n), 'p2');
    const pass = [...seats(n).slice(1), 'p1'];
    expect(order).toEqual([...pass, ...pass]);
  });
});

describe('Aktionsreihenfolge (AC8)', () => {
  it('sortiert nach Kartennummer', () => {
    const holdings = [
      { playerId: 'p1', cards: [5] },
      { playerId: 'p2', cards: [1] },
      { playerId: 'p3', cards: [8] },
      { playerId: 'p4', cards: [3] },
      { playerId: 'p5', cards: [2] },
    ];
    expect(actionOrder(holdings, null)).toEqual(['p2', 'p5', 'p4', 'p1', 'p3']);
  });

  it('bei zwei Karten zählt die niedrigere', () => {
    const holdings = [
      { playerId: 'p1', cards: [2, 8] },
      { playerId: 'p2', cards: [5, 1] },
      { playerId: 'p3', cards: [3, 4] },
    ];
    expect(actionOrder(holdings, null)).toEqual(['p2', 'p1', 'p3']);
  });

  it('Naalu-Token (Initiative 0) ist zuerst, auch mit hoher Karte', () => {
    const holdings = [
      { playerId: 'p1', cards: [1] },
      { playerId: 'p2', cards: [8] },
      { playerId: 'p3', cards: [4] },
    ];
    expect(actionOrder(holdings, 'p2')).toEqual(['p2', 'p1', 'p3']);
  });

  it('verändert die Eingabe nicht', () => {
    const holdings = [
      { playerId: 'p1', cards: [3] },
      { playerId: 'p2', cards: [1] },
    ];
    actionOrder(holdings, null);
    expect(holdings.map((h) => h.playerId)).toEqual(['p1', 'p2']);
  });
});

describe('Sekundär- und Abstimmungsreihenfolge (AC9)', () => {
  it('Sekundär: links vom Aktiven beginnend im Uhrzeigersinn, ohne den Aktiven', () => {
    expect(secondaryOrder(seats(5), 'p4')).toEqual(['p5', 'p1', 'p2', 'p3']);
  });

  it('Abstimmung: links vom Sprecher beginnend, Sprecher zuletzt', () => {
    expect(voteOrder(seats(5), 'p3')).toEqual(['p4', 'p5', 'p1', 'p2', 'p3']);
    expect(voteOrder(seats(8), 'p8')).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
  });
});

describe('nächster Spieler in der Aktionsphase (AC11)', () => {
  const order = ['p2', 'p5', 'p4', 'p1', 'p3'];

  it('nimmt den nächsten nach Initiative, zyklisch', () => {
    expect(nextActor(order, new Set(), 'p4')).toBe('p1');
    expect(nextActor(order, new Set(), 'p3')).toBe('p2');
  });

  it('überspringt Gepasste', () => {
    expect(nextActor(order, new Set(['p1', 'p3']), 'p4')).toBe('p2');
  });

  it('haben alle anderen gepasst, ist derselbe Spieler wieder dran', () => {
    expect(nextActor(order, new Set(['p2', 'p5', 'p1', 'p3']), 'p4')).toBe('p4');
  });

  it('haben alle gepasst → null', () => {
    expect(nextActor(order, new Set(order), 'p4')).toBeNull();
  });
});
