import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FactionBadge } from '../../core/faction-badge';
import { I18n } from '../../core/i18n/i18n';
import { colorEdge, colorHex } from '../../core/player-color';
import { GameSession } from '../game-session';
import { Celebration } from './celebration';
import { FinalStats } from './final-stats';

/** Spielende (M6/E9, E13, E14): „Wer hat gewonnen?“ → Siegerfeier → Endauswertung. */
@Component({
  selector: 'app-finished-view',
  imports: [RouterLink, FactionBadge, Celebration, FinalStats],
  template: `
    @if (finished(); as f) {
      @if (!f.decided) {
        <section class="question">
          <h2 data-testid="winner-question">{{ t('finished.question') }}</h2>
          <div class="options">
            @for (p of players(); track p.id) {
              <button
                type="button"
                class="option"
                data-testid="winner-option"
                [style.--player-color]="colorHex(p.color)"
                [style.--player-edge]="colorEdge(p.color)"
                (click)="declare(p.id)"
              >
                <app-faction-badge [factionId]="p.factionId" [size]="56" />
                <span>{{ p.name }}</span>
              </button>
            }
          </div>
          <button type="button" class="no-winner" (click)="declare(null)">{{ t('finished.noWinner') }}</button>
        </section>
      } @else {
        @if (winner(); as w) {
          @if (celebrating()) {
            <app-celebration [winner]="w" (closed)="celebrating.set(false)" />
          }
        }
        <app-final-stats />
      }
      <nav class="actions">
        <button type="button" (click)="session.backToGame()">{{ t('finished.backToGame') }}</button>
        <a routerLink="/" class="button">{{ t('controls.mainMenu') }}</a>
      </nav>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 2rem;
    }
    .question h2 {
      color: var(--tt-fg);
      font-size: 2.25rem;
      margin: 0 0 1.5rem;
    }
    .options {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
      gap: 1rem;
    }
    .option {
      display: flex;
      align-items: center;
      gap: 1rem;
      min-height: 6rem;
      font-size: 1.75rem;
      font-weight: 800;
      border: 4px solid var(--player-color);
      box-shadow: inset 0 0 0 2px var(--player-edge);
      background: color-mix(in srgb, var(--player-color) 22%, var(--tt-bg));
      text-align: left;
    }
    .no-winner {
      margin-top: 1.5rem;
    }
    .actions {
      display: flex;
      gap: 1rem;
    }
  `,
})
export class FinishedView {
  protected readonly session = inject(GameSession);
  protected readonly t = inject(I18n).t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;
  protected readonly celebrating = signal(true);

  protected readonly finished = computed(() => {
    const s = this.session.game()?.step;
    return s?.kind === 'finished' ? s : null;
  });
  protected readonly players = computed(() => this.session.game()?.players ?? []);
  protected readonly winner = computed(() => this.players().find((p) => p.id === this.finished()?.winnerId) ?? null);

  protected declare(winnerId: string | null): void {
    this.celebrating.set(true);
    this.session.dispatch({ type: 'declareWinner', winnerId });
  }
}
