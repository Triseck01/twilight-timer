import { inject, Service, signal } from '@angular/core';
import { DEFAULT_CONFIG, parseConfig, type TimeConfig } from '@twilight-timer/domain';
import { STORAGE } from '../core/storage';

export const SETTINGS_KEY = 'twilight-timer.settings.v1';

/** Zeiteinstellungen für neue Spiele; im Browser gespeichert (Konzept §4: Kopie beim Anlegen eines Spiels). */
@Service()
export class SettingsStore {
  private readonly storage = inject(STORAGE);
  private readonly state = signal<TimeConfig>(this.load());
  readonly config = this.state.asReadonly();

  update(config: TimeConfig): void {
    this.state.set(config);
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(config));
    } catch {
      // Speicher voll oder blockiert: Einstellung gilt für diese Sitzung.
    }
  }

  reset(): void {
    this.update(DEFAULT_CONFIG);
  }

  private load(): TimeConfig {
    try {
      const raw = this.storage?.getItem(SETTINGS_KEY);
      return (raw && parseConfig(JSON.parse(raw))) || DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
}
