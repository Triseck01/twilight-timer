/**
 * Datenmodell der Spiellogik (Konzept §7.3, angepasst an ADR 0003/0005).
 * Alle Zeiten im Zustand in Millisekunden, Konfiguration in Sekunden (wie in der Oberfläche).
 * Der Zustand ist reines JSON: keine Klassen, keine Maps, keine Funktionen.
 */

export type PlayerId = string;

export type PresetId = 'credit' | 'hybrid' | 'timesOnly' | 'custom';

/** Zeitkonfiguration, für alle Spieler gleich (Konzept §4). */
export interface TimeConfig {
  readonly preset: PresetId;
  /** Zugzeit Aktionsphase. */
  readonly turnSec: number;
  /** Persönliche Reserve pro Spieler. */
  readonly startBankSec: number;
  /** Ungenutzte Zugzeit wird gutgeschrieben. */
  readonly credit: boolean;
  /** Auch beim Passen gutschreiben (nur mit `credit`). */
  readonly creditPass: boolean;
  /** Obergrenze der Bank (nur mit `credit`). */
  readonly bankCapSec: number;
  /** Zeit pro Strategiewahl. */
  readonly strategyPickSec: number;
  /** Zeit pro Spieler und Agenda. */
  readonly agendaVoteSec: number;
  /** Warnschwellen der Restzeit (Anzeige, M8). */
  readonly warnAtSec: readonly number[];
}

export interface Variants {
  /** Prophecy of Kings: 3–8 statt 3–6 Spieler. */
  readonly pok: boolean;
  readonly thundersEdge: boolean;
  /** Initiative-0-Token im Spiel. */
  readonly naalu: boolean;
  /** Handelswaren auf nicht gewählten Karten zählen. */
  readonly tradeGoods: boolean;
}

export interface PlayerSetup {
  readonly id: PlayerId;
  readonly name: string;
  readonly color: string;
}

export interface GameSetup {
  /** Sitzreihenfolge im Uhrzeigersinn (aus dem Draft). */
  readonly players: readonly PlayerSetup[];
  readonly speakerId: PlayerId;
  readonly variants: Variants;
  /** Startinhaber des Initiative-0-Tokens, nur mit `variants.naalu`. */
  readonly naaluPlayerId?: PlayerId;
}

export interface Player extends PlayerSetup {
  readonly bankMs: number;
  readonly passed: boolean;
}

export interface CardState {
  /** Kartennummer = Initiative (1–8). */
  readonly number: number;
  readonly ownerId: PlayerId | null;
  readonly tradeGoods: number;
  readonly used: boolean;
}

/** Uhr eines Abschnitts: `elapsed = baseMs + (now − runningSince)`; `runningSince = null` heißt angehalten. */
export interface Clock {
  readonly baseMs: number;
  readonly runningSince: number | null;
}

export type Step =
  | { readonly kind: 'pick'; readonly queue: readonly PlayerId[]; readonly index: number; readonly clock: Clock }
  | { readonly kind: 'turn'; readonly playerId: PlayerId; readonly strategyCard: number | null; readonly clock: Clock }
  | { readonly kind: 'secondary'; readonly activeId: PlayerId; readonly card: number; readonly clock: Clock }
  | { readonly kind: 'agendaQuestion' }
  | { readonly kind: 'status' }
  | { readonly kind: 'agendaIntro'; readonly agenda: 1 | 2 }
  | {
      readonly kind: 'vote';
      readonly agenda: 1 | 2;
      readonly queue: readonly PlayerId[];
      readonly index: number;
      readonly clock: Clock;
    };

export type Phase = 'strategy' | 'action' | 'status' | 'agenda';

export interface GameState {
  readonly schemaVersion: 1;
  readonly config: TimeConfig;
  readonly variants: Variants;
  /** Sitzreihenfolge im Uhrzeigersinn. */
  readonly players: readonly Player[];
  readonly speakerId: PlayerId;
  readonly initiativeZeroHolder: PlayerId | null;
  readonly round: number;
  readonly phase: Phase;
  readonly agendaActive: boolean;
  readonly cards: readonly CardState[];
  /** Aktionsreihenfolge nach Initiative (leer in der Strategiephase). */
  readonly actionOrder: readonly PlayerId[];
  readonly step: Step;
  readonly pause: { readonly since: number } | null;
  readonly pausedTotalMs: number;
}

/** Ereignisse; `atMs` ist der Zeitstempel der Eingabe (von der Oberfläche übergeben). */
export type GameEvent =
  | { readonly type: 'pickCard'; readonly card: number; readonly atMs: number }
  | { readonly type: 'useCard'; readonly card: number; readonly atMs: number }
  | { readonly type: 'primaryDone'; readonly atMs: number }
  | { readonly type: 'endTurn'; readonly atMs: number }
  | { readonly type: 'pass'; readonly atMs: number }
  | { readonly type: 'secondaryDone'; readonly atMs: number }
  | { readonly type: 'answerAgenda'; readonly active: boolean; readonly atMs: number }
  | { readonly type: 'statusDone'; readonly atMs: number }
  | { readonly type: 'startVoting'; readonly atMs: number }
  | { readonly type: 'endVote'; readonly atMs: number }
  | { readonly type: 'pause'; readonly atMs: number }
  | { readonly type: 'resume'; readonly atMs: number };

export type ErrorCode =
  | 'INVALID_SETUP'
  | 'INVALID_STEP'
  | 'PAUSED'
  | 'NOT_PAUSED'
  | 'UNKNOWN_CARD'
  | 'CARD_TAKEN'
  | 'CARD_NOT_OWNED'
  | 'CARD_ALREADY_USED'
  | 'PRIMARY_PENDING'
  | 'PASS_BLOCKED'
  | 'NOTHING_TO_UNDO'
  | 'NOTHING_TO_REDO';

export interface DomainError {
  readonly code: ErrorCode;
  readonly message: string;
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: DomainError };

/** Verlauf für Undo/Redo (ADR 0005): Eintrag = Ereignis + Zustand danach; `entries[cursor].state` ist der aktuelle Zustand. */
export interface History {
  readonly entries: readonly { readonly event: GameEvent | null; readonly state: GameState }[];
  readonly cursor: number;
}

/** Live-Anzeige zum Zeitpunkt `nowMs`. */
export type ClockView =
  | {
      readonly kind: 'turn';
      readonly playerId: PlayerId;
      readonly elapsedMs: number;
      /** Restliche Zugzeit; negativ = Überzug. */
      readonly remainingMs: number;
      /** Bank inklusive laufendem Überzug. */
      readonly bankMs: number;
      readonly running: boolean;
    }
  | {
      readonly kind: 'pick' | 'vote';
      readonly playerId: PlayerId;
      readonly elapsedMs: number;
      readonly remainingMs: number;
      readonly running: boolean;
    }
  | { readonly kind: 'secondary'; readonly activeId: PlayerId; readonly elapsedMs: number; readonly running: boolean }
  | { readonly kind: 'none' };
