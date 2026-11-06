import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Ticker } from '../../core/ticker';
import { at, fakeClock, gameProviders, startGame, toActionPhase, toAgendaQuestion } from '../game-test-helpers';
import type { GameSession } from '../game-session';
import { ActionView } from './action-view';

describe('ActionView (M4)', () => {
  let fixture: ComponentFixture<ActionView>;
  let el: HTMLElement;
  let session: GameSession;

  const q = (id: string) => el.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  const text = (id: string) => q(id)?.textContent?.replace(/\s+/g, ' ').trim();
  const all = (id: string) => [...el.querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
  /** Text der Teile eines Chips, mit Leerzeichen verbunden (Angular entfernt Leerraum zwischen Elementen). */
  const parts = (c: HTMLElement) => [...c.querySelectorAll('span')].map((s) => s.textContent!.trim()).join(' ');
  const btn = (name: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!;
  async function now(ms: number) {
    fakeClock.now = ms;
    TestBed.inject(Ticker).refresh();
    await fixture.whenStable();
  }
  async function render() {
    fixture = TestBed.createComponent(ActionView);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: gameProviders() });
    session = startGame();
    toActionPhase(session); // Ben am Zug ab t=0
    await render();
  });

  it('Initiative-Leiste in Aktionsreihenfolge, Aktiver markiert; Zähler gepasst (A1)', () => {
    expect(all('initiative-chip').map(parts)).toEqual(['0 Ben', '1 Cem', '2 Emil', '3 Dana', '5 Anna ★']);
    expect(all('initiative-chip')[0]!.getAttribute('aria-current')).toBe('true');
    expect(text('passed-count')).toBe('0/5 gepasst');
  });

  it('Feld des Aktiven: Name, Volk, Karten-Abzeichen, große Zugzeit, Bank, Als Nächstes (A2)', () => {
    expect(text('active-name')).toBe('Ben');
    expect(text('active-faction')).toContain('Das Naalu-Kollektiv');
    expect(text('card-badge-8')).toBe('8 · Imperium / Imperial');
    expect(text('countdown')).toBe('1:30');
    expect(text('big-label')).toBe('Zugzeit');
    expect(text('bank')).toBe('Bank 30:00');
    expect(text('next-actor')).toBe('Als Nächstes: Cem');
    expect(el.querySelector('app-countdown')!.classList).toContain('large');
  });

  it('nach Ablauf der Zugzeit zeigt die große Uhr die Bank live; leer → rot im Minus (A3)', async () => {
    await now(100_000);
    expect(text('big-label')).toBe('Bank');
    expect(text('countdown')).toBe('29:50');
    expect(text('turn-over')).toBe('Zugzeit abgelaufen');
    await now(90_000 + 1_800_000 + 10_000);
    expect(text('countdown')).toBe('-0:10');
    expect(q('countdown')!.classList).toContain('overtime');
  });

  it('Zugzeit-Balken zeigt die verbleibende Zugzeit', async () => {
    await now(45_000);
    const bar = el.querySelector<HTMLProgressElement>('progress')!;
    expect([bar.max, bar.value]).toEqual([90_000, 45_000]);
  });

  it('Karten-Abzeichen antippen → Karte benutzt, Abzeichen gesperrt (A5)', async () => {
    q('card-badge-8')!.click();
    await fixture.whenStable();
    expect(session.game()!.cards[7]!.used).toBe(true);
    expect((q('card-badge-8') as HTMLButtonElement).disabled).toBe(true);
    expect(q('card-badge-8')!.classList).toContain('used');
  });

  it('Sekundärphase: Personen-Timer groß, springt nach jeder Antwort auf 0:00; Tisch-Timer klein (W1–W3)', async () => {
    at(session, 10_000, { type: 'useCard', card: 8 });
    at(session, 20_000, { type: 'primaryDone' });
    await now(27_000);
    expect(text('asked-timer-label')).toBe('Cem');
    expect(text('asked-timer')).toBe('0:07');
    expect(q('asked-timer')!.classList).toContain('large');
    expect(q('table-timer')!.classList).not.toContain('large');
    btn('Nein').click();
    await fixture.whenStable();
    expect(text('asked-timer-label')).toBe('Dana');
    expect(text('asked-timer')).toBe('0:00');
    expect(text('table-timer')).toBe('0:07');
  });

  it('Sekundärphase: Titel, Tisch-Timer hoch, Reihenfolge, Frage Ja/Nein; Ja → nächster (A6)', async () => {
    at(session, 10_000, { type: 'useCard', card: 8 });
    at(session, 20_000, { type: 'primaryDone' });
    await now(20_000);
    expect(text('secondary-title')).toBe('Sekundär: Imperium / Imperial · von Ben');
    expect(all('secondary-chip').map(parts)).toEqual(['Cem', 'Dana', 'Emil', 'Anna']);
    expect(text('secondary-question')).toBe('Cem: Sekundärfähigkeit nutzen?');
    await now(95_000);
    expect(text('table-timer')).toBe('1:15');
    expect(q('table-timer')!.querySelector('[data-testid="countdown"]')!.classList).not.toContain('overtime');
    btn('Ja').click();
    await fixture.whenStable();
    expect(text('secondary-question')).toBe('Dana: Sekundärfähigkeit nutzen?');
    expect(all('secondary-chip')[0]!.textContent).toContain('✓');
    btn('Nein').click();
    await fixture.whenStable();
    expect(all('secondary-chip')[1]!.textContent).toContain('✗');
  });

  it('„Rest: alle Nein“ beendet die Sekundärphase; Nächster nach Initiative ist dran', async () => {
    at(session, 10_000, { type: 'useCard', card: 8 });
    at(session, 20_000, { type: 'primaryDone' });
    await fixture.whenStable();
    btn('Rest: alle Nein').click();
    await fixture.whenStable();
    expect(text('active-name')).toBe('Cem');
  });

  it('Gepasste bleiben in der Leiste sichtbar und werden in der Sekundärphase gefragt (A1, A11)', async () => {
    let t = 1000;
    const go = (e: Parameters<GameSession['dispatch']>[0]) => at(session, (t += 1000), e);
    go({ type: 'useCard', card: 8 }); go({ type: 'primaryDone' }); go({ type: 'secondaryDone' }); // Ben
    go({ type: 'useCard', card: 1 }); go({ type: 'primaryDone' }); go({ type: 'secondaryDone' }); // Cem
    go({ type: 'useCard', card: 2 }); go({ type: 'primaryDone' }); go({ type: 'secondaryDone' }); // Emil
    go({ type: 'endTurn' }); // Dana taktisch (Karte 3 bleibt)
    go({ type: 'endTurn' }); // Anna taktisch (Karte 5 bleibt)
    go({ type: 'pass' }); // Ben
    go({ type: 'pass' }); // Cem
    go({ type: 'endTurn' }); // Emil
    await fixture.whenStable();
    expect(text('passed-count')).toBe('2/5 gepasst');
    expect(all('initiative-chip')[0]!.textContent).toContain('gepasst');
    expect(text('active-name')).toBe('Dana');
    go({ type: 'useCard', card: 3 });
    go({ type: 'primaryDone' });
    go({ type: 'chooseSpeaker', playerId: 'p5' }); // Politik: Dana wählt Emil
    await fixture.whenStable();
    const chips = all('secondary-chip').map(parts);
    expect(chips).toEqual(['Emil', 'Anna', 'Ben gepasst', 'Cem gepasst']);
    for (let i = 0; i < 4; i++) {
      btn('Ja').click();
      await fixture.whenStable();
    }
    expect(text('active-name')).toBe('Anna');
  });

  it('Politik: Frage „Wer wird neuer Sprecher?“, amtierender Sprecher gesperrt; danach Sekundärfragen (PO1, PO2)', async () => {
    // Reihenfolge Ben, Cem, Emil, Dana (Politik), Anna; Sprecher Anna
    let t = 1000;
    const go = (e: Parameters<GameSession['dispatch']>[0]) => at(session, (t += 1000), e);
    go({ type: 'endTurn' }); // Ben
    go({ type: 'endTurn' }); // Cem
    go({ type: 'endTurn' }); // Emil
    go({ type: 'useCard', card: 3 }); // Dana: Politik
    go({ type: 'primaryDone' });
    await fixture.whenStable();
    expect(text('speaker-question')).toBe('Politik: Wer wird neuer Sprecher?');
    expect(btn('Ja')).toBeUndefined();
    const options = [...el.querySelectorAll<HTMLButtonElement>('[data-testid="speaker-option"]')];
    expect(options.map((b) => b.textContent!.trim())).toEqual(['Anna', 'Ben', 'Cem', 'Dana', 'Emil']);
    expect(options[0]!.disabled).toBe(true);
    options[2]!.click();
    await fixture.whenStable();
    expect(session.game()!.speakerId).toBe('p3');
    expect(text('secondary-question')).toBe('Emil: Sekundärfähigkeit nutzen?');
    // Sprecher-Markierung in der Initiative-Leiste wechselt
    const cem = all('initiative-chip').find((c) => c.textContent!.includes('Cem'))!;
    expect(cem.querySelector('[data-testid="speaker-mark"]')).not.toBeNull();
  });

  it('Initiative-Leiste markiert den Sprecher mit ★', () => {
    const anna = all('initiative-chip').find((c) => c.textContent!.includes('Anna'))!;
    expect(anna.querySelector('[data-testid="speaker-mark"]')?.textContent).toBe('★');
    expect(all('initiative-chip').filter((c) => c.querySelector('[data-testid="speaker-mark"]'))).toHaveLength(1);
  });

  it('alle haben gepasst → Frage „Agendaphase aktiv?“ mit Erklärung; Ja/Nein führt in die Statusphase (G1)', async () => {
    toAgendaQuestion(session);
    await fixture.whenStable();
    expect(text('agenda-question')).toBe('Agendaphase aktiv?');
    expect(text('agenda-question-hint')).toBe('Wurde der Custodians-Token von Mecatol Rex entfernt?');
    btn('Ja').click();
    await fixture.whenStable();
    expect(session.game()).toMatchObject({ phase: 'status', agendaActive: true });
  });

  it('„Nein“: Agendaphase bleibt inaktiv', async () => {
    toAgendaQuestion(session);
    await fixture.whenStable();
    btn('Nein').click();
    await fixture.whenStable();
    expect(session.game()).toMatchObject({ phase: 'status', agendaActive: false });
  });
});
