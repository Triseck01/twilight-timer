import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PLAYER_COLORS, availableFactions, colorLabel, factionLabel, type Variants } from '@twilight-timer/domain';
import { colorEdge, colorHex } from '../core/player-color';
import { GameSession } from '../game/game-session';
import { SettingsStore } from '../settings/settings-store';
import { FactionBadge } from '../core/faction-badge';
import { FactionPicker } from './faction-picker';
import { addPlayer, emptyDraft, maxPlayers, movePlayer, removePlayer, setPlayer, setVariant, step2Problems, toSetup } from './new-game-draft';

const PRESET_LABELS: Record<string, string> = {
  credit: 'Bank mit Gutschrift / Bank with credit',
  hybrid: 'Hybrid',
  timesOnly: 'Nur Zeiten / Times only',
  custom: 'Eigene / Custom',
};

/** Neues Spiel in drei Schritten (M2: N1–N4). */
@Component({
  selector: 'app-new-game-page',
  imports: [RouterLink, FactionPicker, FactionBadge],
  templateUrl: './new-game-page.html',
  styleUrl: './new-game-page.scss',
})
export class NewGamePage {
  private readonly session = inject(GameSession);
  private readonly settings = inject(SettingsStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  /** Knopf, der die Völkerauswahl geöffnet hat – bekommt danach den Fokus zurück. */
  private opener: HTMLElement | null = null;

  protected readonly step = signal<1 | 2 | 3>(1);
  protected readonly draft = signal(emptyDraft());
  /** Schlüssel des Spielers, für den gerade das Volk gewählt wird. */
  protected readonly picking = signal<number | null>(null);
  protected readonly startError = signal<string | null>(null);

  protected readonly colors = PLAYER_COLORS;
  protected readonly colorLabel = colorLabel;
  protected readonly factionLabel = factionLabel;
  protected readonly config = this.settings.config;
  protected readonly presetLabel = computed(() => PRESET_LABELS[this.config().preset]);
  protected readonly variantSwitches: readonly { key: keyof Variants; label: string }[] = [
    { key: 'pok', label: 'Prophecy of Kings' },
    { key: 'thundersEdge', label: "Thunder's Edge" },
    { key: 'discordantStars', label: 'Discordant Stars' },
  ];

  protected readonly max = computed(() => maxPlayers(this.draft()));
  protected readonly problems = computed(() => step2Problems(this.draft()));
  protected readonly factions = computed(() => availableFactions(this.draft().variants));
  protected readonly takenColors = computed(() => new Set(this.draft().players.map((p) => p.color).filter((c) => c !== null)));
  protected readonly takenFactions = computed(() => new Set(this.draft().players.map((p) => p.factionId).filter((f) => f !== null)));
  protected readonly pickingPlayer = computed(() => this.draft().players.find((p) => p.key === this.picking()) ?? null);
  protected readonly expansionsText = computed(() => {
    const v = this.draft().variants;
    return ['Basisspiel', v.pok && 'Prophecy of Kings', v.thundersEdge && "Thunder's Edge", v.discordantStars && 'Discordant Stars']
      .filter(Boolean)
      .join(', ');
  });

  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;

  protected openPicker(key: number, opener: HTMLElement): void {
    this.opener = opener;
    this.picking.set(key);
  }

  protected closePicker(): void {
    this.picking.set(null);
    const opener = this.opener;
    afterNextRender(() => opener?.focus(), { injector: this.injector });
  }

  protected setVariant(key: keyof Variants, value: boolean): void {
    this.draft.update((d) => setVariant(d, key, value));
  }
  protected setName(key: number, name: string): void {
    this.draft.update((d) => setPlayer(d, key, { name }));
  }
  protected setColor(key: number, color: string): void {
    this.draft.update((d) => setPlayer(d, key, { color }));
  }
  protected chooseFaction(factionId: string): void {
    const key = this.picking();
    if (key !== null) this.draft.update((d) => setPlayer(d, key, { factionId }));
    this.closePicker();
  }
  protected move(key: number, direction: -1 | 1): void {
    this.draft.update((d) => movePlayer(d, key, direction));
  }
  protected add(): void {
    this.draft.update(addPlayer);
  }
  protected remove(key: number): void {
    this.draft.update((d) => removePlayer(d, key));
  }

  protected start(): void {
    const result = this.session.start(toSetup(this.draft()), this.config(), Date.now());
    if (!result.ok) {
      this.startError.set(result.error.message);
      return;
    }
    void this.router.navigateByUrl('/spiel');
  }
}
