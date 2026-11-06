import { Component, inject, input } from '@angular/core';
import { I18n } from '../core/i18n/i18n';
import { Countdown } from './countdown';

/**
 * Fragerunden (M7-W, Sekundärphase und Agenda-Fenster): Bedenkzeit des Gefragten groß, Tisch-Timer klein darunter.
 * Ohne Gefragten (Sprecherwahl nach Politik) nur der Tisch-Timer groß.
 */
@Component({
  selector: 'app-asked-clock',
  imports: [Countdown],
  template: `
    @if (askedName(); as name) {
      <div class="side">
        <span class="label" data-testid="asked-timer-label">{{ name }}</span>
        <span class="table">
          {{ t('secondary.tableTimer') }}
          <app-countdown size="small" mode="up" data-testid="table-timer" [remainingMs]="tableMs()" [label]="t('secondary.tableTimer')" />
        </span>
      </div>
      <app-countdown size="large" mode="up" data-testid="asked-timer" [remainingMs]="askedMs()" [label]="t('asked.label', { name })" />
    } @else {
      <span class="label">{{ t('secondary.tableTimer') }}</span>
      <app-countdown size="large" mode="up" data-testid="table-timer" [remainingMs]="tableMs()" [label]="t('secondary.tableTimer')" />
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }
    .side {
      display: grid;
      gap: 0.5rem;
    }
    .label {
      font-size: 2rem;
      font-weight: 700;
      color: var(--tt-fg);
    }
    .table {
      display: flex;
      white-space: nowrap;
      align-items: baseline;
      gap: 0.75rem;
      font-size: 1.25rem;
      color: var(--tt-fg);
    }
  `,
})
export class AskedClock {
  protected readonly t = inject(I18n).t;
  /** Name des Gefragten; `null` = niemand gefragt. */
  readonly askedName = input<string | null>(null);
  readonly askedMs = input(0);
  readonly tableMs = input.required<number>();
}
