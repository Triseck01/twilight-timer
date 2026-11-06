import { Component, DestroyRef, DOCUMENT, inject, InjectionToken, input, output } from '@angular/core';
import { factionLabel, type Player } from '@twilight-timer/domain';
import { FactionBadge } from '../../core/faction-badge';
import { I18n } from '../../core/i18n/i18n';
import { colorHex } from '../../core/player-color';

/** Dauer der Siegerfeier in ms (Standard 5 s); in Tests verkürzbar. */
export const CELEBRATION_MS = new InjectionToken<number>('CELEBRATION_MS', { factory: () => 5000 });

/** Siegerfeier (M6/E13): ~5 s Vollbild in Siegerfarbe mit Konfetti; Antippen überspringt; „Bewegung reduzieren“ ohne Konfetti. */
@Component({
  selector: 'app-celebration',
  imports: [FactionBadge],
  template: `
    <button type="button" class="celebration" data-testid="celebration" [style.--winner]="hex()" (click)="closed.emit()">
      @for (c of confetti; track $index) {
        <span
          class="confetti"
          data-testid="confetti"
          aria-hidden="true"
          [style.left.%]="c.left"
          [style.animation-delay.ms]="c.delay"
          [style.animation-duration.ms]="c.duration"
          [style.background]="c.color"
          [style.rotate.deg]="c.rotate"
        ></span>
      }
      <span class="content">
        <app-faction-badge [factionId]="winner().factionId" [size]="160" />
        <span class="title" data-testid="celebration-title">{{ t('finished.victory', { name: winner().name }) }}</span>
        <span class="faction">{{ faction() }}</span>
        <span class="skip">{{ t('finished.continue') }}</span>
      </span>
    </button>
  `,
  styleUrl: './celebration.scss',
})
export class Celebration {
  readonly winner = input.required<Player>();
  readonly closed = output();
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly hex = () => colorHex(this.winner().color);
  protected readonly faction = () => factionLabel(this.winner().factionId, this.i18n.lang());
  protected confetti: { left: number; delay: number; duration: number; color: string; rotate: number }[] = [];

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    const reduced = !!view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      // Deterministisch verteilt (kein Zufall nötig): goldener Winkel streut die Positionen gleichmäßig.
      this.confetti = Array.from({ length: 80 }, (_, i) => ({
        left: (i * 61.8) % 100,
        delay: (i * 137) % 1800,
        duration: 2600 + ((i * 89) % 1600),
        color: i % 3 === 0 ? '#d4a94a' : i % 3 === 1 ? 'var(--winner)' : '#ffffff',
        rotate: (i * 47) % 360,
      }));
    }
    const id = setTimeout(() => this.closed.emit(), inject(CELEBRATION_MS));
    inject(DestroyRef).onDestroy(() => clearTimeout(id));
  }
}
