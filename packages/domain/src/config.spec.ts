import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, presetConfig, updateConfig } from './config';

describe('Voreinstellungen (AC1)', () => {
  it('Standard ist „Bank mit Gutschrift“ mit den Werten aus §4.6', () => {
    expect(DEFAULT_CONFIG).toEqual({
      preset: 'credit',
      turnSec: 90,
      startBankSec: 1800,
      credit: true,
      creditPass: false,
      bankCapSec: 3600,
      strategyPickSec: 300,
      agendaVoteSec: 180,
      warnAtSec: [30, 10],
    });
  });

  it('Hybrid: 1:30 Zugzeit, 60:00 Bank, keine Gutschrift', () => {
    expect(presetConfig('hybrid')).toMatchObject({
      preset: 'hybrid',
      turnSec: 90,
      startBankSec: 3600,
      credit: false,
      creditPass: false,
    });
  });

  it('Nur Zeiten: keine Bank, keine Gutschrift', () => {
    expect(presetConfig('timesOnly')).toMatchObject({
      preset: 'timesOnly',
      turnSec: 90,
      startBankSec: 0,
      credit: false,
    });
  });

  it('alle Voreinstellungen teilen Strategie- und Agendazeiten', () => {
    for (const p of ['credit', 'hybrid', 'timesOnly'] as const) {
      expect(presetConfig(p)).toMatchObject({ strategyPickSec: 300, agendaVoteSec: 180, warnAtSec: [30, 10] });
    }
  });

  it('jede Feldänderung schaltet auf „Eigene“ und ändert nur dieses Feld', () => {
    const changed = updateConfig(DEFAULT_CONFIG, 'turnSec', 120);
    expect(changed).toEqual({ ...DEFAULT_CONFIG, turnSec: 120, preset: 'custom' });
    expect(updateConfig(presetConfig('hybrid'), 'credit', true).preset).toBe('custom');
  });

  it('verändert die Ausgangskonfiguration nicht', () => {
    const before = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as unknown;
    updateConfig(DEFAULT_CONFIG, 'startBankSec', 10);
    expect(DEFAULT_CONFIG).toEqual(before);
  });

  it('liefert für jede Voreinstellung ein neues Objekt', () => {
    expect(presetConfig('credit')).not.toBe(presetConfig('credit'));
    expect(presetConfig('credit')).toEqual(DEFAULT_CONFIG);
  });
});
