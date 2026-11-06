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

type NumericKey = 'turnSec' | 'startBankSec' | 'bankCapSec' | 'strategyPickSec' | 'agendaVoteSec';

/** Schritte und Grenzen der −/+-Knöpfe in den Einstellungen (Sekunden). */
export const CONFIG_LIMITS: Readonly<Record<NumericKey, { readonly min: number; readonly max: number; readonly step: number }>> = {
  turnSec: { min: 15, max: 600, step: 15 },
  startBankSec: { min: 0, max: 10_800, step: 300 },
  bankCapSec: { min: 300, max: 10_800, step: 300 },
  strategyPickSec: { min: 30, max: 900, step: 30 },
  agendaVoteSec: { min: 15, max: 600, step: 15 },
};

/** Ein Schritt nach oben (`+1`) oder unten (`−1`), in den Grenzen; schaltet auf „Eigene“. */
export function adjustConfig(config: TimeConfig, key: NumericKey, direction: 1 | -1): TimeConfig {
  const { min, max, step } = CONFIG_LIMITS[key];
  return updateConfig(config, key, Math.min(max, Math.max(min, config[key] + direction * step)));
}

const PRESET_IDS: readonly PresetId[] = ['credit', 'hybrid', 'timesOnly', 'custom'];

/**
 * Liest gespeicherte Einstellungen (nicht vertrauenswürdig: localStorage, Import) sicher ein.
 * Liefert nur bei vollständig gültigen Daten eine Konfiguration – mit genau den bekannten Feldern –, sonst `null`.
 */
export function parseConfig(value: unknown): TimeConfig | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const inRange = (key: NumericKey) => {
    const n = v[key];
    return typeof n === 'number' && Number.isInteger(n) && n >= CONFIG_LIMITS[key].min && n <= CONFIG_LIMITS[key].max;
  };
  const numericKeys = Object.keys(CONFIG_LIMITS) as NumericKey[];
  const warn = v['warnAtSec'];
  const valid =
    PRESET_IDS.includes(v['preset'] as PresetId) &&
    numericKeys.every(inRange) &&
    typeof v['credit'] === 'boolean' &&
    typeof v['creditPass'] === 'boolean' &&
    Array.isArray(warn) &&
    warn.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 600);
  if (!valid) return null;
  return {
    preset: v['preset'] as PresetId,
    turnSec: v['turnSec'] as number,
    startBankSec: v['startBankSec'] as number,
    credit: v['credit'] as boolean,
    creditPass: v['creditPass'] as boolean,
    bankCapSec: v['bankCapSec'] as number,
    strategyPickSec: v['strategyPickSec'] as number,
    agendaVoteSec: v['agendaVoteSec'] as number,
    warnAtSec: [...(warn as number[])],
  };
}
