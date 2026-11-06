import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Ticker } from '../../core/ticker';
import { at, fakeClock, gameProviders, startGame, toAgendaIntro } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { AgendaView } from './agenda-view';

describe('AgendaView (G3, G4, G8–G11)', () => {
  afterEach(() => localStorage.clear()); // Spracheinstellung nicht in andere Tests tragen

  let fixture: ComponentFixture<AgendaView>;
  let el: HTMLElement;
  let session: GameSession;

  const text = (id: string) => el.querySelector(`[data-testid="${id}"]`)?.textContent?.replace(/\s+/g, ' ').trim();
  const chips = () =>
    [...el.querySelectorAll('[data-testid="queue-chip"]')].map((c) => [...c.querySelectorAll('span')].map((s) => s.textContent!.trim()).join(' '));
  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);
  const tick = async () => {
    TestBed.inject(Ticker).refresh();
    await fixture.whenStable();
  };
  const go = async (e: Parameters<GameSession['dispatch']>[0]) => {
    at(session, (fakeClock.now += 1000), e);
    await tick();
  };

  const toVote = async () => {
    await go({ type: 'agendaRead' });
    await go({ type: 'windowClose' });
    await go({ type: 'discussionDone' });
    await go({ type: 'windowClose' });
  };

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toAgendaIntro(session);
    fixture = TestBed.createComponent(AgendaView);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  it('Einleitung: „Agenda 1 von 2 – Sprecher liest vor“ mit Sprecher (G3)', () => {
    expect(text('agenda-title')).toBe('Agenda 1 von 2 – Sprecher liest vor');
    expect(text('speaker')).toContain('Anna');
    expect(text('planets-hint')).toBeUndefined();
  });

  it('Fenster „Sobald“: ab Sprecher, Frage, Antworten, Tisch-Timer, Knöpfe (G8, G10)', async () => {
    await go({ type: 'agendaRead' });
    expect(text('window-title')).toBe('Sobald eine Agenda aufgedeckt wird');
    expect(chips()).toEqual(['Anna', 'Ben', 'Cem', 'Dana', 'Emil']);
    expect(text('window-question')).toBe('Anna: Aktionskarte spielen?');
    for (const name of ['Nein', 'Ja, gespielt', 'Niemand mehr', 'Agenda ersetzt']) expect(btn(name), name).toBeTruthy();
    fakeClock.now += 42_000;
    await tick();
    expect(text('table-timer')).toBe('0:42');
    btn('Ja, gespielt')!.click();
    await fixture.whenStable();
    expect(chips()[0]).toBe('Anna ✓');
    expect(text('window-question')).toBe('Ben: Aktionskarte spielen?');
  });

  it('Personen-Timer groß, springt nach jeder Antwort auf 0:00; Tisch-Timer klein (W1–W3)', async () => {
    await go({ type: 'agendaRead' });
    fakeClock.now += 12_000;
    await tick();
    expect(text('asked-timer-label')).toBe('Anna');
    expect(text('asked-timer')).toBe('0:12');
    expect(el.querySelector('[data-testid="asked-timer"]')!.classList).toContain('large');
    expect(el.querySelector('[data-testid="table-timer"]')!.classList).not.toContain('large');
    await go({ type: 'windowAnswer', played: false });
    expect(text('asked-timer-label')).toBe('Ben');
    expect(text('asked-timer')).toBe('0:00');
    expect(text('table-timer')).toBe('0:13');
  });

  it('Fenster „Nachdem“ ohne „Agenda ersetzt“; danach Abstimmung (G9)', async () => {
    await go({ type: 'agendaRead' });
    btn('Niemand mehr')!.click();
    await fixture.whenStable();
    expect(text('discussion-title')).toBe('Diskussion');
    await go({ type: 'discussionDone' });
    expect(text('window-title')).toBe('Nachdem eine Agenda aufgedeckt wurde');
    expect(btn('Agenda ersetzt')).toBeUndefined();
    btn('Niemand mehr')!.click();
    await fixture.whenStable();
    expect(text('voter-name')).toBe('Ben');
  });

  it('„Agenda ersetzt“ startet das Fenster neu ab dem Sprecher', async () => {
    await go({ type: 'agendaRead' });
    btn('Nein')!.click();
    await fixture.whenStable();
    btn('Agenda ersetzt')!.click();
    await fixture.whenStable();
    expect(text('window-question')).toBe('Anna: Aktionskarte spielen?');
    expect(chips()[0]).toBe('Anna');
  });

  it('Diskussion nach „Sobald“: 8:00 groß, danach rot ins Minus (A1, A2)', async () => {
    await go({ type: 'agendaRead' });
    await go({ type: 'windowClose' });
    expect(text('discussion-title')).toBe('Diskussion');
    expect(text('countdown')).toBe('8:00');
    expect(el.querySelector('app-countdown')!.classList).toContain('large');
    fakeClock.now += 490_000;
    await tick();
    expect(text('countdown')).toBe('-0:10');
    expect(el.querySelector('[data-testid="countdown"]')!.classList).toContain('overtime');
  });

  it('Ziffernblock: Stimmen eintippen, „A“/„B“/„Enthaltung“ schließt ab; Summen sichtbar (A4)', async () => {
    await toVote();
    const key = (k: string) => el.querySelector<HTMLButtonElement>(`[data-testid="key-${k}"]`)!;
    key('3').click();
    key('4').click();
    await fixture.whenStable();
    expect(text('vote-input')).toBe('34');
    btn('A')!.click();
    await fixture.whenStable();
    expect(text('tally')).toBe('A: 34 · B: 0');
    expect(text('voter-name')).toBe('Cem');
    expect(text('vote-input')).toBe('0');
    key('7').click();
    key('9').click();
    key('back').click();
    await fixture.whenStable();
    expect(text('vote-input')).toBe('7');
    btn('B')!.click();
    await fixture.whenStable();
    expect(text('tally')).toBe('A: 34 · B: 7');
    btn('Enthaltung')!.click();
    await fixture.whenStable();
    expect(text('tally')).toBe('A: 34 · B: 7');
    expect(text('voter-name')).toBe('Emil');
  });

  it('Ziffernblock: höchstens drei Stellen; in der Pause gesperrt', async () => {
    await toVote();
    const key = (k: string) => el.querySelector<HTMLButtonElement>(`[data-testid="key-${k}"]`)!;
    for (const k of ['1', '2', '3', '4']) key(k).click();
    await fixture.whenStable();
    expect(text('vote-input')).toBe('123');
    session.dispatch({ type: 'pause' });
    await fixture.whenStable();
    expect(key('5').disabled).toBe(true);
    expect(btn('A')!.disabled).toBe(true);
  });

  it('Abstimmung: Abstimmender, 2:00 groß, Reihenfolge links vom Sprecher, Sprecher zuletzt (G4)', async () => {
    await toVote();
    expect(text('voter-name')).toBe('Ben');
    expect(text('countdown')).toBe('2:00');
    expect(el.querySelector('app-countdown')!.classList).toContain('large');
    expect(chips()).toEqual(['Ben', 'Cem', 'Dana', 'Emil', 'Anna']);
    fakeClock.now += 200_000;
    await tick();
    expect(text('countdown')).toBe('-1:20');
  });

  it('Ergebnis abhandeln mit Tisch-Timer und Stimmen-Summen (G11, A5); Agenda 2 mit Hinweis „Planeten bereitmachen“', async () => {
    await toVote();
    await go({ type: 'endVote', option: 'a', votes: 5 });
    await go({ type: 'endVote', option: 'b', votes: 3 });
    for (let i = 0; i < 3; i++) await go({ type: 'endVote' });
    expect(text('resolve-title')).toBe('Ergebnis abhandeln');
    expect(text('tally')).toBe('A: 5 · B: 3');
    fakeClock.now += 30_000;
    await tick();
    expect(text('table-timer')).toBe('0:30');
    await go({ type: 'resolved' });
    expect(text('agenda-title')).toBe('Agenda 2 von 2 – Sprecher liest vor');
    expect(text('planets-hint')).toBe('Nach dieser Agenda: Planeten spielbereit machen');
  });

  it('englisch', async () => {
    localStorage.setItem('twilight-timer.language.v1', 'en');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toAgendaIntro(session);
    fixture = TestBed.createComponent(AgendaView);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(text('agenda-title')).toBe('Agenda 1 of 2 – speaker reads aloud');
    await go({ type: 'agendaRead' });
    expect(text('window-title')).toBe('When an agenda is revealed');
  });
});
