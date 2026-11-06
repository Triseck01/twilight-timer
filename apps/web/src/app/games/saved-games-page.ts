import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DOWNLOAD } from '../core/download';
import { GameRepository, type SavedGameEntry } from '../core/game-repository';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { colorEdge, colorHex } from '../core/player-color';
import { NOW } from '../core/ticker';
import { GameSession } from '../game/game-session';

/** Gespeicherte Spiele (M7/P4, P6): Fortsetzen bzw. Ergebnis, Export, Löschen, Import. */
@Component({
  selector: 'app-saved-games-page',
  imports: [RouterLink],
  templateUrl: './saved-games-page.html',
  styleUrl: './saved-games-page.scss',
})
export class SavedGamesPage {
  private readonly repo = inject(GameRepository);
  private readonly session = inject(GameSession);
  private readonly router = inject(Router);
  private readonly download = inject(DOWNLOAD);
  private readonly now = inject(NOW);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly colorHex = colorHex;
  protected readonly colorEdge = colorEdge;
  protected readonly entries = this.repo.entries;
  protected readonly deleting = signal<SavedGameEntry | null>(null);
  protected readonly message = signal<{ ok: boolean; text: string } | null>(null);

  protected date(ms: number): string {
    return new Date(ms).toLocaleString(this.i18n.lang() === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' });
  }

  protected state(e: SavedGameEntry): string {
    if (e.finished) return e.winnerName ? this.t('games.finishedWinner', { name: e.winnerName }) : this.t('games.finished');
    return this.t('game.roundPhase', { n: e.round, phase: this.t(`phase.${e.phase}` as MessageKey) });
  }

  protected open(e: SavedGameEntry): void {
    if (this.session.loadGame(e.id).ok) void this.router.navigateByUrl('/spiel');
  }

  protected exportGame(e: SavedGameEntry): void {
    const json = this.repo.exportJson(e.id);
    if (!json) return;
    const d = new Date(e.updatedAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const name = `twilight-timer-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    this.download(name, json);
  }

  protected confirmDelete(): void {
    const e = this.deleting();
    if (e) this.session.deleteGame(e.id);
    this.deleting.set(null);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) await this.importText(await file.text());
    input.value = '';
  }

  /** Importiert den Inhalt einer Datei (öffentlich für Tests). */
  async importText(text: string): Promise<void> {
    const r = this.repo.importJson(text, this.now());
    this.message.set(r.ok ? { ok: true, text: this.t('games.imported') } : { ok: false, text: this.t('games.importFailed', { reason: r.error.message }) });
  }
}
