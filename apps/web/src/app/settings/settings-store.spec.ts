import { TestBed } from '@angular/core/testing';
import { DEFAULT_CONFIG, adjustConfig, presetConfig } from '@twilight-timer/domain';
import { STORAGE, type KeyValueStorage } from '../core/storage';
import { SETTINGS_KEY, SettingsStore } from './settings-store';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
  };
}

function setup(storage: KeyValueStorage | null) {
  TestBed.configureTestingModule({ providers: [{ provide: STORAGE, useValue: storage }] });
  return TestBed.inject(SettingsStore);
}

describe('SettingsStore (E3)', () => {
  it('ohne gespeicherte Daten: Standard „Bank mit Gutschrift“', () => {
    expect(setup(memoryStorage()).config()).toEqual(DEFAULT_CONFIG);
  });

  it('lädt gespeicherte Einstellungen', () => {
    const saved = adjustConfig(DEFAULT_CONFIG, 'turnSec', 1);
    expect(setup(memoryStorage({ [SETTINGS_KEY]: JSON.stringify(saved) })).config()).toEqual(saved);
  });

  it.each(['{kaputt', '"text"', JSON.stringify({ ...DEFAULT_CONFIG, turnSec: -5 })])('beschädigte Daten (%s) → Standard', (raw) => {
    expect(setup(memoryStorage({ [SETTINGS_KEY]: raw })).config()).toEqual(DEFAULT_CONFIG);
  });

  it('speichert jede Änderung', () => {
    const storage = memoryStorage();
    const store = setup(storage);
    store.update(presetConfig('hybrid'));
    expect(store.config()).toEqual(presetConfig('hybrid'));
    expect(JSON.parse(storage.data[SETTINGS_KEY]!)).toEqual(presetConfig('hybrid'));
  });

  it('„Standard wiederherstellen“ setzt und speichert den Standard', () => {
    const storage = memoryStorage();
    const store = setup(storage);
    store.update(presetConfig('timesOnly'));
    store.reset();
    expect(store.config()).toEqual(DEFAULT_CONFIG);
    expect(JSON.parse(storage.data[SETTINGS_KEY]!)).toEqual(DEFAULT_CONFIG);
  });

  it('funktioniert ohne Speicher und wenn der Speicher wirft (z. B. privater Modus)', () => {
    expect(setup(null).config()).toEqual(DEFAULT_CONFIG);
    TestBed.resetTestingModule();
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('blockiert');
      },
      setItem: () => {
        throw new Error('voll');
      },
    };
    const store = setup(throwing);
    expect(store.config()).toEqual(DEFAULT_CONFIG);
    expect(() => store.update(presetConfig('hybrid'))).not.toThrow();
    expect(store.config()).toEqual(presetConfig('hybrid'));
  });
});
