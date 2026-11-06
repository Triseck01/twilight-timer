// Testhilfen (nur für *.spec.ts; von der Coverage ausgenommen).
import { expect } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { applyEvent, createGame } from './game';
import type { GameEvent, GameSetup, GameState, Result, TimeConfig, Variants } from './types';

export const NO_VARIANTS: Variants = { pok: true, thundersEdge: false, naalu: false, tradeGoods: true };

export function setupFor(n: number, overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    players: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Spieler ${i + 1}`, color: `#00000${i}` })),
    speakerId: 'p1',
    variants: NO_VARIANTS,
    ...overrides,
  };
}

export function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
  return r.value;
}

export function newGame(n: number, overrides: Partial<GameSetup> = {}, config: TimeConfig = DEFAULT_CONFIG, atMs = 0) {
  return unwrap(createGame(setupFor(n, overrides), config, atMs));
}

/** Wendet Ereignisse nacheinander an; scheitert der Test, wenn eines ungültig ist. */
export function play(state: GameState, ...events: GameEvent[]): GameState {
  return events.reduce((s, e) => unwrap(applyEvent(s, e)), state);
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
