import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { factionInitials, factionLogo } from './faction-logo';

/** Logo eines Volks, sonst Kürzel. Dekorativ (alt=""): der Name steht immer daneben. */
@Component({
  selector: 'app-faction-badge',
  imports: [NgOptimizedImage],
  template: `
    @if (logo(); as src) {
      <img [ngSrc]="src" [width]="size()" [height]="size()" alt="" />
    } @else {
      <span class="initials" aria-hidden="true" [style.width.px]="size()" [style.height.px]="size()">{{ initials() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      vertical-align: middle;
    }
    img {
      object-fit: contain;
    }
    .initials {
      display: grid;
      place-items: center;
      border: 1px solid var(--tt-muted);
      border-radius: 50%;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--tt-fg);
    }
  `,
})
export class FactionBadge {
  readonly factionId = input.required<string>();
  readonly size = input(32);
  protected readonly logo = computed(() => factionLogo(this.factionId()));
  protected readonly initials = computed(() => factionInitials(this.factionId()));
}
