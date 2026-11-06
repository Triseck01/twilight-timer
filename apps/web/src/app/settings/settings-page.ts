import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONFIG_LIMITS, adjustConfig, formatDuration, presetConfig, updateConfig, type Lang, type PresetId } from '@twilight-timer/domain';
import { I18n } from '../core/i18n/i18n';
import type { MessageKey } from '../core/i18n/messages';
import { SettingsStore } from './settings-store';

type NumericKey = keyof typeof CONFIG_LIMITS;

/** Zeilen in Anzeige-Reihenfolge; der Feldname ist zugleich Wörterbuch-Schlüssel `settings.<feld>`. */
const ROWS: readonly NumericKey[] = ['turnSec', 'startBankSec', 'bankCapSec', 'strategyPickSec', 'agendaVoteSec'];
const PRESETS: readonly PresetId[] = ['credit', 'hybrid', 'timesOnly', 'custom'];
/** Sprachnamen stehen immer in ihrer eigenen Sprache. */
const LANGUAGES: readonly { readonly id: Lang; readonly name: string }[] = [
  { id: 'de', name: 'Deutsch' },
  { id: 'en', name: 'English' },
];

/** Einstellungen der Zeiten vor dem Anlegen eines Spiels (Konzept §4, §5.1). */
@Component({
  selector: 'app-settings-page',
  imports: [RouterLink],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
})
export class SettingsPage {
  private readonly store = inject(SettingsStore);
  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly lang = this.i18n.lang;
  protected readonly languages = LANGUAGES;
  protected readonly config = this.store.config;
  protected readonly presets = PRESETS;
  protected readonly limits = CONFIG_LIMITS;
  /** Obergrenze nur sinnvoll mit Gutschrift (Konzept §4.1). */
  protected readonly rows = computed(() => ROWS.filter((key) => key !== 'bankCapSec' || this.config().credit));

  protected rowLabel(key: NumericKey): string {
    return this.t(`settings.${key}` as MessageKey);
  }

  protected presetLabel(id: PresetId): string {
    return this.t(`settings.preset.${id}` as MessageKey);
  }

  protected setLang(lang: Lang): void {
    this.i18n.setLang(lang);
  }
  protected readonly format = formatDuration;

  protected selectPreset(id: PresetId): void {
    this.store.update(id === 'custom' ? { ...this.config(), preset: 'custom' } : presetConfig(id));
  }

  protected step(key: NumericKey, direction: 1 | -1): void {
    this.store.update(adjustConfig(this.config(), key, direction));
  }

  protected toggle(key: 'credit' | 'creditPass', value: boolean): void {
    this.store.update(updateConfig(this.config(), key, value));
  }

  protected reset(): void {
    this.store.reset();
  }
}
