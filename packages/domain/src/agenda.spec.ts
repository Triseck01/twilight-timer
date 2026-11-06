import { describe, expect, it } from 'vitest';
import { applyEvent, clockView } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { finalStats } from './stats';
import { expectError, newGame, pickAll, play, unwrap } from './test-utils';
import { agendaWindowStatus } from './view';
import type { GameState } from './types';

/** Spielt Runde 1 bis zur Agenda-Einleitung 1 (Agenda aktiv). 5 Spieler, Sprecher p1. Endet bei t=100 000. */
function toAgendaIntro(): GameState {
  let s = pickAll(newGame(5), [5, 1, 8, 3, 2]);
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

const read = (s: GameState, at = 100_000) => play(s, { type: 'agendaRead', atMs: at });
const no = (s: GameState, at: number) => play(s, { type: 'windowAnswer', played: false, atMs: at });
const yes = (s: GameState, at: number) => play(s, { type: 'windowAnswer', played: true, atMs: at });

describe('Agenda-Zeitfenster (G8–G10)', () => {
  it('nach „Vorgelesen“: Fenster „Sobald“, Fragerunde ab dem Sprecher im Uhrzeigersinn (LRR 31.20)', () => {
    const s = read(toAgendaIntro());
    expect(s.step).toMatchObject({ kind: 'agendaWindow', agenda: 1, window: 'when' });
    expect(agendaWindowStatus(s)).toEqual({
      agenda: 1,
      window: 'when',
      queue: ['p1', 'p2', 'p3', 'p4', 'p5'],
      index: 0,
      answers: [],
      askingId: 'p1',
    });
  });

  it('alle hintereinander „Nein“ → Fenster „Nachdem“, wieder ab dem Sprecher', () => {
    let s = read(toAgendaIntro());
    for (let i = 0; i < 5; i++) s = no(s, 101_000 + i);
    expect(agendaWindowStatus(s)).toMatchObject({ window: 'after', index: 0, answers: [], askingId: 'p1' });
  });

  it('nach einem „Ja“ läuft die Runde erneut, bis alle hintereinander „Nein“ sagen', () => {
    let s = read(toAgendaIntro());
    s = no(s, 101_000); // p1
    s = no(s, 101_001); // p2
    s = yes(s, 101_002); // p3 spielt
    s = no(s, 101_003); // p4
    s = no(s, 101_004); // p5
    expect(agendaWindowStatus(s)).toMatchObject({ window: 'when', index: 0, answers: [], askingId: 'p1' });
    s = no(s, 101_005); // p1
    s = no(s, 101_006); // p2
    expect(agendaWindowStatus(s)).toMatchObject({ window: 'when', askingId: 'p3' });
    s = no(s, 101_007); // p3 – jetzt 5 „Nein“ in Folge
    expect(agendaWindowStatus(s)).toMatchObject({ window: 'after' });
  });

  it('Antworten der laufenden Runde werden angezeigt', () => {
    const s = yes(no(read(toAgendaIntro()), 101_000), 101_001);
    expect(agendaWindowStatus(s)).toMatchObject({ answers: [false, true], index: 2, askingId: 'p3' });
  });

  it('„Niemand mehr“ schließt ein Fenster sofort; nach „Nachdem“ beginnt die Abstimmung links vom Sprecher', () => {
    let s = read(toAgendaIntro());
    s = play(s, { type: 'windowClose', atMs: 101_000 });
    expect(agendaWindowStatus(s)?.window).toBe('after');
    s = play(s, { type: 'windowClose', atMs: 102_000 });
    expect(s.step).toMatchObject({ kind: 'vote', agenda: 1, queue: ['p2', 'p3', 'p4', 'p5', 'p1'], index: 0 });
    expect(clockView(s, 102_000 + 200_000)).toMatchObject({ kind: 'vote', remainingMs: -20_000 });
  });

  it('„Agenda ersetzt“ startet das „Sobald“-Fenster neu ab dem Sprecher; im „Nachdem“-Fenster nicht möglich', () => {
    let s = read(toAgendaIntro());
    s = yes(no(s, 101_000), 101_001);
    s = play(s, { type: 'agendaReplaced', atMs: 101_002 });
    expect(agendaWindowStatus(s)).toMatchObject({ window: 'when', index: 0, answers: [], askingId: 'p1' });
    // danach wieder 5 „Nein“ in Folge nötig
    for (let i = 0; i < 4; i++) s = no(s, 101_010 + i);
    expect(agendaWindowStatus(s)?.window).toBe('when');
    s = play(s, { type: 'windowClose', atMs: 101_100 });
    expectError(applyEvent(s, { type: 'agendaReplaced', atMs: 101_200 }), 'INVALID_STEP');
  });

  it('Tisch-Timer je Fenster läuft hoch über alle Antworten; Pause hält ihn an; niemandem berechnet', () => {
    let s = read(toAgendaIntro());
    const banks = s.players.map((p) => p.bankMs);
    s = no(s, 130_000);
    expect(clockView(s, 160_000)).toEqual({ kind: 'table', elapsedMs: 60_000, running: true });
    s = play(s, { type: 'pause', atMs: 160_000 }, { type: 'resume', atMs: 900_000 });
    expect(clockView(s, 900_000)).toMatchObject({ elapsedMs: 60_000 });
    s = play(s, { type: 'windowClose', atMs: 900_000 });
    expect(clockView(s, 905_000)).toMatchObject({ kind: 'table', elapsedMs: 5000 });
    expect(s.players.map((p) => p.bankMs)).toEqual(banks);
  });

  it('Ereignisse außerhalb des passenden Schritts → INVALID_STEP', () => {
    const intro = toAgendaIntro();
    for (const e of [
      { type: 'windowAnswer', played: true, atMs: 1 },
      { type: 'windowClose', atMs: 1 },
      { type: 'agendaReplaced', atMs: 1 },
      { type: 'resolved', atMs: 1 },
    ] as const) {
      expectError(applyEvent(intro, e), 'INVALID_STEP');
    }
    expectError(applyEvent(read(intro), { type: 'agendaRead', atMs: 1 }), 'INVALID_STEP');
  });
});

describe('Ergebnis abhandeln (G11) und Rundenende', () => {
  function toVote(agenda: GameState, at: number): GameState {
    return play(read(agenda, at), { type: 'windowClose', atMs: at }, { type: 'windowClose', atMs: at });
  }

  it('nach der letzten Stimme: „Ergebnis abhandeln“ mit Tisch-Timer; „Abgehandelt“ → Agenda 2, dann nächste Runde', () => {
    let s = toVote(toAgendaIntro(), 100_000);
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 101_000 + i });
    expect(s.step).toMatchObject({ kind: 'agendaResolve', agenda: 1 });
    expect(clockView(s, 161_004)).toEqual({ kind: 'table', elapsedMs: 60_000, running: true });
    s = play(s, { type: 'resolved', atMs: 161_004 });
    expect(s.step).toMatchObject({ kind: 'agendaIntro', agenda: 2 });
    s = toVote(s, 170_000);
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 171_000 + i });
    expect(s.step).toMatchObject({ kind: 'agendaResolve', agenda: 2 });
    s = play(s, { type: 'resolved', atMs: 180_000 });
    expect(s).toMatchObject({ round: 2, phase: 'strategy', step: { kind: 'pick', index: 0 } });
  });
});

describe('Statistik der Agenda (G10–G12)', () => {
  it('gespielte Karten je Fenster pro Spieler; Fenster und Abhandeln zählen als Agenda-Tischzeit', () => {
    let s = toAgendaIntro(); // Einleitung ab 100 000
    s = read(s, 110_000); // Einleitung 10 s
    s = yes(s, 120_000); // p1 spielt (Sobald)
    s = play(s, { type: 'windowClose', atMs: 130_000 }); // Sobald-Fenster 20 s
    s = no(s, 131_000);
    s = yes(s, 132_000); // p2 spielt (Nachdem)
    s = yes(s, 133_000); // p3 spielt (Nachdem)
    s = play(s, { type: 'windowClose', atMs: 140_000 }); // Nachdem-Fenster 10 s
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 141_000 + i * 1000 }); // Stimmen 1+1+1+1+1 s
    s = play(s, { type: 'resolved', atMs: 165_000 }); // Abhandeln 20 s
    const r = s.stats.rounds[0]!;
    expect(r.players['p1']).toMatchObject({ whenPlays: 1, afterPlays: 0 });
    expect(r.players['p2']).toMatchObject({ whenPlays: 0, afterPlays: 1 });
    expect(r.players['p3']).toMatchObject({ whenPlays: 0, afterPlays: 1 });
    expect(r.phaseMs.agenda).toBe(10_000 + 20_000 + 10_000 + 5_000 + 20_000);
    const f = finalStats(s, 165_000);
    expect(f.players.find((p) => p.id === 'p1')).toMatchObject({ whenPlays: 1, afterPlays: 0 });
    expect(f.players.find((p) => p.id === 'p2')).toMatchObject({ whenPlays: 0, afterPlays: 1 });
  });

  it('Undo pro Antwort nimmt auch die gezählte Karte zurück', () => {
    let h = createHistory(read(toAgendaIntro()));
    h = unwrap(dispatch(h, { type: 'windowAnswer', played: true, atMs: 101_000 }));
    expect(current(h).stats.rounds[0]!.players['p1']!.whenPlays).toBe(1);
    h = unwrap(undo(h, 101_000));
    expect(current(h).stats.rounds[0]!.players['p1']!.whenPlays).toBe(0);
    expect(agendaWindowStatus(current(h))).toMatchObject({ index: 0, askingId: 'p1' });
  });
});
