import { describe, expect, it } from 'vitest';
import { FACTIONS, NAALU_ID, availableFactions, factionLabel, type Expansion } from './factions';

const count = (e: Expansion) => FACTIONS.filter((f) => f.expansion === e).length;

describe('Völkerkatalog (D1)', () => {
  it.each([
    ['base', 17],
    ['pok', 7],
    ['keleres', 1],
    ['te', 5],
    ['ds', 34],
  ] as const)('%s: %i Völker', (e, n) => {
    expect(count(e)).toBe(n);
  });

  it('IDs sind eindeutig und kebab-case', () => {
    const ids = FACTIONS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('englische Namen sind eindeutig und nicht leer', () => {
    const names = FACTIONS.map((f) => f.en);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.trim().length > 0)).toBe(true);
  });

  it('jedes offizielle Volk hat einen deutschen Namen; Discordant Stars nur Englisch', () => {
    for (const f of FACTIONS) {
      if (f.expansion === 'ds') expect(f.de, f.id).toBeNull();
      else expect(f.de?.trim(), f.id).toBeTruthy();
    }
  });

  it('Anzeige zweisprachig, eingestellte Sprache zuerst (Standard Deutsch); DS nur Englisch', () => {
    expect(factionLabel(NAALU_ID)).toBe('Das Naalu-Kollektiv / The Naalu Collective');
    expect(factionLabel(NAALU_ID, 'en')).toBe('The Naalu Collective / Das Naalu-Kollektiv');
    expect(factionLabel('axis')).toBe('The Shipwrights of Axis');
    expect(factionLabel('axis', 'en')).toBe('The Shipwrights of Axis');
    expect(factionLabel('gibt-es-nicht')).toBe('');
  });

  it('Naalu gehört zum Basisspiel', () => {
    expect(FACTIONS.find((f) => f.id === NAALU_ID)?.expansion).toBe('base');
  });
});

describe('verfügbare Völker je Erweiterung', () => {
  const ids = (x: Parameters<typeof availableFactions>[0]) => availableFactions(x).map((f) => f.expansion);
  it('nur Basisspiel', () => {
    expect(new Set(ids({ pok: false, thundersEdge: false, discordantStars: false }))).toEqual(new Set(['base']));
    expect(availableFactions({ pok: false, thundersEdge: false, discordantStars: false })).toHaveLength(17);
  });
  it('PoK bringt auch Keleres', () => {
    expect(availableFactions({ pok: true, thundersEdge: false, discordantStars: false })).toHaveLength(25);
  });
  it("Thunder's Edge bringt auch Keleres (liegt bei)", () => {
    expect(availableFactions({ pok: false, thundersEdge: true, discordantStars: false })).toHaveLength(23);
  });
  it('alles zusammen: 64', () => {
    expect(availableFactions({ pok: true, thundersEdge: true, discordantStars: true })).toHaveLength(64);
  });
});
