import { Component, computed, inject } from '@angular/core';
import type { EventInput } from './game-session';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { GameSession } from './game-session';

/** Großer Knopf rechts in Status- und Agendaphase (M5): Weiter / Vorgelesen / Stimme abgegeben / Abgehandelt. */
@Component({
  selector: 'app-phase-button',
  template: `
    @if (action(); as a) {
      <button type="button" class="primary big" [disabled]="paused()" (click)="press(a.event)">{{ t(a.label) }}</button>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 1.5rem;
    }
    .big {
      width: 100%;
      min-height: 10rem;
      font-size: 1.75rem;
    }
  `,
})
export class PhaseButton {
  private readonly session = inject(GameSession);
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
