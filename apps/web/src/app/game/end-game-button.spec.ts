import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EndGameButton } from './end-game-button';
import { gameProviders, startGame } from './game-test-helpers';
import type { GameSession } from './game-session';

describe('EndGameButton (SE1, SE2)', () => {
  let fixture: ComponentFixture<EndGameButton>;
  let el: HTMLElement;
  let session: GameSession;
  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    fixture = TestBed.createComponent(EndGameButton);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('Standardbeschriftung „Spiel beenden“; Rückfrage, Abbrechen ändert nichts', async () => {
    btn('Spiel beenden')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Spiel wirklich beenden?');
    btn('Abbrechen')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(session.game()!.step.kind).toBe('pick');
  });

  it('Bestätigen beendet das Spiel', async () => {
    btn('Spiel beenden')!.click();
    await fixture.whenStable();
    btn('Bestätigen')!.click();
    await fixture.whenStable();
    expect(session.game()!.step.kind).toBe('finished');
  });

  it('Variante für die Statusphase mit eigener Beschriftung (SE1)', async () => {
    fixture.componentRef.setInput('variant', 'status');
    await fixture.whenStable();
    expect(btn('Spiel beenden (Siegpunktziel erreicht)')).toBeTruthy();
  });
});
