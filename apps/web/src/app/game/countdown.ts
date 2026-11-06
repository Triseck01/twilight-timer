import { Component, computed, input } from '@angular/core';
import { formatDuration } from '@twilight-timer/domain';

/**
 * Große Restzeit-Anzeige; im Minus rot (Konzept §4.8). Warnfarben bei 30 s/10 s folgen mit M8.
 * Rundet vom Nullpunkt weg: 5:00 steht die erste volle Sekunde, „0:00“ erst bei Ablauf, Überzeit sofort „-0:01“.
 */
@Component({
  selector: 'app-countdown',
  template: `<span class="time" data-testid="countdown" [class.overtime]="remainingMs() < 0" [attr.aria-label]="label()">{{
    text()
  }}</span>`,
  styles: `
    .time {
      font-size: clamp(3rem, 9vw, 6.5rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .overtime {
      color: var(--tt-danger);
    }
  `,
})
export class Countdown {
  readonly remainingMs = input.required<number>();
  readonly label = input('');
  protected readonly text = computed(() => {
    const ms = this.remainingMs();
    return formatDuration(ms >= 0 ? Math.ceil(ms / 1000) : -Math.ceil(-ms / 1000));
  });
}
