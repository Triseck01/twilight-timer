import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StartPage } from './start-page';

describe('StartPage (E1)', () => {
  it('zeigt App-Namen, „Neues Spiel“ (hervorgehoben) und „Einstellungen“', async () => {
    TestBed.configureTestingModule({ imports: [StartPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(StartPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Twilight Timer');
    const newGame = el.querySelector<HTMLAnchorElement>('a[href="/neues-spiel"]');
    expect(newGame?.textContent).toContain('Neues Spiel / New game');
    expect(newGame?.classList).toContain('primary');
    expect(el.querySelector('a[href="/einstellungen"]')?.textContent).toContain('Einstellungen / Settings');
  });
});
