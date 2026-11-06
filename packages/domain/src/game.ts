import { announcedClock, countedMs, elapsedMs, resumeClock, startClock, stopClock } from './clock';
import { PLAYER_COLORS } from './colors';
import { NAALU_ID, availableFactions } from './factions';
import { actionOrder, nextActor, pickOrder, reversedVoteOrder, secondaryOrder, speakerFirst, voteOrder } from './order';
import { createStats, recordEvent } from './stats';
import { liveBank, settleTurn } from './time';
import type {
  CardState,
  Clock,
  ClockView,
  DomainError,
  ErrorCode,
  GameEvent,
  GameSetup,
  GameState,
  PlayerId,
  Result,
  Step,
  TimeConfig,
} from './types';

const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (code: ErrorCode, message: string): Result<never> => ({ ok: false, error: { code, message } });

/** Legt ein Spiel an. Die Konfiguration wird kopiert (Konzept §4: spätere Änderungen wirken nicht). */
export function createGame(setup: GameSetup, config: TimeConfig, atMs: number): Result<GameState> {
  const error = validateSetup(setup);
  if (error) return { ok: false, error };
  const seatIds = setup.players.map((p) => p.id);
  const speakerId = setup.speakerId ?? seatIds[0]!;
  return ok({
    schemaVersion: 1,
    config: { ...config, warnAtSec: [...config.warnAtSec] },
    variants: { ...setup.variants },
    players: setup.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      factionId: p.factionId,
      bankMs: config.startBankSec * 1000,
      passed: false,
    })),
    speakerId,
    initiativeZeroHolder: setup.players.find((p) => p.factionId === NAALU_ID)?.id ?? null,
    initiativeZeroDefault: setup.players.find((p) => p.factionId === NAALU_ID)?.id ?? null,
    round: 1,
    phase: 'strategy',
    agendaActive: false,
    cards: CARD_NUMBERS.map((number) => ({ number, ownerId: null, tradeGoods: 0, used: false })),
    actionOrder: [],
    step: { kind: 'pick', queue: pickOrder(seatIds, speakerId), index: 0, clock: announcedClock(atMs, config.announceSec * 1000) },
    pause: null,
    pausedTotalMs: 0,
    stats: createStats(seatIds, config.startBankSec * 1000, atMs),
  });
}

function validateSetup(setup: GameSetup): DomainError | null {
  const n = setup.players.length;
  const max = setup.variants.pok ? 8 : 6;
  const ids = new Set(setup.players.map((p) => p.id));
  const invalid = (message: string): DomainError => ({ code: 'INVALID_SETUP', message });
  if (n < 3 || n > max) return invalid(`Spielerzahl ${n} ist ungültig (erlaubt: 3–${max}).`);
  if (ids.size !== n) return invalid('Spieler-IDs müssen eindeutig sein.');
  if (setup.speakerId !== undefined && !ids.has(setup.speakerId)) return invalid('Der Sprecher ist kein Mitspieler.');
  const colors = setup.players.map((p) => p.color);
  if (!colors.every((c) => PLAYER_COLORS.some((x) => x.id === c))) return invalid('Unbekannte Spielerfarbe.');
  if (new Set(colors).size !== n) return invalid('Jede Farbe darf nur einmal vorkommen.');
  const factions = setup.players.map((p) => p.factionId);
  const allowed = new Set(availableFactions(setup.variants).map((f) => f.id));
  if (!factions.every((f) => allowed.has(f))) return invalid('Unbekanntes Volk oder Volk aus einer nicht gewählten Erweiterung.');
  if (new Set(factions).size !== n) return invalid('Jedes Volk darf nur einmal vorkommen.');
  return null;
}

/** Wendet ein Ereignis an und schreibt die Statistik fort. Ungültige Ereignisse liefern einen Fehler; der Zustand bleibt unverändert. */
export function applyEvent(state: GameState, event: GameEvent): Result<GameState> {
  const result = transition(state, event);
  return result.ok ? ok(recordEvent(state, result.value, event)) : result;
}

function transition(state: GameState, event: GameEvent): Result<GameState> {
  if (state.step.kind === 'finished') {
    return event.type === 'declareWinner' ? declareWinner(state, event.winnerId) : wrongStep(event.type);
  }
  if (event.type === 'resume') return resume(state, event.atMs);
  if (state.pause) return fail('PAUSED', 'Das Spiel ist pausiert. Erst fortsetzen.');
  switch (event.type) {
    case 'pause':
      return pause(state, event.atMs);
    case 'pickCard':
      return pickCard(state, event.card, event.atMs);
    case 'useCard':
      return useCard(state, event.card);
    case 'primaryDone':
      return primaryDone(state, event.atMs);
    case 'endTurn':
      return endTurn(state, event.atMs);
    case 'pass':
      return passTurn(state, event.atMs);
    case 'secondaryAnswer':
      return secondaryAnswer(state, event.use, event.atMs);
    case 'secondaryDone':
      return secondaryDone(state, event.atMs);
    case 'answerAgenda':
      return state.step.kind !== 'agendaQuestion'
        ? wrongStep(event.type)
        : ok({ ...state, agendaActive: event.active, phase: 'status', step: { kind: 'status', clock: startClock(event.atMs) } });
    case 'statusDone':
      if (state.step.kind !== 'status') return wrongStep(event.type);
      return ok(
        state.agendaActive
          ? { ...state, phase: 'agenda', step: { kind: 'agendaIntro', agenda: 1, clock: startClock(event.atMs) } }
          : nextRound(state, event.atMs),
      );
    case 'agendaRead':
      if (state.step.kind !== 'agendaIntro') return wrongStep(event.type);
      return ok(openWindow(state, state.step.agenda, 'when', event.atMs));
    case 'windowAnswer':
      return windowAnswer(state, event.played, event.atMs);
    case 'windowClose':
      return state.step.kind !== 'agendaWindow' ? wrongStep(event.type) : ok(closeWindow(state, state.step, event.atMs));
    case 'agendaReplaced':
      if (state.step.kind !== 'agendaWindow' || state.step.window !== 'when') return wrongStep(event.type);
      return ok({ ...state, step: { ...state.step, index: 0, answers: [], noInRow: 0 } });
    case 'resolved':
      if (state.step.kind !== 'agendaResolve') return wrongStep(event.type);
      return ok(
        state.step.agenda === 1
          ? { ...state, step: { kind: 'agendaIntro', agenda: 2, clock: startClock(event.atMs) } }
          : nextRound(state, event.atMs),
      );
    case 'endVote':
      return endVote(state, event, event.atMs);
    case 'discussionDone': {
      const step = state.step;
      if (step.kind !== 'agendaDiscussion') return wrongStep(event.type);
      const after = openWindow(state, step.agenda, 'after', event.atMs);
      return ok(step.reversedVoting ? { ...after, step: { ...(after.step as WindowStep), reversedVoting: true } } : after);
    }
    case 'startNow':
      return startNow(state, event.atMs);
    case 'setSpeaker':
      return !hasPlayer(state, event.playerId) ? unknownPlayer() : ok({ ...state, speakerId: event.playerId });
    case 'chooseSpeaker':
      return chooseSpeaker(state, event.playerId, event.atMs);
    case 'setActive':
      return setActive(state, event.playerId, event.atMs);
    case 'skipTurn':
      return state.step.kind !== 'turn' ? wrongStep(event.type) : ok(advance(state, afterOf(state.step), event.atMs));
    case 'extraTurn':
      return extraTurn(state, event.playerId, event.atMs);
    case 'swapCards':
      return swapCards(state, event.cardA, event.cardB);
    case 'setInitiativeZero':
      return setInitiativeZero(state, event.playerId);
    case 'reverseVoting':
      return reverseVoting(state);
    case 'adjustBank':
      return adjustBank(state, event.playerId, event.deltaMs);
    case 'endGame':
      return ok({ ...state, step: { kind: 'finished', finishedAtMs: event.atMs, decided: false, winnerId: null, clock: { baseMs: 0, runningSince: null } } });
    case 'declareWinner':
      return wrongStep(event.type);
  }
}

const unknownPlayer = () => fail('UNKNOWN_PLAYER', 'Diesen Spieler gibt es nicht.');
const hasPlayer = (state: GameState, id: PlayerId) => state.players.some((p) => p.id === id);
/** Nach wem es weitergeht: bei einem Zusatzzug nach dem ursprünglichen Spieler (E4). */
const afterOf = (step: { readonly playerId?: PlayerId; readonly activeId?: PlayerId; readonly returnAfter?: PlayerId }) =>
  step.returnAfter ?? step.playerId ?? step.activeId!;

// --- Manuelle Eingriffe (M6) ---------------------------------------------------------------

/** Strategiekarte „Politik“ (Initiative 3). */
const POLITICS = 3;

/** Politik-Primär (LRR 81.6): der aktive Spieler wählt einen neuen Sprecher – nicht den amtierenden. */
function chooseSpeaker(state: GameState, playerId: PlayerId, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'secondary' || !step.speakerPending) return wrongStep('chooseSpeaker');
  if (!hasPlayer(state, playerId)) return unknownPlayer();
  if (playerId === state.speakerId) return fail('INVALID_INPUT', 'Der amtierende Sprecher kann nicht gewählt werden.');
  return ok({ ...state, speakerId: playerId, step: { ...step, speakerPending: false, askedAtMs: elapsedMs(step.clock, atMs) } });
}

/** E2: laufenden Zug abrechnen, dann ist der Gewählte (nicht gepasst) dran. */
function setActive(state: GameState, playerId: PlayerId, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn') return wrongStep('setActive');
  const target = state.players.find((p) => p.id === playerId);
  if (!target) return unknownPlayer();
  if (target.passed) return fail('INVALID_INPUT', 'Gepasste Spieler können nicht gewählt werden (dafür: Zusatzzug).');
  const settled = settleActive(state, step.playerId, step.clock, atMs, false);
  return ok({ ...settled, step: turnOf(state, playerId, atMs) });
}

/** E4: laufenden Zug abrechnen, Zusatzzug für den Gewählten; danach weiter nach dem ursprünglichen Spieler. */
function extraTurn(state: GameState, playerId: PlayerId, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn') return wrongStep('extraTurn');
  if (!hasPlayer(state, playerId)) return unknownPlayer();
  const settled = settleActive(state, step.playerId, step.clock, atMs, false);
  return ok({ ...settled, step: { ...turnOf(state, playerId, atMs), returnAfter: afterOf(step) } as Step });
}

/** E5: Besitzer zweier vergebener Karten tauschen; Initiative neu, der Aktive bleibt. */
function swapCards(state: GameState, a: number, b: number): Result<GameState> {
  if (state.phase !== 'action') return wrongStep('swapCards');
  const ca = state.cards.find((c) => c.number === a);
  const cb = state.cards.find((c) => c.number === b);
  if (!ca?.ownerId || !cb?.ownerId || ca.ownerId === cb.ownerId) {
    return fail('CARD_NOT_OWNED', 'Getauscht werden können nur vergebene Karten zweier verschiedener Spieler.');
  }
  const cards = state.cards.map((c) => (c.number === a ? { ...c, ownerId: cb.ownerId } : c.number === b ? { ...c, ownerId: ca.ownerId } : c));
  return ok(withActionOrder({ ...state, cards }));
}

/** E6: Initiative-0-Token für diese Runde vergeben (oder entfernen). */
function setInitiativeZero(state: GameState, playerId: PlayerId | null): Result<GameState> {
  if (state.phase !== 'strategy' && state.phase !== 'action') return wrongStep('setInitiativeZero');
  if (playerId !== null && !hasPlayer(state, playerId)) return unknownPlayer();
  const next = { ...state, initiativeZeroHolder: playerId };
  return ok(state.phase === 'action' ? withActionOrder(next) : next);
}

function withActionOrder(state: GameState): GameState {
  const holdings = state.players.map((p) => ({ playerId: p.id, cards: state.cards.filter((c) => c.ownerId === p.id).map((c) => c.number) }));
  return { ...state, actionOrder: actionOrder(holdings, state.initiativeZeroHolder) };
}

/** E7: Abstimmung dieser Agenda gegen den Uhrzeigersinn – im Fenster oder vor der ersten Stimme. */
function reverseVoting(state: GameState): Result<GameState> {
  const step = state.step;
  if (step.kind === 'agendaWindow' || step.kind === 'agendaDiscussion') return ok({ ...state, step: { ...step, reversedVoting: true } });
  if (step.kind === 'vote' && step.index === 0) return ok({ ...state, step: { ...step, queue: reversedVoteOrder(seatIds(state), state.speakerId) } });
  return wrongStep('reverseVoting');
}

/** E8: Bank ±1 Minute (Fehlbedienung korrigieren). */
function adjustBank(state: GameState, playerId: PlayerId, deltaMs: number): Result<GameState> {
  if (deltaMs !== 60_000 && deltaMs !== -60_000) return fail('INVALID_INPUT', 'Die Bank lässt sich nur um ±1 Minute ändern.');
  if (!hasPlayer(state, playerId)) return unknownPlayer();
  return ok({ ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, bankMs: p.bankMs + deltaMs } : p)) });
}

/** E9: Sieger festlegen (auch „ohne Sieger“). */
function declareWinner(state: GameState, winnerId: PlayerId | null): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'finished') return wrongStep('declareWinner');
  if (winnerId !== null && !hasPlayer(state, winnerId)) return unknownPlayer();
  return ok({ ...state, step: { ...step, decided: true, winnerId } });
}

const wrongStep = (type: GameEvent['type']) => fail('INVALID_STEP', `„${type}“ ist im aktuellen Schritt nicht möglich.`);
const seatIds = (state: GameState) => state.players.map((p) => p.id);

// --- Pause ---------------------------------------------------------------------------------

function pause(state: GameState, atMs: number): Result<GameState> {
  return ok({ ...withStepClock(state, (c) => stopClock(c, atMs)), pause: { since: atMs } });
}

function resume(state: GameState, atMs: number): Result<GameState> {
  if (!state.pause) return fail('NOT_PAUSED', 'Das Spiel ist nicht pausiert.');
  return ok({
    ...withStepClock(state, (c) => resumeClock(c, atMs)),
    pause: null,
    pausedTotalMs: state.pausedTotalMs + Math.max(0, atMs - state.pause.since),
  });
}

/** Wendet `fn` auf die Uhr des aktuellen Schritts an (jeder Schritt hat eine Uhr, auch ohne Anzeige). */
export function withStepClock(state: GameState, fn: (clock: Clock) => Clock): GameState {
  return { ...state, step: { ...state.step, clock: fn(state.step.clock) } as Step };
}

// --- Strategiephase ------------------------------------------------------------------------

function pickCard(state: GameState, cardNumber: number, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'pick') return wrongStep('pickCard');
  const card = state.cards.find((c) => c.number === cardNumber);
  if (!card) return fail('UNKNOWN_CARD', `Strategiekarte ${cardNumber} gibt es nicht.`);
  if (card.ownerId !== null) return fail('CARD_TAKEN', `Strategiekarte ${cardNumber} ist bereits vergeben.`);
  const pickerId = step.queue[step.index]!;
  const cards = state.cards.map((c) => (c.number === cardNumber ? { ...c, ownerId: pickerId, tradeGoods: 0 } : c));
  if (step.index + 1 < step.queue.length) {
    return ok({ ...state, cards, step: { ...step, index: step.index + 1, clock: announce(state, atMs) } });
  }
  return ok(startActionPhase({ ...state, cards }, atMs));
}

function startActionPhase(state: GameState, atMs: number): GameState {
  const cards: CardState[] = state.cards.map((c) =>
    c.ownerId === null && state.variants.tradeGoods ? { ...c, tradeGoods: c.tradeGoods + 1 } : c,
  );
  const holdings = state.players.map((p) => ({ playerId: p.id, cards: cards.filter((c) => c.ownerId === p.id).map((c) => c.number) }));
  const order = actionOrder(holdings, state.initiativeZeroHolder);
  return { ...state, cards, phase: 'action', actionOrder: order, step: turnOf(state, order[0]!, atMs) };
}

/** Uhr für Wahl/Zug mit Ankündigung des Nächsten (M7-T). */
const announce = (state: GameState, atMs: number) => announcedClock(atMs, state.config.announceSec * 1000);
const turnOf = (state: GameState, playerId: PlayerId, atMs: number): Step => ({ kind: 'turn', playerId, strategyCard: null, clock: announce(state, atMs) });

/** M7-T: Ankündigung überspringen – die Uhr beginnt jetzt bei 0. */
function startNow(state: GameState, atMs: number): Result<GameState> {
  const step = state.step;
  if ((step.kind !== 'pick' && step.kind !== 'turn') || elapsedMs(step.clock, atMs) >= 0) return wrongStep('startNow');
  return ok({ ...state, step: { ...step, clock: startClock(atMs) } });
}

// --- Aktionsphase --------------------------------------------------------------------------

function useCard(state: GameState, cardNumber: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn') return wrongStep('useCard');
  if (step.strategyCard !== null) return fail('PRIMARY_PENDING', 'Erst „Primär erledigt“ für die gewählte Karte.');
  const card = state.cards.find((c) => c.number === cardNumber);
  if (!card || card.ownerId !== step.playerId) return fail('CARD_NOT_OWNED', `Strategiekarte ${cardNumber} gehört nicht dem aktiven Spieler.`);
  if (card.used) return fail('CARD_ALREADY_USED', `Strategiekarte ${cardNumber} wurde in dieser Runde bereits benutzt.`);
  return ok({
    ...state,
    cards: state.cards.map((c) => (c.number === cardNumber ? { ...c, used: true } : c)),
    step: { ...step, strategyCard: cardNumber },
  });
}

/** Rechnet den laufenden Zug mit Zeitstempel `atMs` ab. */
function settleActive(state: GameState, playerId: PlayerId, clock: Clock, atMs: number, pass: boolean): GameState {
  const used = countedMs(clock, atMs);
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, bankMs: settleTurn(p.bankMs, used, state.config, { pass }), passed: p.passed || pass } : p,
    ),
  };
}

function primaryDone(state: GameState, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn' || step.strategyCard === null) return wrongStep('primaryDone');
  const settled = settleActive(state, step.playerId, step.clock, atMs, false);
  return ok({
    ...settled,
    step: {
      kind: 'secondary',
      activeId: step.playerId,
      card: step.strategyCard,
      clock: startClock(atMs),
      queue: secondaryOrder(seatIds(state), step.playerId),
      index: 0,
      answers: [],
      ...(step.returnAfter ? { returnAfter: step.returnAfter } : {}),
      ...(step.strategyCard === POLITICS ? { speakerPending: true } : {}),
    },
  });
}

function endTurn(state: GameState, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn') return wrongStep('endTurn');
  if (step.strategyCard !== null) return fail('PRIMARY_PENDING', 'Strategiekarte benutzt: erst „Primär erledigt“.');
  return ok(advance(settleActive(state, step.playerId, step.clock, atMs, false), afterOf(step), atMs));
}

function passTurn(state: GameState, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'turn') return wrongStep('pass');
  if (step.strategyCard !== null) return fail('PRIMARY_PENDING', 'Strategiekarte benutzt: erst „Primär erledigt“.');
  if (state.cards.some((c) => c.ownerId === step.playerId && !c.used)) {
    return fail('PASS_BLOCKED', 'Passen geht erst, wenn alle eigenen Strategiekarten benutzt sind.');
  }
  return ok(advance(settleActive(state, step.playerId, step.clock, atMs, true), afterOf(step), atMs));
}

/** Antwort des Gefragten; nach dem Letzten folgt der nächste Zug. Der Tisch-Timer läuft weiter (D-S3). */
function secondaryAnswer(state: GameState, use: boolean, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'secondary' || step.speakerPending) return wrongStep('secondaryAnswer');
  if (step.index + 1 >= step.queue.length) return ok(advance(state, afterOf(step), atMs));
  return ok({ ...state, step: { ...step, index: step.index + 1, answers: [...step.answers, use], askedAtMs: elapsedMs(step.clock, atMs) } });
}

function secondaryDone(state: GameState, atMs: number): Result<GameState> {
  if (state.step.kind !== 'secondary' || state.step.speakerPending) return wrongStep('secondaryDone');
  return ok(advance(state, afterOf(state.step), atMs));
}

/** Nächster Zug nach Initiative; haben alle gepasst, endet die Aktionsphase (Frage nach der Agendaphase, solange nicht aktiv). */
function advance(state: GameState, afterId: PlayerId, atMs: number): GameState {
  const passed = new Set(state.players.filter((p) => p.passed).map((p) => p.id));
  const next = nextActor(state.actionOrder, passed, afterId);
  if (next !== null) return { ...state, step: turnOf(state, next, atMs) };
  const clock = startClock(atMs);
  return state.agendaActive ? { ...state, phase: 'status', step: { kind: 'status', clock } } : { ...state, step: { kind: 'agendaQuestion', clock } };
}

// --- Agenda und neue Runde -----------------------------------------------------------------

/** Stimme abgegeben; mit Option und Stimmenzahl für den Zähler (M7-A), sonst Enthaltung. */
function endVote(state: GameState, event: Extract<GameEvent, { type: 'endVote' }>, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'vote') return wrongStep('endVote');
  const votes = event.votes ?? 0;
  if (!Number.isInteger(votes) || votes < 0 || votes > 999) return fail('INVALID_INPUT', 'Ungültige Stimmenzahl (0–999).');
  const before = step.tally ?? { a: 0, b: 0 };
  const tally = event.option ? { ...before, [event.option]: before[event.option] + votes } : before;
  if (step.index + 1 < step.queue.length) return ok({ ...state, step: { ...step, index: step.index + 1, clock: startClock(atMs), tally } });
  return ok({ ...state, step: { kind: 'agendaResolve', agenda: step.agenda, clock: startClock(atMs), tally } });
}

function openWindow(state: GameState, agenda: 1 | 2, window: 'when' | 'after', atMs: number): GameState {
  return {
    ...state,
    step: { kind: 'agendaWindow', agenda, window, queue: speakerFirst(seatIds(state), state.speakerId), index: 0, answers: [], noInRow: 0, clock: startClock(atMs) },
  };
}

type WindowStep = Extract<Step, { kind: 'agendaWindow' }>;

/** „Sobald“ → Diskussion (M7-A) → „Nachdem“ → Abstimmung (links vom Sprecher, Sprecher zuletzt). */
function closeWindow(state: GameState, step: WindowStep, atMs: number): GameState {
  if (step.window === 'when') {
    return {
      ...state,
      step: { kind: 'agendaDiscussion', agenda: step.agenda, clock: startClock(atMs), ...(step.reversedVoting ? { reversedVoting: true } : {}) },
    };
  }
  const order = step.reversedVoting ? reversedVoteOrder : voteOrder;
  return {
    ...state,
    step: { kind: 'vote', agenda: step.agenda, queue: order(seatIds(state), state.speakerId), index: 0, clock: startClock(atMs), tally: { a: 0, b: 0 } },
  };
}

/** Antwort im Zeitfenster; nach einem „Ja“ beginnt die Zählung der „Nein“ neu, die Runde läuft weiter (LRR 31.20). */
function windowAnswer(state: GameState, played: boolean, atMs: number): Result<GameState> {
  const step = state.step;
  if (step.kind !== 'agendaWindow') return wrongStep('windowAnswer');
  const noInRow = played ? 0 : step.noInRow + 1;
  if (noInRow >= step.queue.length) return ok(closeWindow(state, step, atMs));
  const wraps = step.index + 1 >= step.queue.length;
  return ok({
    ...state,
    step: { ...step, noInRow, index: wraps ? 0 : step.index + 1, answers: wraps ? [] : [...step.answers, played], askedAtMs: elapsedMs(step.clock, atMs) },
  });
}

function nextRound(state: GameState, atMs: number): GameState {
  return {
    ...state,
    round: state.round + 1,
    phase: 'strategy',
    initiativeZeroHolder: state.initiativeZeroDefault,
    players: state.players.map((p) => ({ ...p, passed: false })),
    cards: state.cards.map((c) => ({ ...c, ownerId: null, used: false })),
    actionOrder: [],
    step: { kind: 'pick', queue: pickOrder(seatIds(state), state.speakerId), index: 0, clock: announce(state, atMs) },
  };
}

// --- Anzeige -------------------------------------------------------------------------------

/** Live-Werte für die Anzeige zum Zeitpunkt `nowMs` (rein aus Zeitstempeln). */
export function clockView(state: GameState, nowMs: number): ClockView {
  const step = state.step;
  switch (step.kind) {
    case 'turn': {
      const raw = elapsedMs(step.clock, nowMs);
      const elapsed = Math.max(0, raw);
      const bank = state.players.find((p) => p.id === step.playerId)!.bankMs;
      return {
        kind: 'turn',
        playerId: step.playerId,
        announceMs: Math.max(0, -raw),
        elapsedMs: elapsed,
        remainingMs: state.config.turnSec * 1000 - elapsed,
        bankMs: liveBank(bank, elapsed, state.config),
        running: step.clock.runningSince !== null,
      };
    }
    case 'pick':
    case 'vote': {
      const raw = elapsedMs(step.clock, nowMs);
      const elapsed = Math.max(0, raw);
      const limitSec = step.kind === 'pick' ? state.config.strategyPickSec : state.config.agendaVoteSec;
      return {
        kind: step.kind,
        playerId: step.queue[step.index]!,
        announceMs: Math.max(0, -raw),
        elapsedMs: elapsed,
        remainingMs: limitSec * 1000 - elapsed,
        running: step.clock.runningSince !== null,
      };
    }
    case 'secondary':
      return { kind: 'secondary', activeId: step.activeId, elapsedMs: elapsedMs(step.clock, nowMs), running: step.clock.runningSince !== null };
    case 'agendaWindow':
    case 'agendaResolve':
      return { kind: 'table', elapsedMs: elapsedMs(step.clock, nowMs), running: step.clock.runningSince !== null };
    case 'agendaDiscussion': {
      const elapsed = elapsedMs(step.clock, nowMs);
      return { kind: 'discussion', elapsedMs: elapsed, remainingMs: state.config.discussionSec * 1000 - elapsed, running: step.clock.runningSince !== null };
    }
    default:
      return { kind: 'none' };
  }
}
