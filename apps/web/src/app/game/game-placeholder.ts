import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { colorLabel, factionLabel } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';
import { colorEdge, colorHex } from '../core/player-color';
import { GameSession } from './game-session';

/** Platzhalter für die Spielansicht bis M3: zeigt das angelegte Spiel. */
@Component({
  selector: 'app-game-placeholder',
  imports: [RouterLink, FactionBadge],
  template: `
    <main class="page">
      <a routerLink="/" class="back">← Start</a>
      <h1>Spiel / Game</h1>
      @if (game(); as g) {
        <p>Runde {{ g.round }} · Strategiephase / Strategy phase</p>
        <ol class="players">
          @for (p of g.players; track p.id) {
            <li [style.border-left-color]="hex(p.color)" [style.box-shadow]="'inset 3px 0 0 ' + edge(p.color)">
              <app-faction-badge [factionId]="p.factionId" />
              <strong>{{ p.name }}</strong> · {{ colorLabel(p.color) }} · {{ factionLabel(p.factionId) }}
              @if (p.id === g.speakerId) {
                · ★ Sprecher / Speaker
              }
              @if (p.id === g.initiativeZeroHolder) {
                · Initiative 0
              }
            </li>
          }
        </ol>
        <p class="hint">Die Spielansicht folgt mit M3 (Strategiephase).</p>
      } @else {
        <p>Kein laufendes Spiel / No running game.</p>
        <a routerLink="/neues-spiel" class="button primary">Neues Spiel / New game</a>
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
  protected readonly colorLabel = colorLabel;
  protected readonly factionLabel = factionLabel;
  protected readonly hex = colorHex;
  protected readonly edge = colorEdge;
}
