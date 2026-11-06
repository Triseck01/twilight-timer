import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG } from '@twilight-timer/domain';
import { FIVE, fakeClock, gameProviders, startGame } from './game-test-helpers';
import { GameSession } from './game-session';

describe('GameSession', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: gameProviders() }));

  it('ohne Spiel: null, kein Undo/Redo', () => {
    const s = TestBed.inject(GameSession);
    expect(s.game()).toBeNull();
    expect([s.canUndo(), s.canRedo()]).toEqual([false, false]);
  });

  it('startet ein Spiel mit den Einstellungen (Kopie)', () => {
    expect(startGame().game()).toMatchObject({ round: 1, phase: 'strategy', speakerId: 'p1' });
  });

  it('ungültiges Setup → Fehler, kein Spiel', () => {
    const session = TestBed.inject(GameSession);
    expect(session.start({ ...FIVE, players: FIVE.players.slice(0, 2) }, DEFAULT_CONFIG, 0).ok).toBe(false);
    expect(session.game()).toBeNull();
  });

  it('Ereignisse bekommen den aktuellen Zeitstempel; Undo/Redo zur aktuellen Zeit', () => {
    const session = startGame();
    fakeClock.now = 30_000;
    expect(session.dispatch({ type: 'pickCard', card: 1 }).ok).toBe(true);
    expect(session.game()!.cards[0]!.ownerId).toBe('p1');
    expect(session.canUndo()).toBe(true);
    fakeClock.now = 90_000;
    session.undo();
    expect(session.game()!.cards[0]!.ownerId).toBeNull();
    expect(session.canRedo()).toBe(true);
    session.redo();
    expect(session.game()!.cards[0]!.ownerId).toBe('p1');
  });

  it('ungültiges Ereignis → Fehler, Zustand unverändert', () => {
    const session = startGame();
    const before = session.game();
    expect(session.dispatch({ type: 'endTurn' }).ok).toBe(false);
    expect(session.game()).toBe(before);
  });
});
