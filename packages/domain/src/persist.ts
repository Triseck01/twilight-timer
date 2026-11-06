import { PLAYER_COLORS } from './colors';
import { parseConfig } from './config';
import { FACTIONS } from './factions';
import type { DomainError, GameState, History, Result } from './types';

/**
 * Speicher- und Austauschformat eines Spiels (M7, P1/P6/P8).
 * Gespeicherte und importierte Daten sind nicht vertrauenswürdig: `parseSavedGame` prüft jedes Feld und jeden Verweis
 * (z. B. ob genannte Spieler existieren), damit fehlerhafte Daten abgelehnt statt angezeigt werden. Wirft nie.
 */
export const SAVE_FORMAT = 'twilight-timer-game';
export const SAVE_VERSION = 1;

export interface SavedGame {
  readonly format: typeof SAVE_FORMAT;
  readonly version: typeof SAVE_VERSION;
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly history: History;
}

const ID = /^[a-z0-9-]{1,40}$/;
const EVENT_TYPES = new Set([
  'pickCard', 'useCard', 'primaryDone', 'endTurn', 'pass', 'secondaryAnswer', 'secondaryDone', 'answerAgenda', 'statusDone',
  'agendaRead', 'windowAnswer', 'windowClose', 'agendaReplaced', 'resolved', 'endVote', 'pause', 'resume', 'setSpeaker',
  'chooseSpeaker', 'setActive', 'skipTurn', 'extraTurn', 'swapCards', 'setInitiativeZero', 'reverseVoting', 'adjustBank', 'endGame', 'declareWinner',
]);
const COLOR_IDS = new Set(PLAYER_COLORS.map((c) => c.id));
const FACTION_IDS = new Set(FACTIONS.map((f) => f.id));
const MAX_HISTORY = 31;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const int = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => num(v) && Number.isInteger(v) && v >= min && v <= max;
const bool = (v: unknown): v is boolean => typeof v === 'boolean';
/** Datensätze: genau die erwarteten Schlüssel (keine fremden wie „__proto__“). */
const exactKeys = (o: Obj, keys: readonly string[]) => {
  const own = Object.keys(o);
  return own.length === keys.length && keys.every((k) => Object.prototype.hasOwnProperty.call(o, k));
};

class Invalid extends Error {}
function check(condition: boolean, what: string): asserts condition {
  if (!condition) throw new Invalid(what);
}

export function parseSavedGame(value: unknown): Result<SavedGame> {
  try {
    check(isObj(value) && value['format'] === SAVE_FORMAT, 'kein Twilight-Timer-Spielstand');
    if (value['version'] !== SAVE_VERSION) {
      return fail('UNSUPPORTED_VERSION', 'Dieser Spielstand stammt aus einer anderen Version der App und kann nicht geladen werden.');
    }
    check(typeof value['id'] === 'string' && ID.test(value['id']), 'id');
    check(num(value['createdAt']) && num(value['updatedAt']), 'Zeitstempel');
    checkHistory(value['history']);
    return { ok: true, value: withThinkTime(value as unknown as SavedGame) };
  } catch (e) {
    const detail = e instanceof Invalid ? e.message : 'unbekannt';
    return fail('INVALID_INPUT', `Ungültiger Spielstand (${detail}).`);
  }
}

const fail = (code: DomainError['code'], message: string): Result<never> => ({ ok: false, error: { code, message } });

function checkHistory(h: unknown): asserts h is History {
  check(isObj(h) && Array.isArray(h['entries']), 'Verlauf');
  const entries = h['entries'] as unknown[];
  check(entries.length >= 1 && entries.length <= MAX_HISTORY, 'Verlauf: Länge');
  check(int(h['cursor'], 0, entries.length - 1), 'Verlauf: Cursor');
  entries.forEach((entry, i) => {
    check(isObj(entry), 'Verlaufseintrag');
    const ev = entry['event'];
    if (i > 0 || ev !== null) check(isObj(ev) && typeof ev['type'] === 'string' && EVENT_TYPES.has(ev['type']) && num(ev['atMs']), 'Ereignis');
    checkState(entry['state']);
  });
}

function checkState(s: unknown): asserts s is GameState {
  check(isObj(s) && s['schemaVersion'] === 1, 'Zustand: Version');
  check(parseConfig(s['config']) !== null, 'Konfiguration');
  const v = s['variants'];
  check(isObj(v) && exactKeys(v, ['pok', 'thundersEdge', 'discordantStars', 'tradeGoods']) && Object.values(v).every(bool), 'Varianten');

  const players = s['players'];
  check(Array.isArray(players) && players.length >= 3 && players.length <= 8, 'Spieler');
  const ids = new Set<string>();
  for (const p of players as unknown[]) {
    check(isObj(p) && typeof p['id'] === 'string' && ID.test(p['id']) && !ids.has(p['id']), 'Spieler-ID');
    ids.add(p['id']);
    check(typeof p['name'] === 'string' && p['name'].length <= 60, 'Spielername');
    check(typeof p['color'] === 'string' && COLOR_IDS.has(p['color']), 'Spielerfarbe');
    check(typeof p['factionId'] === 'string' && FACTION_IDS.has(p['factionId']), 'Volk');
    check(num(p['bankMs']) && bool(p['passed']), 'Bank/Passen');
  }
  const isId = (x: unknown): x is string => typeof x === 'string' && ids.has(x);
  const idOrNull = (x: unknown) => x === null || isId(x);
  const idList = (x: unknown) => Array.isArray(x) && x.every(isId) && new Set(x).size === x.length;

  check(isId(s['speakerId']), 'Sprecher');
  check(idOrNull(s['initiativeZeroHolder']) && idOrNull(s['initiativeZeroDefault']), 'Initiative-0-Token');
  check(int(s['round'], 1, 999), 'Runde');
  check(['strategy', 'action', 'status', 'agenda'].includes(s['phase'] as string), 'Phase');
  check(bool(s['agendaActive']), 'Agenda aktiv');
  const cards = s['cards'];
  check(Array.isArray(cards) && cards.length === 8, 'Karten');
  (cards as unknown[]).forEach((c, i) => {
    check(isObj(c) && c['number'] === i + 1 && idOrNull(c['ownerId']) && int(c['tradeGoods'], 0, 999) && bool(c['used']), 'Karte');
  });
  check(idList(s['actionOrder']), 'Aktionsreihenfolge');
  checkStep(s['step'], isId);
  const pause = s['pause'];
  check(pause === null || (isObj(pause) && num(pause['since'])), 'Pause');
  check(num(s['pausedTotalMs']) && (s['pausedTotalMs'] as number) >= 0, 'Pausendauer');
  checkStats(s['stats'], [...ids], s['round'] as number, isId);
}

function checkClock(c: unknown) {
  check(isObj(c) && num(c['baseMs']) && (c['baseMs'] as number) >= 0 && (c['runningSince'] === null || num(c['runningSince'])), 'Uhr');
}

function checkStep(step: unknown, isId: (x: unknown) => x is string) {
  check(isObj(step), 'Schritt');
  checkClock(step['clock']);
  const queue = (min: number) => {
    const q = step['queue'];
    check(Array.isArray(q) && q.length >= min && q.every(isId), 'Reihenfolge');
    check(int(step['index'], 0, (q as unknown[]).length - 1), 'Position');
  };
  const answers = () => {
    const a = step['answers'];
    check(Array.isArray(a) && a.every(bool) && a.length <= (step['queue'] as unknown[]).length, 'Antworten');
  };
  const returnAfter = () => check(step['returnAfter'] === undefined || isId(step['returnAfter']), 'Rückkehr');
  const askedAt = () => check(step['askedAtMs'] === undefined || (num(step['askedAtMs']) && step['askedAtMs'] >= 0), 'Fragezeitpunkt');
  const agenda = () => check(step['agenda'] === 1 || step['agenda'] === 2, 'Agenda');
  switch (step['kind']) {
    case 'pick':
      return queue(1);
    case 'turn':
      check(isId(step['playerId']) && (step['strategyCard'] === null || int(step['strategyCard'], 1, 8)), 'Zug');
      return returnAfter();
    case 'secondary':
      check(isId(step['activeId']) && int(step['card'], 1, 8), 'Sekundär');
      check(step['speakerPending'] === undefined || bool(step['speakerPending']), 'Sprecherwahl');
      askedAt();
      queue(1);
      answers();
      return returnAfter();
    case 'agendaQuestion':
    case 'status':
      return;
    case 'agendaIntro':
    case 'agendaResolve':
      return agenda();
    case 'agendaWindow':
      agenda();
      check(step['window'] === 'when' || step['window'] === 'after', 'Fenster');
      queue(1);
      answers();
      check(int(step['noInRow'], 0, 99), 'Nein in Folge');
      askedAt();
      return check(step['reversedVoting'] === undefined || bool(step['reversedVoting']), 'Abstimmung umgekehrt');
    case 'vote':
      agenda();
      return queue(1);
    case 'finished':
      return check(num(step['finishedAtMs']) && bool(step['decided']) && (step['winnerId'] === null || isId(step['winnerId'])), 'Spielende');
    default:
      check(false, 'unbekannter Schritt');
  }
}

const PLAYER_ROUND_NUMBERS = [
  'strategyMs', 'actionMs', 'agendaMs', 'turns', 'longestTurnMs', 'overtimeTurns', 'overtimeMs', 'creditedMs',
  'picksOverLimit', 'votes', 'votesOverLimit', 'whenPlays', 'afterPlays',
] as const;
const PHASES = ['strategy', 'action', 'secondary', 'status', 'agenda'] as const;
const CARD_KEYS = new Set(['1', '2', '3', '4', '5', '6', '7', '8']);

function checkCardRecord(r: unknown) {
  check(isObj(r) && Object.keys(r).every((k) => CARD_KEYS.has(k)) && Object.values(r).every((x) => num(x) && x >= 0), 'Kartenwerte');
}

function checkStats(st: unknown, ids: readonly string[], round: number, isId: (x: unknown) => x is string) {
  check(isObj(st) && num(st['startedAtMs']) && int(st['pauseCount']), 'Statistik');
  check(st['agendaUnlockedRound'] === null || int(st['agendaUnlockedRound'], 1, 999), 'Agenda freigeschaltet');
  const minBank = st['minBankMs'];
  check(isObj(minBank) && exactKeys(minBank, ids) && Object.values(minBank).every(num), 'Bank-Tiefststand');
  const rounds = st['rounds'];
  check(Array.isArray(rounds) && rounds.length >= 1 && rounds.length <= round, 'Statistik-Runden');
  for (const r of rounds as unknown[]) {
    check(isObj(r) && int(r['round'], 1, 999), 'Statistik-Runde');
    const players = r['players'];
    check(isObj(players) && exactKeys(players, ids), 'Statistik-Spieler');
    for (const id of ids) {
      const p = players[id];
      check(isObj(p) && PLAYER_ROUND_NUMBERS.every((k) => num(p[k]) && (p[k] as number) >= 0), 'Statistik-Werte');
      check(p['thinkMs'] === undefined || (num(p['thinkMs']) && p['thinkMs'] >= 0), 'Bedenkzeit');
      check(Array.isArray(p['cards']) && p['cards'].every((c) => int(c, 1, 8)), 'Statistik-Karten');
      checkCardRecord(p['secondaryUses']);
    }
    const phase = r['phaseMs'];
    check(isObj(phase) && exactKeys(phase, PHASES) && Object.values(phase).every((x) => num(x) && x >= 0), 'Phasendauern');
    checkCardRecord(r['secondaryByCardMs']);
    check(Array.isArray(r['passOrder']) && r['passOrder'].every(isId), 'Pass-Reihenfolge');
  }
}

/** Spielstände vor M7-W kennen keine Bedenkzeit: fehlende Werte als 0 ergänzen (Eingabe bleibt unverändert). */
function withThinkTime(game: SavedGame): SavedGame {
  const entries = game.history.entries.map((e) => {
    const rounds = e.state.stats.rounds.map((r) => ({
      ...r,
      players: Object.fromEntries(Object.entries(r.players).map(([id, p]) => [id, { ...p, thinkMs: p.thinkMs ?? 0 }])),
    }));
    return { event: e.event, state: { ...e.state, stats: { ...e.state.stats, rounds } } };
  });
  return { ...game, history: { ...game.history, entries } };
}
