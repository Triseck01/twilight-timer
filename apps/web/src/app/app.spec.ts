import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideServiceWorker('ngsw-worker.js', { enabled: false }), provideRouter(routes)],
    }).compileComponents();
  });

  it('erzeugt die App mit Router-Ausgang', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('router-outlet')).not.toBeNull();
  });

  it('zeigt die Build-Version (in Tests: "dev")', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[data-testid="build-version"]')?.textContent?.trim()).toBe('dev');
  });

  it('bindet den Update-Hinweis ein', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-update-notice')).not.toBeNull();
  });

  it('Routen: Start, Einstellungen, Neues Spiel, Spiel', () => {
    expect(routes.map((r) => r.path)).toEqual(expect.arrayContaining(['', 'einstellungen', 'neues-spiel', 'spiel', '**']));
  });
});
