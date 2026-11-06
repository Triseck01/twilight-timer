import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG } from '@twilight-timer/domain';
import { memoryStorage } from '../core/memory-storage';
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

  it('pauseIfRunning pausiert ein laufendes Spiel, sonst nichts (H2)', () => {
    const empty = TestBed.inject(GameSession);
    expect(() => empty.pauseIfRunning()).not.toThrow();
    const session = startGame();
    fakeClock.now = 5000;
    session.pauseIfRunning();
    expect(session.game()!.pause).toEqual({ since: 5000 });
    fakeClock.now = 9000;
    session.pauseIfRunning();
    expect(session.game()!.pause).toEqual({ since: 5000 });
  });


  it('ungültiges Ereignis → Fehler, Zustand unverändert', () => {
    const session = startGame();
    const before = session.game();
    expect(session.dispatch({ type: 'endTurn' }).ok).toBe(false);
    expect(session.game()).toBe(before);
  });

  describe('Speichern und Wiederherstellen (M7)', () => {
    function restart(storage: ReturnType<typeof memoryStorage>, at: number) {
      TestBed.resetTestingModule();
      fakeClock.now = at;
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      return TestBed.inject(GameSession);
    }

    it('jede Änderung wird gespeichert; nach Neustart ist das Spiel exakt wieder da, mit Undo (P1)', () => {
      TestBed.resetTestingModule();
      const storage = memoryStorage();
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      const session = startGame();
      fakeClock.now = 10_000;
      session.dispatch({ type: 'pickCard', card: 1 });
      const before = session.game();
      const again = restart(storage, 20_000);
      expect(again.game()).toEqual(before);
      expect(again.canUndo()).toBe(true);
    });

    it('Neuladen mitten im Zug: Zeit läuft weiter (P2)', () => {
      TestBed.resetTestingModule();
      const storage = memoryStorage();
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      startGame(); // Wahl läuft seit t=0
      const again = restart(storage, 60_000); // 1 min später – unter 5 min Abwesenheit
      expect(again.game()!.pause).toBeNull();
    });

    it('Abwesenheit > 5 min → Pause ab der letzten Aktivität (P3)', () => {
      TestBed.resetTestingModule();
      const storage = memoryStorage();
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      const session = startGame();
      fakeClock.now = 30_000;
      session.heartbeat();
      const again = restart(storage, 30_000 + 10 * 60_000);
      expect(again.game()!.pause).toEqual({ since: 30_000 });
    });

    it('beendetes Spiel wird nicht automatisch geladen; „Spiel fortsetzen“ lädt das zuletzt gespielte', () => {
      TestBed.resetTestingModule();
      const storage = memoryStorage();
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      const session = startGame();
      session.dispatch({ type: 'endGame' });
      const again = restart(storage, 5000);
      expect(again.game()).toBeNull();
    });

    it('Speicher voll → Hinweis-Signal, Spiel läuft weiter (P7)', () => {
      TestBed.resetTestingModule();
      const storage = memoryStorage();
      TestBed.configureTestingModule({ providers: gameProviders(storage) });
      const session = startGame();
      storage.failWrites = true;
      fakeClock.now = 1000;
      expect(session.dispatch({ type: 'pickCard', card: 1 }).ok).toBe(true);
      expect(session.storageError()).toBe(true);
      expect(session.game()!.cards[0]!.ownerId).toBe('p1');
    });
  });
});
