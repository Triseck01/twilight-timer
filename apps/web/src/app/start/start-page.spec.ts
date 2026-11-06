import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18n } from '../core/i18n/i18n';
import { gameProviders, startGame } from '../game/game-test-helpers';
import { StartPage } from './start-page';

describe('StartPage (E1, H3, H4)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [StartPage], providers: [provideRouter([]), ...gameProviders()] });
  });

  async function render() {
    const fixture = TestBed.createComponent(StartPage);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('ohne Spiel: App-Name, „Neues Spiel“ (hervorgehoben) und „Einstellungen“; kein „Fortsetzen“', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('Twilight Timer');
    const newGame = el.querySelector<HTMLAnchorElement>('a[href="/neues-spiel"]');
    expect(newGame?.textContent).toContain('Neues Spiel');
    expect(newGame?.classList).toContain('primary');
    expect(el.querySelector('a[href="/einstellungen"]')?.textContent).toContain('Einstellungen');
    expect(el.textContent).not.toContain('Spiel fortsetzen');
    expect(el.textContent).not.toContain('New game');
  });

  it('auf Englisch umgestellt: englische Texte (L3)', async () => {
    TestBed.inject(I18n).setLang('en');
    const { el } = await render();
    expect(el.querySelector('a[href="/neues-spiel"]')?.textContent).toContain('New game');
    expect(el.textContent).toContain('Fan project');
  });

  it('mit laufendem Spiel: „Spiel fortsetzen“ mit Runde und Phase (H3)', async () => {
    startGame();
    const { el } = await render();
    const cont = el.querySelector<HTMLAnchorElement>('a[href="/spiel"]');
    expect(cont?.textContent).toContain('Spiel fortsetzen');
    expect(cont?.textContent).toContain('Runde 1 · Strategiephase');
    expect(cont?.classList).toContain('primary');
  });

  it('„Neues Spiel“ ist auch bei laufendem Spiel ein direkter Link (P5)', async () => {
    startGame();
    const { el } = await render();
    expect(el.querySelector('a[href="/neues-spiel"]')).not.toBeNull();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('„Gespeicherte Spiele“ erscheint, sobald Spiele gespeichert sind (P4)', async () => {
    const empty = await render();
    expect(empty.el.querySelector('a[href="/spiele"]')).toBeNull();
    startGame();
    const { el } = await render();
    expect(el.querySelector('a[href="/spiele"]')?.textContent).toContain('Gespeicherte Spiele');
  });
});
