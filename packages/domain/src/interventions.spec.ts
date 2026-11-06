import { describe, expect, it } from 'vitest';
import { applyEvent, clockView } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { finalStats } from './stats';
import { activeId, expectError, newGame, pickAll, play, player, setupWithNaalu, unwrap } from './test-utils';
import { createGame } from './game';
import { DEFAULT_CONFIG } from './config';
import type { GameState } from './types';

const MIN = 60_000;
/** 5 Spieler, Sprecher p1. p1→5, p2→1, p3→8, p4→3, p5→2 ⇒ p2, p5, p4, p1, p3; p2 am Zug ab t=5000. */
const actionPhase = (): GameState => pickAll(newGame(5), [5, 1, 8, 3, 2]);

describe('E1 Sprecher ändern', () => {
  it('gilt für danach beginnende Reihenfolgen (nächste Strategiephase)', () => {
    let s = play(actionPhase(), { type: 'setSpeaker', playerId: 'p4', atMs: 6000 });
    expect(s.speakerId).toBe('p4');
    expect(activeId(s)).toBe('p2'); // laufender Zug unverändert
    // Runde beenden
    for (let i = 0; i < 40 && s.step.kind !== 'agendaQuestion'; i++) {
      const st = s.step;
      const t = 10_000 + i;
      if (st.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
      else if (st.kind === 'turn' && st.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
      else if (st.kind === 'turn') {
        const c = s.cards.find((x) => x.ownerId === st.playerId && !x.used);
        s = play(s, c ? { type: 'useCard', card: c.number, atMs: t } : { type: 'pass', atMs: t });
      }
    }
    s = play(s, { type: 'answerAgenda', active: false, atMs: 20_000 }, { type: 'statusDone', atMs: 20_001 });
    expect(s.step).toMatchObject({ kind: 'pick', queue: ['p4', 'p5', 'p1', 'p2', 'p3'] });
  });

  it('unbekannter Spieler → INVALID_SETUP-artiger Fehler (UNKNOWN_PLAYER)', () => {
    expectError(applyEvent(actionPhase(), { type: 'setSpeaker', playerId: 'x', atMs: 1 }), 'UNKNOWN_PLAYER');
  });
});

describe('E2 Aktiven Spieler wählen', () => {
  it('rechnet den laufenden Zug ab; danach ab dem Gewählten nach Initiative', () => {
    let s = play(actionPhase(), { type: 'setActive', playerId: 'p1', atMs: 65_000 }); // p2 60 s → +30 s
    expect(player(s, 'p2').bankMs).toBe(30 * MIN + 30_000);
    expect(activeId(s)).toBe('p1');
    s = play(s, { type: 'endTurn', atMs: 70_000 });
    expect(activeId(s)).toBe('p3');
  });

  it('gepasster Spieler kann nicht gewählt werden; nur im Zug möglich', () => {
    expectError(applyEvent(newGame(5), { type: 'setActive', playerId: 'p1', atMs: 1 }), 'INVALID_STEP');
    let s = actionPhase();
    s = play(s, { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 }, { type: 'secondaryDone', atMs: 8000 }); // p2
    for (let i = 0; i < 4; i++) s = play(s, { type: 'endTurn', atMs: 9000 + i }); // p5 p4 p1 p3
    s = play(s, { type: 'pass', atMs: 13_000 }); // p2 passt
    expectError(applyEvent(s, { type: 'setActive', playerId: 'p2', atMs: 14_000 }), 'INVALID_INPUT');
    expectError(applyEvent(s, { type: 'setActive', playerId: 'x', atMs: 14_000 }), 'UNKNOWN_PLAYER');
  });
});

describe('E3 Zug überspringen', () => {
  it('Zeit verfällt (nicht abgerechnet), Nächster nach Initiative', () => {
    const s = play(actionPhase(), { type: 'skipTurn', atMs: 5000 + 200_000 });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN);
    expect(activeId(s)).toBe('p5');
  });
});

describe('E4 Zusatzzug', () => {
  it('Gewählter sofort; danach der ohne Unterbrechung Nächste', () => {
    let s = play(actionPhase(), { type: 'extraTurn', playerId: 'p3', atMs: 65_000 }); // p2 abgerechnet
    expect(player(s, 'p2').bankMs).toBe(30 * MIN + 30_000);
    expect(activeId(s)).toBe('p3');
    expect(clockView(s, 65_000)).toMatchObject({ remainingMs: 90_000 });
    s = play(s, { type: 'endTurn', atMs: 70_000 });
    expect(activeId(s)).toBe('p5'); // nach p2 wäre p5 dran gewesen
  });

  it('auch für Gepasste; sie bleiben gepasst; Rückkehr auch nach Strategiekarte mit Sekundärphase', () => {
    let s = actionPhase();
    s = play(s, { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 }, { type: 'secondaryDone', atMs: 8000 }); // p2
    s = play(s, { type: 'endTurn', atMs: 9000 }, { type: 'endTurn', atMs: 10_000 }, { type: 'endTurn', atMs: 11_000 }, { type: 'endTurn', atMs: 12_000 }); // p5 p4 p1 p3
    s = play(s, { type: 'pass', atMs: 13_000 }); // p2 passt → p5
    s = play(s, { type: 'extraTurn', playerId: 'p2', atMs: 14_000 }); // p5 abgerechnet, Zusatzzug p2
    expect(activeId(s)).toBe('p2');
    expect(player(s, 'p2').passed).toBe(true);
    s = play(s, { type: 'endTurn', atMs: 15_000 });
    expect(activeId(s)).toBe('p4'); // nach p5 wäre p4 dran gewesen
    // Zusatzzug mit Strategiekarte: Rückkehr nach der Sekundärphase
    s = play(s, { type: 'extraTurn', playerId: 'p4', atMs: 16_000 }); // p4 selbst, danach nach p4 → p1
    s = play(s, { type: 'useCard', card: 3, atMs: 17_000 }, { type: 'primaryDone', atMs: 18_000 }, { type: 'secondaryDone', atMs: 19_000 });
    expect(activeId(s)).toBe('p1');
  });
});

describe('E5 Strategiekarten tauschen', () => {
  it('Besitzer tauschen, Initiative neu, Aktiver bleibt', () => {
    const s = play(actionPhase(), { type: 'swapCards', cardA: 1, cardB: 8, atMs: 6000 }); // p2 ↔ p3
    expect(s.cards.find((c) => c.number === 1)!.ownerId).toBe('p3');
    expect(s.cards.find((c) => c.number === 8)!.ownerId).toBe('p2');
    expect(s.actionOrder).toEqual(['p3', 'p5', 'p4', 'p1', 'p2']);
    expect(activeId(s)).toBe('p2');
  });

  it('nur vergebene Karten verschiedener Spieler', () => {
    expectError(applyEvent(actionPhase(), { type: 'swapCards', cardA: 1, cardB: 4, atMs: 1 }), 'CARD_NOT_OWNED');
    expectError(applyEvent(actionPhase(), { type: 'swapCards', cardA: 1, cardB: 1, atMs: 1 }), 'CARD_NOT_OWNED');
  });
});

describe('E6 Initiative-0-Token geben', () => {
  it('für diese Runde; Reihenfolge neu; nächste Runde wieder bei Naalu', () => {
    let s = pickAll(unwrap(createGame(setupWithNaalu(5, 'p3'), DEFAULT_CONFIG, 0)), [5, 1, 8, 3, 2]);
    expect(s.actionOrder[0]).toBe('p3');
    s = play(s, { type: 'setInitiativeZero', playerId: 'p1', atMs: 6000 });
    expect(s.initiativeZeroHolder).toBe('p1');
    expect(s.actionOrder).toEqual(['p1', 'p2', 'p5', 'p4', 'p3']);
    for (let i = 0; i < 40 && s.step.kind !== 'agendaQuestion'; i++) {
      const st = s.step;
      const t = 10_000 + i;
      if (st.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
      else if (st.kind === 'turn' && st.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
      else if (st.kind === 'turn') {
        const c = s.cards.find((x) => x.ownerId === st.playerId && !x.used);
        s = play(s, c ? { type: 'useCard', card: c.number, atMs: t } : { type: 'pass', atMs: t });
      }
    }
    s = play(s, { type: 'answerAgenda', active: false, atMs: 20_000 }, { type: 'statusDone', atMs: 20_001 });
    expect(s.initiativeZeroHolder).toBe('p3');
  });

  it('niemand: Token entfernt', () => {
    const s = play(actionPhase(), { type: 'setInitiativeZero', playerId: null, atMs: 6000 });
    expect(s.initiativeZeroHolder).toBeNull();
  });
});

describe('E7 Abstimmung gegen den Uhrzeigersinn', () => {
  function toWindow(): GameState {
    let s = actionPhase();
    for (let i = 0; i < 40 && s.step.kind !== 'agendaQuestion'; i++) {
      const st = s.step;
      const t = 10_000 + i;
      if (st.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
      else if (st.kind === 'turn' && st.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
      else if (st.kind === 'turn') {
        const c = s.cards.find((x) => x.ownerId === st.playerId && !x.used);
        s = play(s, c ? { type: 'useCard', card: c.number, atMs: t } : { type: 'pass', atMs: t });
      }
    }
    return play(s, { type: 'answerAgenda', active: true, atMs: 20_000 }, { type: 'statusDone', atMs: 20_001 }, { type: 'agendaRead', atMs: 20_002 });
  }

  it('im Fenster gesetzt: Abstimmung beginnt rechts vom Sprecher, Sprecher zuletzt; nur diese Agenda', () => {
    let s = play(toWindow(), { type: 'reverseVoting', atMs: 21_000 });
    s = play(s, { type: 'windowClose', atMs: 22_000 }, { type: 'windowClose', atMs: 23_000 });
    expect(s.step).toMatchObject({ kind: 'vote', queue: ['p5', 'p4', 'p3', 'p2', 'p1'] });
    for (let i = 0; i < 5; i++) s = play(s, { type: 'endVote', atMs: 24_000 + i });
    s = play(s, { type: 'resolved', atMs: 30_000 }, { type: 'agendaRead', atMs: 30_001 }, { type: 'windowClose', atMs: 30_002 }, { type: 'windowClose', atMs: 30_003 });
    expect(s.step).toMatchObject({ kind: 'vote', agenda: 2, queue: ['p2', 'p3', 'p4', 'p5', 'p1'] });
  });

  it('in der Abstimmung vor der ersten Stimme möglich, danach nicht', () => {
    let s = play(toWindow(), { type: 'windowClose', atMs: 21_000 }, { type: 'windowClose', atMs: 22_000 });
    s = play(s, { type: 'reverseVoting', atMs: 23_000 });
    expect(s.step).toMatchObject({ kind: 'vote', queue: ['p5', 'p4', 'p3', 'p2', 'p1'], index: 0 });
    s = play(s, { type: 'endVote', atMs: 24_000 });
    expectError(applyEvent(s, { type: 'reverseVoting', atMs: 25_000 }), 'INVALID_STEP');
  });
});

describe('E8 Bank ±1 Minute', () => {
  it('ändert die Bank eines Spielers in jeder Phase; Tiefststand folgt', () => {
    let s = play(newGame(5), { type: 'adjustBank', playerId: 'p3', deltaMs: -MIN, atMs: 1 });
    expect(player(s, 'p3').bankMs).toBe(29 * MIN);
    expect(s.stats.minBankMs['p3']).toBe(29 * MIN);
    s = play(s, { type: 'adjustBank', playerId: 'p3', deltaMs: MIN, atMs: 2 });
    expect(player(s, 'p3').bankMs).toBe(30 * MIN);
  });

  it('nur ±1 Minute', () => {
    expectError(applyEvent(newGame(5), { type: 'adjustBank', playerId: 'p3', deltaMs: 5 * MIN, atMs: 1 }), 'INVALID_INPUT');
  });
});

describe('E9 Spiel beenden und Sieger', () => {
  it('stoppt alle Uhren; Sieger wird gespeichert; danach nur noch Siegerwahl möglich', () => {
    let s = play(actionPhase(), { type: 'endGame', atMs: 65_000 });
    expect(s.step).toMatchObject({ kind: 'finished', winnerId: null, decided: false, finishedAtMs: 65_000 });
    expect(clockView(s, 999_999)).toEqual({ kind: 'none' });
    expect(player(s, 'p2').bankMs).toBe(30 * MIN); // Zug nicht abgerechnet
    expectError(applyEvent(s, { type: 'endTurn', atMs: 70_000 }), 'INVALID_STEP');
    s = play(s, { type: 'declareWinner', winnerId: 'p4', atMs: 70_000 });
    expect(s.step).toMatchObject({ kind: 'finished', winnerId: 'p4', decided: true });
    expectError(applyEvent(s, { type: 'declareWinner', winnerId: 'x', atMs: 71_000 }), 'UNKNOWN_PLAYER');
  });

  it('ohne Sieger beenden', () => {
    const s = play(actionPhase(), { type: 'endGame', atMs: 6000 }, { type: 'declareWinner', winnerId: null, atMs: 7000 });
    expect(s.step).toMatchObject({ winnerId: null, decided: true });
  });

  it('Endauswertung: Sieger, Brutto-Zeit endet beim Spielende; Zug zählt nicht als Zug', () => {
    const s = play(actionPhase(), { type: 'endGame', atMs: 65_000 }, { type: 'declareWinner', winnerId: 'p4', atMs: 70_000 });
    const f = finalStats(s, 999_000);
    expect(f.overview).toMatchObject({ winnerId: 'p4', grossMs: 65_000, netMs: 65_000 });
    expect(f.players.find((p) => p.id === 'p2')).toMatchObject({ turns: 0, actionMs: 60_000 });
  });

  it('Undo führt zurück ins Spiel', () => {
    let h = createHistory(actionPhase());
    h = unwrap(dispatch(h, { type: 'endGame', atMs: 65_000 }));
    h = unwrap(dispatch(h, { type: 'declareWinner', winnerId: 'p1', atMs: 66_000 }));
    h = unwrap(undo(h, 70_000));
    h = unwrap(undo(h, 70_000));
    expect(current(h).step).toMatchObject({ kind: 'turn', playerId: 'p2' });
  });
});

describe('E11 Eingriffe sind Undo-Schritte, JSON-tauglich', () => {
  it('jeder Eingriff ein Verlaufseintrag', () => {
    let h = createHistory(actionPhase());
    for (const e of [
      { type: 'setSpeaker', playerId: 'p3', atMs: 6000 },
      { type: 'adjustBank', playerId: 'p1', deltaMs: 60_000, atMs: 6001 },
      { type: 'swapCards', cardA: 5, cardB: 2, atMs: 6002 },
      { type: 'setInitiativeZero', playerId: 'p4', atMs: 6003 },
    ] as const) {
      const before = h.entries.length;
      h = unwrap(dispatch(h, e));
      expect(h.entries.length).toBe(before + 1);
    }
    const s = current(h);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    for (let i = 0; i < 4; i++) h = unwrap(undo(h, 7000));
    expect(current(h)).toMatchObject({ speakerId: 'p1', initiativeZeroHolder: null });
  });
});

describe('PO Sprecherwahl nach Politik (LRR 81.6)', () => {
  /** p4 hält Politik (Karte 3); Reihenfolge p2, p5, p4, p1, p3; Sprecher p1. */
  const toPolitics = (): GameState => {
    let s = actionPhase();
    s = play(s, { type: 'endTurn', atMs: 6000 }, { type: 'endTurn', atMs: 7000 }); // p2, p5 → p4
    return play(s, { type: 'useCard', card: 3, atMs: 8000 }, { type: 'primaryDone', atMs: 9000 });
  };

  it('nach Politik-Primär: Sprecherwahl offen, Sekundär-Antworten noch gesperrt (PO1)', () => {
    const s = toPolitics();
    expect(s.step).toMatchObject({ kind: 'secondary', card: 3, speakerPending: true });
    expectError(applyEvent(s, { type: 'secondaryAnswer', use: true, atMs: 9500 }), 'INVALID_STEP');
    expectError(applyEvent(s, { type: 'secondaryDone', atMs: 9500 }), 'INVALID_STEP');
  });

  it('amtierender Sprecher ist nicht wählbar; unbekannter Spieler → Fehler', () => {
    expectError(applyEvent(toPolitics(), { type: 'chooseSpeaker', playerId: 'p1', atMs: 9500 }), 'INVALID_INPUT');
    expectError(applyEvent(toPolitics(), { type: 'chooseSpeaker', playerId: 'x', atMs: 9500 }), 'UNKNOWN_PLAYER');
  });

  it('Wahl setzt den Sprecher, danach normale Sekundärphase (auch sich selbst wählbar)', () => {
    const s = play(toPolitics(), { type: 'chooseSpeaker', playerId: 'p4', atMs: 9500 });
    expect(s.speakerId).toBe('p4');
    expect(s.step).toMatchObject({ kind: 'secondary', speakerPending: false, queue: ['p5', 'p1', 'p2', 'p3'] });
    expect(play(s, { type: 'secondaryDone', atMs: 10_000 }).step).toMatchObject({ kind: 'turn', playerId: 'p1' });
  });

  it('andere Strategiekarten fragen nicht nach dem Sprecher', () => {
    const s = play(actionPhase(), { type: 'useCard', card: 1, atMs: 6000 }, { type: 'primaryDone', atMs: 7000 });
    expect(s.step).toMatchObject({ kind: 'secondary', card: 1 });
    expect((s.step as { speakerPending?: boolean }).speakerPending).toBeFalsy();
    expectError(applyEvent(s, { type: 'chooseSpeaker', playerId: 'p3', atMs: 8000 }), 'INVALID_STEP');
  });

  it('neuer Sprecher gilt für die Agenda derselben Runde (PO2)', () => {
    let s = play(toPolitics(), { type: 'chooseSpeaker', playerId: 'p3', atMs: 9500 }, { type: 'secondaryDone', atMs: 10_000 });
    for (let i = 0; i < 40 && s.step.kind !== 'agendaQuestion'; i++) {
      const st = s.step;
      const t = 20_000 + i;
      if (st.kind === 'secondary') s = play(s, { type: 'secondaryDone', atMs: t });
      else if (st.kind === 'turn' && st.strategyCard !== null) s = play(s, { type: 'primaryDone', atMs: t });
      else if (st.kind === 'turn') {
        const c = s.cards.find((x) => x.ownerId === st.playerId && !x.used);
        s = play(s, c ? { type: 'useCard', card: c.number, atMs: t } : { type: 'pass', atMs: t });
      }
    }
    s = play(s, { type: 'answerAgenda', active: true, atMs: 30_000 }, { type: 'statusDone', atMs: 30_001 }, { type: 'agendaRead', atMs: 30_002 });
    expect(s.step).toMatchObject({ kind: 'agendaWindow', queue: ['p3', 'p4', 'p5', 'p1', 'p2'] });
  });

  it('Undo nimmt die Sprecherwahl zurück (PO3)', () => {
    let h = createHistory(toPolitics());
    h = unwrap(dispatch(h, { type: 'chooseSpeaker', playerId: 'p5', atMs: 9500 }));
    h = unwrap(undo(h, 9500));
    expect(current(h)).toMatchObject({ speakerId: 'p1', step: { speakerPending: true } });
  });
});
