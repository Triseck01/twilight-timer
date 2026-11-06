import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { fakeClock, gameProviders, playToNextRound, startGame, THREE } from '../game-test-helpers';
import { Ticker } from '../../core/ticker';
import { StrategyView } from './strategy-view';
import type { GameSession } from '../game-session';

describe('StrategyView (M3)', () => {
  afterEach(() => localStorage.clear()); // Spracheinstellung nicht in andere Tests tragen

  let fixture: ComponentFixture<StrategyView>;
  let el: HTMLElement;
  let session: GameSession;

  async function render() {
    fixture = TestBed.createComponent(StrategyView);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }
  const text = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
  const card = (n: number) => el.querySelector<HTMLButtonElement>(`[data-testid="card-${n}"]`)!;
  const dialog = () => el.querySelector<HTMLElement>('[data-testid="confirm-pick"]');
  const dialogButton = (name: string) => [...(dialog()?.querySelectorAll('button') ?? [])].find((x) => x.textContent?.trim() === name)!;
  async function tap(n: number) {
    card(n).click();
    await fixture.whenStable();
  }
  async function choose(n: number) {
    await tap(n);
    dialogButton('Wählen').click();
    await fixture.whenStable();
  }
  async function at(ms: number) {
    fakeClock.now = ms;
    TestBed.inject(Ticker).refresh();
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
  });

  it('zeigt den Wählenden mit Volk, Fortschritt und wer als Nächstes wählt (S1)', async () => {
    session = startGame();
    await render();
    expect(text('picker-name')).toBe('Anna');
    expect(text('picker-faction')).toContain('Die Sol-Föderation / The Federation of Sol');
    expect(text('pick-progress')).toBe('Wahl 1 von 5');
    expect(text('next-picker')).toBe('Als Nächstes: Ben');
    expect(el.querySelector<HTMLElement>('[data-testid="picker"]')!.style.getPropertyValue('--player-color')).toBe('#d32f2f');
  });

  it('Restzeit 5:00 läuft live und wird nach Ablauf rot im Minus (S2)', async () => {
    session = startGame();
    await render();
    expect(text('countdown')).toBe('5:00');
    await at(61_000);
    expect(text('countdown')).toBe('3:59');
    await at(310_000);
    expect(text('countdown')).toBe('-0:10');
    expect(el.querySelector('[data-testid="countdown"]')!.classList).toContain('overtime');
  });

  it('8 Karten zweisprachig; Antippen wählt, Karte zeigt Wähler und ist gesperrt (S3)', async () => {
    session = startGame();
    await render();
    expect(el.querySelectorAll('[data-testid^="card-"]')).toHaveLength(8);
    expect(card(1).textContent).toContain('Führungsstärke / Leadership');
    await choose(1);
    expect(card(1).disabled).toBe(true);
    expect(card(1).textContent).toContain('Anna');
    expect(card(1).hasAttribute('aria-label')).toBe(false);
    expect(text('picker-name')).toBe('Ben');
    expect(text('countdown')).toBe('5:00');
  });

  it('vergebene Karte von Schwarz bekommt eine helle Kante (sichtbar auf dunklem Grund)', async () => {
    session = startGame();
    session.dispatch({ type: 'pickCard', card: 1 }); // Anna (rot)
    session.dispatch({ type: 'pickCard', card: 8 }); // Ben (schwarz)
    await render();
    expect(card(8).style.getPropertyValue('--player-edge')).toBe('var(--tt-muted)');
    expect(card(1).style.getPropertyValue('--player-edge')).toBe('#d32f2f');
  });

  it('Antippen öffnet die Abfrage, ohne zu wählen (C1)', async () => {
    session = startGame();
    await render();
    await tap(3);
    expect(session.game()!.cards[2]!.ownerId).toBeNull();
    expect(dialog()?.getAttribute('role')).toBe('dialog');
    expect(dialog()?.textContent).toContain('Karte 3 · Politik / Politics');
    expect(dialog()?.textContent).toContain('für Anna wählen?');
  });

  it('„Wählen“ wählt; „Abbrechen“ schließt ohne Wahl (C2)', async () => {
    session = startGame();
    await render();
    await tap(3);
    dialogButton('Abbrechen').click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(session.game()!.cards[2]!.ownerId).toBeNull();
    await choose(3);
    expect(dialog()).toBeNull();
    expect(session.game()!.cards[2]!.ownerId).toBe('p1');
  });

  it('Escape und Tippen neben die Abfrage schließen ohne Wahl (C2)', async () => {
    session = startGame();
    await render();
    await tap(3);
    dialog()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    await tap(3);
    el.querySelector<HTMLElement>('[data-testid="confirm-backdrop"]')!.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(session.game()!.cards[2]!.ownerId).toBeNull();
  });

  it('Restzeit läuft während der Abfrage weiter (C3)', async () => {
    session = startGame();
    await render();
    await tap(3);
    await at(30_000);
    expect(text('countdown')).toBe('4:30');
  });

  it('Pause schließt die Abfrage, auch nach dem Fortsetzen bleibt sie zu (C4)', async () => {
    session = startGame();
    await render();
    await tap(3);
    expect(dialog()).not.toBeNull();
    session.dispatch({ type: 'pause' });
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    session.dispatch({ type: 'resume' });
    await fixture.whenStable();
    expect(dialog()).toBeNull();
  });

  it('Fokus auf „Wählen“; nach Abbrechen zurück auf die Karte (C5)', async () => {
    session = startGame();
    await render();
    document.body.appendChild(el);
    await tap(3);
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement).toBe(dialogButton('Wählen'));
    dialogButton('Abbrechen').click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement).toBe(card(3));
    el.remove();
  });

  it('englisch: Abfrage auf Englisch (C5)', async () => {
    localStorage.setItem('twilight-timer.language.v1', 'en');
    session = startGame();
    await render();
    await tap(1);
    expect(dialog()?.textContent).toContain('Card 1 · Leadership / Führungsstärke');
    expect(dialog()?.textContent).toContain('Pick for Anna?');
    expect(dialogButton('Pick')).toBeTruthy();
    expect(dialogButton('Cancel')).toBeTruthy();
  });

  it('große Restzeit in der Strategiephase (C7)', async () => {
    session = startGame();
    await render();
    expect(el.querySelector('app-countdown')!.classList).toContain('large');
  });

  it('3 Spieler: zweiter Durchgang wird angezeigt (S1)', async () => {
    session = startGame(THREE);
    for (const c of [1, 2, 3]) session.dispatch({ type: 'pickCard', card: c });
    await render();
    expect(text('pick-progress')).toBe('Wahl 4 von 6 · Durchgang 2');
  });

  it('Handelswaren auf freien Karten (S3)', async () => {
    session = startGame();
    playToNextRound(session, [1, 2, 3, 4, 5]);
    await render();
    expect(text('card-6-goods')).toBe('+1 Handelsware');
    expect(el.querySelector('[data-testid="card-1-goods"]')).toBeNull();
  });

  it('englisch: Kartennamen Englisch zuerst', async () => {
    localStorage.setItem('twilight-timer.language.v1', 'en');
    session = startGame();
    await render();
    expect(card(1).textContent).toContain('Leadership / Führungsstärke');
    expect(text('pick-progress')).toBe('Pick 1 of 5');
  });
});
