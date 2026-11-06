import type { PresetId, TimeConfig } from './types';

type PresetValues = Omit<TimeConfig, 'preset'>;

const SHARED = { strategyPickSec: 300, agendaVoteSec: 180, warnAtSec: [30, 10] } as const;

/** Voreinstellungen der Aktionsphase (Konzept §4.1, Standardwerte §4.6). */
const PRESETS: Record<Exclude<PresetId, 'custom'>, PresetValues> = {
  credit: { turnSec: 90, startBankSec: 1800, credit: true, creditPass: false, bankCapSec: 3600, ...SHARED },
  hybrid: { turnSec: 90, startBankSec: 3600, credit: false, creditPass: false, bankCapSec: 3600, ...SHARED },
  timesOnly: { turnSec: 90, startBankSec: 0, credit: false, creditPass: false, bankCapSec: 3600, ...SHARED },
};

export function presetConfig(preset: Exclude<PresetId, 'custom'>): TimeConfig {
  const values = PRESETS[preset];
  return { preset, ...values, warnAtSec: [...values.warnAtSec] };
}

/** Standard: „Bank mit Gutschrift“ (Entscheidung des Nutzers). */
export const DEFAULT_CONFIG: TimeConfig = presetConfig('credit');

/** Ändert ein Feld; jede Änderung schaltet auf „Eigene“. */
export function updateConfig<K extends keyof PresetValues>(config: TimeConfig, key: K, value: PresetValues[K]): TimeConfig {
  return { ...config, [key]: value, preset: 'custom' };
}
