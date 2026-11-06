import { afterNextRender, Component, computed, ElementRef, inject, Injector, input, signal } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import { GameSession } from './game-session';

/**
 * „Spiel beenden“ mit Rückfrage (M7-SE): klein in der Steuerleiste jeder Phase (SE2),
 * als zweiter Knopf in der Statusphase mit „Siegpunktziel erreicht“ (SE1). Danach folgt die Siegerfrage (M6).
 */
@Component({
  selector: 'app-end-game-button',
  template: `
    <button type="button" class="end" [class.status]="variant() === 'status'" [disabled]="paused()" (click)="ask()">
      {{ variant() === 'status' ? t('end.statusButton') : t('iv.end') }}
    </button>
    @if (confirming()) {
      <div class="overlay">
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="end-title" (keydown.escape)="confirming.set(false)">
          <h2 id="end-title">{{ t('iv.endText') }}</h2>
          <div class="dialog-actions">
            <button type="button" (click)="confirming.set(false)">{{ t('action.cancel') }}</button>
            <button type="button" class="primary" data-testid="end-ok" (click)="end()">{{ t('iv.confirm') }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .end {
      width: 100%;
      min-height: 3rem;
      font-size: 1rem;
    }
    .end.status {
      min-height: 4.5rem;
      font-size: 1.25rem;
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
      width: min(32rem, 90vw);
      padding: 1.75rem 2rem;
      border: 2px solid var(--tt-accent);
      border-radius: 1rem;
      background: var(--tt-surface);
      text-align: center;
    }
    .dialog h2 {
      color: var(--tt-fg);
      font-size: 1.75rem;
      margin: 0;
    }
    .dialog-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .dialog-actions button {
      flex: 1;
      min-height: 4rem;
      font-size: 1.25rem;
    }
  `,
})
export class EndGameButton {
  private readonly session = inject(GameSession);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly t = inject(I18n).t;
  readonly variant = input<'small' | 'status'>('small');
  protected readonly confirming = signal(false);
  protected readonly paused = computed(() => !!this.session.game()?.pause);

  protected ask(): void {
    this.confirming.set(true);
    afterNextRender(() => this.host.querySelector<HTMLElement>('[data-testid="end-ok"]')?.focus(), { injector: this.injector });
  }

  protected end(): void {
    this.confirming.set(false);
    this.session.dispatch({ type: 'endGame' });
  }
}
