import { Component, computed, inject } from '@angular/core';
import { cardLabel, clockView, factionLabel, pickStatus } from '@twilight-timer/domain';
import { FactionBadge } from '../../core/faction-badge';
import { I18n } from '../../core/i18n/i18n';
import { colorEdge, colorHex } from '../../core/player-color';
import { Ticker } from '../../core/ticker';
import { Countdown } from '../countdown';
import { GameSession } from '../game-session';

/** Strategiephase (M3): wer wählt, Restzeit, 8 Karten. Antippen einer freien Karte wählt sie sofort. */
@Component({
  selector: 'app-strategy-view',
  imports: [Countdown, FactionBadge],
  templateUrl: './strategy-view.html',
  styleUrl: './strategy-view.scss',
})
export class StrategyView {
  private readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  protected readonly game = this.session.game;
  protected readonly status = computed(() => {
    const g = this.game();
    return g ? pickStatus(g) : null;
  });
  protected readonly picker = computed(() => this.game()?.players.find((p) => p.id === this.status()?.pickerId) ?? null);
  protected readonly nextName = computed(() => this.game()?.players.find((p) => p.id === this.status()?.nextId)?.name ?? null);
  protected readonly remainingMs = computed(() => {
    const g = this.game();
    const v = g ? clockView(g, this.ticker.now()) : null;
    return v && v.kind === 'pick' ? v.remainingMs : 0;
  });
  protected readonly progress = computed(() => {
    const s = this.status();
    if (!s) return '';
    const base = this.t('strategy.progress', { n: s.number, total: s.total });
    return s.passes > 1 ? `${base} · ${this.t('strategy.pass', { n: s.pass })}` : base;
  });
  protected readonly cards = computed(() => {
    const g = this.game();
    if (!g) return [];
    const lang = this.i18n.lang();
    return g.cards.map((c) => {
      const owner = g.players.find((p) => p.id === c.ownerId) ?? null;
      return {
        number: c.number,
        label: cardLabel(c.number, lang),
        owner,
        goods: !owner && g.variants.tradeGoods && c.tradeGoods > 0 ? c.tradeGoods : 0,
      };
    });
  });

  protected factionLabel(id: string): string {
    return factionLabel(id, this.i18n.lang());
  }

  protected goodsText(n: number): string {
    return n === 1 ? this.t('strategy.tradeGood') : this.t('strategy.tradeGoods', { n });
  }

  protected pick(card: number): void {
    this.session.dispatch({ type: 'pickCard', card });
  }
}
