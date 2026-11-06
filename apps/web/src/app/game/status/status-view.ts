import { Component, computed, inject } from '@angular/core';
import { initiativeOrder } from '@twilight-timer/domain';
import { I18n } from '../../core/i18n/i18n';
import type { MessageKey } from '../../core/i18n/messages';
import { colorEdge, colorHex } from '../../core/player-color';
import { GameSession } from '../game-session';

/** Statusphase (M5/G2): keine Uhr; Merkliste der 8 Schritte (LRR 82) und Wertungsreihenfolge. Weiter über den großen Knopf. */
@Component({
  selector: 'app-status-view',
  template: `
    <section class="status" aria-labelledby="status-title">
      <h2 id="status-title">{{ t('status.title') }}</h2>
      <ol class="steps">
        @for (step of steps(); track step.n) {
          <li data-testid="status-step">
            {{ step.label }}
            @if (step.ordered) {
              <span class="hint">({{ t('status.inInitiative') }})</span>
            }
          </li>
        }
      </ol>
      <h3>{{ t('status.scoringOrder') }}</h3>
      <ol class="order">
        @for (row of order(); track row.player.id) {
          <li class="chip" data-testid="scoring-chip" [style.--player-color]="colorHex(row.player.color)" [style.--player-edge]="colorEdge(row.player.color)">
            <span class="initiative">{{ row.initiative }}</span>
            <span>{{ row.player.name }}</span>
          </li>
        }
      </ol>
    </section>
  `,
  styles: `
    .status h2 {
      color: var(--tt-fg);
      font-size: 1.75rem;
      margin: 0 0 1rem;
    }
    .steps {
      font-size: 1.25rem;
      line-height: 1.9;
      margin: 0 0 1.5rem;
    }
    .hint {
      color: var(--tt-muted);
      font-size: 1rem;
    }
    .order {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      padding: 0;
    }
    .chip {
      display: flex;
      gap: 0.5rem;
      padding: 0.4rem 0.8rem;
      border: 2px solid var(--tt-line);
      border-bottom: 5px solid var(--player-color);
      box-shadow: inset 0 -2px 0 var(--player-edge);
      border-radius: 0.6rem;
      background: var(--tt-surface);
    }
    .initiative {
      font-weight: 800;
      color: var(--tt-accent);
    }
  `,
})
export class StatusView {
  private readonly game = inject(GameSession).game;
  protected readonly t = inject(I18n).t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  protected readonly steps = computed(() =>
    [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ n, label: this.t(`status.step${n}` as MessageKey), ordered: n === 1 || n === 3 })),
  );

  protected readonly order = computed(() => {
    const g = this.game();
    if (!g) return [];
    return initiativeOrder(g).map(({ playerId, initiative }) => ({ player: g.players.find((p) => p.id === playerId)!, initiative }));
  });
}
