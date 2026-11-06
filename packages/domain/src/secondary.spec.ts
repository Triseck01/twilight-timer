import { describe, expect, it } from 'vitest';
import { applyEvent, clockView } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { finalStats } from './stats';
import { expectError, newGame, pickAll, play, unwrap } from './test-utils';
import { secondaryStatus } from './view';
import type { GameState } from './types';

/** 5 Spieler, Sprecher p1. Karten: p1→5, p2→1, p3→8, p4→3, p5→2 ⇒ Reihenfolge p2, p5, p4, p1, p3. p2 ist am Zug ab t=5000. */
const actionPhase = (): GameState => pickAll(newGame(5), [5, 1, 8, 3, 2]);

/** p2 nutzt Karte 1, Primär erledigt bei t=20 000 → Sekundärphase. */
const inSecondary = (): GameState =>
  play(actionPhase(), { type: 'useCard', card: 1, atMs: 10_000 }, { type: 'primaryDone', atMs: 20_000 });

describe('Sekundärphase reihum (D-S1–D-S3)', () => {
  it('Reihenfolge links vom Aktiven im Uhrzeigersinn; der Erste wird gefragt', () => {
    expect(secondaryStatus(inSecondary())).toEqual({
      activeId: 'p2',
      card: 1,
      queue: ['p3', 'p4', 'p5', 'p1'],
      index: 0,
      answers: [],
      askingId: 'p3',
    });
  });

  it('Ja/Nein geht zum Nächsten und merkt sich die Antworten', () => {
    const s = play(inSecondary(), { type: 'secondaryAnswer', use: true, atMs: 25_000 }, { type: 'secondaryAnswer', use: false, atMs: 26_000 });
    expect(secondaryStatus(s)).toMatchObject({ index: 2, answers: [true, false], askingId: 'p5' });
  });

  it('nach dem Letzten ist der nächste nicht gepasste Spieler nach Initiative dran (D-S2)', () => {
    let s = inSecondary();
    for (let i = 0; i < 4; i++) s = play(s, { type: 'secondaryAnswer', use: i % 2 === 0, atMs: 30_000 + i });
    expect(s.step).toMatchObject({ kind: 'turn', playerId: 'p5' });
    expect(secondaryStatus(s)).toBeNull();
  });

  it('„Rest: alle Nein“ beendet die Sekundärphase sofort', () => {
    const s = play(inSecondary(), { type: 'secondaryAnswer', use: true, atMs: 25_000 }, { type: 'secondaryDone', atMs: 26_000 });
    expect(s.step).toMatchObject({ kind: 'turn', playerId: 'p5' });
  });

  it('Tisch-Timer läuft über alle Antworten durch, ohne Limit; niemandem wird Zeit berechnet (D-S3)', () => {
    let s = inSecondary();
    const banks = s.players.map((p) => p.bankMs);
    s = play(s, { type: 'secondaryAnswer', use: true, atMs: 200_000 });
    expect(clockView(s, 900_000)).toEqual({ kind: 'secondary', activeId: 'p2', elapsedMs: 880_000, running: true });
    s = play(s, { type: 'pause', atMs: 900_000 }, { type: 'resume', atMs: 1_000_000 });
    expect(clockView(s, 1_000_000)).toMatchObject({ elapsedMs: 880_000 });
    expect(s.players.map((p) => p.bankMs)).toEqual(banks);
  });

  it('Gepasste werden gefragt; danach ist der nächste nicht gepasste Spieler dran (A11)', () => {
    // p2 nutzt Karte 1 und passt später; p5 nutzt Karte 2, p4 Karte 3 …
    let s = actionPhase();
    s = play(s, { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 }, { type: 'secondaryDone', atMs: 8000 });
    s = play(s, { type: 'useCard', card: 2, atMs: 9000 }, { type: 'primaryDone', atMs: 10_000 }, { type: 'secondaryDone', atMs: 11_000 });
    s = play(s, { type: 'endTurn', atMs: 12_000 }); // p4
    s = play(s, { type: 'endTurn', atMs: 13_000 }); // p1
    s = play(s, { type: 'endTurn', atMs: 14_000 }); // p3
    s = play(s, { type: 'pass', atMs: 15_000 }); // p2 passt
    s = play(s, { type: 'pass', atMs: 16_000 }); // p5 passt
    expect(s.step).toMatchObject({ kind: 'turn', playerId: 'p4' });
    s = play(s, { type: 'useCard', card: 3, atMs: 17_000 }, { type: 'primaryDone', atMs: 18_000 });
    const st = secondaryStatus(s)!;
    expect(st.queue).toEqual(['p5', 'p1', 'p2', 'p3']);
    expect(st.askingId).toBe('p5');
    for (let i = 0; i < 4; i++) s = play(s, { type: 'secondaryAnswer', use: true, atMs: 19_000 + i });
    expect(s.step).toMatchObject({ kind: 'turn', playerId: 'p1' });
  });

  it('Antwort außerhalb der Sekundärphase → INVALID_STEP', () => {
    expectError(applyEvent(actionPhase(), { type: 'secondaryAnswer', use: true, atMs: 6000 }), 'INVALID_STEP');
  });
});

describe('Undo pro Antwort (D-S4)', () => {
  it('nimmt genau eine Antwort zurück', () => {
    let h = createHistory(inSecondary());
    h = unwrap(dispatch(h, { type: 'secondaryAnswer', use: true, atMs: 25_000 }));
    h = unwrap(dispatch(h, { type: 'secondaryAnswer', use: false, atMs: 26_000 }));
    h = unwrap(undo(h, 26_000));
    expect(secondaryStatus(current(h))).toMatchObject({ index: 1, answers: [true], askingId: 'p4' });
  });

  it('JSON verlustfrei', () => {
    const s = play(inSecondary(), { type: 'secondaryAnswer', use: true, atMs: 25_000 });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('Statistik: genutzte Sekundärfähigkeiten (S9)', () => {
  it('zählt pro Spieler, Runde und Karte; „Nein“ und „Rest: alle Nein“ zählen nicht', () => {
    let s = inSecondary(); // Karte 1, Reihenfolge p3, p4, p5, p1
    s = play(s, { type: 'secondaryAnswer', use: true, atMs: 21_000 }, { type: 'secondaryAnswer', use: false, atMs: 22_000 }, { type: 'secondaryDone', atMs: 23_000 });
    // p5: Karte 2, Reihenfolge p1, p2, p3, p4
    s = play(s, { type: 'useCard', card: 2, atMs: 24_000 }, { type: 'primaryDone', atMs: 25_000 });
    s = play(s, { type: 'secondaryAnswer', use: true, atMs: 26_000 }, { type: 'secondaryAnswer', use: true, atMs: 27_000 }, { type: 'secondaryAnswer', use: true, atMs: 28_000 }, { type: 'secondaryAnswer', use: false, atMs: 29_000 });
    const r = s.stats.rounds[0]!;
    expect(r.players['p3']!.secondaryUses).toEqual({ '1': 1, '2': 1 });
    expect(r.players['p4']!.secondaryUses).toEqual({});
    expect(r.players['p1']!.secondaryUses).toEqual({ '2': 1 });
    const f = finalStats(s, 30_000);
    expect(f.players.find((p) => p.id === 'p3')).toMatchObject({ secondaryUses: 2, secondaryUsesByCard: { '1': 1, '2': 1 } });
    expect(f.players.find((p) => p.id === 'p4')).toMatchObject({ secondaryUses: 0, secondaryUsesByCard: {} });
  });

  it('Tisch-Timer der Sekundärphase zählt als Tischzeit, auch über mehrere Antworten', () => {
    let s = inSecondary();
    s = play(s, { type: 'secondaryAnswer', use: true, atMs: 50_000 }, { type: 'secondaryDone', atMs: 80_000 });
    expect(s.stats.rounds[0]!.phaseMs.secondary).toBe(60_000);
    expect(s.stats.rounds[0]!.secondaryByCardMs).toEqual({ '1': 60_000 });
  });
});
