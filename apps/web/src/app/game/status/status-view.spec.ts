import { TestBed } from '@angular/core/testing';
import { at, fakeClock, gameProviders, startGame, toActionPhase, toAgendaQuestion } from '../game-test-helpers';
import { StatusView } from './status-view';

describe('StatusView (G2)', () => {
  async function render(lang?: string) {
    localStorage.clear();
    if (lang) localStorage.setItem('twilight-timer.language.v1', lang);
    TestBed.configureTestingModule({ providers: gameProviders() });
    const session = startGame();
    toActionPhase(session);
    toAgendaQuestion(session);
    at(session, (fakeClock.now += 1000), { type: 'answerAgenda', active: false });
    const f = TestBed.createComponent(StatusView);
    await f.whenStable();
    return f.nativeElement as HTMLElement;
  }

  it('Merkliste der 8 Schritte mit offiziellen Bezeichnungen', async () => {
    const el = await render();
    const steps = [...el.querySelectorAll('[data-testid="status-step"]')].map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(steps).toHaveLength(8);
    expect(steps[0]).toContain('Aufträge werten');
    expect(steps[7]).toContain('Strategiekarten zurücklegen');
  });

  it('Wertungsreihenfolge nach Initiative (Naalu 0 zuerst)', async () => {
    const el = await render();
    const order = [...el.querySelectorAll('[data-testid="scoring-chip"]')].map((c) =>
      [...c.querySelectorAll('span')].map((s) => s.textContent!.trim()).join(' '),
    );
    expect(order).toEqual(['0 Ben', '1 Cem', '2 Emil', '3 Dana', '5 Anna']);
  });

  it('englisch: offizielle englische Bezeichnungen', async () => {
    const el = await render('en');
    expect(el.textContent).toContain('Score Objectives');
    expect(el.textContent).toContain('Return Strategy Cards');
  });
});
