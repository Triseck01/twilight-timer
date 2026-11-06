import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
          <a routerLink="/spiel" class="button primary continue">
            {{ t('start.continue') }}
            <span class="state">{{ s }}</span>
          </a>
          <button type="button" class="secondary" (click)="askDiscard()">{{ t('start.newGame') }}</button>
        } @else {
          <a routerLink="/neues-spiel" class="button primary">{{ t('start.newGame') }}</a>
        }
        <a routerLink="/einstellungen" class="button secondary">{{ t('start.settings') }}</a>
      </nav>
      <p class="notice">{{ t('start.notice') }}</p>
    </main>
    @if (confirming()) {
      <div class="overlay">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title" aria-describedby="discard-text" (keydown.escape)="cancel()">
          <h2 id="discard-title">{{ t('start.discardTitle') }}</h2>
          <p id="discard-text">{{ t('start.discardText') }}</p>
          <div class="dialog-actions">
            <button type="button" (click)="cancel()">{{ t('start.cancel') }}</button>
            <button type="button" class="danger" (click)="discard()">{{ t('start.discard') }}</button>
          </div>
        </div>
      </div>
    }
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
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-items: center;
      background: rgb(8 9 12 / 80%);
    }
    .dialog {
      width: min(32rem, 90%);
      padding: 1.75rem 2rem;
      border: 2px solid var(--tt-accent);
      border-radius: 1rem;
      background: var(--tt-surface);
      text-align: center;
    }
    .dialog h2 {
      color: var(--tt-fg);
      font-size: 1.5rem;
      margin: 0 0 0.5rem;
    }
    .dialog-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .dialog-actions button {
      flex: 1;
      min-height: 3.5rem;
    }
    .danger {
      border-color: var(--tt-danger);
      color: var(--tt-danger);
      font-weight: 700;
    }
  `,
})
export class StartPage {
  private readonly session = inject(GameSession);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly t = inject(I18n).t;
  protected readonly confirming = signal(false);

  /** „Runde n · Phase“ des laufenden Spiels, sonst `null`. */
  protected readonly state = computed(() => {
    const g = this.session.game();
    if (!g) return null;
    if (g.step.kind === 'finished') return this.t('finished.title');
    return this.t('game.roundPhase', { n: g.round, phase: this.t(`phase.${g.phase}` as MessageKey) });
  });

  protected askDiscard(): void {
    this.confirming.set(true);
    afterNextRender(() => this.host.querySelector<HTMLElement>('.dialog button')?.focus(), { injector: this.injector });
  }

  protected cancel(): void {
    this.confirming.set(false);
  }

  protected discard(): void {
    this.confirming.set(false);
    this.session.discard();
    void this.router.navigateByUrl('/neues-spiel');
  }
}
