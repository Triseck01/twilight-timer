import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STORAGE, type KeyValueStorage } from '../storage';
import { I18n, LANGUAGE_KEY } from './i18n';
import { DE, EN } from './messages';

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v), removeItem: (k) => void delete data[k] };
}

function setup(storage: KeyValueStorage | null) {
  TestBed.configureTestingModule({ providers: [{ provide: STORAGE, useValue: storage }] });
  return TestBed.inject(I18n);
}

describe('I18n (L1, L3)', () => {
  it('Standard ist Deutsch', () => {
    const i18n = setup(memory());
    expect(i18n.lang()).toBe('de');
    expect(i18n.t('start.newGame')).toBe('Neues Spiel');
  });

  it('Umschalten auf Englisch wirkt sofort und wird gespeichert', () => {
    const storage = memory();
    const i18n = setup(storage);
    i18n.setLang('en');
    expect(i18n.t('start.newGame')).toBe('New game');
    expect(storage.data[LANGUAGE_KEY]).toBe('en');
  });

  it('gespeicherte Sprache wird geladen; Unsinn → Deutsch', () => {
    expect(setup(memory({ [LANGUAGE_KEY]: 'en' })).lang()).toBe('en');
    TestBed.resetTestingModule();
    expect(setup(memory({ [LANGUAGE_KEY]: 'fr' })).lang()).toBe('de');
  });

  it('setzt das Sprachattribut der Seite', () => {
    const i18n = setup(memory());
    TestBed.tick();
    const doc = TestBed.inject(DOCUMENT);
    expect(doc.documentElement.lang).toBe('de');
    i18n.setLang('en');
    TestBed.tick();
    expect(doc.documentElement.lang).toBe('en');
  });

  it('ersetzt Platzhalter', () => {
    const i18n = setup(memory());
    expect(i18n.t('newGame.problemName', { n: 2 })).toBe('Spieler 2: Name fehlt');
  });

  it('funktioniert ohne Speicher', () => {
    const i18n = setup(null);
    i18n.setLang('en');
    expect(i18n.lang()).toBe('en');
  });

  it('jeder Text existiert in beiden Sprachen und ist nicht leer (L4)', () => {
    expect(Object.keys(EN).sort()).toEqual(Object.keys(DE).sort());
    for (const [k, v] of Object.entries({ ...DE, ...EN })) expect(v.trim(), k).not.toBe('');
  });

  it('deutsche Texte enthalten keine „/ English“-Doppelungen mehr (L1)', () => {
    for (const [k, v] of Object.entries(DE)) expect(v, k).not.toMatch(/ \/ [A-Z]/);
  });
});
