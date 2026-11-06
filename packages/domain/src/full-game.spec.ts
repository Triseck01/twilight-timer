// Durchlauf: 5 Spieler, zwei komplette Runden über die öffentliche API (inkl. Agenda ab Runde 1 nach „Ja“).
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './config';
import { clockView, createGame } from './game';
import { createHistory, current, dispatch, undo } from './history';
import { NO_VARIANTS, setupFor, unwrap } from './test-utils';
import type { GameEvent, History } from './types';

/** Ereignis ohne Zeitstempel (verteilt über die Union). */
type EventInput = GameEvent extends infer E ? (E extends GameEvent ? Omit<E, 'atMs'> : never) : never;

const S = 1000;

describe('Durchlauf 5 Spieler × 2 Runden', () => {
  it('läuft ohne Blockade durch und rechnet Banken korrekt', () => {
    let h: History = createHistory(unwrap(createGame(setupFor(5, { speakerId: 'p3', variants: NO_VARIANTS }), DEFAULT_CONFIG, 0)));
    let t = 0;
    const go = (e: EventInput, dt = 10 * S) => {
      t += dt;
      h = unwrap(dispatch(h, { ...e, atMs: t }));
    };
    const step = () => current(h).step;

    for (const round of [1, 2]) {
      // Strategie: Sprecher p3 zuerst → p3:1, p4:2, p5:3, p1:4, p2:5
      expect(step()).toMatchObject({ kind: 'pick', queue: ['p3', 'p4', 'p5', 'p1', 'p2'] });
      for (const card of [1, 2, 3, 4, 5]) go({ type: 'pickCard', card });
      expect(current(h).actionOrder).toEqual(['p3', 'p4', 'p5', 'p1', 'p2']);

      // Jeder: erst Strategiekarte (Primär 60 s, Sekundär 2 min), dann eine taktische Aktion (2 min, 30 s Überzug), dann passen
      for (let i = 0; i < 5; i++) {
        const s = step();
        if (s.kind !== 'turn') throw new Error('Zug erwartet');
        const card = current(h).cards.find((c) => c.ownerId === s.playerId)!.number;
        go({ type: 'useCard', card }, 30 * S);
        go({ type: 'primaryDone' }, 30 * S);
        go({ type: 'secondaryDone' }, 120 * S);
      }
      for (let i = 0; i < 5; i++) go({ type: 'endTurn' }, 120 * S);
      // Fehlklick und Undo beim ersten Passen
      go({ type: 'endTurn' }, 5 * S);
      h = unwrap(undo(h, (t += 20 * S)));
      for (let i = 0; i < 5; i++) go({ type: 'pass' }, 5 * S);

      if (round === 1) {
        expect(step()).toMatchObject({ kind: 'agendaQuestion' });
        go({ type: 'answerAgenda', active: true });
      }
      expect(current(h).phase).toBe('status');
      expect(clockView(current(h), t)).toEqual({ kind: 'none' });
      go({ type: 'statusDone' });
      for (let agenda = 1; agenda <= 2; agenda++) {
        go({ type: 'startVoting' });
        for (let i = 0; i < 5; i++) go({ type: 'endVote' }, 60 * S);
      }
      expect(current(h).round).toBe(round + 1);
    }

    // Pro Runde und Spieler: Primär 60 s (+30 s Gutschrift), Taktik 120 s (−30 s), Pass ohne Gutschrift.
    // Der erste Passende hatte vor dem Undo 5 s gebraucht (Fehlklick), danach weitere 5 s → 10 s, keine Gutschrift.
    for (const p of current(h).players) expect(p.bankMs).toBe(30 * 60 * S);
    expect(current(h).phase).toBe('strategy');
  });
});
