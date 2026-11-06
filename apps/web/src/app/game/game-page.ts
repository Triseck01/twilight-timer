import { Component, computed, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { ActionButtons } from './action/action-buttons';
import { ActionView } from './action/action-view';
import { AgendaView } from './agenda/agenda-view';
import { GameControls } from './game-controls';
import { GameSession } from './game-session';
import { PhaseButton } from './phase-button';
import { StatusView } from './status/status-view';
import { StrategyView } from './strategy/strategy-view';

/** Spielansicht (Konzept §5.2): links die Phase, rechts die Steuerung. */
@Component({
  selector: 'app-game-page',
  imports: [RouterLink, StrategyView, ActionView, ActionButtons, StatusView, AgendaView, PhaseButton, GameControls],
  templateUrl: './game-page.html',
  styleUrl: './game-page.scss',
})
export class GamePage {
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  private readonly session = inject(GameSession);
  protected readonly game = this.session.game;

  constructor() {
    // Wer die Spielansicht verlässt (Hauptmenü, Zurück, Einstellungen), pausiert das Spiel (M3-H/H2).
    inject(DestroyRef).onDestroy(() => this.session.pauseIfRunning());
  }

  protected readonly heading = computed(() => {
    const g = this.game();
    return g ? this.t('game.roundPhase', { n: g.round, phase: this.t(`phase.${g.phase}` as MessageKey) }) : '';
  });
}
