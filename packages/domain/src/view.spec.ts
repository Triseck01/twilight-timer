import { describe, expect, it } from 'vitest';
import { createHistory, dispatch, undo } from './history';
import { canRedo, canUndo, initiativeOrder, pickStatus } from './view';
import { newGame, pickAll, play, unwrap } from './test-utils';

describe('pickStatus (M3/S1)', () => {
  it('5 Spieler: wer wählt, Wahl x von n, ein Durchgang, wer als Nächstes', () => {
    const s = play(newGame(5, { speakerId: 'p3' }), { type: 'pickCard', card: 1, atMs: 1000 });
    expect(pickStatus(s)).toEqual({ pickerId: 'p4', number: 2, total: 5, pass: 1, passes: 1, nextId: 'p5' });
  });

  it('3 Spieler: zweiter Durchgang wird erkannt', () => {
    const s = pickAll(newGame(3), [1, 2, 3, 4]);
    expect(pickStatus(s)).toEqual({ pickerId: 'p2', number: 5, total: 6, pass: 2, passes: 2, nextId: 'p3' });
  });

  it('letzte Wahl: niemand als Nächstes', () => {
    const s = pickAll(newGame(5), [1, 2, 3, 4]);
    expect(pickStatus(s)?.nextId).toBeNull();
  });

  it('außerhalb der Strategiephase: null', () => {
    expect(pickStatus(pickAll(newGame(5), [1, 2, 3, 4, 5]))).toBeNull();
  });
});

describe('canUndo / canRedo (M3/S5)', () => {
  it('folgen dem Verlauf', () => {
    let h = createHistory(newGame(5));
    expect([canUndo(h), canRedo(h)]).toEqual([false, false]);
    h = unwrap(dispatch(h, { type: 'pickCard', card: 1, atMs: 1000 }));
    expect([canUndo(h), canRedo(h)]).toEqual([true, false]);
    h = unwrap(undo(h, 2000));
    expect([canUndo(h), canRedo(h)]).toEqual([false, true]);
  });
});

describe('initiativeOrder', () => {
  it('Aktionsreihenfolge mit Initiative; Naalu-Token = 0; leer in der Strategiephase', () => {
    expect(initiativeOrder(newGame(5))).toEqual([]);
    const s = pickAll(newGame(5), [5, 1, 8, 3, 2]);
    expect(initiativeOrder(s)).toEqual([
      { playerId: 'p2', initiative: 1 },
      { playerId: 'p5', initiative: 2 },
      { playerId: 'p4', initiative: 3 },
      { playerId: 'p1', initiative: 5 },
      { playerId: 'p3', initiative: 8 },
    ]);
  });
});
