import { Component, computed, inject } from '@angular/core';
import { cardLabel, clockView, factionLabel, formatDuration, initiativeOrder, secondaryStatus } from '@twilight-timer/domain';
import { FactionBadge } from '../../core/faction-badge';
import { I18n } from '../../core/i18n/i18n';
import { colorEdge, colorHex } from '../../core/player-color';
import { Ticker } from '../../core/ticker';
import { Countdown } from '../countdown';
import { GameSession } from '../game-session';

/** Aktionsphase (M4, Konzept §5.2/§5.3): Initiative-Leiste, aktiver Spieler bzw. Sekundärphase. */
@Component({
  selector: 'app-action-view',
  imports: [Countdown, FactionBadge],
  templateUrl: './action-view.html',
  styleUrl: './action-view.scss',
})
export class ActionView {
  private readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;
  protected readonly game = this.session.game;

  private readonly player = (id: string | null | undefined) => this.game()?.players.find((p) => p.id === id) ?? null;

  /** Initiative-Leiste in Aktionsreihenfolge (0 = Naalu-Token). */
  protected readonly bar = computed(() => {
    const g = this.game();
    if (!g) return [];
    const step = g.step;
    const activeId = step.kind === 'turn' ? step.playerId : step.kind === 'secondary' ? step.activeId : null;
    return initiativeOrder(g).map(({ playerId, initiative }) => ({ player: this.player(playerId)!, initiative, active: playerId === activeId }));
  });
  protected readonly passedCount = computed(() => {
    const g = this.game();
    return g ? this.t('action.passedCount', { n: g.players.filter((p) => p.passed).length, total: g.players.length }) : '';
  });

  // --- Zug ---------------------------------------------------------------------------------
  protected readonly turn = computed(() => {
    const g = this.game();
    if (!g || g.step.kind !== 'turn') return null;
    const step = g.step;
    const view = clockView(g, this.ticker.now());
    if (view.kind !== 'turn') return null;
    const lang = this.i18n.lang();
    const player = this.player(step.playerId)!;
    const order = g.actionOrder;
    const passed = new Set(g.players.filter((p) => p.passed).map((p) => p.id));
    const start = order.indexOf(step.playerId);
    let nextId: string | null = null;
    for (let i = 1; i <= order.length && nextId === null; i++) {
      const id = order[(start + i) % order.length]!;
      if (!passed.has(id)) nextId = id;
    }
    const turnMs = g.config.turnSec * 1000;
    return {
      player,
      faction: factionLabel(player.factionId, lang),
      cards: g.cards
        .filter((c) => c.ownerId === player.id)
        .map((c) => ({ number: c.number, label: `${c.number} · ${cardLabel(c.number, lang)}`, used: c.used, pending: step.strategyCard === c.number })),
      cardPending: step.strategyCard !== null,
      turnMs,
      remainingMs: view.remainingMs,
      bankMs: view.bankMs,
      turnOver: view.remainingMs < 0,
      bankText: this.t('action.bankValue', { time: formatDuration(Math.round(player.bankMs / 1000)) }),
      nextName: this.player(nextId)?.name ?? '',
    };
  });

  protected useCard(card: number): void {
    this.session.dispatch({ type: 'useCard', card });
  }

  // --- Sekundärphase -----------------------------------------------------------------------
  protected readonly secondary = computed(() => {
    const g = this.game();
    const s = g ? secondaryStatus(g) : null;
    if (!g || !s) return null;
    const view = clockView(g, this.ticker.now());
    return {
      title: this.t('secondary.title', { card: cardLabel(s.card, this.i18n.lang()), name: this.player(s.activeId)?.name ?? '' }),
      elapsedMs: view.kind === 'secondary' ? view.elapsedMs : 0,
      asking: this.player(s.askingId)!,
      chips: s.queue.map((id, i) => ({
        player: this.player(id)!,
        answer: i < s.answers.length ? s.answers[i]! : null,
        current: i === s.index,
      })),
    };
  });

  protected answer(use: boolean): void {
    this.session.dispatch({ type: 'secondaryAnswer', use });
  }

  protected answerAgenda(active: boolean): void {
    this.session.dispatch({ type: 'answerAgenda', active });
  }

  protected restNo(): void {
    this.session.dispatch({ type: 'secondaryDone' });
  }
}
