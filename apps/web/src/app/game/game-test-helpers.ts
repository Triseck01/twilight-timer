// Testhilfen für Spielansichten (nur in *.spec.ts verwendet).
import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG, type GameSetup } from '@twilight-timer/domain';
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

export function gameProviders() {
  return [{ provide: NOW, useValue: () => fakeClock.now }];
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
