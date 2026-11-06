import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { at, fakeClock, gameProviders, startGame, toActionPhase, toAgendaQuestion } from './game-test-helpers';
import type { GameSession } from './game-session';
import { PhaseButton } from './phase-button';

describe('PhaseButton (G2–G4, G11)', () => {
  let fixture: ComponentFixture<PhaseButton>;
  let el: HTMLElement;
  let session: GameSession;
  const big = () => el.querySelector<HTMLButtonElement>('button');

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toActionPhase(session);
    toAgendaQuestion(session);
    at(session, (fakeClock.now += 1000), { type: 'answerAgenda', active: true });
    fixture = TestBed.createComponent(PhaseButton);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('führt mit einem großen Knopf durch Status, Einleitung, Abstimmung und Abhandeln', async () => {
    const press = async (label: string) => {
      expect(big()?.textContent?.trim()).toBe(label);
      fakeClock.now += 1000;
      big()!.click();
      await fixture.whenStable();
    };
    await press('Weiter');
    await press('Vorgelesen');
    expect(big()).toBeNull(); // Zeitfenster: Antworten im Hauptbereich
    at(session, (fakeClock.now += 1000), { type: 'windowClose' });
    at(session, (fakeClock.now += 1000), { type: 'windowClose' });
    await fixture.whenStable();
    for (let i = 0; i < 5; i++) await press('Stimme abgegeben');
    await press('Abgehandelt');
    expect(session.game()!.step).toMatchObject({ kind: 'agendaIntro', agenda: 2 });
  });

  it('in der Pause gesperrt', async () => {
    session.dispatch({ type: 'pause' });
    await fixture.whenStable();
    expect(big()!.disabled).toBe(true);
  });
});
