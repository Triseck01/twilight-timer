import { afterNextRender, Component, computed, effect, type ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InterventionsDialog } from './interventions/interventions-dialog';
import { EndGameButton } from './end-game-button';
import { formatDuration } from '@twilight-timer/domain';
import { I18n } from '../core/i18n/i18n';
import { Ticker } from '../core/ticker';
import { GameSession } from './game-session';

/** Rechte Spalte: Pause (prominent), Rückgängig, Wiederholen; Pause als Vollbild-Overlay (Konzept §4.9). */
@Component({
  selector: 'app-game-controls',
  imports: [RouterLink, InterventionsDialog, EndGameButton],
  template: `
    <nav class="controls" [attr.aria-label]="t('controls.label')">
      @if (prominent()) {
        <button type="button" class="interventions prominent" [disabled]="paused()" (click)="interventions.set(true)">
          {{ t('controls.interventions') }}
        </button>
      }
      <button type="button" class="pause" [disabled]="paused()" (click)="pause()">{{ t('controls.pause') }}</button>
      <button type="button" [disabled]="!session.canUndo() || paused()" (click)="session.undo()">{{ t('controls.undo') }}</button>
      <button type="button" [disabled]="!session.canRedo() || paused()" (click)="session.redo()">{{ t('controls.redo') }}</button>
      @if (!prominent()) {
        <button type="button" class="interventions" [disabled]="paused()" (click)="interventions.set(true)">
          {{ t('controls.interventions') }}
        </button>
      }
      <a routerLink="/" class="button menu">{{ t('controls.mainMenu') }}</a>
      @if (session.game()?.step?.kind !== 'status') {
        <app-end-game-button />
      }
    </nav>
    @if (interventions()) {
      <app-interventions-dialog (done)="interventions.set(false)" />
    }
    @if (paused()) {
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title" data-testid="pause-overlay">
        <h2 id="pause-title">{{ t('pause.title') }}</h2>
        <p>
          {{ t('pause.duration') }}: <span data-testid="pause-duration">{{ pauseDuration() }}</span>
        </p>
        <button #resumeButton type="button" class="primary resume" (click)="resume()">{{ t('pause.resume') }}</button>
        <a routerLink="/" class="button">{{ t('controls.mainMenu') }}</a>
      </div>
    }
  `,
  styles: `
    .controls {
      display: grid;
      gap: 0.75rem;
    }
    .pause {
      min-height: 6rem;
      font-size: 1.5rem;
      font-weight: 800;
      border-color: var(--tt-accent);
    }
    .menu {
      margin-top: 0.75rem;
    }
    .interventions {
      margin-top: 0.5rem;
    }
    .interventions.prominent {
      margin-top: 0;
      min-height: 4.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      border-color: var(--tt-accent);
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 1.5rem;
      background: rgb(8 9 12 / 94%);
      text-align: center;
    }
    .overlay h2 {
      font-size: 4rem;
      color: var(--tt-fg);
      margin: 0;
    }
    .overlay p {
      font-size: 1.5rem;
      margin: 0;
    }
    .resume {
      min-width: 20rem;
      min-height: 6rem;
      font-size: 2rem;
    }
  `,
})
export class GameControls {
  protected readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly injector = inject(Injector);
  protected readonly t = inject(I18n).t;
  private readonly resumeButton = viewChild<ElementRef<HTMLButtonElement>>('resumeButton');

  protected readonly paused = computed(() => !!this.session.game()?.pause);
  protected readonly interventions = signal(false);
  /** Mit Thunder's Edge steht „Eingriffe“ oben und groß (Konzept §6). */
  protected readonly prominent = computed(() => !!this.session.game()?.variants.thundersEdge);
  protected readonly pauseDuration = computed(() => {
    const since = this.session.game()?.pause?.since;
    return since === undefined ? '' : formatDuration(Math.max(0, this.ticker.now() - since) / 1000);
  });

  constructor() {
    // Fokus auf „Fortsetzen“, sobald das Overlay erscheint.
    effect(() => {
      const button = this.resumeButton();
      if (button) afterNextRender(() => button.nativeElement.focus(), { injector: this.injector });
    });
  }

  protected pause(): void {
    this.session.dispatch({ type: 'pause' });
  }

  protected resume(): void {
    this.session.dispatch({ type: 'resume' });
  }
}
