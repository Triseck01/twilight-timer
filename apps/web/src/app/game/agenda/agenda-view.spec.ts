import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Ticker } from '../../core/ticker';
import { at, fakeClock, gameProviders, startGame, toAgendaIntro } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { AgendaView } from './agenda-view';

describe('AgendaView (G3, G4, G8–G11)', () => {
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

  it('Fenster „Nachdem“ ohne „Agenda ersetzt“; danach Abstimmung (G9)', async () => {
    await go({ type: 'agendaRead' });
    btn('Niemand mehr')!.click();
    await fixture.whenStable();
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

  it('Abstimmung: Abstimmender, 3:00 groß, Reihenfolge links vom Sprecher, Sprecher zuletzt (G4)', async () => {
    await go({ type: 'agendaRead' });
    await go({ type: 'windowClose' });
    await go({ type: 'windowClose' });
    expect(text('voter-name')).toBe('Ben');
    expect(text('countdown')).toBe('3:00');
    expect(el.querySelector('app-countdown')!.classList).toContain('large');
    expect(chips()).toEqual(['Ben', 'Cem', 'Dana', 'Emil', 'Anna']);
    fakeClock.now += 200_000;
    await tick();
    expect(text('countdown')).toBe('-0:20');
  });

  it('Ergebnis abhandeln mit Tisch-Timer (G11); Agenda 2 mit Hinweis „Planeten bereitmachen“', async () => {
    await go({ type: 'agendaRead' });
    await go({ type: 'windowClose' });
    await go({ type: 'windowClose' });
    for (let i = 0; i < 5; i++) await go({ type: 'endVote' });
    expect(text('resolve-title')).toBe('Ergebnis abhandeln');
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
