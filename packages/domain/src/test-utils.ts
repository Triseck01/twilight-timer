// Testhilfen (nur für *.spec.ts; von der Coverage ausgenommen).
import { expect } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { applyEvent, createGame } from './game';
import type { GameEvent, GameSetup, GameState, Result, TimeConfig, Variants } from './types';

export const NO_VARIANTS: Variants = { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true };

/** Gültige Farben und Völker (ohne Naalu) für Testspieler in Sitzreihenfolge. */
const TEST_COLORS = ['black', 'red', 'blue', 'green', 'gold', 'purple', 'neon-orange', 'neon-pink'];
const TEST_FACTIONS = ['sol', 'hacan', 'letnev', 'xxcha', 'jol-nar', 'mentak', 'arborec', 'yin'];

export function setupFor(n: number, overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    players: Array.from({ length: n }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Spieler ${i + 1}`,
      color: TEST_COLORS[i % 8]!,
      factionId: TEST_FACTIONS[i % 8]!,
    })),
    speakerId: 'p1',
    variants: NO_VARIANTS,
    ...overrides,
  };
}

/** Wie `setupFor`, aber Spieler `naaluId` spielt Naalu. */
export function setupWithNaalu(n: number, naaluId: string, overrides: Partial<GameSetup> = {}): GameSetup {
  const base = setupFor(n, overrides);
  return { ...base, players: base.players.map((p) => (p.id === naaluId ? { ...p, factionId: 'naalu' } : p)) };
}

export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
}

export function newGame(n: number, overrides: Partial<GameSetup> = {}, config: TimeConfig = DEFAULT_CONFIG, atMs = 0) {
  return unwrap(createGame(setupFor(n, overrides), config, atMs));
}

/**
 * Wendet Ereignisse nacheinander an; scheitert der Test, wenn eines ungültig ist.
 * Szenarien, die Politik nur nebenbei spielen: steht die Sprecherwahl (M7-PO) noch aus und folgt eine
 * Sekundär-Antwort, wählt der Politik-Spieler formal einen anderen Sprecher und ein Eingriff stellt den alten
 * sofort wieder her (gleicher Zeitpunkt, keine Statistikwirkung). Tests der Sprecherwahl selbst nutzen `applyEvent`.
 */
export function play(state: GameState, ...events: GameEvent[]): GameState {
  return events.reduce((s, e) => unwrap(applyEvent(keepSpeakerIfPending(s, e), e)), state);
}

export function keepSpeakerIfPending(s: GameState, e: GameEvent): GameState {
  if (s.step.kind !== 'secondary' || !s.step.speakerPending) return s;
  if (e.type !== 'secondaryAnswer' && e.type !== 'secondaryDone') return s;
  const other = s.players.find((p) => p.id !== s.speakerId)!.id;
  const chosen = unwrap(applyEvent(s, { type: 'chooseSpeaker', playerId: other, atMs: e.atMs }));
  return unwrap(applyEvent(chosen, { type: 'setSpeaker', playerId: s.speakerId, atMs: e.atMs }));
}

export function expectError(r: Result<unknown>, code: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error.code).toBe(code);
}

/** Lässt die Spieler in Wahlreihenfolge die angegebenen Karten wählen (je 1 s pro Wahl ab `fromMs`). */
export function pickAll(state: GameState, cards: number[], fromMs = 0): GameState {
  return cards.reduce((s, card, i) => play(s, { type: 'pickCard', card, atMs: fromMs + (i + 1) * 1000 }), state);
}

export const player = (s: GameState, id: string) => s.players.find((p) => p.id === id)!;
export const activeId = (s: GameState) => (s.step.kind === 'turn' ? s.step.playerId : undefined);
