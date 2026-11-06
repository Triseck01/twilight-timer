import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { STORAGE } from '../core/storage';
import { GameSession } from '../game/game-session';
import { I18n } from '../core/i18n/i18n';
import { NewGamePage } from './new-game-page';

describe('NewGamePage (N1–N4)', () => {
  let fixture: ComponentFixture<NewGamePage>;
  let el: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [NewGamePage],
      providers: [provideRouter([]), { provide: STORAGE, useValue: null }],
    });
    fixture = TestBed.createComponent(NewGamePage);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const stable = () => fixture.whenStable();
  const buttons = (name: string) =>
    [...el.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') ?? b.textContent ?? '').trim() === name);
  const button = (name: string) => buttons(name)[0]!;
  const removeButtons = () => [...el.querySelectorAll('button')].filter((b) => /^Spieler \d+ entfernen$/.test(b.getAttribute('aria-label') ?? ''));
  const click = async (name: string) => {
    expect(button(name), `Knopf „${name}“ fehlt`).toBeTruthy();
    button(name).click();
    await stable();
  };
  const checkbox = (name: string) => el.querySelector<HTMLInputElement>(`input[type=checkbox][name="${name}"]`)!;
  const rows = () => [...el.querySelectorAll<HTMLElement>('[data-testid="player-row"]')];
  const type = async (input: HTMLInputElement, value: string) => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await stable();
  };

  async function fillPlayer(index: number, name: string, color: string, search: string, factionLabel: string) {
    const row = rows()[index]!;
    await type(row.querySelector<HTMLInputElement>('input[type=text]')!, name);
    row.querySelector<HTMLInputElement>(`input[type=radio][value="${color}"]`)!.click();
    await stable();
    row.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    await type(el.querySelector<HTMLInputElement>('[data-testid="faction-search"]')!, search);
    const option = [...el.querySelectorAll<HTMLButtonElement>('[data-testid="faction-option"]')].find((b) => b.textContent?.includes(factionLabel));
    expect(option, `Volk „${factionLabel}“ nicht gefunden`).toBeTruthy();
    option!.click();
    await stable();
  }

  it('auf Englisch: Texte englisch, Völkernamen Englisch zuerst (L2, L3)', async () => {
    TestBed.inject(I18n).setLang('en');
    await stable();
    expect(el.querySelector('h1')?.textContent).toContain('New game');
    await click('Next');
    rows()[0]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    const labels = [...el.querySelectorAll('[data-testid="faction-option"]')].map((b) => b.textContent?.trim());
    expect(labels).toContain('The Federation of Sol / Die Sol-Föderation');
  });

  it('Völkernamen auf Deutsch: Deutsch zuerst (L2)', async () => {
    await click('Weiter');
    rows()[0]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    const labels = [...el.querySelectorAll('[data-testid="faction-option"]')].map((b) => b.textContent?.trim());
    expect(labels).toContain('Die Sol-Föderation / The Federation of Sol');
  });

  it('Schritt 1: Erweiterungen und Handelswaren mit Standardwerten, ohne Uncharted Space (N1)', () => {
    expect(el.querySelector('h2')?.textContent).toContain('1/3');
    expect(checkbox('pok').checked).toBe(true);
    expect(checkbox('thundersEdge').checked).toBe(false);
    expect(checkbox('discordantStars').checked).toBe(false);
    expect(checkbox('tradeGoods').checked).toBe(true);
    expect(el.textContent).not.toContain('Uncharted');
  });

  it('Schritt 2: „Weiter“ gesperrt mit Hinweis, was fehlt (N3)', async () => {
    await click('Weiter');
    expect(el.querySelector('h2')?.textContent).toContain('2/3');
    expect(rows()).toHaveLength(3);
    expect(button('Weiter').disabled).toBe(true);
    expect(el.querySelector('[data-testid="problems"]')?.textContent).toContain('Spieler 1: Name fehlt');
  });

  it('Position 1 ist Sprecher; Pfeile ändern die Reihenfolge (N2, D4)', async () => {
    await click('Weiter');
    await type(rows()[0]!.querySelector('input[type=text]')!, 'Anna');
    await type(rows()[1]!.querySelector('input[type=text]')!, 'Ben');
    expect(rows()[0]!.textContent).toContain('Sprecher');
    expect(rows()[1]!.textContent).not.toContain('Sprecher');
    rows()[1]!.querySelector<HTMLButtonElement>('button[aria-label^="Nach oben"]')!.click();
    await stable();
    expect(rows()[0]!.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Ben');
    expect(rows()[0]!.textContent).toContain('Sprecher');
    expect(rows()[0]!.querySelector<HTMLButtonElement>('button[aria-label^="Nach oben"]')!.disabled).toBe(true);
  });

  it('belegte Farben und Völker sind für andere ausgegraut (N2)', async () => {
    await click('Weiter');
    await fillPlayer(0, 'Anna', 'red', 'sol', 'The Federation of Sol');
    expect(rows()[1]!.querySelector<HTMLInputElement>('input[type=radio][value="red"]')!.disabled).toBe(true);
    rows()[1]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    const sol = [...el.querySelectorAll<HTMLButtonElement>('[data-testid="faction-option"]')].find((b) => b.textContent?.includes('Federation of Sol'))!;
    expect(sol.disabled).toBe(true);
  });

  it('Völkerliste gruppiert nach Erweiterung, Suche filtert; DS nur wenn gewählt', async () => {
    await click('Weiter');
    rows()[0]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    const groups = [...el.querySelectorAll('[data-testid="faction-group"] h3')].map((h) => h.textContent?.trim());
    expect(groups).toEqual(['Basisspiel', 'Prophecy of Kings', 'Council Keleres']);
    await type(el.querySelector<HTMLInputElement>('[data-testid="faction-search"]')!, 'naalu');
    expect(el.querySelectorAll('[data-testid="faction-option"]')).toHaveLength(1);
  });

  it('Völkerauswahl: Fokus ins Suchfeld, Escape schließt, Fokus zurück zum Knopf (Q2)', async () => {
    document.body.appendChild(el);
    await click('Weiter');
    const opener = rows()[0]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!;
    opener.focus();
    opener.click();
    await stable();
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement).toBe(el.querySelector('[data-testid="faction-search"]'));
    el.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await stable();
    await new Promise((r) => setTimeout(r));
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(rows()[0]!.querySelector('[data-testid="choose-faction"]'));
    el.remove();
  });

  it('Schwarz bekommt eine helle Kante, damit der Farbbalken sichtbar bleibt (Q2)', async () => {
    await click('Weiter');
    rows()[0]!.querySelector<HTMLInputElement>('input[type=radio][value="black"]')!.click();
    rows()[1]!.querySelector<HTMLInputElement>('input[type=radio][value="red"]')!.click();
    await stable();
    expect(rows()[0]!.style.getPropertyValue('--player-edge')).toBe('var(--tt-muted)');
    expect(rows()[1]!.style.getPropertyValue('--player-edge')).toBe('#d32f2f');
  });

  it('Völkerauswahl zeigt Logos bzw. Kürzel; die Spielerzeile zeigt das Logo des gewählten Volks', async () => {
    await click('Weiter');
    rows()[0]!.querySelector<HTMLButtonElement>('[data-testid="choose-faction"]')!.click();
    await stable();
    const sol = [...el.querySelectorAll<HTMLButtonElement>('[data-testid="faction-option"]')].find((b) => b.textContent?.includes('Federation of Sol'))!;
    expect(sol.querySelector('img')?.getAttribute('src')).toBe('factions/sol.webp');
    expect(sol.querySelector('img')?.getAttribute('alt')).toBe('');
    sol.click();
    await stable();
    expect(rows()[0]!.querySelector('[data-testid="choose-faction"] img')?.getAttribute('src')).toBe('factions/sol.webp');
  });

  it('Spieler hinzufügen und entfernen in den Grenzen', async () => {
    await click('Weiter');
    expect(removeButtons()[0]!.disabled).toBe(true);
    for (let i = 0; i < 6; i++) await click('Spieler hinzufügen');
    expect(rows()).toHaveLength(8);
    expect(button('Spieler hinzufügen').disabled).toBe(true);
    removeButtons()[0]!.click();
    await stable();
    expect(rows()).toHaveLength(7);
  });

  it('„Zurück“ behält alle Eingaben (N3)', async () => {
    await click('Weiter');
    await type(rows()[0]!.querySelector('input[type=text]')!, 'Anna');
    await click('Zurück');
    checkbox('thundersEdge').click();
    await stable();
    await click('Weiter');
    expect(rows()[0]!.querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('Anna');
    await click('Zurück');
    expect(checkbox('thundersEdge').checked).toBe(true);
  });

  it('Schritt 3: Zusammenfassung und „Spiel starten“ legt das Spiel an (N4)', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await click('Weiter');
    await fillPlayer(0, 'Anna', 'red', 'sol', 'The Federation of Sol');
    await fillPlayer(1, 'Ben', 'black', 'naalu', 'The Naalu Collective');
    await fillPlayer(2, 'Cem', 'neon-pink', 'hacan', 'The Emirates of Hacan');
    expect(button('Weiter').disabled).toBe(false);
    await click('Weiter');
    expect(el.querySelector('h2')?.textContent).toContain('3/3');
    const summary = el.querySelector('[data-testid="summary"]')!.textContent!;
    expect(summary).toMatch(/Anna[\s\S]*Ben[\s\S]*Cem/);
    expect(summary).toContain('The Naalu Collective');
    expect(summary).toContain('Sprecher');
    expect(summary).toContain('Bank mit Gutschrift');
    await click('Spiel starten');
    const game = TestBed.inject(GameSession).game()!;
    expect(game.players.map((p) => p.name)).toEqual(['Anna', 'Ben', 'Cem']);
    expect(game.speakerId).toBe('p1');
    expect(game.initiativeZeroHolder).toBe('p2');
    expect(navigate).toHaveBeenCalledWith('/spiel');
  });
});
