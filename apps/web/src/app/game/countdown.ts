import { Component, computed, input } from '@angular/core';
import { formatDuration } from '@twilight-timer/domain';

/**
 * Große Restzeit-Anzeige; im Minus rot (Konzept §4.8). Warnfarben bei 30 s/10 s folgen mit M8.
 * Rundet vom Nullpunkt weg: 5:00 steht die erste volle Sekunde, „0:00“ erst bei Ablauf, Überzeit sofort „-0:01“.
 */
@Component({
  selector: 'app-countdown',
  host: { '[class.large]': 'size() === "large"', '[class.small]': 'size() === "small"' },
  template: `<span class="time" data-testid="countdown" [class.overtime]="mode() === 'down' && remainingMs() < 0" [attr.aria-label]="label()">{{
    text()
  }}</span>`,
  styles: `
    :host(.large) {
      display: block;
    }
    .time {
      font-size: clamp(3rem, 9vw, 6.5rem);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    :host(.large) .time {
      /* M3-C/U3: groß, aus der Ferne lesbar; Block mit enger Zeilenhöhe spart Platz im Querformat */
      display: block;
      font-size: 16rem;
      line-height: 0.9;
      letter-spacing: -0.03em;
    }
    :host(.small) .time {
      font-size: 2.5rem;
    }
    .overtime {
      color: var(--tt-danger);
    }
  `,
})
export class Countdown {
  readonly remainingMs = input.required<number>();
  readonly label = input('');
  readonly size = input<'small' | 'normal' | 'large'>('normal');
  /** `up`: hochzählende Anzeige (Sekundär-Tisch-Timer) – rundet ab, nie rot. */
  readonly mode = input<'down' | 'up'>('down');
  protected readonly text = computed(() => {
    const ms = this.remainingMs();
    if (this.mode() === 'up') return formatDuration(Math.floor(ms / 1000));
    return formatDuration(ms >= 0 ? Math.ceil(ms / 1000) : -Math.ceil(-ms / 1000));
  });
}
