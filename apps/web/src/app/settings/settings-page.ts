import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONFIG_LIMITS, adjustConfig, formatDuration, presetConfig, updateConfig, type PresetId } from '@twilight-timer/domain';
import { SettingsStore } from './settings-store';

type NumericKey = keyof typeof CONFIG_LIMITS;

interface Row {
  readonly key: NumericKey;
  readonly label: string;
  /** Kurzname für die Knopf-Beschriftung (Screenreader): „Zugzeit erhöhen“. */
  readonly name: string;
}

const ROWS: readonly Row[] = [
  { key: 'turnSec', label: 'Zugzeit / Turn time', name: 'Zugzeit' },
  { key: 'startBankSec', label: 'Startbank / Start bank', name: 'Startbank' },
  { key: 'bankCapSec', label: 'Bank-Obergrenze / Bank cap', name: 'Bank-Obergrenze' },
  { key: 'strategyPickSec', label: 'Strategiewahl / Strategy pick', name: 'Strategiewahl' },
  { key: 'agendaVoteSec', label: 'Agenda-Stimme / Agenda vote', name: 'Agenda-Stimme' },
];

const PRESETS: readonly { readonly id: PresetId; readonly label: string }[] = [
  { id: 'credit', label: 'Bank mit Gutschrift / Bank with credit' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'timesOnly', label: 'Nur Zeiten / Times only' },
  { id: 'custom', label: 'Eigene / Custom' },
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
  protected readonly config = this.store.config;
  protected readonly presets = PRESETS;
  protected readonly limits = CONFIG_LIMITS;
  /** Obergrenze nur sinnvoll mit Gutschrift (Konzept §4.1). */
  protected readonly rows = computed(() => ROWS.filter((r) => r.key !== 'bankCapSec' || this.config().credit));
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
