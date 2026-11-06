import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { I18n } from '../../core/i18n/i18n';
import { GameSession } from '../game-session';

/** Rechte Spalte, Aktionsphase: großer Knopf (Nächster Spieler / Primär erledigt) und Passen mit Rückfrage (M4). */
@Component({
  selector: 'app-action-buttons',
  template: `
    @if (turn(); as tu) {
      <div class="buttons">
        <button type="button" class="primary big" [disabled]="paused()" (click)="main()">
          {{ tu.cardPending ? t('action.primaryDone') : t('action.nextPlayer') }}
        </button>
        <button type="button" class="pass" [disabled]="!!tu.lock || paused()" [attr.aria-describedby]="tu.lock ? 'pass-hint' : null" (click)="askPass()">
          {{ t('action.pass') }}
        </button>
        @if (tu.lock; as lock) {
          <p class="hint" id="pass-hint" data-testid="pass-hint">{{ lock }}</p>
        }
      </div>
      @if (confirming()) {
        <div class="overlay">
          <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="pass-title" aria-describedby="pass-text" (keydown.escape)="confirming.set(false)">
            <h2 id="pass-title">{{ t('action.passConfirm', { name: tu.name }) }}</h2>
            <p id="pass-text">{{ t('action.passConfirmText') }}</p>
            <div class="dialog-actions">
              <button type="button" (click)="confirming.set(false)">{{ t('action.cancel') }}</button>
              <button type="button" class="primary" data-testid="pass-ok" (click)="pass()">{{ t('action.pass') }}</button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: `
    .buttons {
      display: grid;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .big {
      min-height: 10rem;
      font-size: 1.75rem;
    }
    .pass {
      min-height: 4rem;
      font-size: 1.25rem;
    }
    .hint {
      margin: 0;
      font-size: 0.9rem;
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
      margin: 0 0 0.5rem;
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
export class ActionButtons {
  private readonly session = inject(GameSession);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly t = inject(I18n).t;
  protected readonly confirming = signal(false);
  protected readonly paused = computed(() => !!this.session.game()?.pause);

  /** Zustand des Zuges für die Knöpfe; `null` außerhalb eines Zuges (Sekundärphase, Phasenende). */
  protected readonly turn = computed(() => {
    const g = this.session.game();
    if (!g || g.step.kind !== 'turn') return null;
    const step = g.step;
    const unused = g.cards.some((c) => c.ownerId === step.playerId && !c.used);
    const lock = step.strategyCard !== null ? this.t('action.passLockedPrimary') : unused ? this.t('action.passLocked') : null;
    return { name: g.players.find((p) => p.id === step.playerId)!.name, cardPending: step.strategyCard !== null, lock };
  });

  protected main(): void {
    this.session.dispatch({ type: this.turn()?.cardPending ? 'primaryDone' : 'endTurn' });
  }

  protected askPass(): void {
    this.confirming.set(true);
    afterNextRender(() => this.host.querySelector<HTMLElement>('[data-testid="pass-ok"]')?.focus(), { injector: this.injector });
  }

  protected pass(): void {
    this.confirming.set(false);
    this.session.dispatch({ type: 'pass' });
  }
}
