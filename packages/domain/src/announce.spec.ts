import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { applyEvent, clockView } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { SAVE_FORMAT, SAVE_VERSION, parseSavedGame } from './persist';
import { newGame, play, player, unwrap } from './test-utils';
import type { GameState, TimeConfig } from './types';

/** Standard-Konfiguration mit Ankündigung 8 s (M7-T). */
const CFG: TimeConfig = DEFAULT_CONFIG;
const game = (cfg: TimeConfig = CFG) => newGame(5, {}, cfg, 0);
const view = (s: GameState, t: number) => clockView(s, t) as Extract<ReturnType<typeof clockView>, { kind: 'pick' | 'turn' }>;

/** Alle wählen sofort nach der Ankündigung (je 8 s + 1 s). Reihenfolge p1…p5, Karten 5, 1, 8, 3, 2 → p2 beginnt. */
function toAction(): { s: GameState; t: number } {
  let s = game();
  let t = 0;
  for (const card of [5, 1, 8, 3, 2]) {
    t += 9_000;
    s = play(s, { type: 'pickCard', card, atMs: t });
  }
  return { s, t };
}

describe('Ankündigung des Nächsten (M7-T)', () => {
  it('Standard: 8 s Ankündigung', () => {
    expect(DEFAULT_CONFIG.announceSec).toBe(8);
  });

  it('T1/T2: erste Wahl – 8 s Ankündigung, Wahlzeit läuft erst danach', () => {
    const s = game();
    expect(view(s, 3_000)).toMatchObject({ kind: 'pick', playerId: 'p1', announceMs: 5_000, remainingMs: 300_000 });
    expect(view(s, 8_000)).toMatchObject({ announceMs: 0, remainingMs: 300_000 });
    expect(view(s, 18_000)).toMatchObject({ announceMs: 0, remainingMs: 290_000 });
  });

  it('T1: jede weitere Wahl wird angekündigt', () => {
    const s = play(game(), { type: 'pickCard', card: 5, atMs: 20_000 });
    expect(view(s, 24_000)).toMatchObject({ playerId: 'p2', announceMs: 4_000, remainingMs: 300_000 });
  });

  it('T1/T2: Zug der Aktionsphase – Ankündigung, keine Bank in dieser Zeit', () => {
    const { s, t } = toAction();
    expect(view(s, t + 2_000)).toMatchObject({ kind: 'turn', playerId: 'p2', announceMs: 6_000, remainingMs: 90_000 });
    // Zug endet genau nach Ankündigung + 90 s → kein Überzug, keine Gutschrift (Zugzeit voll genutzt)
    const after = play(s, { type: 'endTurn', atMs: t + 8_000 + 90_000 });
    expect(player(after, 'p2').bankMs).toBe(player(s, 'p2').bankMs);
    expect(view(after, t + 98_000 + 1_000)).toMatchObject({ playerId: 'p5', announceMs: 7_000 });
  });

  it('T2: Zugende während der Ankündigung zählt als 0 s (nie negativ)', () => {
    const { s, t } = toAction();
    const after = play(s, { type: 'useCard', card: 1, atMs: t + 1_000 }, { type: 'primaryDone', atMs: t + 2_000 });
    expect(player(after, 'p2').bankMs).toBe(player(s, 'p2').bankMs + 90_000); // wie ein sofortiges Zugende: volle Gutschrift
    expect(after.stats.rounds[0]!.players['p2']!.actionMs).toBe(0);
  });

  it('T2: Antippen startet sofort (kein Undo-Schritt)', () => {
    const h0 = createHistory(game());
    const h = unwrap(dispatch(h0, { type: 'startNow', atMs: 2_000 }));
    expect(h.entries).toHaveLength(1);
    expect(view(current(h), 12_000)).toMatchObject({ announceMs: 0, remainingMs: 290_000 });
    expect(applyEvent(current(h), { type: 'startNow', atMs: 13_000 }).ok).toBe(false); // keine Ankündigung mehr
  });

  it('T3: Pause hält die Ankündigung an', () => {
    let s = play(game(), { type: 'pause', atMs: 3_000 });
    expect(view(s, 60_000)).toMatchObject({ announceMs: 5_000, remainingMs: 300_000, running: false });
    s = play(s, { type: 'resume', atMs: 60_000 });
    expect(view(s, 61_000)).toMatchObject({ announceMs: 4_000 });
  });

  it('T3: Undo führt zur vorigen Wahl zurück', () => {
    let h = createHistory(game());
    h = unwrap(dispatch(h, { type: 'pickCard', card: 5, atMs: 20_000 }));
    h = unwrap(undo(h, 25_000));
    expect(view(current(h), 25_000)).toMatchObject({ playerId: 'p1', announceMs: 0, remainingMs: 288_000 });
  });

  it('Ankündigung 0 s: Uhr startet sofort', () => {
    expect(view(game({ ...CFG, announceSec: 0 }), 1_000)).toMatchObject({ announceMs: 0, remainingMs: 299_000 });
  });

  it('Speicherformat: Vorlauf bis −30 s gültig, darüber hinaus abgelehnt', () => {
    const save = (state: GameState) => JSON.parse(JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, id: 'g-1', createdAt: 1, updatedAt: 2, history: createHistory(state) })) as unknown;
    expect(parseSavedGame(save(game())).ok).toBe(true);
    const bad = game();
    expect(parseSavedGame(save({ ...bad, step: { ...bad.step, clock: { baseMs: -31_000, runningSince: 0 } } })).ok).toBe(false);
  });
});
