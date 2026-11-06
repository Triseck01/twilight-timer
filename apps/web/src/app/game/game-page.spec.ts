import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GamePage } from './game-page';
import { fakeClock, gameProviders, startGame } from './game-test-helpers';

describe('GamePage (M3)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...gameProviders()] });
  });

  async function render() {
    const f = TestBed.createComponent(GamePage);
    await f.whenStable();
    return f.nativeElement as HTMLElement;
  }

  it('ohne Spiel: Hinweis und Link zu „Neues Spiel“', async () => {
    const el = await render();
    expect(el.textContent).toContain('Kein laufendes Spiel');
    expect(el.querySelector('a[href="/neues-spiel"]')).not.toBeNull();
  });

  it('Verlassen der Spielansicht pausiert automatisch (H2); bereits pausiert bleibt pausiert', async () => {
    const session = startGame();
    fakeClock.now = 12_000;
    const f = TestBed.createComponent(GamePage);
    await f.whenStable();
    f.destroy();
    expect(session.game()!.pause).toEqual({ since: 12_000 });
    const g = TestBed.createComponent(GamePage);
    await g.whenStable();
    fakeClock.now = 50_000;
    g.destroy();
    expect(session.game()!.pause).toEqual({ since: 12_000 });
  });

  it('Strategiephase: Kopfzeile, Wahlansicht und Steuerung', async () => {
    startGame();
    const el = await render();
    expect(el.textContent).toContain('Runde 1 · Strategiephase');
    expect(el.querySelector('app-strategy-view')).not.toBeNull();
    expect(el.querySelector('app-game-controls')).not.toBeNull();
  });

  it('nach der letzten Wahl: Aktionsphase mit Aktionsansicht und Aktionsknöpfen (M4)', async () => {
    const session = startGame();
    for (const card of [5, 8, 1, 3, 2]) {
      fakeClock.now += 1000;
      session.dispatch({ type: 'pickCard', card });
    }
    const el = await render();
    expect(el.textContent).toContain('Runde 1 · Aktionsphase');
    expect(el.querySelector('app-action-view')).not.toBeNull();
    expect(el.querySelector('app-action-buttons')).not.toBeNull();
  });
});
