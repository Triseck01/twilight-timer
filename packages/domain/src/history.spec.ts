import { describe, expect, it } from 'vitest';
import { clockView } from './game';
import { HISTORY_LIMIT, createHistory, current, dispatch, redo, undo } from './history';
import { expectError, newGame, pickAll, player, unwrap } from './test-utils';
import type { GameEvent, History } from './types';

const MIN = 60_000;

/** 5 Spieler in der Aktionsphase; Zug von p2 läuft seit t=5000. */
function start(): History {
  return createHistory(pickAll(newGame(5), [5, 1, 8, 3, 2]));
}

const d = (h: History, e: GameEvent) => unwrap(dispatch(h, e));

describe('Undo/Redo (AC14)', () => {
  it('Undo stellt Zustand und Bank exakt wieder her (bei gleichem Zeitpunkt identisch)', () => {
    const h0 = start();
    const h1 = d(h0, { type: 'endTurn', atMs: 300_000 }); // p2 überzieht: Bank −210 s
    expect(player(current(h1), 'p2').bankMs).toBe(30 * MIN - 205_000);
    const back = unwrap(undo(h1, 300_000));
    expect(current(back)).toEqual(current(h0));
    expect(player(current(back), 'p2').bankMs).toBe(30 * MIN);
  });

  it('Zeit zwischen Fehlklick und Undo wird niemandem angerechnet', () => {
    let h = start(); // p2 ab 5000
    h = d(h, { type: 'endTurn', atMs: 65_000 }); // Fehlklick nach 60 s
    h = unwrap(undo(h, 665_000)); // Undo 10 min später
    expect(clockView(current(h), 665_000)).toMatchObject({ kind: 'turn', playerId: 'p2', elapsedMs: 60_000, running: true });
    expect(clockView(current(h), 675_000)).toMatchObject({ elapsedMs: 70_000 });
  });

  it('Redo stellt den Folgezustand wieder her, ebenfalls ohne Zwischenzeit', () => {
    let h = start();
    h = d(h, { type: 'endTurn', atMs: 65_000 }); // p5 ab 65 000
    const after = current(h);
    h = unwrap(undo(h, 70_000));
    h = unwrap(redo(h, 100_000));
    expect(current(h).players).toEqual(after.players);
    expect(clockView(current(h), 100_000)).toMatchObject({ kind: 'turn', playerId: 'p5', elapsedMs: 0 });
  });

  it('mehrfaches Undo und Redo zum selben Zeitpunkt ist verlustfrei', () => {
    let h = start();
    const events: GameEvent[] = [
      { type: 'endTurn', atMs: 10_000 },
      { type: 'useCard', card: 2, atMs: 20_000 },
      { type: 'primaryDone', atMs: 30_000 },
      { type: 'secondaryDone', atMs: 40_000 },
    ];
    const states = [current(h)];
    for (const e of events) {
      h = d(h, e);
      states.push(current(h));
    }
    for (let i = events.length - 1; i >= 0; i--) {
      h = unwrap(undo(h, 40_000));
      expect(current(h).players).toEqual(states[i]!.players);
      expect(current(h).cards).toEqual(states[i]!.cards);
    }
    for (let i = 1; i <= events.length; i++) {
      h = unwrap(redo(h, 40_000));
      expect(current(h).players).toEqual(states[i]!.players);
    }
  });

  it('eine neue Aktion nach Undo verwirft den Redo-Zweig', () => {
    let h = start();
    h = d(h, { type: 'endTurn', atMs: 10_000 });
    h = unwrap(undo(h, 11_000));
    h = d(h, { type: 'useCard', card: 1, atMs: 12_000 });
    expectError(redo(h, 13_000), 'NOTHING_TO_REDO');
    expect(h.entries.at(-1)!.event).toEqual({ type: 'useCard', card: 1, atMs: 12_000 });
  });

  it('jeder Eintrag speichert Ereignis und Zustand danach (ADR 0005)', () => {
    let h = start();
    h = d(h, { type: 'endTurn', atMs: 10_000 });
    expect(h.entries).toHaveLength(2);
    expect(h.entries[0]!.event).toBeNull();
    expect(h.entries[1]).toMatchObject({ event: { type: 'endTurn' }, state: current(h) });
  });

  it('nichts zum Rückgängigmachen / Wiederholen → Fehler, Verlauf unverändert', () => {
    const h = start();
    expectError(undo(h, 1), 'NOTHING_TO_UNDO');
    expectError(redo(h, 1), 'NOTHING_TO_REDO');
  });

  it('ungültiges Ereignis → Fehler, kein neuer Eintrag', () => {
    const h = start();
    expectError(dispatch(h, { type: 'pass', atMs: 6000 }), 'PASS_BLOCKED');
  });

  it('Pause und Fortsetzen erzeugen keinen Undo-Schritt', () => {
    let h = start();
    h = d(h, { type: 'endTurn', atMs: 10_000 });
    h = d(h, { type: 'pause', atMs: 20_000 });
    h = d(h, { type: 'resume', atMs: 50_000 });
    expect(h.entries).toHaveLength(2);
    expect(current(h).pausedTotalMs).toBe(30_000);
    // Undo landet beim Zug von p2, nicht bei „vor der Pause“
    h = unwrap(undo(h, 60_000));
    expect(current(h).step).toMatchObject({ kind: 'turn', playerId: 'p2' });
    expect(current(h).pausedTotalMs).toBe(30_000);
  });

  it('Undo während der Pause: Zustand bleibt pausiert, Uhr steht beim Stand des Fehlklicks', () => {
    let h = start(); // p2 ab 5000
    h = d(h, { type: 'endTurn', atMs: 35_000 });
    h = d(h, { type: 'pause', atMs: 40_000 });
    h = unwrap(undo(h, 100_000));
    const s = current(h);
    expect(s.pause).toEqual({ since: 40_000 });
    expect(clockView(s, 500_000)).toMatchObject({ playerId: 'p2', elapsedMs: 30_000, running: false });
    h = d(h, { type: 'resume', atMs: 600_000 });
    expect(clockView(current(h), 610_000)).toMatchObject({ elapsedMs: 40_000, running: true });
    expect(current(h).pausedTotalMs).toBe(560_000);
  });

  it('erneutes Undo nach Undo+neuer Aktion rechnet die Zwischenzeit nicht nachträglich an', () => {
    let h = start(); // p2 ab 5000
    h = d(h, { type: 'endTurn', atMs: 15_000 }); // Fehlklick nach 10 s
    h = unwrap(undo(h, 615_000)); // 10 min später: p2 wieder bei 10 s
    h = d(h, { type: 'endTurn', atMs: 625_000 }); // p2 nach 20 s fertig
    h = unwrap(undo(h, 625_000));
    expect(clockView(current(h), 625_000)).toMatchObject({ playerId: 'p2', elapsedMs: 20_000 });
  });

  it(`hält höchstens ${HISTORY_LIMIT} Undo-Schritte`, () => {
    let h = start();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) h = d(h, { type: 'endTurn', atMs: 10_000 + i });
    expect(h.entries).toHaveLength(HISTORY_LIMIT + 1);
    for (let i = 0; i < HISTORY_LIMIT; i++) h = unwrap(undo(h, 99_999));
    expectError(undo(h, 99_999), 'NOTHING_TO_UNDO');
  });
});
