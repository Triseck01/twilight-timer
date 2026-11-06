import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG, type GameSetup } from '@twilight-timer/domain';
import { GameSession } from './game-session';

const setup: GameSetup = {
  variants: { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true },
  players: [
    { id: 'p1', name: 'A', color: 'red', factionId: 'sol' },
    { id: 'p2', name: 'B', color: 'blue', factionId: 'hacan' },
    { id: 'p3', name: 'C', color: 'gold', factionId: 'letnev' },
  ],
};

describe('GameSession', () => {
  it('ohne Spiel: null', () => {
    expect(TestBed.inject(GameSession).game()).toBeNull();
  });

  it('startet ein Spiel mit den Einstellungen (Kopie)', () => {
    const session = TestBed.inject(GameSession);
    const r = session.start(setup, DEFAULT_CONFIG, 1000);
    expect(r.ok).toBe(true);
    expect(session.game()).toMatchObject({ round: 1, phase: 'strategy', speakerId: 'p1' });
  });

  it('ungültiges Setup → Fehler, kein Spiel', () => {
    const session = TestBed.inject(GameSession);
    const r = session.start({ ...setup, players: setup.players.slice(0, 2) }, DEFAULT_CONFIG, 0);
    expect(r.ok).toBe(false);
    expect(session.game()).toBeNull();
  });
});
