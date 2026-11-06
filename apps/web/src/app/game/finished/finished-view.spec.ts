import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { at, fakeClock, gameProviders, startGame, toActionPhase } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { CELEBRATION_MS } from './celebration';
import { FinishedView } from './finished-view';

describe('FinishedView (E9, E13, E14)', () => {
  let fixture: ComponentFixture<FinishedView>;
  let el: HTMLElement;
  let session: GameSession;

  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.replace(/\s+/g, ' ').trim() === name);
  const text = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim();

  async function render() {
    fixture = TestBed.createComponent(FinishedView);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...gameProviders(), { provide: CELEBRATION_MS, useValue: 50 }] });
    session = startGame();
    toActionPhase(session);
    at(session, (fakeClock.now += 60_000), { type: 'endTurn' });
    at(session, (fakeClock.now += 1000), { type: 'endGame' });
  });

  it('fragt „Wer hat gewonnen?“ mit einem Knopf je Spieler und „Ohne Sieger beenden“ (E9)', async () => {
    await render();
    expect(text('winner-question')).toBe('Wer hat gewonnen?');
    expect(el.querySelectorAll('[data-testid="winner-option"]')).toHaveLength(5);
    btn('Ben')!.click();
    await fixture.whenStable();
    expect(session.game()!.step).toMatchObject({ kind: 'finished', winnerId: 'p2', decided: true });
  });

  it('Siegerfeier: Vollbild, „Sieg für Ben!“, Konfetti; nach Ablauf vorbei (E13, Standard 5 s)', async () => {
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: 'p2' });
    await render();
    expect(text('celebration-title')).toBe('Sieg für Ben!');
    expect(el.querySelectorAll('[data-testid="confetti"]').length).toBeGreaterThan(20);
    await new Promise((r) => setTimeout(r, 120));
    await fixture.whenStable();
    expect(text('celebration-title')).toBeUndefined();
  });

  it('Standarddauer der Feier ist 5 s', () => {
    TestBed.resetTestingModule();
    expect(TestBed.inject(CELEBRATION_MS)).toBe(5000);
  });

  it('Antippen überspringt die Feier (E13)', async () => {
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: 'p2' });
    await render();
    el.querySelector<HTMLElement>('[data-testid="celebration"]')!.click();
    await fixture.whenStable();
    expect(text('celebration-title')).toBeUndefined();
  });

  it('„Bewegung reduzieren“: kein Konfetti (E13)', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce'), media: q })) as typeof window.matchMedia;
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: 'p2' });
    await render();
    expect(text('celebration-title')).toBe('Sieg für Ben!');
    expect(el.querySelectorAll('[data-testid="confetti"]')).toHaveLength(0);
    window.matchMedia = original;
  });

  it('Endauswertung: Sieger mit Krone, Übersicht, Spieler × Runde, je Spieler, je Runde (E14)', async () => {
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: 'p2' });
    await render();
    btn('Weiter zur Auswertung')?.click();
    el.querySelector<HTMLElement>('[data-testid="celebration"]')?.click();
    await fixture.whenStable();
    expect(text('final-winner')).toContain('👑');
    expect(text('final-winner')).toContain('Ben');
    expect(text('overview-rounds')).toBe('1');
    expect(el.querySelectorAll('[data-testid="player-round-row"]')).toHaveLength(5);
    expect(el.querySelectorAll('[data-testid="player-card"]')).toHaveLength(5);
    expect(el.querySelectorAll('[data-testid="round-card"]')).toHaveLength(1);
    expect(el.querySelector('[data-player="p2"]')?.textContent).toContain('Ø pro Zug');
    expect(el.querySelector('[data-player="p2"]')?.textContent).toContain('Bedenkzeit in Fragerunden'); // W6
  });

  it('ohne Sieger: keine Feier, keine Krone (E14)', async () => {
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: null });
    await render();
    expect(el.querySelector('[data-testid="celebration"]')).toBeNull();
    expect(text('final-winner')).toBe('Ohne Sieger');
  });

  it('„Zurück ins Spiel“ nimmt das Spielende zurück', async () => {
    at(session, (fakeClock.now += 1000), { type: 'declareWinner', winnerId: null });
    await render();
    btn('Zurück ins Spiel')!.click();
    await fixture.whenStable();
    expect(session.game()!.step.kind).toBe('turn');
  });
});
