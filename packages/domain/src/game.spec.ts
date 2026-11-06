import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, updateConfig } from './config';
import { applyEvent, clockView, createGame } from './game';
import { activeId, expectError, newGame, NO_VARIANTS, pickAll, play, player, setupFor, setupWithNaalu } from './test-utils';
import type { GameSetup, GameState } from './types';

const MIN = 60_000;

function withPlayer(setup: GameSetup, index: number, patch: Partial<GameSetup['players'][number]>): GameSetup {
  return { ...setup, players: setup.players.map((p, i) => (i === index ? { ...p, ...patch } : p)) };
}

function unwrapGame(setup: GameSetup): GameState {
  const r = createGame(setup, DEFAULT_CONFIG, 0);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** 5 Spieler, Sprecher p1. Wahl: p1→5, p2→1, p3→8, p4→3, p5→2 ⇒ Aktionsreihenfolge p2, p5, p4, p1, p3. */
function actionPhase5(): GameState {
  return pickAll(newGame(5), [5, 1, 8, 3, 2]);
}

describe('Spiel anlegen', () => {
  it('beginnt in Runde 1, Strategiephase, Sprecher wählt zuerst, Uhr läuft', () => {
    const s = newGame(5, { speakerId: 'p3' }, DEFAULT_CONFIG, 1000);
    expect(s.round).toBe(1);
    expect(s.phase).toBe('strategy');
    expect(s.step).toMatchObject({ kind: 'pick', queue: ['p3', 'p4', 'p5', 'p1', 'p2'], index: 0 });
    expect(clockView(s, 3000)).toMatchObject({ kind: 'pick', playerId: 'p3', elapsedMs: 2000, running: true });
  });

  it('alle Spieler starten mit derselben Bank', () => {
    const s = newGame(6);
    expect(new Set(s.players.map((p) => p.bankMs))).toEqual(new Set([30 * MIN]));
  });

  it('kopiert die Konfiguration (AC2)', () => {
    const config = { ...DEFAULT_CONFIG, warnAtSec: [30, 10] };
    const s = newGame(5, {}, config);
    (config as { turnSec: number }).turnSec = 1;
    (config.warnAtSec as number[]).push(5);
    expect(s.config.turnSec).toBe(90);
    expect(s.config.warnAtSec).toEqual([30, 10]);
  });

  it.each([
    ['2 Spieler', setupFor(2)],
    ['9 Spieler', setupFor(9)],
    ['7 Spieler ohne PoK', setupFor(7, { variants: { ...NO_VARIANTS, pok: false } })],
    ['unbekannter Sprecher', setupFor(5, { speakerId: 'x' })],
    ['doppelte Spieler-ID', { ...setupFor(3), players: [...setupFor(2).players, { ...setupFor(1).players[0]!, color: 'gold', factionId: 'naalu' }] }],
    ['doppelte Farbe (D2)', withPlayer(setupFor(3), 2, { color: 'black' })],
    ['unbekannte Farbe (D2)', withPlayer(setupFor(3), 2, { color: '#ffffff' })],
    ['doppeltes Volk (D2)', withPlayer(setupFor(3), 2, { factionId: 'sol' })],
    ['unbekanntes Volk (D2)', withPlayer(setupFor(3), 2, { factionId: 'gibt-es-nicht' })],
    ['Volk aus nicht gewählter Erweiterung (D2)', withPlayer(setupFor(3), 2, { factionId: 'axis' })],
    ['PoK-Volk ohne PoK (D2)', withPlayer(setupFor(3, { variants: { ...NO_VARIANTS, pok: false } }), 2, { factionId: 'nomad' })],
  ])('lehnt ungültiges Setup ab: %s', (_, setup) => {
    expectError(createGame(setup, DEFAULT_CONFIG, 0), 'INVALID_SETUP');
  });

  it('Volk aus gewählter Erweiterung ist erlaubt (Discordant Stars)', () => {
    const setup = withPlayer(setupFor(3, { variants: { ...NO_VARIANTS, discordantStars: true } }), 2, { factionId: 'axis' });
    expect(createGame(setup, DEFAULT_CONFIG, 0).ok).toBe(true);
  });

  it('Naalu gespielt → dieser Spieler hält den Initiative-0-Token (D3); sonst niemand', () => {
    expect(unwrapGame(setupWithNaalu(5, 'p4')).initiativeZeroHolder).toBe('p4');
    expect(newGame(5).initiativeZeroHolder).toBeNull();
  });

  it('ohne Sprecherangabe ist Position 1 Sprecher (D4)', () => {
    const { players, variants } = setupFor(5, { speakerId: 'p3' });
    const setup: GameSetup = { players, variants };
    expect(unwrapGame(setup).speakerId).toBe('p1');
  });

  it('Spieler behalten ihr Volk', () => {
    expect(newGame(3).players.map((p) => p.factionId)).toEqual(['sol', 'hacan', 'letnev']);
  });
});

describe('Strategiephase (AC7, AC13)', () => {
  it('nach der letzten Wahl startet die Aktionsphase nach Initiative', () => {
    const s = actionPhase5();
    expect(s.phase).toBe('action');
    expect(s.actionOrder).toEqual(['p2', 'p5', 'p4', 'p1', 'p3']);
    expect(s.step).toMatchObject({ kind: 'turn', playerId: 'p2', strategyCard: null });
  });

  it('bereits vergebene Karte → Fehler, Zustand unverändert (AC15)', () => {
    const s = play(newGame(5), { type: 'pickCard', card: 4, atMs: 1000 });
    const r = applyEvent(s, { type: 'pickCard', card: 4, atMs: 2000 });
    expectError(r, 'CARD_TAKEN');
    expectError(applyEvent(s, { type: 'pickCard', card: 9, atMs: 2000 }), 'UNKNOWN_CARD');
  });

  it('5:00 pro Wahl, fest, ohne Bank; Uhr startet je Wahl neu', () => {
    const s = play(newGame(5), { type: 'pickCard', card: 4, atMs: 200_000 });
    expect(clockView(s, 200_000 + 310_000)).toMatchObject({ kind: 'pick', playerId: 'p2', remainingMs: -10_000 });
    expect(s.players.every((p) => p.bankMs === 30 * MIN)).toBe(true);
  });

  it('3 Spieler: zwei Durchgänge, je zwei Karten, Initiative = niedrigere', () => {
    // Wahl: p1→8, p2→3, p3→6, p1→2, p2→7, p3→1
    const s = pickAll(newGame(3), [8, 3, 6, 2, 7, 1]);
    expect(s.actionOrder).toEqual(['p3', 'p1', 'p2']);
  });

  it('Naalu-Token-Inhaber spielt zuerst', () => {
    const s = pickAll(unwrapGame(setupWithNaalu(5, 'p3')), [5, 1, 8, 3, 2]);
    expect(s.actionOrder[0]).toBe('p3');
  });

  it('nicht gewählte Karten erhalten +1 Handelsgut; gewählte geben sie ab', () => {
    let s = actionPhase5();
    expect(s.cards.filter((c) => c.tradeGoods === 1).map((c) => c.number)).toEqual([4, 6, 7]);
    s = finishRound(s, 100_000);
    s = play(s, { type: 'pickCard', card: 4, atMs: 200_000 });
    expect(s.cards.find((c) => c.number === 4)!.tradeGoods).toBe(0);
    expect(s.cards.find((c) => c.number === 6)!.tradeGoods).toBe(1);
  });

  it('ohne Handelswaren-Schalter keine Handelswaren', () => {
    const s = pickAll(newGame(5, { variants: { ...NO_VARIANTS, tradeGoods: false } }), [5, 1, 8, 3, 2]);
    expect(s.cards.every((c) => c.tradeGoods === 0)).toBe(true);
  });

  it('Runde 2 beginnt wieder beim Sprecher, nicht beim Inhaber der Karte 1', () => {
    const s = finishRound(actionPhase5(), 100_000);
    expect(s.round).toBe(2);
    expect(s.step).toMatchObject({ kind: 'pick', index: 0 });
    expect(s.step.kind === 'pick' && s.step.queue[0]).toBe('p1');
  });
});

describe('Aktionsphase (AC3, AC11, AC12)', () => {
  it('taktische Aktion: Zug wird abgerechnet, nächster nach Initiative', () => {
    let s = actionPhase5(); // Zug p2 startet bei t=5000
    s = play(s, { type: 'endTurn', atMs: 5000 + 60_000 });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN + 30_000);
    expect(activeId(s)).toBe('p5');
    expect(clockView(s, 65_000 + 100_000)).toMatchObject({ kind: 'turn', playerId: 'p5', remainingMs: -10_000, bankMs: 30 * MIN - 10_000 });
  });

  it('Strategiekarte: benutzen → Primär erledigt rechnet ab → Sekundär ohne Zugzeit/Bank → nächster', () => {
    let s = actionPhase5();
    s = play(s, { type: 'useCard', card: 1, atMs: 10_000 });
    expect(s.step).toMatchObject({ kind: 'turn', strategyCard: 1 });
    expect(s.cards.find((c) => c.number === 1)!.used).toBe(true);
    expectError(applyEvent(s, { type: 'endTurn', atMs: 11_000 }), 'PRIMARY_PENDING');
    s = play(s, { type: 'primaryDone', atMs: 5000 + 200_000 });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN - 110_000);
    expect(s.step).toMatchObject({ kind: 'secondary', activeId: 'p2', card: 1 });
    const before = s.players.map((p) => p.bankMs);
    expect(clockView(s, 205_000 + 999_000)).toEqual({ kind: 'secondary', activeId: 'p2', elapsedMs: 999_000, running: true });
    s = play(s, { type: 'secondaryDone', atMs: 205_000 + 999_000 });
    expect(s.players.map((p) => p.bankMs)).toEqual(before);
    expect(activeId(s)).toBe('p5');
  });

  it('nur eigene, unbenutzte Karten lassen sich benutzen', () => {
    const s = actionPhase5();
    expectError(applyEvent(s, { type: 'useCard', card: 5, atMs: 6000 }), 'CARD_NOT_OWNED');
    const used = play(s, { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 }, { type: 'secondaryDone', atMs: 8000 });
    const again = advanceTo(used, 'p2');
    expectError(applyEvent(again, { type: 'useCard', card: 1, atMs: 99_000 }), 'CARD_ALREADY_USED');
  });

  it('Passen gesperrt, bis alle eigenen Karten benutzt sind (AC11)', () => {
    const s = actionPhase5();
    expectError(applyEvent(s, { type: 'pass', atMs: 6000 }), 'PASS_BLOCKED');
  });

  it('Passen gesperrt bei 2 Karten, solange eine unbenutzt ist', () => {
    let s = pickAll(newGame(3), [8, 3, 6, 2, 7, 1]); // p3 (1,6) zuerst
    s = play(s, { type: 'useCard', card: 1, atMs: 7000 }, { type: 'primaryDone', atMs: 8000 }, { type: 'secondaryDone', atMs: 9000 });
    s = advanceTo(s, 'p3');
    expectError(applyEvent(s, { type: 'pass', atMs: 99_000 }), 'PASS_BLOCKED');
  });

  it('Passen schreibt keine Zeit gut; Gepasste werden übersprungen, bleiben aber in der Reihenfolge', () => {
    let s = actionPhase5();
    s = useCardAndContinue(s); // p2 benutzt Karte 1, weiter zu p5
    s = advanceTo(s, 'p2');
    const bank = player(s, 'p2').bankMs;
    const startedAt = 100_000;
    s = play(s, { type: 'pass', atMs: startedAt });
    expect(player(s, 'p2')).toMatchObject({ passed: true });
    expect(player(s, 'p2').bankMs).toBeLessThanOrEqual(bank);
    expect(s.actionOrder).toContain('p2');
    s = advanceTo(s, 'p3');
    s = play(s, { type: 'endTurn', atMs: 300_000 });
    expect(activeId(s)).toBe('p5');
  });

  it('Primär nur nach Benutzen einer Karte; Sekundär nur in der Sekundärphase', () => {
    const s = actionPhase5();
    expectError(applyEvent(s, { type: 'primaryDone', atMs: 6000 }), 'INVALID_STEP');
    expectError(applyEvent(s, { type: 'secondaryDone', atMs: 6000 }), 'INVALID_STEP');
  });

  it('ist nur noch einer übrig, bekommt er je Aktion eine neue Zugzeit', () => {
    let s = everyoneUsesCards(actionPhase5());
    for (const id of ['p2', 'p5', 'p4', 'p1']) s = passWhenActive(s, id);
    expect(activeId(s)).toBe('p3');
    const t = 900_000;
    s = play(s, { type: 'endTurn', atMs: t });
    expect(activeId(s)).toBe('p3');
    expect(clockView(s, t + 1000)).toMatchObject({ kind: 'turn', elapsedMs: 1000 });
  });

  it('Sekundär der letzten Karte: haben alle anderen gepasst, ist der Aktive wieder dran', () => {
    let s = actionPhase5();
    s = useCardAndContinue(s); // p2
    s = useCardAndContinue(s); // p5
    s = useCardAndContinue(s); // p4
    s = useCardAndContinue(s); // p1
    s = passWhenActive(s, 'p2');
    s = passWhenActive(s, 'p5');
    s = passWhenActive(s, 'p4');
    s = passWhenActive(s, 'p1');
    expect(activeId(s)).toBe('p3');
    s = useCardAndContinue(s);
    expect(activeId(s)).toBe('p3');
  });

  it('Phase endet, wenn alle gepasst haben → Abfrage „Agendaphase aktiv?“ (AC10)', () => {
    const s = allPass(everyoneUsesCards(actionPhase5()));
    expect(s.step).toMatchObject({ kind: 'agendaQuestion' });
  });
});

describe('Phasenfolge (AC10, AC13)', () => {
  it('„Nein“ → Status → nächste Runde; die Frage kommt jede Runde wieder', () => {
    let s = allPass(everyoneUsesCards(actionPhase5()));
    s = play(s, { type: 'answerAgenda', active: false, atMs: 500_000 });
    expect(s).toMatchObject({ phase: 'status', step: { kind: 'status' }, agendaActive: false });
    expect(clockView(s, 999_999)).toEqual({ kind: 'none' });
    s = play(s, { type: 'statusDone', atMs: 510_000 });
    expect(s).toMatchObject({ round: 2, phase: 'strategy' });
    s = allPass(everyoneUsesCards(pickAll(s, [5, 1, 8, 3, 2], 600_000)));
    expect(s.step).toMatchObject({ kind: 'agendaQuestion' });
  });

  it('„Ja“ → Agenda schon in derselben Runde und dauerhaft, ohne erneute Frage', () => {
    let s = allPass(everyoneUsesCards(actionPhase5()));
    s = play(s, { type: 'answerAgenda', active: true, atMs: 500_000 }, { type: 'statusDone', atMs: 510_000 });
    expect(s).toMatchObject({ round: 1, phase: 'agenda', agendaActive: true, step: { kind: 'agendaIntro', agenda: 1 } });
    s = voteAgendas(s, 520_000);
    expect(s).toMatchObject({ round: 2, phase: 'strategy' });
    s = allPass(everyoneUsesCards(pickAll(s, [5, 1, 8, 3, 2], 2_000_000)));
    expect(s.step).toMatchObject({ kind: 'status' });
  });

  it('Agenda: 3:00 pro Stimme, links vom Sprecher, Sprecher zuletzt, zwei Agenden, Bank unverändert', () => {
    let s = allPass(everyoneUsesCards(actionPhase5()));
    s = play(s, { type: 'answerAgenda', active: true, atMs: 500_000 }, { type: 'statusDone', atMs: 510_000 });
    const banks = s.players.map((p) => p.bankMs);
    s = play(s, { type: 'startVoting', atMs: 520_000 });
    expect(s.step).toMatchObject({ kind: 'vote', agenda: 1, queue: ['p2', 'p3', 'p4', 'p5', 'p1'], index: 0 });
    expect(clockView(s, 520_000 + 200_000)).toMatchObject({ kind: 'vote', playerId: 'p2', remainingMs: -20_000 });
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 530_000 + i * 1000 });
    expect(s.step).toMatchObject({ kind: 'agendaIntro', agenda: 2 });
    s = play(s, { type: 'startVoting', atMs: 600_000 });
    expect(s.step).toMatchObject({ kind: 'vote', agenda: 2, index: 0 });
    expect(s.players.map((p) => p.bankMs)).toEqual(banks);
  });

  it('Ereignisse außerhalb ihres Schritts → INVALID_STEP', () => {
    const s = newGame(5);
    for (const type of ['endTurn', 'pass', 'useCard', 'statusDone', 'startVoting', 'endVote', 'answerAgenda'] as const) {
      expectError(applyEvent(s, { type, card: 1, active: true, atMs: 1 } as never), 'INVALID_STEP');
    }
    expectError(applyEvent(actionPhase5(), { type: 'pickCard', card: 4, atMs: 1 }), 'INVALID_STEP');
  });

  it('neue Runde: Karten zurück, Passen zurückgesetzt, Banken bleiben', () => {
    const end = allPass(everyoneUsesCards(actionPhase5()));
    const s = play(end, { type: 'answerAgenda', active: false, atMs: 500_000 }, { type: 'statusDone', atMs: 510_000 });
    expect(s.cards.every((c) => c.ownerId === null && !c.used)).toBe(true);
    expect(s.players.every((p) => !p.passed)).toBe(true);
    expect(s.players.map((p) => p.bankMs)).toEqual(end.players.map((p) => p.bankMs));
    expect(s.actionOrder).toEqual([]);
  });
});

describe('Pause (AC6)', () => {
  it('hält die Uhr an, zählt Pausenzeit separat und kostet niemanden Zeit', () => {
    let s = actionPhase5(); // p2 ab 5000
    s = play(s, { type: 'pause', atMs: 35_000 });
    expect(clockView(s, 1_000_000)).toMatchObject({ elapsedMs: 30_000, running: false });
    s = play(s, { type: 'resume', atMs: 1_035_000 });
    expect(s.pausedTotalMs).toBe(1_000_000);
    s = play(s, { type: 'endTurn', atMs: 1_065_000 });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN + 30_000);
  });

  it.each(['pick', 'secondary', 'vote'] as const)('wirkt auch in %s', (kind) => {
    const s = stateWith(kind);
    const paused = play(s, { type: 'pause', atMs: 3_000_000 });
    const resumed = play(paused, { type: 'resume', atMs: 4_000_000 });
    expect(clockView(resumed, 4_000_000)).toMatchObject({ elapsedMs: clockElapsed(s, 3_000_000) });
  });

  it('während der Pause sind Spielaktionen gesperrt; doppelte Pause/Fortsetzen → Fehler', () => {
    const s = play(actionPhase5(), { type: 'pause', atMs: 10_000 });
    expectError(applyEvent(s, { type: 'endTurn', atMs: 11_000 }), 'PAUSED');
    expectError(applyEvent(s, { type: 'pause', atMs: 11_000 }), 'PAUSED');
    expectError(applyEvent(actionPhase5(), { type: 'resume', atMs: 11_000 }), 'NOT_PAUSED');
  });

  it('Pause in der Statusphase (ohne Uhr) ist möglich', () => {
    let s = allPass(everyoneUsesCards(actionPhase5()));
    s = play(s, { type: 'answerAgenda', active: false, atMs: 500_000 }, { type: 'pause', atMs: 501_000 }, { type: 'resume', atMs: 511_000 });
    expect(s.pausedTotalMs).toBe(10_000);
    expect(clockView(s, 600_000)).toEqual({ kind: 'none' });
  });
});

describe('Robustheit (AC15)', () => {
  it('ungültige Aktion lässt den Zustand unverändert', () => {
    const s = actionPhase5();
    const copy = JSON.parse(JSON.stringify(s)) as unknown;
    applyEvent(s, { type: 'pass', atMs: 6000 });
    expect(s).toEqual(copy);
  });

  it('Fehler haben eine verständliche Meldung', () => {
    const r = applyEvent(actionPhase5(), { type: 'pass', atMs: 6000 });
    expect(!r.ok && r.error.message.length).toBeGreaterThan(10);
  });
});

// --- Hilfen für Abläufe ---------------------------------------------------------------

let clockT = 1_000_000;
const tick = () => (clockT += 1000);

function advanceTo(s: GameState, id: string): GameState {
  for (let i = 0; i < 20 && activeId(s) !== id; i++) s = play(s, { type: 'endTurn', atMs: tick() });
  expect(activeId(s)).toBe(id);
  return s;
}

function useCardAndContinue(s: GameState): GameState {
  const id = activeId(s)!;
  const card = s.cards.find((c) => c.ownerId === id && !c.used)!.number;
  return play(s, { type: 'useCard', card, atMs: tick() }, { type: 'primaryDone', atMs: tick() }, { type: 'secondaryDone', atMs: tick() });
}

/** Jeder benutzt reihum alle eigenen Karten. */
function everyoneUsesCards(s: GameState): GameState {
  for (let i = 0; i < 40 && s.cards.some((c) => c.ownerId && !c.used); i++) {
    const id = activeId(s)!;
    s = s.cards.some((c) => c.ownerId === id && !c.used) ? useCardAndContinue(s) : play(s, { type: 'endTurn', atMs: tick() });
  }
  return s;
}

function passWhenActive(s: GameState, id: string): GameState {
  s = advanceTo(s, id);
  return play(s, { type: 'pass', atMs: tick() });
}

function allPass(s: GameState): GameState {
  for (let i = 0; i < 20 && s.step.kind === 'turn'; i++) s = play(s, { type: 'pass', atMs: tick() });
  return s;
}

function voteAgendas(s: GameState, from: number): GameState {
  let t = from;
  for (let agenda = 1; agenda <= 2; agenda++) {
    s = play(s, { type: 'startVoting', atMs: (t += 1000) });
    for (let i = 0; i < s.players.length; i++) s = play(s, { type: 'endVote', atMs: (t += 1000) });
  }
  return s;
}

function finishRound(s: GameState, from: number): GameState {
  s = allPass(everyoneUsesCards(s));
  return play(s, { type: 'answerAgenda', active: false, atMs: from }, { type: 'statusDone', atMs: from + 1 });
}

function stateWith(kind: 'pick' | 'secondary' | 'vote'): GameState {
  if (kind === 'pick') return newGame(5);
  if (kind === 'secondary') return play(actionPhase5(), { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 });
  const s = allPass(everyoneUsesCards(actionPhase5()));
  return play(s, { type: 'answerAgenda', active: true, atMs: 2_000_000 }, { type: 'statusDone', atMs: 2_000_001 }, { type: 'startVoting', atMs: 2_000_002 });
}

function clockElapsed(s: GameState, at: number): number {
  const v = clockView(s, at);
  return v.kind === 'none' ? 0 : v.elapsedMs;
}

describe('Gutschrift-Konfiguration wird im Spiel verwendet', () => {
  it('Hybrid ohne Gutschrift: kurzer Zug verändert die Bank nicht', () => {
    const cfg = updateConfig(DEFAULT_CONFIG, 'credit', false);
    let s = pickAll(newGame(5, {}, cfg), [5, 1, 8, 3, 2]);
    s = play(s, { type: 'endTurn', atMs: 10_000 });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN);
  });
});
