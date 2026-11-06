import { elapsedMs } from './clock';
import { liveBank } from './time';
import type {
  FinalStats,
  GameEvent,
  GameState,
  GameStats,
  InterimStats,
  PhaseDurations,
  PlayerId,
  PlayerRoundStats,
  RoundStats,
} from './types';

/**
 * Statistik (M1-S): nur Summen im Spielzustand, damit sie Undo/Redo und Speichern mitmacht.
 * Zeiten stammen aus den Uhren der Schritte – Pausen sind dadurch automatisch herausgerechnet.
 */

const EMPTY_PHASES: PhaseDurations = { strategy: 0, action: 0, secondary: 0, status: 0, agenda: 0 };

const emptyPlayerRound = (): PlayerRoundStats => ({
  strategyMs: 0,
  actionMs: 0,
  agendaMs: 0,
  turns: 0,
  longestTurnMs: 0,
  overtimeTurns: 0,
  overtimeMs: 0,
  creditedMs: 0,
  cards: [],
  picksOverLimit: 0,
  votes: 0,
  votesOverLimit: 0,
  secondaryUses: {},
});

function emptyRound(round: number, playerIds: readonly PlayerId[]): RoundStats {
  return {
    round,
    players: Object.fromEntries(playerIds.map((id) => [id, emptyPlayerRound()])),
    phaseMs: EMPTY_PHASES,
    secondaryByCardMs: {},
    passOrder: [],
  };
}

export function createStats(playerIds: readonly PlayerId[], startBankMs: number, atMs: number): GameStats {
  return {
    startedAtMs: atMs,
    agendaUnlockedRound: null,
    pauseCount: 0,
    minBankMs: Object.fromEntries(playerIds.map((id) => [id, startBankMs])),
    rounds: [emptyRound(1, playerIds)],
  };
}

// --- Fortschreiben --------------------------------------------------------------------------

/** Ereignisse, die den laufenden Abschnitt (die Uhr des aktuellen Schritts) beenden. */
const CLOSES_SEGMENT: ReadonlySet<GameEvent['type']> = new Set([
  // 'secondaryAnswer' beendet den Abschnitt nur nach der letzten Antwort (siehe recordEvent)
  'pickCard',
  'primaryDone',
  'endTurn',
  'pass',
  'secondaryDone',
  'answerAgenda',
  'statusDone',
  'startVoting',
  'endVote',
]);

type RoundUpdate = (round: RoundStats) => RoundStats;

function updateRound(stats: GameStats, round: number, fn: RoundUpdate): GameStats {
  return { ...stats, rounds: stats.rounds.map((r) => (r.round === round ? fn(r) : r)) };
}

function updatePlayer(id: PlayerId, fn: (p: PlayerRoundStats) => PlayerRoundStats): RoundUpdate {
  return (r) => ({ ...r, players: { ...r.players, [id]: fn(r.players[id]!) } });
}

function addPhase(key: keyof PhaseDurations, ms: number): RoundUpdate {
  return (r) => ({ ...r, phaseMs: { ...r.phaseMs, [key]: r.phaseMs[key] + ms } });
}

/** Rechnet `ms` des aktuellen Schritts von `state` den passenden Zeitsummen zu (nur Zeiten, keine Zähler). */
function addDuration(stats: GameStats, state: GameState, ms: number): GameStats {
  const step = state.step;
  const on = (fn: RoundUpdate) => updateRound(stats, state.round, fn);
  switch (step.kind) {
    case 'pick':
      return on((r) => addPhase('strategy', ms)(updatePlayer(step.queue[step.index]!, (p) => ({ ...p, strategyMs: p.strategyMs + ms }))(r)));
    case 'turn':
      return on((r) => addPhase('action', ms)(updatePlayer(step.playerId, (p) => ({ ...p, actionMs: p.actionMs + ms }))(r)));
    case 'secondary': {
      const key = String(step.card);
      return on((r) => ({
        ...addPhase('secondary', ms)(r),
        secondaryByCardMs: { ...r.secondaryByCardMs, [key]: (r.secondaryByCardMs[key] ?? 0) + ms },
      }));
    }
    case 'agendaQuestion':
      return on(addPhase('action', ms));
    case 'status':
      return on(addPhase('status', ms));
    case 'agendaIntro':
      return on(addPhase('agenda', ms));
    case 'vote':
      return on((r) => addPhase('agenda', ms)(updatePlayer(step.queue[step.index]!, (p) => ({ ...p, agendaMs: p.agendaMs + ms }))(r)));
  }
}

/** Schreibt die Statistik nach einem gültigen Ereignis fort (`before` → `after`). */
export function recordEvent(before: GameState, after: GameState, event: GameEvent): GameState {
  let stats = before.stats;
  const step = before.step;
  const round = before.round;

  // Genutzte Sekundärfähigkeit zählen (S9) – unabhängig davon, ob die Phase damit endet.
  if (event.type === 'secondaryAnswer' && event.use && step.kind === 'secondary') {
    const key = String(step.card);
    stats = updateRound(
      stats,
      round,
      updatePlayer(step.queue[step.index]!, (p) => ({ ...p, secondaryUses: { ...p.secondaryUses, [key]: (p.secondaryUses[key] ?? 0) + 1 } })),
    );
  }

  const closes = CLOSES_SEGMENT.has(event.type) || (event.type === 'secondaryAnswer' && after.step.kind !== 'secondary');
  if (closes) {
    const ms = elapsedMs(step.clock, event.atMs);
    stats = addDuration(stats, before, ms);

    if (step.kind === 'pick') {
      const over = ms > before.config.strategyPickSec * 1000 ? 1 : 0;
      stats = updateRound(stats, round, updatePlayer(step.queue[step.index]!, (p) => ({ ...p, cards: [...p.cards, (event as { card: number }).card], picksOverLimit: p.picksOverLimit + over })));
    }
    if (step.kind === 'turn') {
      const id = step.playerId;
      const overflow = Math.max(0, ms - before.config.turnSec * 1000);
      const bankBefore = before.players.find((p) => p.id === id)!.bankMs;
      const bankAfter = after.players.find((p) => p.id === id)!.bankMs;
      stats = updateRound(
        stats,
        round,
        updatePlayer(id, (p) => ({
          ...p,
          turns: p.turns + 1,
          longestTurnMs: Math.max(p.longestTurnMs, ms),
          overtimeTurns: p.overtimeTurns + (overflow > 0 ? 1 : 0),
          overtimeMs: p.overtimeMs + overflow,
          // Gutschrift gibt es nur ohne Überzug; dann ist jeder Zuwachs der Bank Gutschrift.
          creditedMs: p.creditedMs + Math.max(0, bankAfter - bankBefore),
        })),
      );
      stats = { ...stats, minBankMs: { ...stats.minBankMs, [id]: Math.min(stats.minBankMs[id]!, bankAfter) } };
      if (event.type === 'pass') stats = updateRound(stats, round, (r) => ({ ...r, passOrder: [...r.passOrder, id] }));
    }
    if (step.kind === 'vote') {
      const over = ms > before.config.agendaVoteSec * 1000 ? 1 : 0;
      stats = updateRound(stats, round, updatePlayer(step.queue[step.index]!, (p) => ({ ...p, votes: p.votes + 1, votesOverLimit: p.votesOverLimit + over })));
    }
  }

  if (event.type === 'answerAgenda' && event.active && stats.agendaUnlockedRound === null) stats = { ...stats, agendaUnlockedRound: round };
  if (event.type === 'pause') stats = { ...stats, pauseCount: stats.pauseCount + 1 };
  if (after.round > round) stats = { ...stats, rounds: [...stats.rounds, emptyRound(after.round, after.players.map((p) => p.id))] };

  return { ...after, stats };
}

// --- Auswerten ------------------------------------------------------------------------------

/** Statistik inklusive des laufenden Abschnitts bis `nowMs` (nur Zeiten, Zähler bleiben). */
function liveStats(state: GameState, nowMs: number): GameStats {
  return addDuration(state.stats, state, elapsedMs(state.step.clock, nowMs));
}

function secondaryTotals(rounds: readonly PlayerRoundStats[]) {
  const byCard: Record<string, number> = {};
  for (const r of rounds) for (const [card, n] of Object.entries(r.secondaryUses)) byCard[card] = (byCard[card] ?? 0) + n;
  return { secondaryUses: sum(Object.values(byCard)), secondaryUsesByCard: byCard };
}

const sumPhases = (p: PhaseDurations) => p.strategy + p.action + p.secondary + p.status + p.agenda;
const playerTotal = (p: PlayerRoundStats) => p.strategyMs + p.actionMs + p.agendaMs;
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (total: number, count: number) => (count > 0 ? total / count : 0);
const pausedAt = (state: GameState, nowMs: number) => state.pausedTotalMs + (state.pause ? Math.max(0, nowMs - state.pause.since) : 0);

/** Zwischenstand für den Button „Statistik“ (S5). */
export function interimStats(state: GameState, nowMs: number): InterimStats {
  const live = liveStats(state, nowMs);
  const closed = state.stats;
  const view = state.step;
  return {
    netMs: sum(live.rounds.map((r) => sumPhases(r.phaseMs))),
    grossMs: nowMs - closed.startedAtMs,
    round: state.round,
    pausedMs: pausedAt(state, nowMs),
    players: state.players.map((p) => {
      const closedRounds = closed.rounds.map((r) => r.players[p.id]!);
      const running = view.kind === 'turn' && view.playerId === p.id;
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        totalMs: sum(live.rounds.map((r) => playerTotal(r.players[p.id]!))),
        avgTurnMs: avg(sum(closedRounds.map((r) => r.actionMs)), sum(closedRounds.map((r) => r.turns))),
        bankMs: running ? liveBank(p.bankMs, elapsedMs(view.clock, nowMs), state.config) : p.bankMs,
        overtimeTurns: sum(closedRounds.map((r) => r.overtimeTurns)),
      };
    }),
    currentRound: live.rounds.find((r) => r.round === state.round)!.phaseMs,
  };
}

/** Endauswertung (S6); Runden ohne erfasste Zeit (z. B. gerade begonnen) werden ausgelassen. */
export function finalStats(state: GameState, nowMs: number): FinalStats {
  const live = liveStats(state, nowMs);
  const rounds = live.rounds.filter((r) => sumPhases(r.phaseMs) > 0);
  const closedRounds = state.stats.rounds.filter((r) => rounds.some((x) => x.round === r.round));
  const totals = state.players.map((p) => sum(rounds.map((r) => playerTotal(r.players[p.id]!))));
  const allPlayers = sum(totals);

  return {
    overview: {
      netMs: sum(rounds.map((r) => sumPhases(r.phaseMs))),
      grossMs: nowMs - state.stats.startedAtMs,
      rounds: rounds.length,
      pausedMs: pausedAt(state, nowMs),
      pauseCount: state.stats.pauseCount,
      agendaUnlockedRound: state.stats.agendaUnlockedRound,
    },
    byPlayerRound: state.players.map((p) =>
      rounds.map((r) => {
        const s = r.players[p.id]!;
        return { totalMs: playerTotal(s), strategyMs: s.strategyMs, actionMs: s.actionMs, agendaMs: s.agendaMs };
      }),
    ),
    players: state.players.map((p, i) => {
      const liveP = rounds.map((r) => r.players[p.id]!);
      const closedP = closedRounds.map((r) => r.players[p.id]!);
      const turns = sum(closedP.map((r) => r.turns));
      const longest = closedRounds.reduce<{ ms: number; round: number } | null>((best, r) => {
        const s = r.players[p.id]!;
        return s.turns > 0 && (best === null || s.longestTurnMs > best.ms) ? { ms: s.longestTurnMs, round: r.round } : best;
      }, null);
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        totalMs: totals[i]!,
        sharePct: allPlayers > 0 ? (totals[i]! / allPlayers) * 100 : 0,
        strategyMs: sum(liveP.map((r) => r.strategyMs)),
        actionMs: sum(liveP.map((r) => r.actionMs)),
        agendaMs: sum(liveP.map((r) => r.agendaMs)),
        turns,
        avgTurnMs: avg(sum(closedP.map((r) => r.actionMs)), turns),
        longestTurn: longest,
        overtimeTurns: sum(closedP.map((r) => r.overtimeTurns)),
        overtimeMs: sum(closedP.map((r) => r.overtimeMs)),
        bankEndMs: p.bankMs,
        minBankMs: state.stats.minBankMs[p.id]!,
        creditedMs: sum(closedP.map((r) => r.creditedMs)),
        cardsByRound: closedP.map((r) => [...r.cards]),
        avgPickMs: avg(sum(closedP.map((r) => r.strategyMs)), sum(closedP.map((r) => r.cards.length))),
        picksOverLimit: sum(closedP.map((r) => r.picksOverLimit)),
        avgVoteMs: avg(sum(closedP.map((r) => r.agendaMs)), sum(closedP.map((r) => r.votes))),
        votesOverLimit: sum(closedP.map((r) => r.votesOverLimit)),
        ...secondaryTotals(closedP),
        passPositionByRound: closedRounds.map((r) => {
          const pos = r.passOrder.indexOf(p.id);
          return pos === -1 ? null : pos + 1;
        }),
      };
    }),
    rounds: rounds.map((r) => ({ round: r.round, totalMs: sumPhases(r.phaseMs), phaseMs: r.phaseMs, secondaryByCardMs: r.secondaryByCardMs })),
  };
}
