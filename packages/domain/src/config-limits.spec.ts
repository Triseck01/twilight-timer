import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CONFIG_LIMITS, DEFAULT_CONFIG, adjustConfig, parseConfig, presetConfig } from './config';

describe('Schritte und Grenzen der Einstellungen (E2)', () => {
  it.each([
    ['turnSec', 15],
    ['startBankSec', 300],
    ['bankCapSec', 300],
    ['strategyPickSec', 30],
    ['agendaVoteSec', 15],
  ] as const)('%s ändert sich in Schritten von %i s', (key, step) => {
    expect(CONFIG_LIMITS[key].step).toBe(step);
    expect(adjustConfig(DEFAULT_CONFIG, key, +1)[key]).toBe(DEFAULT_CONFIG[key] + step);
    expect(adjustConfig(DEFAULT_CONFIG, key, -1)[key]).toBe(DEFAULT_CONFIG[key] - step);
  });

  it('jede Anpassung schaltet auf „Eigene“', () => {
    expect(adjustConfig(DEFAULT_CONFIG, 'turnSec', 1).preset).toBe('custom');
  });

  it('bleibt in den Grenzen (min/max)', () => {
    for (const key of Object.keys(CONFIG_LIMITS) as (keyof typeof CONFIG_LIMITS)[]) {
      const { min, max } = CONFIG_LIMITS[key];
      let c = DEFAULT_CONFIG;
      for (let i = 0; i < 200; i++) c = adjustConfig(c, key, -1);
      expect(c[key]).toBe(min);
      for (let i = 0; i < 400; i++) c = adjustConfig(c, key, +1);
      expect(c[key]).toBe(max);
    }
  });

  it('Untergrenzen: Zugzeit 0:15, Bank 0, Wahl 0:30, Stimme 0:15', () => {
    expect(CONFIG_LIMITS.turnSec.min).toBe(15);
    expect(CONFIG_LIMITS.startBankSec.min).toBe(0);
    expect(CONFIG_LIMITS.strategyPickSec.min).toBe(30);
    expect(CONFIG_LIMITS.agendaVoteSec.min).toBe(15);
  });

  it('alle Voreinstellungen liegen in den Grenzen', () => {
    for (const p of ['credit', 'hybrid', 'timesOnly'] as const) expect(parseConfig(presetConfig(p))).toEqual(presetConfig(p));
  });
});

describe('Gespeicherte Einstellungen sicher einlesen (E3)', () => {
  it('gültige Daten werden übernommen', () => {
    const saved = adjustConfig(adjustConfig(DEFAULT_CONFIG, 'turnSec', 1), 'turnSec', 1);
    expect(parseConfig(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it.each([
    ['null', null],
    ['Text', 'kaputt'],
    ['Array', []],
    ['fehlendes Feld', { ...DEFAULT_CONFIG, turnSec: undefined }],
    ['falscher Typ', { ...DEFAULT_CONFIG, credit: 'ja' }],
    ['unbekannte Voreinstellung', { ...DEFAULT_CONFIG, preset: 'turbo' }],
    ['außerhalb der Grenzen', { ...DEFAULT_CONFIG, turnSec: 1 }],
    ['keine ganze Zahl', { ...DEFAULT_CONFIG, turnSec: 90.5 }],
    ['NaN', { ...DEFAULT_CONFIG, startBankSec: Number.NaN }],
    ['Warnschwellen kaputt', { ...DEFAULT_CONFIG, warnAtSec: ['x'] }],
  ])('ungültig (%s) → null', (_, value) => {
    expect(parseConfig(value)).toBeNull();
  });

  it('übernimmt keine fremden Felder (z. B. __proto__-Tricks)', () => {
    const input = JSON.parse(`{"__proto__":{"evil":1},"extra":5,${JSON.stringify(DEFAULT_CONFIG).slice(1)}`) as unknown;
    const parsed = parseConfig(input);
    expect(parsed).toEqual(DEFAULT_CONFIG);
    expect(Object.keys(parsed!)).toEqual(Object.keys(DEFAULT_CONFIG));
  });

  it('wirft nie, egal was eingelesen wird', () => {
    fc.assert(fc.property(fc.anything(), (v) => void expect(() => parseConfig(v)).not.toThrow()));
  });
});
