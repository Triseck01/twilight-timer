import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DEFAULT_CONFIG, clockView } from '@twilight-timer/domain';
import { Ticker } from '../core/ticker';
import { AnnounceOverlay } from './announce-overlay';
import { at, fakeClock, gameProviders, startGame } from './game-test-helpers';
import type { GameSession } from './game-session';

describe('AnnounceOverlay (M7-T)', () => {
  afterEach(() => localStorage.clear());

  let fixture: ComponentFixture<AnnounceOverlay>;
  let el: HTMLElement;
  let session: GameSession;
  const overlay = () => el.querySelector<HTMLElement>('[data-testid="announce"]');
  const tick = async () => {
    TestBed.inject(Ticker).refresh();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame(undefined, DEFAULT_CONFIG); // Ankündigung 8 s
    fixture = TestBed.createComponent(AnnounceOverlay);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('T1: zeigt groß, wer dran ist (Name, Volk, Sekunden)', () => {
    expect(overlay()).not.toBeNull();
    expect(el.querySelector('[data-testid="announce-name"]')?.textContent?.trim()).toBe('Anna');
    expect(overlay()!.textContent).toContain('ist dran');
    expect(el.querySelector('[data-testid="announce-seconds"]')?.textContent?.trim()).toBe('8');
    expect(el.querySelector('app-faction-badge')).not.toBeNull();
  });

  it('T2: verschwindet nach 8 s von selbst; auch nach der nächsten Wahl wieder da', async () => {
    fakeClock.now = 8_000;
    await tick();
    expect(overlay()).toBeNull();
    at(session, 20_000, { type: 'pickCard', card: 5 });
    await tick();
    expect(el.querySelector('[data-testid="announce-name"]')?.textContent?.trim()).toBe('Ben');
  });

  it('T2: Antippen startet sofort', async () => {
    fakeClock.now = 2_000;
    overlay()!.click();
    await tick();
    expect(overlay()).toBeNull();
    expect(clockView(session.game()!, 2_000)).toMatchObject({ announceMs: 0, remainingMs: 300_000 });
  });

  it('T3: in der Pause verdeckt (das Pause-Fenster hat Vorrang)', async () => {
    session.dispatch({ type: 'pause' });
    await tick();
    expect(overlay()).toBeNull();
  });

  it('ohne Ankündigung (0 s) nie sichtbar', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: gameProviders() });
    startGame();
    fixture = TestBed.createComponent(AnnounceOverlay);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(overlay()).toBeNull();
  });
});
