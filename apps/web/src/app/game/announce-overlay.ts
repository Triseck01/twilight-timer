import { Component, computed, inject } from '@angular/core';
import { clockView, factionLabel } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';
import { I18n } from '../core/i18n/i18n';
import { colorEdge, colorHex } from '../core/player-color';
import { Ticker } from '../core/ticker';
import { GameSession } from './game-session';

/**
 * Ankündigung des Nächsten (M7-T): Vollbild in der Spielerfarbe, solange die Uhr der Wahl bzw. des Zuges im Vorlauf ist.
 * Antippen startet sofort. In der Pause verdeckt – das Pause-Fenster hat Vorrang.
 */
@Component({
  selector: 'app-announce-overlay',
  imports: [FactionBadge],
  template: `
    @if (next(); as n) {
      <button
        type="button"
        class="announce"
        data-testid="announce"
        [style.--player-color]="colorHex(n.player.color)"
        [style.--player-edge]="colorEdge(n.player.color)"
        (click)="startNow()"
      >
        <app-faction-badge [factionId]="n.player.factionId" [size]="200" />
        <span class="name" data-testid="announce-name">{{ n.player.name }}</span>
        <span class="turn">{{ t('announce.turn') }}</span>
        <span class="faction">{{ n.faction }}</span>
        <span class="seconds" data-testid="announce-seconds">{{ n.seconds }}</span>
        <span class="hint">{{ t('announce.tap') }}</span>
      </button>
    }
  `,
  styles: `
    .announce {
      position: fixed;
      inset: 0;
      z-index: 15;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 0.75rem;
      width: 100%;
      min-height: 0;
      padding: 1rem;
      border: 1rem solid var(--player-color);
      box-shadow: inset 0 0 0 4px var(--player-edge);
      border-radius: 0;
      background: color-mix(in srgb, var(--player-color) 30%, var(--tt-bg));
      color: var(--tt-fg);
      text-align: center;
    }
    .name {
      font-size: 7rem;
      font-weight: 800;
      line-height: 1;
    }
    .turn {
      font-size: 2.5rem;
      font-weight: 700;
    }
    .faction {
      font-size: 1.75rem;
    }
    .seconds {
      font-size: 3rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .hint {
      font-size: 1.25rem;
    }
  `,
})
export class AnnounceOverlay {
  private readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  protected readonly next = computed(() => {
    const g = this.session.game();
    if (!g || g.pause) return null;
    const v = clockView(g, this.ticker.now());
    if ((v.kind !== 'pick' && v.kind !== 'turn') || v.announceMs <= 0) return null;
    const player = g.players.find((p) => p.id === v.playerId)!;
    return { player, faction: factionLabel(player.factionId, this.i18n.lang()), seconds: Math.ceil(v.announceMs / 1000) };
  });

  protected startNow(): void {
    this.session.dispatch({ type: 'startNow' });
  }
}
