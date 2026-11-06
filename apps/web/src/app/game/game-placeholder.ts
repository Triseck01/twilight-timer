import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { colorLabel, factionLabel } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';
import { I18n } from '../core/i18n/i18n';
import { colorEdge, colorHex } from '../core/player-color';
import { GameSession } from './game-session';

/** Platzhalter für die Spielansicht bis M3: zeigt das angelegte Spiel. */
@Component({
  selector: 'app-game-placeholder',
  imports: [RouterLink, FactionBadge],
  template: `
    <main class="page">
      <a routerLink="/" class="back">{{ t('nav.backToStart') }}</a>
      <h1>{{ t('game.title') }}</h1>
      @if (game(); as g) {
        <p>{{ t('game.roundStrategy', { n: g.round }) }}</p>
        <ol class="players">
          @for (p of g.players; track p.id) {
            <li [style.border-left-color]="hex(p.color)" [style.box-shadow]="'inset 3px 0 0 ' + edge(p.color)">
              <app-faction-badge [factionId]="p.factionId" />
              <strong>{{ p.name }}</strong> · {{ colorLabel(p.color) }} · {{ factionLabel(p.factionId) }}
              @if (p.id === g.speakerId) {
                · {{ t('game.speaker') }}
              }
              @if (p.id === g.initiativeZeroHolder) {
                · {{ t('game.initiativeZero') }}
              }
            </li>
          }
        </ol>
        <p class="hint">{{ t('game.comingSoon') }}</p>
      } @else {
        <p>{{ t('game.none') }}</p>
        <a routerLink="/neues-spiel" class="button primary">{{ t('start.newGame') }}</a>
      }
    </main>
  `,
  styles: `
    .players {
      list-style: none;
      padding: 0;
    }
    .players li {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border-left: 0.75rem solid;
      background: var(--tt-surface);
      border-radius: 0.6rem;
    }
    .hint {
      color: var(--tt-muted);
    }
  `,
})
export class GamePlaceholder {
  protected readonly game = inject(GameSession).game;
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected colorLabel(id: string): string {
    return colorLabel(id, this.i18n.lang());
  }
  protected factionLabel(id: string): string {
    return factionLabel(id, this.i18n.lang());
  }
  protected readonly hex = colorHex;
  protected readonly edge = colorEdge;
}
