import { afterNextRender, Component, computed, ElementRef, inject, Injector, output, signal } from '@angular/core';
import { cardLabel, formatDuration, type Player } from '@twilight-timer/domain';
import { I18n } from '../../core/i18n/i18n';
import type { MessageKey } from '../../core/i18n/messages';
import { colorEdge, colorHex } from '../../core/player-color';
import { GameSession, type EventInput } from '../game-session';

type Kind = 'speaker' | 'active' | 'skip' | 'extra' | 'swap' | 'zero' | 'reverse' | 'bank' | 'end';

/** Manuelle Eingriffe (M6, Konzept §5.4): nur in der Phase Mögliches; jeder Eingriff ist ein Undo-Schritt. */
@Component({
  selector: 'app-interventions-dialog',
  templateUrl: './interventions-dialog.html',
  styleUrl: './interventions-dialog.scss',
  host: { '(keydown.escape)': 'done.emit()' },
})
export class InterventionsDialog {
  private readonly session = inject(GameSession);
  private readonly i18n = inject(I18n);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;
  readonly done = output();

  protected readonly kind = signal<Kind | null>(null);
  /** Erste gewählte Karte beim Tauschen. */
  protected readonly firstCard = signal<number | null>(null);
  protected readonly game = this.session.game;

  /** Mögliche Eingriffe in Reihenfolge, abhängig vom aktuellen Schritt (E10). */
  protected readonly available = computed((): Kind[] => {
    const g = this.game();
    if (!g || g.step.kind === 'finished') return [];
    const turn = g.step.kind === 'turn';
    const reverse = g.step.kind === 'agendaWindow' || (g.step.kind === 'vote' && g.step.index === 0);
    const list: (Kind | false)[] = [
      'speaker',
      turn && 'active',
      turn && 'skip',
      turn && 'extra',
      g.phase === 'action' && 'swap',
      (g.phase === 'strategy' || g.phase === 'action') && 'zero',
      reverse && 'reverse',
      'bank',
      'end',
    ];
    return list.filter((k): k is Kind => k !== false);
  });

  protected readonly activeName = computed(() => {
    const g = this.game();
    return g?.step.kind === 'turn' ? (g.players.find((p) => p.id === (g.step as { playerId: string }).playerId)?.name ?? '') : '';
  });

  protected readonly ownedCards = computed(() => {
    const g = this.game();
    if (!g) return [];
    const lang = this.i18n.lang();
    return g.cards
      .filter((c) => c.ownerId !== null)
      .map((c) => {
        const owner = g.players.find((p) => p.id === c.ownerId)!;
        return { number: c.number, owner, label: `${c.number} · ${cardLabel(c.number, lang)} – ${owner.name}` };
      });
  });

  protected label(k: Kind): string {
    return this.t(`iv.${k}` as MessageKey);
  }

  protected bankText(p: Player): string {
    return formatDuration(Math.round(p.bankMs / 1000));
  }

  /** Spieler-Auswahl je Eingriff; bei „Aktiven wählen“ sind Gepasste gesperrt. */
  protected disabled(p: Player): boolean {
    return this.kind() === 'active' && p.passed;
  }

  protected open(k: Kind): void {
    this.kind.set(k);
    this.firstCard.set(null);
    this.focusFirst();
  }

  protected back(): void {
    this.kind.set(null);
    this.focusFirst();
  }

  protected choosePlayer(id: string | null): void {
    const k = this.kind();
    const event: EventInput | null =
      k === 'speaker' && id
        ? { type: 'setSpeaker', playerId: id }
        : k === 'active' && id
          ? { type: 'setActive', playerId: id }
          : k === 'extra' && id
            ? { type: 'extraTurn', playerId: id }
            : k === 'zero'
              ? { type: 'setInitiativeZero', playerId: id }
              : null;
    if (event) this.apply(event);
  }

  protected chooseCard(n: number): void {
    const first = this.firstCard();
    if (first === null) {
      this.firstCard.set(n);
      this.focusFirst();
    } else this.apply({ type: 'swapCards', cardA: first, cardB: n });
  }

  /** Karten für die zweite Wahl: nur die anderer Spieler. */
  protected secondChoices() {
    const first = this.ownedCards().find((c) => c.number === this.firstCard());
    return this.ownedCards().filter((c) => c.owner.id !== first?.owner.id);
  }

  protected confirm(): void {
    const k = this.kind();
    if (k === 'skip') this.apply({ type: 'skipTurn' });
    if (k === 'reverse') this.apply({ type: 'reverseVoting' });
    if (k === 'end') this.apply({ type: 'endGame' });
  }

  protected adjust(id: string, deltaMs: number): void {
    this.session.dispatch({ type: 'adjustBank', playerId: id, deltaMs });
  }

  private apply(event: EventInput): void {
    this.session.dispatch(event);
    this.done.emit();
  }

  private focusFirst(): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>('.content button')?.focus(), { injector: this.injector });
  }
}
