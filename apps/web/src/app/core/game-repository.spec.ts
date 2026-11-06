import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG, createGame, createHistory, dispatch, type GameSetup, type History } from '@twilight-timer/domain';
import { memoryStorage } from './memory-storage';
import { GAME_STORAGE, GameRepository } from './game-repository';

const SETUP: GameSetup = {
  variants: { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true },
  players: [
    { id: 'p1', name: 'Anna', color: 'red', factionId: 'sol' },
    { id: 'p2', name: 'Ben', color: 'black', factionId: 'naalu' },
    { id: 'p3', name: 'Cem', color: 'gold', factionId: 'hacan' },
  ],
};

function history(): History {
  const r = createGame(SETUP, DEFAULT_CONFIG, 1000);
  if (!r.ok) throw new Error('setup');
  return createHistory(r.value);
}

describe('GameRepository (P1, P4–P8)', () => {
  let storage: ReturnType<typeof memoryStorage>;
  let repo: GameRepository;

  beforeEach(() => {
    storage = memoryStorage();
    TestBed.configureTestingModule({ providers: [{ provide: GAME_STORAGE, useValue: storage }] });
    repo = TestBed.inject(GameRepository);
  });

  it('speichert und lädt einen Verlauf verlustfrei; Index mit Spielern und Stand', () => {
    const h = history();
    expect(repo.save('g-1', 1000, h, 5000)).toBe(true);
    const loaded = repo.load('g-1');
    expect(loaded.ok && loaded.value.history).toEqual(h);
    expect(repo.list()).toEqual([
      {
        id: 'g-1',
        createdAt: 1000,
        updatedAt: 5000,
        players: [
          { name: 'Anna', color: 'red' },
          { name: 'Ben', color: 'black' },
          { name: 'Cem', color: 'gold' },
        ],
        round: 1,
        phase: 'strategy',
        finished: false,
        winnerName: null,
      },
    ]);
  });

  it('Liste nach letzter Änderung sortiert; zuletzt gespieltes laufendes Spiel', () => {
    repo.save('g-a', 1000, history(), 2000);
    repo.save('g-b', 1000, history(), 9000);
    expect(repo.list().map((e) => e.id)).toEqual(['g-b', 'g-a']);
    expect(repo.latestRunning()?.id).toBe('g-b');
  });

  it('beendete Spiele kompakt: nur Endstand; Sieger im Index', () => {
    let h = history();
    for (const e of [{ type: 'endGame', atMs: 2000 }, { type: 'declareWinner', winnerId: 'p2', atMs: 3000 }] as const) {
      const r = dispatch(h, e);
      if (r.ok) h = r.value;
    }
    repo.save('g-1', 1000, h, 3000);
    const loaded = repo.load('g-1');
    expect(loaded.ok && loaded.value.history.entries).toHaveLength(1);
    expect(repo.list()[0]).toMatchObject({ finished: true, winnerName: 'Ben' });
    expect(repo.latestRunning()).toBeNull();
  });

  it('löschen entfernt Spiel und Indexeintrag', () => {
    repo.save('g-1', 1000, history(), 2000);
    repo.remove('g-1');
    expect(repo.list()).toEqual([]);
    expect(repo.load('g-1').ok).toBe(false);
  });

  it('Speicher voll → false, nichts kaputt (P7)', () => {
    storage.failWrites = true;
    expect(repo.save('g-1', 1000, history(), 2000)).toBe(false);
  });

  it('beschädigter Index → leere Liste statt Absturz', () => {
    storage.data['twilight-timer.games.v1'] = '{kaputt';
    expect(repo.list()).toEqual([]);
  });

  it('Export ist gültiges JSON im Speicherformat; Import legt ein neues Spiel an (P6)', () => {
    repo.save('g-1', 1000, history(), 2000);
    const json = repo.exportJson('g-1')!;
    expect(JSON.parse(json)).toMatchObject({ format: 'twilight-timer-game', version: 1 });
    const r = repo.importJson(json, 7000);
    expect(r.ok).toBe(true);
    expect(repo.list()).toHaveLength(2);
    expect(r.ok && r.value.id).not.toBe('g-1');
  });

  it.each([
    ['kein JSON', '{kaputt'],
    ['falsches Format', JSON.stringify({ format: 'x' })],
    ['zu groß', 'x'.repeat(6 * 1024 * 1024)],
  ])('ungültiger Import (%s) → Fehler, nichts geändert (P6)', (_, text) => {
    const r = repo.importJson(text, 1);
    expect(r.ok).toBe(false);
    expect(repo.list()).toEqual([]);
  });

  it('neuere Version → verständliche Meldung (P8)', () => {
    const r = repo.importJson(JSON.stringify({ format: 'twilight-timer-game', version: 2 }), 1);
    expect(!r.ok && r.error.code).toBe('UNSUPPORTED_VERSION');
  });

  it('merkt sich die letzte Aktivität je Spiel', () => {
    repo.markSeen('g-1', 12_345);
    expect(repo.lastSeen('g-1')).toBe(12_345);
    expect(repo.lastSeen('g-x')).toBeNull();
  });
});
