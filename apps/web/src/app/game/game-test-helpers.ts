// Testhilfen für Spielansichten (nur in *.spec.ts verwendet).
import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG, type GameSetup } from '@twilight-timer/domain';
import { GAME_STORAGE } from '../core/game-repository';
import { memoryStorage } from '../core/memory-storage';
import { NOW } from '../core/ticker';
import { GameSession } from './game-session';

export const FIVE: GameSetup = {
  variants: { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true },
  players: [
    { id: 'p1', name: 'Anna', color: 'red', factionId: 'sol' },
    { id: 'p2', name: 'Ben', color: 'black', factionId: 'naalu' },
    { id: 'p3', name: 'Cem', color: 'neon-pink', factionId: 'hacan' },
    { id: 'p4', name: 'Dana', color: 'gold', factionId: 'nomad' },
    { id: 'p5', name: 'Emil', color: 'blue', factionId: 'keleres' },
  ],
};

export const THREE: GameSetup = { ...FIVE, players: FIVE.players.slice(0, 3) };

/** Steuerbare Uhr für Tests. */
export const fakeClock = { now: 0 };

/** Steuerbare Uhr und frischer Spielstand-Speicher je Test (keine Spiele aus anderen Tests). */
export function gameProviders(storage = memoryStorage()) {
  return [
    { provide: NOW, useValue: () => fakeClock.now },
    { provide: GAME_STORAGE, useValue: storage },
  ];
}

export function startGame(setup: GameSetup = FIVE): GameSession {
  fakeClock.now = 0;
  const session = TestBed.inject(GameSession);
  const r = session.start(setup, DEFAULT_CONFIG, fakeClock.now);
  if (!r.ok) throw new Error('Spiel konnte nicht angelegt werden');
  return session;
}

/** Spielt eine Runde ohne Agenda durch, bis die Strategiephase der nächsten Runde beginnt. */
export function playToNextRound(session: GameSession, cards: number[]): void {
  const go = (e: Parameters<GameSession['dispatch']>[0]) => {
    fakeClock.now += 1000;
    const r = session.dispatch(e);
    if (!r.ok) throw new Error(r.error.message);
  };
  for (const card of cards) go({ type: 'pickCard', card });
  for (let i = 0; i < 40 && session.game()!.phase === 'action'; i++) {
    const g = session.game()!;
    if (g.step.kind === 'secondary') go({ type: 'secondaryDone' });
    else if (g.step.kind === 'turn' && g.step.strategyCard !== null) go({ type: 'primaryDone' });
    else if (g.step.kind === 'turn') {
      const id = g.step.playerId;
      const unused = g.cards.find((c) => c.ownerId === id && !c.used);
      go(unused ? { type: 'useCard', card: unused.number } : { type: 'pass' });
    } else if (g.step.kind === 'agendaQuestion') go({ type: 'answerAgenda', active: false });
  }
  go({ type: 'statusDone' });
}

/** Strategiephase mit festen Karten abschließen: Anna 5, Ben (Naalu) 8, Cem 1, Dana 3, Emil 2
 *  ⇒ Aktionsreihenfolge Ben (0), Cem (1), Emil (2), Dana (3), Anna (5). Ben ist ab `fakeClock.now` am Zug. */
export function toActionPhase(session: GameSession): void {
  for (const card of [5, 8, 1, 3, 2]) {
    const r = session.dispatch({ type: 'pickCard', card });
    if (!r.ok) throw new Error(r.error.message);
  }
}

/** Sendet ein Ereignis zum Zeitpunkt `atMs` (setzt die Testuhr). */
export function at(session: GameSession, atMs: number, event: Parameters<GameSession['dispatch']>[0]): void {
  fakeClock.now = atMs;
  const r = session.dispatch(event);
  if (!r.ok) throw new Error(r.error.message);
}

/** Spielt die Aktionsphase durch (alle nutzen ihre Karte, dann passen alle), bis zur Frage „Agendaphase aktiv?“. */
export function toAgendaQuestion(session: GameSession): void {
  for (let i = 0; i < 40 && session.game()!.step.kind !== 'agendaQuestion'; i++) {
    const g = session.game()!;
    const step = g.step;
    fakeClock.now += 1000;
    if (step.kind === 'secondary') session.dispatch({ type: 'secondaryDone' });
    else if (step.kind === 'turn' && step.strategyCard !== null) session.dispatch({ type: 'primaryDone' });
    else if (step.kind === 'turn') {
      const unused = g.cards.find((c) => c.ownerId === step.playerId && !c.used);
      session.dispatch(unused ? { type: 'useCard', card: unused.number } : { type: 'pass' });
    }
  }
}

/** Bis zur Agenda-Einleitung 1 (Agenda aktiv). Sprecher ist Anna (p1). */
export function toAgendaIntro(session: GameSession): void {
  toActionPhase(session);
  toAgendaQuestion(session);
  at(session, (fakeClock.now += 1000), { type: 'answerAgenda', active: true });
  at(session, (fakeClock.now += 1000), { type: 'statusDone' });
}
