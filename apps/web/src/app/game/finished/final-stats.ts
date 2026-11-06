import { Component, computed, inject } from '@angular/core';
import { cardLabel, finalStats } from '@twilight-timer/domain';
import { FactionBadge } from '../../core/faction-badge';
import { formatLong } from '../../core/format';
import { I18n } from '../../core/i18n/i18n';
import type { MessageKey } from '../../core/i18n/messages';
import { colorEdge, colorHex } from '../../core/player-color';
import { Ticker } from '../../core/ticker';
import { GameSession } from '../game-session';

/** Endauswertung (M6/E14 = M1-S 2a–2d). Auszeichnungen folgen später, Export mit M7. */
@Component({
  selector: 'app-final-stats',
  imports: [FactionBadge],
  templateUrl: './final-stats.html',
  styleUrl: './final-stats.scss',
})
export class FinalStats {
  private readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly fmt = formatLong;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  protected readonly data = computed(() => {
    const g = this.session.game();
    if (!g) return null;
    const f = finalStats(g, this.ticker.now());
    const lang = this.i18n.lang();
    const byId = (id: string) => g.players.find((p) => p.id === id)!;
    return {
      f,
      winner: f.overview.winnerId ? byId(f.overview.winnerId) : null,
      players: f.players.map((p, i) => ({
        ...p,
        player: byId(p.id),
        rounds: f.byPlayerRound[i]!,
        cardsText: p.cardsByRound.map((cards) => cards.map((n) => cardLabel(n, lang).split(' / ')[0]).join(' + ') || '–').join(' | '),
        passText: p.passPositionByRound.map((x) => (x === null ? '–' : String(x))).join(' · '),
      })),
      rounds: f.rounds.map((r) => ({
        ...r,
        phases: (['strategy', 'action', 'secondary', 'status', 'agenda'] as const).map((k) => ({
          label: k === 'secondary' ? this.t('stats.secondaryPhase') : this.t(`phase.${k}` as MessageKey),
          ms: r.phaseMs[k],
        })),
        cards: Object.entries(r.secondaryByCardMs).map(([n, ms]) => ({ label: cardLabel(Number(n), lang), ms })),
      })),
    };
  });
}
