import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { elapsedMs, resumeClock, startClock, stopClock } from './clock';
import { DEFAULT_CONFIG, presetConfig, updateConfig } from './config';
import { liveBank, settleTurn } from './time';

const MIN = 60_000;
const credit = DEFAULT_CONFIG; // Zugzeit 1:30, Bank 30:00, Obergrenze 60:00
const hybrid = presetConfig('hybrid');
const timesOnly = presetConfig('timesOnly');

describe('Zugabrechnung (AC3)', () => {
  it('Gutschrift: ungenutzte Zugzeit wird der Bank gutgeschrieben', () => {
    expect(settleTurn(30 * MIN, 60_000, credit, { pass: false })).toBe(30 * MIN + 30_000);
  });

  it('Überzug kostet Bank (alle Modelle)', () => {
    expect(settleTurn(30 * MIN, 120_000, credit, { pass: false })).toBe(30 * MIN - 30_000);
    expect(settleTurn(60 * MIN, 120_000, hybrid, { pass: false })).toBe(60 * MIN - 30_000);
  });

  it('Hybrid: ungenutzte Zugzeit verfällt', () => {
    expect(settleTurn(60 * MIN, 10_000, hybrid, { pass: false })).toBe(60 * MIN);
  });

  it('Passen schreibt standardmäßig nichts gut', () => {
    expect(settleTurn(30 * MIN, 5_000, credit, { pass: true })).toBe(30 * MIN);
  });

  it('mit „Pass gutschreiben“ schreibt auch Passen gut', () => {
    const cfg = updateConfig(credit, 'creditPass', true);
    expect(settleTurn(30 * MIN, 5_000, cfg, { pass: true })).toBe(30 * MIN + 85_000);
  });

  it('„Pass gutschreiben“ wirkt nicht ohne Gutschrift', () => {
    const cfg = updateConfig(hybrid, 'creditPass', true);
    expect(settleTurn(60 * MIN, 5_000, cfg, { pass: true })).toBe(60 * MIN);
  });

  it('Gutschrift wird bei der Obergrenze gedeckelt', () => {
    expect(settleTurn(60 * MIN - 10_000, 0, credit, { pass: false })).toBe(60 * MIN);
  });

  it('eine Bank über der Obergrenze wird durch Gutschrift nicht gekürzt', () => {
    const cfg = updateConfig(credit, 'startBankSec', 4000);
    expect(settleTurn(4000_000, 0, cfg, { pass: false })).toBe(4000_000);
  });
});

describe('negative Bank (AC4)', () => {
  it('Nur Zeiten: Überzug macht die Bank negativ, kein Abschneiden bei 0', () => {
    expect(settleTurn(0, 150_000, timesOnly, { pass: false })).toBe(-60_000);
  });

  it('eine negative Bank sinkt weiter', () => {
    expect(settleTurn(-60_000, 100_000, credit, { pass: false })).toBe(-70_000);
  });
});

describe('Live-Anzeige der Bank (AC5)', () => {
  it('innerhalb der Zugzeit unverändert', () => {
    expect(liveBank(30 * MIN, 80_000, credit)).toBe(30 * MIN);
  });

  it('nach Ablauf der Zugzeit sinkt sie live mit', () => {
    expect(liveBank(30 * MIN, 100_000, credit)).toBe(30 * MIN - 10_000);
  });
});

describe('Uhr aus Zeitstempeln (AC5, AC6)', () => {
  it('läuft ab Startzeitpunkt', () => {
    expect(elapsedMs(startClock(1000), 4500)).toBe(3500);
  });

  it('angehalten zählt sie nicht weiter, fortgesetzt schon', () => {
    const stopped = stopClock(startClock(0), 10_000);
    expect(elapsedMs(stopped, 50_000)).toBe(10_000);
    expect(elapsedMs(resumeClock(stopped, 50_000), 55_000)).toBe(15_000);
  });

  it('erneutes Anhalten oder Fortsetzen ändert nichts', () => {
    const stopped = stopClock(startClock(0), 10_000);
    expect(stopClock(stopped, 20_000)).toEqual(stopped);
    const running = startClock(5);
    expect(resumeClock(running, 99)).toEqual(running);
  });

  it('springt die Gerätezeit zurück, wird nie negative Zeit geliefert', () => {
    expect(elapsedMs(startClock(10_000), 5_000)).toBe(0);
  });

  it('gleiche Eingaben → gleiche Ausgaben (deterministisch)', () => {
    fc.assert(
      fc.property(fc.nat(1e9), fc.nat(1e9), (start, delta) => {
        const c = startClock(start);
        expect(elapsedMs(c, start + delta)).toBe(elapsedMs(c, start + delta));
        expect(elapsedMs(c, start + delta)).toBe(delta);
      }),
    );
  });
});

describe('Invarianten der Zeitrechnung (Property-Tests)', () => {
  const configArb = fc.record({
    turnSec: fc.integer({ min: 1, max: 600 }),
    startBankSec: fc.integer({ min: 0, max: 7200 }),
    credit: fc.boolean(),
    creditPass: fc.boolean(),
    bankCapSec: fc.integer({ min: 0, max: 7200 }),
  });
  const turnsArb = fc.array(fc.record({ usedMs: fc.nat(1_200_000), pass: fc.boolean() }), { maxLength: 60 });

  it('Gesamtzeit ≤ Startbank + Züge × Zugzeit − Endbank (alle Modelle)', () => {
    fc.assert(
      fc.property(configArb, turnsArb, (partial, turns) => {
        const cfg = { ...DEFAULT_CONFIG, ...partial, preset: 'custom' as const };
        let bank = cfg.startBankSec * 1000;
        for (const t of turns) bank = settleTurn(bank, t.usedMs, cfg, { pass: t.pass });
        const used = turns.reduce((s, t) => s + t.usedMs, 0);
        expect(used).toBeLessThanOrEqual(cfg.startBankSec * 1000 + turns.length * cfg.turnSec * 1000 - bank);
      }),
    );
  });

  it('Gutschrift hebt die Bank nie über max(Obergrenze, bisherige Bank)', () => {
    fc.assert(
      fc.property(configArb, fc.integer({ min: -1e7, max: 1e7 }), fc.nat(1e6), fc.boolean(), (partial, bank, used, pass) => {
        const cfg = { ...DEFAULT_CONFIG, ...partial, preset: 'custom' as const };
        const after = settleTurn(bank, used, cfg, { pass });
        expect(after).toBeLessThanOrEqual(Math.max(cfg.bankCapSec * 1000, bank));
      }),
    );
  });

  it('Pausen kosten nichts: Zug mit Pausen = Zug ohne Pausen', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(fc.nat(100_000), fc.nat(100_000)), { maxLength: 10 }), (segments) => {
        // Abwechselnd laufen (run) und pausieren (pause) ab t=0.
        let clock = startClock(0);
        let t = 0;
        let runTotal = 0;
        for (const [run, pause] of segments) {
          t += run;
          runTotal += run;
          clock = stopClock(clock, t);
          t += pause;
          clock = resumeClock(clock, t);
        }
        expect(elapsedMs(clock, t)).toBe(runTotal);
        expect(settleTurn(0, elapsedMs(clock, t), DEFAULT_CONFIG, { pass: false })).toBe(
          settleTurn(0, runTotal, DEFAULT_CONFIG, { pass: false }),
        );
      }),
    );
  });
});
