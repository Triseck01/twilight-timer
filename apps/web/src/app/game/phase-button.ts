import { Component, computed, inject } from '@angular/core';
import type { EventInput } from './game-session';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { GameSession } from './game-session';
import { EndGameButton } from './end-game-button';

/** Großer Knopf rechts in Status- und Agendaphase (M5): Weiter / Vorgelesen / Stimme abgegeben / Abgehandelt. */
@Component({
  selector: 'app-phase-button',
  imports: [EndGameButton],
  template: `
    @if (action(); as a) {
      <button type="button" class="primary big" [disabled]="paused()" (click)="press(a.event)">{{ t(a.label) }}</button>
    }
    @if (session.game()?.step?.kind === 'status') {
      <app-end-game-button variant="status" class="status-end" />
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }
    .status-end {
      margin-top: 0.75rem;
    }
    .big {
      width: 100%;
      min-height: 8rem;
      font-size: 1.75rem;
    }
  `,
})
export class PhaseButton {
  protected readonly session = inject(GameSession);
  protected readonly t = inject(I18n).t;
  protected readonly paused = computed(() => !!this.session.game()?.pause);

  protected readonly action = computed((): { label: MessageKey; event: EventInput } | null => {
    switch (this.session.game()?.step.kind) {
      case 'status':
        return { label: 'phase.continue', event: { type: 'statusDone' } };
      case 'agendaIntro':
        return { label: 'agenda.readDone', event: { type: 'agendaRead' } };
      case 'vote':
        return { label: 'agenda.voteDone', event: { type: 'endVote' } };
      case 'agendaResolve':
        return { label: 'agenda.resolved', event: { type: 'resolved' } };
      default:
        return null;
    }
  });

  protected press(event: EventInput): void {
    this.session.dispatch(event);
  }
}
