import { Component, computed, inject } from '@angular/core';
import { agendaWindowStatus, askedTimer, clockView, factionLabel } from '@twilight-timer/domain';
import { FactionBadge } from '../../core/faction-badge';
import { I18n } from '../../core/i18n/i18n';
import { colorEdge, colorHex } from '../../core/player-color';
import { Ticker } from '../../core/ticker';
import { AskedClock } from '../asked-clock';
import { Countdown } from '../countdown';
import { GameSession } from '../game-session';

/** Agendaphase (M5): Einleitung, Zeitfenster „Sobald“/„Nachdem“, Abstimmung, Ergebnis abhandeln – je Agenda. */
@Component({
  selector: 'app-agenda-view',
  imports: [AskedClock, Countdown, FactionBadge],
  templateUrl: './agenda-view.html',
  styleUrl: './agenda-view.scss',
})
export class AgendaView {
  private readonly session = inject(GameSession);
  private readonly ticker = inject(Ticker);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;
  protected readonly game = this.session.game;

  private readonly player = (id: string | undefined) => this.game()?.players.find((p) => p.id === id) ?? null;

  protected readonly step = computed(() => this.game()?.step ?? null);
  protected readonly agenda = computed(() => {
    const s = this.step();
    return s && 'agenda' in s ? s.agenda : 1;
  });
  protected readonly speaker = computed(() => this.player(this.game()?.speakerId));
  protected readonly elapsedMs = computed(() => {
    const g = this.game();
    const v = g ? clockView(g, this.ticker.now()) : null;
    return v && (v.kind === 'table' || v.kind === 'vote') ? v.elapsedMs : 0;
  });
  protected readonly remainingMs = computed(() => {
    const g = this.game();
    const v = g ? clockView(g, this.ticker.now()) : null;
    return v && v.kind === 'vote' ? v.remainingMs : 0;
  });

  protected readonly window = computed(() => {
    const g = this.game();
    const w = g ? agendaWindowStatus(g) : null;
    if (!g || !w) return null;
    return {
      askedMs: askedTimer(g, this.ticker.now())?.elapsedMs ?? 0,
      title: this.t(w.window === 'when' ? 'agenda.when' : 'agenda.after'),
      when: w.window === 'when',
      asking: this.player(w.askingId)!,
      chips: w.queue.map((id, i) => ({ player: this.player(id)!, answer: i < w.answers.length ? w.answers[i]! : null, current: i === w.index })),
    };
  });

  protected readonly vote = computed(() => {
    const s = this.step();
    if (!s || s.kind !== 'vote') return null;
    const voter = this.player(s.queue[s.index])!;
    return {
      voter,
      faction: factionLabel(voter.factionId, this.i18n.lang()),
      chips: s.queue.map((id, i) => ({ player: this.player(id)!, answer: null, current: i === s.index })),
    };
  });

  protected answer(played: boolean): void {
    this.session.dispatch({ type: 'windowAnswer', played });
  }

  protected noneMore(): void {
    this.session.dispatch({ type: 'windowClose' });
  }

  protected replaced(): void {
    this.session.dispatch({ type: 'agendaReplaced' });
  }
}
