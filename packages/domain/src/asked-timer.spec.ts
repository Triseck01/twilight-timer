import { describe, expect, it } from 'vitest';
import { applyEvent } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { SAVE_FORMAT, SAVE_VERSION, parseSavedGame } from './persist';
import { finalStats } from './stats';
import { newGame, pickAll, play, unwrap } from './test-utils';
import type { GameState } from './types';
import { askedTimer } from './view';

/** 5 Spieler; p2 nutzt Karte 1 (Führungsstärke), Primär bei t=20 000 → Sekundärphase, gefragt: p3, p4, p5, p1. */
const inSecondary = (): GameState =>
  play(pickAll(newGame(5), [5, 1, 8, 3, 2]), { type: 'useCard', card: 1, atMs: 10_000 }, { type: 'primaryDone', atMs: 20_000 });

/** Spielt bis zum Agenda-Fenster „Sobald“ (Start bei t=100 000), Fragerunde p1…p5. */
function inWindow(): GameState {
  let s = pickAll(newGame(5), [5, 1, 8, 4, 2]);
  let t = 10_000;
  for (let i = 0; i < 40 && s.phase === 'action'; i++) {
    const step = s.step;
    t += 100;
    if (step.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
    else if (step.kind === 'turn' && step.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
    else if (step.kind === 'turn') {
      const unused = s.cards.find((c) => c.ownerId === step.playerId && !c.used);
      s = play(s, unused ? { type: 'useCard', card: unused.number, atMs: t } : { type: 'pass', atMs: t });
    } else if (step.kind === 'agendaQuestion') s = play(s, { type: 'answerAgenda', active: true, atMs: t });
  }
  return play(s, { type: 'statusDone', atMs: 99_000 }, { type: 'agendaRead', atMs: 100_000 });
}

const think = (s: GameState, id: string) => finalStats(s, 0).players.find((p) => p.id === id)!.thinkMs;

describe('Timer pro Person in Fragerunden (M7-W)', () => {
  it('W1: Sekundärphase – der Gefragte zählt ab 0:00 hoch', () => {
    const s = inSecondary();
    expect(askedTimer(s, 20_000)).toEqual({ playerId: 'p3', elapsedMs: 0, running: true });
    expect(askedTimer(s, 27_500)).toEqual({ playerId: 'p3', elapsedMs: 7_500, running: true });
  });

  it('W2: nach jeder Antwort beginnt der Nächste bei 0:00; Tisch-Timer läuft weiter', () => {
    const s = play(inSecondary(), { type: 'secondaryAnswer', use: true, atMs: 25_000 });
    expect(askedTimer(s, 25_000)).toEqual({ playerId: 'p4', elapsedMs: 0, running: true });
    expect(askedTimer(s, 31_000)?.elapsedMs).toBe(6_000);
  });

  it('W1/W2: Agenda-Fenster, auch in der Wiederholungsrunde nach „Ja“', () => {
    let s = inWindow();
    expect(askedTimer(s, 104_000)).toEqual({ playerId: 'p1', elapsedMs: 4_000, running: true });
    s = play(s, { type: 'windowAnswer', played: true, atMs: 104_000 });
    expect(askedTimer(s, 104_000)).toEqual({ playerId: 'p2', elapsedMs: 0, running: true });
    for (let i = 0; i < 4; i++) s = play(s, { type: 'windowAnswer', played: false, atMs: 105_000 + i * 1000 });
    expect(askedTimer(s, 110_000)).toEqual({ playerId: 'p1', elapsedMs: 2_000, running: true });
  });

  it('kein Personen-Timer außerhalb von Fragerunden und solange der Sprecher (Politik) noch nicht gewählt ist', () => {
    expect(askedTimer(pickAll(newGame(5), [5, 1, 8, 3, 2]), 6_000)).toBeNull();
    // p1 hält Politik (3); Reihenfolge p2 (1), p5 (2), p1 (3) …
    const politics = play(pickAll(newGame(5), [3, 1, 8, 5, 2]), { type: 'endTurn', atMs: 6_000 }, { type: 'endTurn', atMs: 6_500 });
    const s = play(politics, { type: 'useCard', card: 3, atMs: 7_000 }, { type: 'primaryDone', atMs: 8_000 });
    expect(s.step).toMatchObject({ kind: 'secondary', speakerPending: true });
    expect(askedTimer(s, 12_000)).toBeNull();
    const chosen = unwrap(applyEvent(s, { type: 'chooseSpeaker', playerId: 'p2', atMs: 12_000 }));
    expect(askedTimer(chosen, 15_000)?.elapsedMs).toBe(3_000);
  });

  it('W4: Pause hält den Personen-Timer an', () => {
    let s = play(inSecondary(), { type: 'secondaryAnswer', use: false, atMs: 25_000 });
    s = play(s, { type: 'pause', atMs: 27_000 });
    expect(askedTimer(s, 90_000)).toEqual({ playerId: 'p4', elapsedMs: 2_000, running: false });
    s = play(s, { type: 'resume', atMs: 90_000 });
    expect(askedTimer(s, 91_000)?.elapsedMs).toBe(3_000);
  });

  it('W4: Undo stellt die Zeit der vorigen Person wieder her; Zeit bis zum Undo zählt nicht', () => {
    let h = createHistory(inSecondary());
    h = unwrap(dispatch(h, { type: 'secondaryAnswer', use: false, atMs: 25_000 })); // p3 nach 5 s
    h = unwrap(undo(h, 40_000));
    expect(askedTimer(current(h), 40_000)).toEqual({ playerId: 'p3', elapsedMs: 5_000, running: true });
    expect(askedTimer(current(h), 41_000)?.elapsedMs).toBe(6_000);
  });

  it('W5/W6: Bedenkzeit pro Spieler in der Statistik; Bank unverändert, Tischzeit bleibt', () => {
    const before = inSecondary();
    let s = play(before, { type: 'secondaryAnswer', use: true, atMs: 25_000 }); // p3: 5 s
    s = play(s, { type: 'secondaryAnswer', use: false, atMs: 32_000 }); // p4: 7 s
    s = play(s, { type: 'secondaryDone', atMs: 33_000 }); // p5: 1 s („Rest: alle Nein“)
    expect([think(s, 'p3'), think(s, 'p4'), think(s, 'p5'), think(s, 'p1')]).toEqual([5_000, 7_000, 1_000, 0]);
    expect(s.players.map((p) => p.bankMs)).toEqual(before.players.map((p) => p.bankMs));
    expect(s.stats.rounds[0]!.phaseMs.secondary).toBe(13_000);
    expect(s.stats.rounds[0]!.players['p3']!.actionMs).toBe(before.stats.rounds[0]!.players['p3']!.actionMs);
  });

  it('W6: Bedenkzeit im Fenster zählt bei „Ja“, „Nein“ und „Niemand mehr“', () => {
    let s = inWindow();
    const base = (id: string) => think(s, id);
    const p1 = base('p1');
    const p2 = base('p2');
    s = play(s, { type: 'windowAnswer', played: false, atMs: 103_000 }); // p1: 3 s
    s = play(s, { type: 'windowClose', atMs: 104_500 }); // p2: 1,5 s
    expect(think(s, 'p1') - p1).toBe(3_000);
    expect(think(s, 'p2') - p2).toBe(1_500);
  });

  it('alte Spielstände ohne Bedenkzeit/Fragezeitpunkt werden geladen (Bedenkzeit 0)', () => {
    const json = JSON.parse(
      JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, id: 'g-1', createdAt: 1, updatedAt: 2, history: createHistory(inSecondary()) }),
    ) as { history: { entries: { state: { stats: { rounds: { players: Record<string, Record<string, unknown>> }[] } } }[] } };
    for (const p of Object.values(json.history.entries[0]!.state.stats.rounds[0]!.players)) delete p['thinkMs'];
    const r = parseSavedGame(json);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.history.entries[0]!.state.stats.rounds[0]!.players['p3']!.thinkMs).toBe(0);
  });

  it('ungültiger Fragezeitpunkt oder ungültige Bedenkzeit → abgelehnt', () => {
    const save = (state: unknown) => ({ format: SAVE_FORMAT, version: SAVE_VERSION, id: 'g-1', createdAt: 1, updatedAt: 2, history: { entries: [{ event: null, state }], cursor: 0 } });
    const s = JSON.parse(JSON.stringify(inSecondary())) as Record<string, Record<string, unknown>>;
    s['step']!['askedAtMs'] = -5;
    expect(parseSavedGame(save(s)).ok).toBe(false);
    const t = JSON.parse(JSON.stringify(inSecondary())) as { stats: { rounds: { players: Record<string, Record<string, unknown>> }[] } };
    t.stats.rounds[0]!.players['p1']!['thinkMs'] = 'x';
    expect(parseSavedGame(save(t)).ok).toBe(false);
  });
});
