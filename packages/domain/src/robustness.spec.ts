import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { applyEvent, clockView, createGame } from './game';
import { createHistory, current, dispatch, redo, undo } from './history';
import { NO_VARIANTS, setupFor, setupWithNaalu, unwrap } from './test-utils';
import type { GameEvent, History } from './types';

const eventTypes = [
  'pickCard',
  'useCard',
  'primaryDone',
  'endTurn',
  'pass',
  'secondaryDone',
  'secondaryAnswer',
  'answerAgenda',
  'statusDone',
  'agendaRead',
  'windowAnswer',
  'windowClose',
  'discussionDone',
  'startNow',
  'agendaReplaced',
  'endVote',
  'resolved',
  'setSpeaker',
  'chooseSpeaker',
  'setActive',
  'skipTurn',
  'extraTurn',
  'swapCards',
  'setInitiativeZero',
  'reverseVoting',
  'adjustBank',
  'endGame',
  'declareWinner',
  'pause',
  'resume',
] as const;

type Op = { kind: 'event'; type: (typeof eventTypes)[number]; card: number; active: boolean; dt: number } | { kind: 'undo' | 'redo'; dt: number };

const opArb: fc.Arbitrary<Op> = fc.oneof(
  { weight: 8, arbitrary: fc.record({ kind: fc.constant('event' as const), type: fc.constantFrom(...eventTypes), card: fc.integer({ min: 0, max: 9 }), active: fc.boolean(), dt: fc.nat(400_000) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constantFrom('undo' as const, 'redo' as const), dt: fc.nat(400_000) }) },
);

const setupArb = fc.record({
  n: fc.integer({ min: 3, max: 8 }),
  speaker: fc.nat(7),
  naalu: fc.boolean(),
  tradeGoods: fc.boolean(),
});

/** Baut aus einer Zufallseingabe ein Ereignis; überzählige Felder ignoriert die Domain. */
function eventOf(op: { type: (typeof eventTypes)[number]; card: number; active: boolean }, t: number): GameEvent {
  const playerId = `p${(op.card % 3) + 1}`;
  return {
    type: op.type,
    card: op.card,
    active: op.active,
    use: op.active,
    played: op.active,
    playerId,
    cardA: op.card,
    cardB: (op.card % 8) + 1,
    deltaMs: op.active ? 60_000 : -60_000,
    winnerId: op.active ? playerId : null,
    atMs: t,
  } as GameEvent;
}

/** Spielt eine zufällige Folge von Eingaben (gültig und ungültig) über den Verlauf. */
function run(setup: { n: number; speaker: number; naalu: boolean; tradeGoods: boolean }, ops: Op[]) {
  const opts = { speakerId: `p${(setup.speaker % setup.n) + 1}`, variants: { ...NO_VARIANTS, tradeGoods: setup.tradeGoods } };
  const base = setup.naalu ? setupWithNaalu(setup.n, 'p1', opts) : setupFor(setup.n, opts);
  let h: History = createHistory(unwrap(createGame(base, DEFAULT_CONFIG, 0)));
  let t = 0;
  for (const op of ops) {
    t += op.dt;
    const r =
      op.kind === 'event'
        ? dispatch(h, eventOf(op, t))
        : op.kind === 'undo'
          ? undo(h, t)
          : redo(h, t);
    if (r.ok) h = r.value;
  }
  return { h, t };
}

describe('Robustheit (AC15, AC16)', () => {
  it('beliebige Eingabefolgen werfen nie und liefern immer gültigen Zustand', () => {
    fc.assert(
      fc.property(setupArb, fc.array(opArb, { maxLength: 150 }), (setup, ops) => {
        const { h, t } = run(setup, ops);
        const s = current(h);
        expect(h.entries[h.cursor]!.state).toBe(s);
        expect(s.players).toHaveLength(setup.n);
        expect(() => clockView(s, t + 1000)).not.toThrow();
        for (const p of s.players) expect(Number.isFinite(p.bankMs)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('Bank (mit Gutschrift) übersteigt nie max(Startbank, Obergrenze) + manuelle Korrekturen', () => {
    fc.assert(
      fc.property(setupArb, fc.array(opArb, { maxLength: 150 }), (setup, ops) => {
        const s = current(run(setup, ops).h);
        const plus = ops.filter((o) => o.kind === 'event' && o.type === 'adjustBank' && o.active).length * 60_000;
        for (const p of s.players) expect(p.bankMs).toBeLessThanOrEqual(Math.max(1800_000, 3600_000) + plus);
      }),
      { numRuns: 200 },
    );
  });

  it('Zustand und Verlauf überstehen JSON verlustfrei (AC16)', () => {
    fc.assert(
      fc.property(setupArb, fc.array(opArb, { maxLength: 100 }), (setup, ops) => {
        const { h } = run(setup, ops);
        const restored = JSON.parse(JSON.stringify(h)) as History;
        expect(restored).toEqual(h);
        // Weiterspielen mit dem geladenen Stand verhält sich wie mit dem Original
        const e: GameEvent = { type: 'pause', atMs: 9e9 };
        expect(dispatch(restored, e)).toEqual(dispatch(h, e));
      }),
      { numRuns: 200 },
    );
  });

  it('Undo direkt nach einem Ereignis zum selben Zeitpunkt ergibt exakt den Zustand davor', () => {
    fc.assert(
      fc.property(setupArb, fc.array(opArb, { maxLength: 80 }), fc.constantFrom(...eventTypes), fc.nat(9), (setup, ops, type, card) => {
        const { h, t } = run(setup, ops);
        const before = current(h);
        if (before.pause) return;
        const r = dispatch(h, eventOf({ type, card, active: true }, t));
        if (!r.ok || r.value.entries.length === h.entries.length) return;
        const back = current(unwrap(undo(r.value, t)));
        expect(back).toEqual(before);
      }),
      { numRuns: 300 },
    );
  });

  it('ungültige Ereignisse lassen den Zustand unverändert', () => {
    fc.assert(
      fc.property(setupArb, fc.array(opArb, { maxLength: 80 }), fc.constantFrom(...eventTypes), fc.nat(9), (setup, ops, type, card) => {
        const s = current(run(setup, ops).h);
        const copy = JSON.parse(JSON.stringify(s)) as unknown;
        applyEvent(s, eventOf({ type, card, active: false }, 1e10));
        expect(s).toEqual(copy);
      }),
      { numRuns: 200 },
    );
  });
});
