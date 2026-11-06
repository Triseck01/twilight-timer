import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { createGame } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { finalStats, interimStats } from './stats';
import { NO_VARIANTS, setupFor, unwrap } from './test-utils';
import type { GameEvent, GameState, History } from './types';

const S = 1000;

/**
 * Runde 1 mit 5 Spielern, Sprecher p1, alle Zeiten von Hand gesetzt (siehe Kommentare).
 * Aktionsreihenfolge p2(1), p5(2), p4(3), p1(5), p3(8).
 */
function roundOne(): History {
  let h = createHistory(unwrap(createGame(setupFor(5), DEFAULT_CONFIG, 0)));
  const e = (event: GameEvent) => (h = unwrap(dispatch(h, event)));
  // Strategie (360 s): p1 10 s, p2 20 s, p3 310 s (über 5:00), p4 10 s, p5 10 s
  e({ type: 'pickCard', card: 5, atMs: 10 * S });
  e({ type: 'pickCard', card: 1, atMs: 30 * S });
  e({ type: 'pickCard', card: 8, atMs: 340 * S });
  e({ type: 'pickCard', card: 3, atMs: 350 * S });
  e({ type: 'pickCard', card: 2, atMs: 360 * S });
  // p2: Primär 60 s (Gutschrift 30 s), Sekundär Karte 1: 120 s
  e({ type: 'useCard', card: 1, atMs: 380 * S });
  e({ type: 'primaryDone', atMs: 420 * S });
  e({ type: 'secondaryDone', atMs: 540 * S });
  // p5: Taktik 120 s (Überzug 30 s)
  e({ type: 'endTurn', atMs: 660 * S });
  // p4: Taktik 30 s mit 100 s Pause dazwischen (Gutschrift 60 s)
  e({ type: 'pause', atMs: 670 * S });
  e({ type: 'resume', atMs: 770 * S });
  e({ type: 'endTurn', atMs: 790 * S });
  // p1: Primär 90 s, Sekundär Karte 5: 60 s
  e({ type: 'useCard', card: 5, atMs: 800 * S });
  e({ type: 'primaryDone', atMs: 880 * S });
  e({ type: 'secondaryDone', atMs: 940 * S });
  // p3: Primär 200 s (Überzug 110 s), Sekundär Karte 8: 10 s
  e({ type: 'useCard', card: 8, atMs: 950 * S });
  e({ type: 'primaryDone', atMs: 1140 * S });
  e({ type: 'secondaryDone', atMs: 1150 * S });
  // p2 passt (5 s)
  e({ type: 'pass', atMs: 1155 * S });
  // p5: Primär 10 s (Gutschrift 80 s), Sekundär Karte 2: 10 s
  e({ type: 'useCard', card: 2, atMs: 1160 * S });
  e({ type: 'primaryDone', atMs: 1165 * S });
  e({ type: 'secondaryDone', atMs: 1175 * S });
  // p4: Primär 10 s (Gutschrift 80 s), Sekundär Karte 3: 10 s
  e({ type: 'useCard', card: 3, atMs: 1180 * S });
  e({ type: 'primaryDone', atMs: 1185 * S });
  e({ type: 'secondaryDone', atMs: 1195 * S });
  // Passen: p1, p3, p5, p4 (je 5 s)
  for (const t of [1200, 1205, 1210, 1215]) e({ type: 'pass', atMs: t * S });
  // Abfrage 10 s, Status 60 s, Agenda-Einleitung je 10 s, Stimmen: p2 200 s (über 3:00), sonst je 10 s
  e({ type: 'answerAgenda', active: true, atMs: 1225 * S });
  e({ type: 'statusDone', atMs: 1285 * S });
  e({ type: 'startVoting', atMs: 1295 * S });
  for (const t of [1495, 1505, 1515, 1525, 1535]) e({ type: 'endVote', atMs: t * S });
  e({ type: 'startVoting', atMs: 1545 * S });
  for (const t of [1555, 1565, 1575, 1585, 1595]) e({ type: 'endVote', atMs: t * S });
  return h;
}

const round1 = (s: GameState) => s.stats.rounds[0]!;

describe('Statistik pro Spieler und Runde (S1, S2)', () => {
  const s = current(roundOne());

  it('Zeiten nach Phase, Züge, längster Zug', () => {
    expect(round1(s).players['p2']).toMatchObject({ strategyMs: 20 * S, actionMs: 65 * S, agendaMs: 210 * S, turns: 2, longestTurnMs: 60 * S });
    expect(round1(s).players['p5']).toMatchObject({ strategyMs: 10 * S, actionMs: 135 * S, turns: 3, longestTurnMs: 120 * S });
    expect(round1(s).players['p4']).toMatchObject({ actionMs: 45 * S, turns: 3 });
    expect(round1(s).players['p1']).toMatchObject({ actionMs: 95 * S, turns: 2 });
  });

  it('Überzug, Gutschrift, Überschreitungen bei Wahl und Stimme', () => {
    expect(round1(s).players['p3']).toMatchObject({ overtimeTurns: 1, overtimeMs: 110 * S, creditedMs: 0, picksOverLimit: 1 });
    expect(round1(s).players['p5']).toMatchObject({ overtimeTurns: 1, overtimeMs: 30 * S, creditedMs: 80 * S });
    expect(round1(s).players['p4']).toMatchObject({ creditedMs: 140 * S, overtimeTurns: 0 });
    expect(round1(s).players['p2']).toMatchObject({ creditedMs: 30 * S, votes: 2, votesOverLimit: 1 });
  });

  it('gewählte Karten und Pass-Reihenfolge', () => {
    expect(round1(s).players['p3']!.cards).toEqual([8]);
    expect(round1(s).passOrder).toEqual(['p2', 'p1', 'p3', 'p5', 'p4']);
  });

  it('Tiefststand der Bank', () => {
    expect(s.stats.minBankMs).toEqual({ p1: 1800 * S, p2: 1800 * S, p3: 1690 * S, p4: 1800 * S, p5: 1770 * S });
  });

  it('nächste Runde ist angelegt und leer', () => {
    expect(s.stats.rounds[1]).toMatchObject({ round: 2, passOrder: [], phaseMs: { strategy: 0, action: 0, secondary: 0, status: 0, agenda: 0 } });
  });
});

describe('Tischzeiten pro Runde (S3) und Spielwerte (S4)', () => {
  const s = current(roundOne());

  it('Phasendauern ohne Pause; Sekundär und Status keinem Spieler zugerechnet', () => {
    expect(round1(s).phaseMs).toEqual({ strategy: 360 * S, action: 555 * S, secondary: 210 * S, status: 60 * S, agenda: 310 * S });
    expect(round1(s).secondaryByCardMs).toEqual({ '1': 120 * S, '5': 60 * S, '8': 10 * S, '2': 10 * S, '3': 10 * S });
  });

  it('Startzeit, Agenda-Freischaltung, Pausen', () => {
    expect(s.stats).toMatchObject({ startedAtMs: 0, agendaUnlockedRound: 1, pauseCount: 1 });
    expect(s.pausedTotalMs).toBe(100 * S);
  });
});

describe('Zwischenstand (S5)', () => {
  it('enthält den laufenden Abschnitt, ohne Züge doppelt zu zählen', () => {
    const s = current(roundOne()); // Runde 2: p1 wählt seit 1595 s
    const i = interimStats(s, 1605 * S);
    expect(i).toMatchObject({ round: 2, netMs: 1505 * S, grossMs: 1605 * S, pausedMs: 100 * S });
    expect(i.currentRound).toEqual({ strategy: 10 * S, action: 0, secondary: 0, status: 0, agenda: 0 });
    expect(i.players[0]).toMatchObject({ id: 'p1', totalMs: 135 * S, avgTurnMs: 47_500, bankMs: 1800 * S, overtimeTurns: 0 });
  });

  it('laufender Zug zählt zur Zeit, aber nicht als Zug; Bank live', () => {
    let h = createHistory(unwrap(createGame(setupFor(5), DEFAULT_CONFIG, 0)));
    for (const [card, t] of [[5, 1], [1, 2], [8, 3], [3, 4], [2, 5]] as const) h = unwrap(dispatch(h, { type: 'pickCard', card, atMs: t * S }));
    const i = interimStats(current(h), 5 * S + 100 * S); // p2 seit 100 s am Zug
    const p2 = i.players.find((p) => p.id === 'p2')!;
    expect(p2).toMatchObject({ totalMs: 101 * S, avgTurnMs: 0, bankMs: 1790 * S });
  });

  it('laufende Pause zählt zur Pausendauer, nicht zur Spielzeit', () => {
    let h = roundOne();
    h = unwrap(dispatch(h, { type: 'pause', atMs: 1600 * S }));
    const i = interimStats(current(h), 1700 * S);
    expect(i).toMatchObject({ netMs: 1500 * S, pausedMs: 200 * S, grossMs: 1700 * S });
  });
});

describe('Endauswertung (S6)', () => {
  const f = finalStats(current(roundOne()), 1595 * S);

  it('Übersicht', () => {
    expect(f.overview).toEqual({ netMs: 1495 * S, grossMs: 1595 * S, rounds: 1, pausedMs: 100 * S, pauseCount: 1, agendaUnlockedRound: 1 });
  });

  it('Zeit pro Spieler pro Runde', () => {
    expect(f.byPlayerRound[1]).toEqual([{ totalMs: 295 * S, strategyMs: 20 * S, actionMs: 65 * S, agendaMs: 210 * S }]);
    expect(f.byPlayerRound).toHaveLength(5);
  });

  it('pro Spieler: Summen, Anteil, Durchschnitte, längster Zug, Bank, Karten, Pass-Position', () => {
    const p3 = f.players[2]!;
    expect(p3).toMatchObject({
      id: 'p3',
      totalMs: 535 * S,
      strategyMs: 310 * S,
      actionMs: 205 * S,
      agendaMs: 20 * S,
      turns: 2,
      avgTurnMs: 102_500,
      longestTurn: { ms: 200 * S, round: 1 },
      overtimeTurns: 1,
      overtimeMs: 110 * S,
      bankEndMs: 1690 * S,
      minBankMs: 1690 * S,
      creditedMs: 0,
      cardsByRound: [[8]],
      avgPickMs: 310 * S,
      picksOverLimit: 1,
      avgVoteMs: 10 * S,
      passPositionByRound: [3],
    });
    const sum = f.players.reduce((a, p) => a + p.sharePct, 0);
    expect(sum).toBeCloseTo(100, 6);
  });

  it('pro Runde: Dauer, Phasen, Sekundär pro Karte', () => {
    expect(f.rounds).toEqual([
      {
        round: 1,
        totalMs: 1495 * S,
        phaseMs: { strategy: 360 * S, action: 555 * S, secondary: 210 * S, status: 60 * S, agenda: 310 * S },
        secondaryByCardMs: { '1': 120 * S, '5': 60 * S, '8': 10 * S, '2': 10 * S, '3': 10 * S },
      },
    ]);
  });

  it('Spieler ohne Züge: Durchschnitte 0, kein längster Zug', () => {
    const g = finalStats(unwrap(createGame(setupFor(3), DEFAULT_CONFIG, 0)), 0);
    expect(g.players[0]).toMatchObject({ avgTurnMs: 0, avgPickMs: 0, avgVoteMs: 0, longestTurn: null, sharePct: 0 });
  });
});

describe('Undo und JSON (S7, S8)', () => {
  it('Undo nimmt die Statistik des Zuges zurück; Zeit zwischen Fehlklick und Undo zählt nirgends', () => {
    let h = createHistory(unwrap(createGame(setupFor(5), DEFAULT_CONFIG, 0)));
    for (const [card, t] of [[5, 1], [1, 2], [8, 3], [3, 4], [2, 5]] as const) h = unwrap(dispatch(h, { type: 'pickCard', card, atMs: t * S }));
    const before = current(h).stats;
    h = unwrap(dispatch(h, { type: 'endTurn', atMs: 35 * S })); // Fehlklick nach 30 s
    h = unwrap(undo(h, 35 * S));
    expect(current(h).stats).toEqual(before);
    h = unwrap(dispatch(h, { type: 'endTurn', atMs: 45 * S }));
    h = unwrap(undo(h, 645 * S)); // 10 min später
    h = unwrap(dispatch(h, { type: 'endTurn', atMs: 655 * S })); // weitere 10 s
    expect(current(h).stats.rounds[0]!.players['p2']).toMatchObject({ actionMs: 50 * S, turns: 1 });
    expect(finalStats(current(h), 655 * S).overview.netMs).toBe(55 * S);
  });

  it('Undo nach einer Pause behält Pausenzahl und Pausendauer', () => {
    let h = createHistory(unwrap(createGame(setupFor(5), DEFAULT_CONFIG, 0)));
    h = unwrap(dispatch(h, { type: 'pickCard', card: 1, atMs: 10 * S }));
    h = unwrap(dispatch(h, { type: 'pause', atMs: 20 * S }));
    h = unwrap(dispatch(h, { type: 'resume', atMs: 50 * S }));
    h = unwrap(undo(h, 60 * S));
    const f = finalStats(current(h), 60 * S);
    expect(f.overview).toMatchObject({ pauseCount: 1, pausedMs: 30 * S });
  });

  it('JSON verlustfrei, Endauswertung danach identisch', () => {
    const s = current(roundOne());
    const restored = JSON.parse(JSON.stringify(s)) as GameState;
    expect(restored).toEqual(s);
    expect(finalStats(restored, 1700 * S)).toEqual(finalStats(s, 1700 * S));
  });
});

describe('Invarianten (Property-Tests)', () => {
  const types = ['pickCard', 'useCard', 'primaryDone', 'endTurn', 'pass', 'secondaryDone', 'answerAgenda', 'statusDone', 'startVoting', 'endVote', 'pause', 'resume'] as const;
  const opArb = fc.record({ type: fc.constantFrom(...types), card: fc.integer({ min: 1, max: 8 }), active: fc.boolean(), dt: fc.nat(300_000) });

  it('ohne Undo gilt: Spielzeit netto + Pausen = brutto; Spielerzeiten ≤ netto', () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 8 }), fc.array(opArb, { maxLength: 200 }), fc.nat(300_000), (n, ops, tail) => {
        let s = unwrap(createGame(setupFor(n, { variants: NO_VARIANTS }), DEFAULT_CONFIG, 0));
        let t = 0;
        let h = createHistory(s);
        for (const op of ops) {
          t += op.dt;
          const r = dispatch(h, { type: op.type, card: op.card, active: op.active, atMs: t } as GameEvent);
          if (r.ok) h = r.value;
        }
        s = current(h);
        const now = t + tail;
        const f = finalStats(s, now);
        expect(f.overview.netMs + f.overview.pausedMs).toBe(f.overview.grossMs);
        expect(f.players.reduce((a, p) => a + p.totalMs, 0)).toBeLessThanOrEqual(f.overview.netMs);
        expect(f.rounds.reduce((a, r) => a + r.totalMs, 0)).toBe(f.overview.netMs);
        const i = interimStats(s, now);
        expect(i.netMs).toBe(f.overview.netMs);
      }),
      { numRuns: 300 },
    );
  });
});
