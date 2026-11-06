import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { createGame } from './game';
import { createHistory, dispatch } from './history';
import { SAVE_FORMAT, SAVE_VERSION, parseSavedGame, type SavedGame } from './persist';
import { newGame, pickAll, play, setupFor, unwrap } from './test-utils';
import type { GameEvent, GameState, History } from './types';

function saved(history: History): SavedGame {
  return { format: SAVE_FORMAT, version: SAVE_VERSION, id: 'g-1', createdAt: 1000, updatedAt: 2000, history };
}
const roundtrip = (x: unknown) => JSON.parse(JSON.stringify(x)) as unknown;
const valid = () => saved(createHistory(pickAll(newGame(5), [5, 1, 8, 3, 2])));

/** Setzt einen Wert an einem Pfad in einer JSON-Kopie. */
function patched(path: (string | number)[], value: unknown): unknown {
  const copy = roundtrip(valid()) as Record<string, unknown>;
  let node: Record<string | number, unknown> = copy;
  for (const k of path.slice(0, -1)) node = node[k] as Record<string | number, unknown>;
  const last = path.at(-1)!;
  if (value === undefined) delete node[last];
  // defineProperty legt auch „__proto__“ als eigenes Feld an (Zuweisung würde den Prototyp setzen)
  else Object.defineProperty(node, last, { value, enumerable: true, configurable: true, writable: true });
  return copy;
}
const S = ['history', 'entries', 0, 'state'];

describe('parseSavedGame: gültige Daten (P1, P8)', () => {
  it('nimmt einen gespeicherten Stand nach JSON verlustfrei an', () => {
    const v = valid();
    const r = parseSavedGame(roundtrip(v));
    expect(r.ok).toBe(true);
    expect(r.ok && r.value).toEqual(v);
  });

  it('jeder in zufälligen Partien entstehende Verlauf ist gültig (Vollständigkeit des Prüfers)', () => {
    const types = ['pickCard', 'useCard', 'primaryDone', 'endTurn', 'pass', 'secondaryDone', 'secondaryAnswer', 'answerAgenda', 'statusDone',
      'agendaRead', 'windowAnswer', 'windowClose', 'agendaReplaced', 'endVote', 'resolved', 'pause', 'resume', 'setSpeaker', 'setActive',
      'skipTurn', 'extraTurn', 'swapCards', 'setInitiativeZero', 'reverseVoting', 'adjustBank', 'endGame', 'declareWinner'] as const;
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 8 }),
        fc.array(fc.record({ type: fc.constantFrom(...types), card: fc.integer({ min: 1, max: 8 }), flag: fc.boolean(), dt: fc.nat(200_000) }), { maxLength: 120 }),
        (n, ops) => {
          let h = createHistory(unwrap(createGame(setupFor(n), DEFAULT_CONFIG, 0)));
          let t = 0;
          for (const op of ops) {
            t += op.dt;
            const id = `p${(op.card % n) + 1}`;
            const e = { type: op.type, card: op.card, active: op.flag, use: op.flag, played: op.flag, playerId: id, cardA: op.card,
              cardB: (op.card % 8) + 1, deltaMs: op.flag ? 60_000 : -60_000, winnerId: op.flag ? id : null, atMs: t } as GameEvent;
            const r = dispatch(h, e);
            if (r.ok) h = r.value;
          }
          const r = parseSavedGame(roundtrip(saved(h)));
          if (!r.ok) throw new Error(r.error.message);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('parseSavedGame: ungültige Daten werden abgelehnt (P6, P8)', () => {
  it.each([
    ['kein Objekt', 'text'],
    ['null', null],
    ['falsches Format', { ...valid(), format: 'anderes' }],
    ['ungültige ID', { ...valid(), id: '../x' }],
  ])('%s', (_, value) => {
    const r = parseSavedGame(roundtrip(value));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error.code).toBe('INVALID_INPUT');
  });

  it('neuere Version → UNSUPPORTED_VERSION mit Hinweis', () => {
    const r = parseSavedGame({ ...(roundtrip(valid()) as object), version: 99 });
    expect(!r.ok && r.error.code).toBe('UNSUPPORTED_VERSION');
  });

  it.each([
    ['Cursor außerhalb', ['history', 'cursor'], 5],
    ['leerer Verlauf', ['history', 'entries'], []],
    ['Ereignis unbekannt', ['history', 'entries', 0, 'event'], { type: 'hack', atMs: 1 }],
    ['Spieler fehlt Feld', [...S, 'players', 0, 'bankMs'], undefined],
    ['Bank kein Wert', [...S, 'players', 0, 'bankMs'], 'viel'],
    ['unbekannte Farbe', [...S, 'players', 0, 'color'], '#ff0000'],
    ['unbekanntes Volk', [...S, 'players', 0, 'factionId'], 'gibt-es-nicht'],
    ['Name zu lang', [...S, 'players', 0, 'name'], 'x'.repeat(200)],
    ['doppelte Spieler-ID', [...S, 'players', 1, 'id'], 'p1'],
    ['Sprecher unbekannt', [...S, 'speakerId'], 'p9'],
    ['Zug-Spieler unbekannt', [...S, 'step', 'playerId'], 'p9'],
    ['unbekannter Schritt', [...S, 'step', 'kind'], 'teleport'],
    ['Karte mit falscher Nummer', [...S, 'cards', 0, 'number'], 7],
    ['Kartenbesitzer unbekannt', [...S, 'cards', 0, 'ownerId'], 'p9'],
    ['Aktionsreihenfolge unbekannt', [...S, 'actionOrder', 0], 'p9'],
    ['Uhr kaputt', [...S, 'step', 'clock', 'baseMs'], -5],
    ['Konfiguration kaputt', [...S, 'config', 'turnSec'], 1],
    ['Statistik ohne Spieler', [...S, 'stats', 'rounds', 0, 'players', 'p1'], undefined],
    ['Statistik mit fremdem Schlüssel', [...S, 'stats', 'minBankMs', '__proto__'], 5],
    ['Schema-Version des Zustands', [...S, 'schemaVersion'], 2],
  ] as const)('%s', (_, path, value) => {
    const r = parseSavedGame(patched([...path], value));
    expect(r.ok).toBe(false);
  });

  it('wirft nie, egal was eingelesen wird', () => {
    fc.assert(fc.property(fc.anything(), (v) => void expect(() => parseSavedGame(v)).not.toThrow()));
  });
});

describe('parseSavedGame: jeder Schrittart gültig und mit Fehler (Abdeckung des Prüfers)', () => {
  /** Spielt bis zur Frage „Agendaphase aktiv?“. */
  function untilQuestion(s: GameState): GameState {
    for (let i = 0; i < 40 && s.step.kind !== 'agendaQuestion'; i++) {
      const st = s.step;
      const t = 10_000 + i;
      if (st.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
      else if (st.kind === 'turn' && st.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
      else if (st.kind === 'turn') {
        const c = s.cards.find((x) => x.ownerId === st.playerId && !x.used);
        s = play(s, c ? { type: 'useCard', card: c.number, atMs: t } : { type: 'pass', atMs: t });
      }
    }
    return s;
  }
  const action = () => pickAll(newGame(5), [5, 1, 8, 3, 2]);
  const states: Record<string, () => GameState> = {
    turn: () => play(action(), { type: 'useCard', card: 1, atMs: 6000 }),
    extraTurn: () => play(action(), { type: 'extraTurn', playerId: 'p3', atMs: 6000 }),
    secondary: () => play(action(), { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 }, { type: 'secondaryAnswer', use: true, atMs: 8000 }),
    agendaQuestion: () => untilQuestion(action()),
    status: () => play(untilQuestion(action()), { type: 'answerAgenda', active: true, atMs: 50_000 }),
    agendaIntro: () => play(states['status']!(), { type: 'statusDone', atMs: 51_000 }),
    agendaWindow: () => play(states['agendaIntro']!(), { type: 'agendaRead', atMs: 52_000 }, { type: 'reverseVoting', atMs: 52_500 }, { type: 'windowAnswer', played: true, atMs: 53_000 }),
    vote: () => play(states['agendaIntro']!(), { type: 'agendaRead', atMs: 52_000 }, { type: 'windowClose', atMs: 53_000 }, { type: 'windowClose', atMs: 54_000 }),
    agendaResolve: () => {
      let s = states['vote']!();
      for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 55_000 + i });
      return s;
    },
    finished: () => play(action(), { type: 'endGame', atMs: 6000 }, { type: 'declareWinner', winnerId: 'p2', atMs: 7000 }),
  };
  const withState = (s: GameState) => roundtrip(saved(createHistory(s))) as { history: { entries: { state: Record<string, unknown> }[] } };

  for (const [name, make] of Object.entries(states)) {
    it(`gültig: ${name}`, () => {
      const r = parseSavedGame(withState(make()));
      if (!r.ok) throw new Error(r.error.message);
    });
  }

  const broken: [string, string, (step: Record<string, unknown>) => void][] = [
    ['Zug: Rückkehr unbekannt', 'extraTurn', (st) => (st['returnAfter'] = 'p9')],
    ['Zug: Karte 9', 'turn', (st) => (st['strategyCard'] = 9)],
    ['Sekundär: zu viele Antworten', 'secondary', (st) => (st['answers'] = [true, true, true, true, true, true])],
    ['Sekundär: Position außerhalb', 'secondary', (st) => (st['index'] = 7)],
    ['Sekundär: Aktiver unbekannt', 'secondary', (st) => (st['activeId'] = 'p9')],
    ['Fenster: unbekannt', 'agendaWindow', (st) => (st['window'] = 'during')],
    ['Fenster: Nein in Folge negativ', 'agendaWindow', (st) => (st['noInRow'] = -1)],
    ['Fenster: umgekehrt kein Wahrheitswert', 'agendaWindow', (st) => (st['reversedVoting'] = 'ja')],
    ['Abstimmung: Agenda 3', 'vote', (st) => (st['agenda'] = 3)],
    ['Abhandeln: Agenda fehlt', 'agendaResolve', (st) => delete st['agenda']],
    ['Spielende: Sieger unbekannt', 'finished', (st) => (st['winnerId'] = 'p9')],
    ['Spielende: entschieden fehlt', 'finished', (st) => delete st['decided']],
  ];
  for (const [name, state, mutate] of broken) {
    it(`ungültig: ${name}`, () => {
      const data = withState(states[state]!());
      mutate(data.history.entries[0]!.state['step'] as Record<string, unknown>);
      expect(parseSavedGame(data).ok).toBe(false);
    });
  }

  it.each([
    ['Pause kaputt', (s: Record<string, unknown>) => (s['pause'] = { since: 'gestern' })],
    ['Pausendauer negativ', (s: Record<string, unknown>) => (s['pausedTotalMs'] = -1)],
    ['Runde 0', (s: Record<string, unknown>) => (s['round'] = 0)],
    ['Phase unbekannt', (s: Record<string, unknown>) => (s['phase'] = 'kampf')],
    ['Varianten mit Zusatzfeld', (s: Record<string, unknown>) => ((s['variants'] as Record<string, unknown>)['cheat'] = true)],
    ['Statistik: Phasendauer fehlt', (s: Record<string, unknown>) => delete ((s['stats'] as { rounds: { phaseMs: Record<string, unknown> }[] }).rounds[0]!.phaseMs['agenda'])],
    ['Statistik: Sekundär je Karte mit Karte 9', (s: Record<string, unknown>) => ((s['stats'] as { rounds: { secondaryByCardMs: Record<string, unknown> }[] }).rounds[0]!.secondaryByCardMs['9'] = 5)],
    ['Statistik: Pass-Reihenfolge unbekannt', (s: Record<string, unknown>) => ((s['stats'] as { rounds: { passOrder: unknown[] }[] }).rounds[0]!.passOrder = ['p9'])],
    [
      'Statistik: mehr Runden als gespielt',
      (s: Record<string, unknown>) => {
        const rounds = (s['stats'] as { rounds: unknown[] }).rounds;
        rounds.push(rounds[0]);
      },
    ],
  ])('ungültig: %s', (_, mutate) => {
    const data = withState(action());
    mutate(data.history.entries[0]!.state);
    expect(parseSavedGame(data).ok).toBe(false);
  });

  it('erstes Ereignis darf nur null sein oder ein gültiges Ereignis', () => {
    const data = roundtrip(valid()) as { history: { entries: { event: unknown }[] } };
    data.history.entries[0]!.event = { type: 'endTurn' };
    expect(parseSavedGame(data).ok).toBe(false);
  });
});
