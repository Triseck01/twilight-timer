import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { at, gameProviders, startGame, toActionPhase } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { ActionButtons } from './action-buttons';

describe('ActionButtons (M4)', () => {
  afterEach(() => localStorage.clear()); // Spracheinstellung nicht in andere Tests tragen

  let fixture: ComponentFixture<ActionButtons>;
  let el: HTMLElement;
  let session: GameSession;

  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
  const hint = () => el.querySelector('[data-testid="pass-hint"]')?.textContent?.trim();
  const active = () => {
    const s = session.game()!.step;
    return s.kind === 'turn' ? s.playerId : null;
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toActionPhase(session); // Ben (p2) am Zug
    fixture = TestBed.createComponent(ActionButtons);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('„Nächster Spieler“ rechnet ab und gibt weiter (A4)', async () => {
    btn('Nächster Spieler')!.click();
    await fixture.whenStable();
    expect(active()).toBe('p3');
  });

  it('nach Karten-Abzeichen: „Primär erledigt“ öffnet die Sekundärphase (A5)', async () => {
    at(session, 5000, { type: 'useCard', card: 8 });
    await fixture.whenStable();
    expect(btn('Nächster Spieler')).toBeUndefined();
    btn('Primär erledigt')!.click();
    await fixture.whenStable();
    expect(session.game()!.step.kind).toBe('secondary');
    expect(btn('Primär erledigt')).toBeUndefined();
    expect(btn('Passen')).toBeUndefined();
  });

  it('Passen gesperrt mit Hinweis, bis eigene Karten benutzt sind (A7)', async () => {
    expect(btn('Passen')!.disabled).toBe(true);
    expect(hint()).toBe('Erst Strategiekarte nutzen');
    at(session, 5000, { type: 'useCard', card: 8 });
    await fixture.whenStable();
    expect(btn('Passen')!.disabled).toBe(true);
    expect(hint()).toBe('Erst „Primär erledigt“');
  });

  it('Passen mit Rückfrage; Abbrechen ändert nichts, Passen gibt weiter (A7)', async () => {
    let t = 1000;
    for (const card of [8, 1, 2, 3, 5]) {
      at(session, (t += 1000), { type: 'useCard', card });
      at(session, (t += 1000), { type: 'primaryDone' });
      if (card === 3) at(session, (t += 1000), { type: 'chooseSpeaker', playerId: 'p5' }); // Politik: Dana wählt Emil
      at(session, (t += 1000), { type: 'secondaryDone' });
    }
    await fixture.whenStable();
    expect(active()).toBe('p2');
    expect(hint()).toBeUndefined();
    btn('Passen')!.click();
    await fixture.whenStable();
    const dialog = el.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Ben passt?');
    btn('Abbrechen')!.click();
    await fixture.whenStable();
    expect(session.game()!.players[1]!.passed).toBe(false);
    btn('Passen')!.click();
    await fixture.whenStable();
    [...el.querySelectorAll('[role="dialog"] button')].find((b) => b.textContent?.trim() === 'Passen')!.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    expect(session.game()!.players[1]!.passed).toBe(true);
    expect(active()).toBe('p3');
  });

  it('englisch: Knöpfe auf Englisch', async () => {
    localStorage.setItem('twilight-timer.language.v1', 'en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toActionPhase(session);
    fixture = TestBed.createComponent(ActionButtons);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(btn('Next player')).toBeTruthy();
    expect(btn('Pass')).toBeTruthy();
  });
});
