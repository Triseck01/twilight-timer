import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Ticker } from '../core/ticker';
import { GameControls } from './game-controls';
import { fakeClock, gameProviders, startGame } from './game-test-helpers';
import type { GameSession } from './game-session';

describe('GameControls: Pause, Undo, Redo (S4, S5)', () => {
  let fixture: ComponentFixture<GameControls>;
  let el: HTMLElement;
  let session: GameSession;

  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!;
  async function at(ms: number) {
    fakeClock.now = ms;
    TestBed.inject(Ticker).refresh();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...gameProviders()] });
    session = startGame();
    fixture = TestBed.createComponent(GameControls);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('Knopf „Hauptmenü“ führt zum Start, auch aus dem Pause-Fenster (H1)', async () => {
    const menu = () => [...el.querySelectorAll<HTMLAnchorElement>('a[href="/"]')].filter((a) => a.textContent?.trim() === 'Hauptmenü');
    expect(menu()).toHaveLength(1);
    btn('Pause').click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="pause-overlay"] a[href="/"]')?.textContent?.trim()).toBe('Hauptmenü');
  });

  it('Knopf „Eingriffe“ öffnet den Dialog; mit Thunder\'s Edge hervorgehoben (E10)', async () => {
    expect(btn('Eingriffe')!.classList).not.toContain('prominent');
    btn('Eingriffe')!.click();
    await fixture.whenStable();
    expect(el.querySelector('app-interventions-dialog')).not.toBeNull();
  });

  it('Undo/Redo gesperrt, wenn nicht möglich', async () => {
    expect(btn('Rückgängig').disabled).toBe(true);
    expect(btn('Wiederholen').disabled).toBe(true);
    session.dispatch({ type: 'pickCard', card: 1 });
    await fixture.whenStable();
    expect(btn('Rückgängig').disabled).toBe(false);
  });

  it('Undo holt den vorigen Wähler zurück; Redo stellt die Wahl wieder her', async () => {
    await at(20_000);
    session.dispatch({ type: 'pickCard', card: 1 });
    await at(30_000);
    btn('Rückgängig').click();
    await fixture.whenStable();
    expect(session.game()!.cards[0]!.ownerId).toBeNull();
    btn('Wiederholen').click();
    await fixture.whenStable();
    expect(session.game()!.cards[0]!.ownerId).toBe('p1');
  });

  it('Pause: Vollbild-Overlay mit Pausendauer, Fortsetzen; Pausenzeit zählt niemandem', async () => {
    await at(10_000);
    btn('Pause').click();
    await fixture.whenStable();
    const overlay = el.querySelector('[data-testid="pause-overlay"]')!;
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.textContent).toContain('Pausiert');
    await at(75_000);
    expect(el.querySelector('[data-testid="pause-duration"]')!.textContent?.trim()).toBe('1:05');
    btn('Fortsetzen').click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="pause-overlay"]')).toBeNull();
    expect(session.game()!.pausedTotalMs).toBe(65_000);
  });
});
