import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { I18n } from '../core/i18n/i18n';
import { StartPage } from './start-page';

describe('StartPage (E1)', () => {
  beforeEach(() => localStorage.clear());

  it('zeigt App-Namen, „Neues Spiel“ (hervorgehoben) und „Einstellungen“', async () => {
    TestBed.configureTestingModule({ imports: [StartPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(StartPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Twilight Timer');
    const newGame = el.querySelector<HTMLAnchorElement>('a[href="/neues-spiel"]');
    expect(newGame?.textContent).toContain('Neues Spiel');
    expect(newGame?.classList).toContain('primary');
    expect(el.querySelector('a[href="/einstellungen"]')?.textContent).toContain('Einstellungen');
    expect(el.textContent).not.toContain('New game');
  });

  it('auf Englisch umgestellt: englische Texte (L3)', async () => {
    TestBed.configureTestingModule({ imports: [StartPage], providers: [provideRouter([])] });
    TestBed.inject(I18n).setLang('en');
    const fixture = TestBed.createComponent(StartPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/neues-spiel"]')?.textContent).toContain('New game');
    expect(el.textContent).toContain('Fan project');
  });
});
