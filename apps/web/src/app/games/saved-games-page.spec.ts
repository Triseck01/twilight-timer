import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { memoryStorage } from '../core/memory-storage';
import { GameRepository } from '../core/game-repository';
import { DOWNLOAD } from '../core/download';
import { fakeClock, gameProviders, startGame } from '../game/game-test-helpers';
import { GameSession } from '../game/game-session';
import { SavedGamesPage } from './saved-games-page';

describe('SavedGamesPage (P4, P6)', () => {
  let fixture: ComponentFixture<SavedGamesPage>;
  let el: HTMLElement;
  let download: ReturnType<typeof vi.fn>;

  const rows = () => [...el.querySelectorAll<HTMLElement>('[data-testid="saved-game"]')];
  const btn = (root: HTMLElement, name: string) => [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === name);

  async function render() {
    fixture = TestBed.createComponent(SavedGamesPage);
    el = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  beforeEach(() => {
    localStorage.clear();
    download = vi.fn();
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...gameProviders(memoryStorage()), { provide: DOWNLOAD, useValue: download }] });
  });

  it('leer: Hinweis und Import', async () => {
    await render();
    expect(el.textContent).toContain('Noch keine gespeicherten Spiele');
    expect(el.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('listet Spiele mit Spielern und Stand; Fortsetzen lädt und öffnet das Spiel', async () => {
    const session = startGame();
    const id = session.id()!;
    session.discardFromMemory();
    await render();
    expect(rows()).toHaveLength(1);
    expect(rows()[0]!.textContent).toContain('Anna');
    expect(rows()[0]!.textContent).toContain('Runde 1 · Strategiephase');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    btn(rows()[0]!, 'Fortsetzen')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(GameSession).id()).toBe(id);
    expect(navigate).toHaveBeenCalledWith('/spiel');
  });

  it('beendetes Spiel: „Beendet · 👑 Name“ und „Ergebnis ansehen“', async () => {
    const session = startGame();
    session.dispatch({ type: 'endGame' });
    session.dispatch({ type: 'declareWinner', winnerId: 'p2' });
    await render();
    expect(rows()[0]!.textContent).toContain('Beendet · 👑 Ben');
    expect(btn(rows()[0]!, 'Ergebnis ansehen')).toBeTruthy();
  });

  it('Löschen mit Rückfrage', async () => {
    startGame();
    await render();
    btn(rows()[0]!, 'Löschen')!.click();
    await fixture.whenStable();
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain('Spiel löschen?');
    btn(el.querySelector('[role="dialog"]')!, 'Löschen')!.click();
    await fixture.whenStable();
    expect(rows()).toHaveLength(0);
    expect(TestBed.inject(GameSession).game()).toBeNull();
  });

  it('Exportieren lädt eine JSON-Datei herunter', async () => {
    startGame();
    await render();
    btn(rows()[0]!, 'Exportieren')!.click();
    expect(download).toHaveBeenCalledOnce();
    const [name, content] = download.mock.calls[0]!;
    expect(name).toMatch(/^twilight-timer-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(JSON.parse(content as string)).toMatchObject({ format: 'twilight-timer-game' });
  });

  it('Import: gültige Datei erscheint in der Liste; ungültige → Meldung', async () => {
    const session = startGame();
    const json = TestBed.inject(GameRepository).exportJson(session.id()!)!;
    await render();
    await fixture.componentInstance.importText(json);
    await fixture.whenStable();
    expect(rows()).toHaveLength(2);
    expect(el.querySelector('[data-testid="import-message"]')?.textContent).toContain('Spiel importiert');
    await fixture.componentInstance.importText('{kaputt');
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="import-message"]')?.textContent).toContain('Import fehlgeschlagen');
    expect(rows()).toHaveLength(2);
    fakeClock.now = 0;
  });
});
