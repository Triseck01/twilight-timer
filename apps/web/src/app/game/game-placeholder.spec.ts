import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_CONFIG } from '@twilight-timer/domain';
import { GamePlaceholder } from './game-placeholder';
import { GameSession } from './game-session';

describe('GamePlaceholder (N4)', () => {
  function render() {
    TestBed.configureTestingModule({ imports: [GamePlaceholder], providers: [provideRouter([])] });
    return TestBed.inject(GameSession);
  }

  it('ohne Spiel: Hinweis und Link zu „Neues Spiel“', async () => {
    render();
    const f = TestBed.createComponent(GamePlaceholder);
    await f.whenStable();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Kein laufendes Spiel');
    expect(el.querySelector('a[href="/neues-spiel"]')).not.toBeNull();
  });

  it('mit Spiel: Runde, Phase, Spieler in Sitzreihenfolge mit Volk und Sprecher', async () => {
    const session = render();
    session.start(
      {
        variants: { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true },
        players: [
          { id: 'p1', name: 'Anna', color: 'red', factionId: 'sol' },
          { id: 'p2', name: 'Ben', color: 'blue', factionId: 'naalu' },
          { id: 'p3', name: 'Cem', color: 'gold', factionId: 'letnev' },
        ],
      },
      DEFAULT_CONFIG,
      0,
    );
    const f = TestBed.createComponent(GamePlaceholder);
    await f.whenStable();
    const text = (f.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Runde 1');
    expect(text).toContain('Strategiephase');
    expect(text).toMatch(/Anna[\s\S]*Sprecher[\s\S]*Ben[\s\S]*Cem/);
    expect(text).toContain('The Naalu Collective');
    expect(text).toContain('Initiative 0');
  });
});
