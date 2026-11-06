import { describe, expect, it } from 'vitest';
import { CONFIG_LIMITS, DEFAULT_CONFIG, parseConfig, presetConfig } from './config';
import { applyEvent, clockView } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { SAVE_FORMAT, SAVE_VERSION, parseSavedGame } from './persist';
import { expectError, newGame, pickAll, play, unwrap } from './test-utils';
import type { GameState, TimeConfig } from './types';

/** Konfiguration, wie sie vor M7-A/M7-T gespeichert wurde (ohne die neuen Felder). */
function withoutNewFields(config: TimeConfig): Record<string, unknown> {
  const old: Record<string, unknown> = { ...config };
  delete old['discussionSec'];
  delete old['announceSec'];
  return old;
}

/** Runde 1 bis zur Agenda-Einleitung 1 (Agenda aktiv). 5 Spieler, Sprecher p1. Endet bei t=100 000. */
function toIntro(): GameState {
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
  return play(s, { type: 'statusDone', atMs: 100_000 });
}

/** Vorlesen bei 101 000, „Sobald“ geschlossen bei 102 000 → Diskussion. */
const toDiscussion = () => play(toIntro(), { type: 'agendaRead', atMs: 101_000 }, { type: 'windowClose', atMs: 102_000 });
/** Diskussion beendet bei 110 000, „Nachdem“ geschlossen bei 111 000 → Abstimmung (p2 … p5, p1). */
const toVote = () => play(toDiscussion(), { type: 'discussionDone', atMs: 110_000 }, { type: 'windowClose', atMs: 111_000 });

describe('Agenda-Diskussion (M7-A: A1–A3)', () => {
  it('A3: Standard Diskussion 8:00, Stimmzeit 2:00 in allen Voreinstellungen', () => {
    expect(DEFAULT_CONFIG.discussionSec).toBe(480);
    for (const p of ['credit', 'hybrid', 'timesOnly'] as const) expect(presetConfig(p).agendaVoteSec).toBe(120);
    expect(CONFIG_LIMITS.discussionSec).toBeDefined();
  });

  it('A3: ältere Einstellungen ohne die neuen Felder laden mit Standardwerten; ungültige Werte → null', () => {
    expect(parseConfig(withoutNewFields(DEFAULT_CONFIG))).toMatchObject({ discussionSec: 480, announceSec: 8 });
    expect(parseConfig({ ...DEFAULT_CONFIG, discussionSec: -1 })).toBeNull();
    expect(parseConfig({ ...DEFAULT_CONFIG, announceSec: 99 })).toBeNull();
  });

  it('A1: nach „Sobald“ folgt die Diskussion mit Countdown', () => {
    const s = toDiscussion();
    expect(s.step).toMatchObject({ kind: 'agendaDiscussion', agenda: 1 });
    expect(clockView(s, 162_000)).toEqual({ kind: 'discussion', elapsedMs: 60_000, remainingMs: 420_000, running: true });
  });

  it('A2: nach Ablauf ins Minus; „Diskussion beendet“ öffnet „Nachdem“', () => {
    const s = toDiscussion();
    expect(clockView(s, 102_000 + 490_000)).toMatchObject({ remainingMs: -10_000 });
    const after = play(s, { type: 'discussionDone', atMs: 600_000 });
    expect(after.step).toMatchObject({ kind: 'agendaWindow', window: 'after', index: 0 });
  });

  it('„Diskussion beendet“ nur in der Diskussion; Diskussion zählt zur Agenda-Tischzeit', () => {
    expectError(applyEvent(toIntro(), { type: 'discussionDone', atMs: 101_000 }), 'INVALID_STEP');
    const s = play(toDiscussion(), { type: 'discussionDone', atMs: 110_000 });
    const before = toDiscussion().stats.rounds[0]!.phaseMs.agenda;
    expect(s.stats.rounds[0]!.phaseMs.agenda - before).toBe(8_000);
  });

  it('Abstimmung gegen den Uhrzeigersinn bleibt über die Diskussion erhalten', () => {
    const s = play(toDiscussion(), { type: 'reverseVoting', atMs: 103_000 }, { type: 'discussionDone', atMs: 104_000 }, { type: 'windowClose', atMs: 105_000 });
    expect(s.step).toMatchObject({ kind: 'vote', queue: ['p5', 'p4', 'p3', 'p2', 'p1'] });
  });

  it('alte Spielstände (Konfiguration ohne neue Felder) laden mit Standardwerten', () => {
    const s = toIntro();
    const old = { ...s, config: withoutNewFields(s.config) as unknown as TimeConfig };
    const json = JSON.parse(JSON.stringify({ format: SAVE_FORMAT, version: SAVE_VERSION, id: 'g-1', createdAt: 1, updatedAt: 2, history: createHistory(old) })) as unknown;
    const r = parseSavedGame(json);
    expect(r.ok && r.value.history.entries[0]!.state.config).toMatchObject({ discussionSec: 480, announceSec: 8 });
  });
});

describe('Stimmen-Zähler (M7-A: A4, A5)', () => {
  it('A4: Stimmen für A/B werden summiert, Enthaltung zählt nicht', () => {
    let s = toVote();
    s = play(s, { type: 'endVote', option: 'a', votes: 34, atMs: 112_000 });
    s = play(s, { type: 'endVote', option: 'b', votes: 7, atMs: 113_000 });
    s = play(s, { type: 'endVote', atMs: 114_000 });
    expect(s.step).toMatchObject({ kind: 'vote', index: 3, tally: { a: 34, b: 7 } });
  });

  it('A5: Summen auch beim Ergebnis-Abhandeln; nächste Agenda beginnt bei 0', () => {
    let s = toVote();
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', option: i % 2 === 0 ? 'a' : 'b', votes: i + 1, atMs: 112_000 + i });
    expect(s.step).toMatchObject({ kind: 'agendaResolve', tally: { a: 9, b: 6 } });
    s = play(s, { type: 'resolved', atMs: 120_000 }, { type: 'agendaRead', atMs: 121_000 }, { type: 'windowClose', atMs: 122_000 }, { type: 'discussionDone', atMs: 123_000 }, { type: 'windowClose', atMs: 124_000 });
    expect(s.step).toMatchObject({ kind: 'vote', agenda: 2, tally: { a: 0, b: 0 } });
  });

  it('A5: Undo nimmt eine Stimme zurück', () => {
    let h = createHistory(toVote());
    h = unwrap(dispatch(h, { type: 'endVote', option: 'a', votes: 12, atMs: 112_000 }));
    h = unwrap(undo(h, 113_000));
    expect(current(h).step).toMatchObject({ kind: 'vote', index: 0, tally: { a: 0, b: 0 } });
  });

  it('ungültige Stimmenzahl → INVALID_INPUT, Zustand unverändert', () => {
    const s = toVote();
    for (const votes of [-1, 1.5, 1000]) expectError(applyEvent(s, { type: 'endVote', option: 'a', votes, atMs: 112_000 }), 'INVALID_INPUT');
  });
});
