import { Component, computed, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { cardLabel, factionLabel } from '@twilight-timer/domain';
import { FactionBadge } from '../core/faction-badge';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { colorEdge, colorHex } from '../core/player-color';
import { GameControls } from './game-controls';
import { GameSession } from './game-session';
import { StrategyView } from './strategy/strategy-view';

/** Spielansicht (Konzept §5.2): links die Phase, rechts die Steuerung. */
@Component({
  selector: 'app-game-page',
  imports: [RouterLink, StrategyView, GameControls, FactionBadge],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
})
export class GamePage {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly session = inject(GameSession);
  protected readonly game = this.session.game;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  constructor() {
    // Wer die Spielansicht verlässt (Hauptmenü, Zurück, Einstellungen), pausiert das Spiel (M3-H/H2).
    inject(DestroyRef).onDestroy(() => this.session.pauseIfRunning());
  }

  protected readonly heading = computed(() => {
    const g = this.game();
    return g ? this.t('game.roundPhase', { n: g.round, phase: this.t(`phase.${g.phase}` as MessageKey) }) : '';
  });

  /** Aktionsreihenfolge mit Initiative (0 = Naalu-Token), Karten und Spieler (M3/S6, Platzhalter bis M4). */
  protected readonly order = computed(() => {
    const g = this.game();
    if (!g) return [];
    const lang = this.i18n.lang();
    return g.actionOrder.map((id) => {
      const player = g.players.find((p) => p.id === id)!;
      const owned = g.cards.filter((c) => c.ownerId === id).map((c) => c.number);
      return {
        player,
        initiative: id === g.initiativeZeroHolder ? 0 : Math.min(...owned),
        cards: owned.map((n) => cardLabel(n, lang)).join(', '),
        faction: factionLabel(player.factionId, lang),
      };
    });
  });
}
