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

  it('Strategiephase: Kopfzeile, Wahlansicht und Steuerung', async () => {
    startGame();
    const el = await render();
    expect(el.textContent).toContain('Runde 1 · Strategiephase');
    expect(el.querySelector('app-strategy-view')).not.toBeNull();
    expect(el.querySelector('app-game-controls')).not.toBeNull();
  });

  it('nach der letzten Wahl: Aktionsreihenfolge mit Initiative, Karte, Spieler, Naalu „0“ (S6)', async () => {
    const session = startGame();
    // Anna 5, Ben (Naalu) 8, Cem 1, Dana 3, Emil 2
    for (const card of [5, 8, 1, 3, 2]) {
      fakeClock.now += 1000;
      session.dispatch({ type: 'pickCard', card });
    }
    const el = await render();
    const rows = [...el.querySelectorAll('[data-testid="order-row"]')].map((r) => r.textContent!.replace(/\s+/g, ' ').trim());
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatch(/^0\s*Imperium \/ Imperial.*Ben/);
    expect(rows[1]).toMatch(/^1\s*Führungsstärke \/ Leadership.*Cem/);
    expect(rows[4]).toMatch(/^5\s*Handel \/ Trade.*Anna/);
    expect(el.textContent).toContain('Die Aktionsphase folgt mit M4.');
  });
});
