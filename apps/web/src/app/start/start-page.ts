import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameRepository } from '../core/game-repository';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { GameSession } from '../game/game-session';

/** Startbildschirm (M2/E1, M3-H): Neues Spiel, ggf. Spiel fortsetzen, Einstellungen. */
@Component({
  selector: 'app-start-page',
  imports: [RouterLink],
  template: `
    <main class="page start">
      <img src="icons/icon-192.png" alt="" width="96" height="96" />
      <h1>{{ t('app.name') }}</h1>
      <nav class="actions" [attr.aria-label]="t('nav.mainMenu')">
        @if (state(); as s) {
          <a routerLink="/spiel" class="button primary continue" (click)="continueGame()">
            {{ t('start.continue') }}
            <span class="state">{{ s }}</span>
          </a>
          <a routerLink="/neues-spiel" class="button secondary">{{ t('start.newGame') }}</a>
        } @else {
          <a routerLink="/neues-spiel" class="button primary">{{ t('start.newGame') }}</a>
        }
        @if (hasSaved()) {
          <a routerLink="/spiele" class="button secondary">{{ t('start.savedGames') }}</a>
        }
        <a routerLink="/einstellungen" class="button secondary">{{ t('start.settings') }}</a>
      </nav>
      <p class="notice">{{ t('start.notice') }}</p>
    </main>
  `,
  styles: `
    .start {
      display: grid;
      justify-items: center;
      align-content: center;
      min-height: 100dvh;
      text-align: center;
    }
    .actions {
      display: grid;
      gap: 1rem;
      width: min(28rem, 100%);
    }
    .primary {
      font-size: 1.5rem;
      padding-block: 1.5rem;
    }
    .continue .state {
      display: block;
      font-size: 1rem;
      font-weight: 600;
    }
    .notice {
      max-width: 36rem;
      margin-top: 3rem;
      font-size: 0.8rem;
      color: var(--tt-muted);
    }
  `,
})
export class StartPage {
  private readonly session = inject(GameSession);
  private readonly repo = inject(GameRepository);
  protected readonly t = inject(I18n).t;
  protected readonly hasSaved = computed(() => this.repo.entries().length > 0);

  /** Stand des Spiels, das „Spiel fortsetzen“ öffnet: das geladene laufende oder das zuletzt gespielte. */
  protected readonly state = computed(() => {
    const g = this.session.game();
    if (g && g.step.kind !== 'finished') return this.t('game.roundPhase', { n: g.round, phase: this.t(`phase.${g.phase}` as MessageKey) });
    const latest = this.repo.entries().find((e) => !e.finished);
    return latest ? this.t('game.roundPhase', { n: latest.round, phase: this.t(`phase.${latest.phase}` as MessageKey) }) : null;
  });

  protected continueGame(): void {
    this.session.continueLatest();
  }
}
