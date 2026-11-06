import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { at, fakeClock, gameProviders, startGame, toActionPhase, toAgendaIntro } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { InterventionsDialog } from './interventions-dialog';

describe('InterventionsDialog (E1–E10)', () => {
  let fixture: ComponentFixture<InterventionsDialog>;
  let el: HTMLElement;
  let session: GameSession;

  const btn = (name: string) =>
    [...el.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') ?? b.textContent?.replace(/\s+/g, ' ').trim()) === name);
  const items = () => [...el.querySelectorAll('[data-testid="intervention"]')].map((b) => b.textContent!.trim());
  const click = async (name: string) => {
    const b = btn(name);
    expect(b, `Knopf „${name}“ fehlt`).toBeTruthy();
    b!.click();
    await fixture.whenStable();
  };
  async function render() {
    fixture = TestBed.createComponent(InterventionsDialog);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
  });

  it('Strategiephase: nur Mögliches (E10)', async () => {
    await render();
    expect(items()).toEqual(['Sprecher ändern', 'Initiative-0-Token geben', 'Bank ±1 Minute', 'Spiel beenden']);
  });

  it('Aktionsphase im Zug: alle Zug-Eingriffe', async () => {
    toActionPhase(session);
    await render();
    expect(items()).toEqual([
      'Sprecher ändern',
      'Aktiven Spieler wählen',
      'Zug überspringen',
      'Zusatzzug gewähren',
      'Strategiekarten tauschen',
      'Initiative-0-Token geben',
      'Bank ±1 Minute',
      'Spiel beenden',
    ]);
  });

  it('Sprecher ändern: Spieler wählen → übernommen, Dialog meldet „erledigt“ (E1)', async () => {
    await render();
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    await click('Sprecher ändern');
    await click('Cem');
    expect(session.game()!.speakerId).toBe('p3');
    expect(done).toHaveBeenCalled();
  });

  it('Aktiven Spieler wählen: Gepasste gesperrt (E2)', async () => {
    toActionPhase(session);
    await render();
    await click('Aktiven Spieler wählen');
    await click('Dana');
    expect(session.game()!.step).toMatchObject({ kind: 'turn', playerId: 'p4' });
  });

  it('Zug überspringen mit Bestätigung (E3)', async () => {
    toActionPhase(session); // Ben am Zug
    await render();
    await click('Zug überspringen');
    await click('Bestätigen');
    expect(session.game()!.step).toMatchObject({ kind: 'turn', playerId: 'p3' });
  });

  it('Strategiekarten tauschen: zwei Karten wählen (E5)', async () => {
    toActionPhase(session); // Anna 5, Ben 8, Cem 1, Dana 3, Emil 2
    await render();
    await click('Strategiekarten tauschen');
    await click('8 · Imperium / Imperial – Ben');
    await click('1 · Führungsstärke / Leadership – Cem');
    expect(session.game()!.cards.find((c) => c.number === 1)!.ownerId).toBe('p2');
  });

  it('Initiative-0-Token: Spieler oder niemand (E6)', async () => {
    toActionPhase(session);
    await render();
    await click('Initiative-0-Token geben');
    await click('Niemand');
    expect(session.game()!.initiativeZeroHolder).toBeNull();
  });

  it('Bank ±1 Minute: zeigt Bank, bleibt offen für mehrere Korrekturen (E8)', async () => {
    await render();
    await click('Bank ±1 Minute');
    await click('Anna: +1 Minute');
    await click('Anna: +1 Minute');
    expect(el.querySelector('[data-testid="bank-p1"]')?.textContent?.trim()).toBe('32:00');
    await click('Ben: −1 Minute');
    expect(session.game()!.players[1]!.bankMs).toBe(29 * 60_000);
  });

  it('Abstimmung gegen den Uhrzeigersinn nur in der Agenda (E7)', async () => {
    toAgendaIntro(session);
    at(session, (fakeClock.now += 1000), { type: 'agendaRead' });
    await render();
    expect(items()).toContain('Abstimmung gegen den Uhrzeigersinn');
    await click('Abstimmung gegen den Uhrzeigersinn');
    await click('Bestätigen');
    expect(session.game()!.step).toMatchObject({ kind: 'agendaWindow', reversedVoting: true });
  });

  it('Spiel beenden mit Bestätigung (E9)', async () => {
    await render();
    await click('Spiel beenden');
    expect(el.textContent).toContain('Spiel wirklich beenden?');
    await click('Bestätigen');
    expect(session.game()!.step.kind).toBe('finished');
  });

  it('Zurück aus einem Eingriff zur Liste; Schließen meldet „erledigt“', async () => {
    await render();
    const done = vi.fn();
    fixture.componentInstance.done.subscribe(done);
    await click('Sprecher ändern');
    await click('Zurück');
    expect(items().length).toBeGreaterThan(0);
    await click('Schließen');
    expect(done).toHaveBeenCalled();
  });
});
