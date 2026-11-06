import { inject, InjectionToken, Service, signal } from '@angular/core';
import { SAVE_FORMAT, SAVE_VERSION, current, parseSavedGame, type History, type Phase, type Result, type SavedGame } from '@twilight-timer/domain';
import { STORAGE, type KeyValueStorage } from './storage';

/** Speicher für Spielstände (Standard: `localStorage`); in Tests je Test frisch. */
export const GAME_STORAGE = new InjectionToken<KeyValueStorage | null>('GAME_STORAGE', { factory: () => inject(STORAGE) });

const INDEX_KEY = 'twilight-timer.games.v1';
const GAME_KEY = (id: string) => `twilight-timer.game.v1.${id}`;
const SEEN_KEY = (id: string) => `twilight-timer.seen.v1.${id}`;
/** Größte importierte Datei (Schutz vor Speicher- und Rechenlast). */
const MAX_IMPORT = 5 * 1024 * 1024;

export interface SavedGameEntry {
  readonly id: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly players: readonly { readonly name: string; readonly color: string }[];
  readonly round: number;
  readonly phase: Phase;
  readonly finished: boolean;
  readonly winnerName: string | null;
}

/** Gespeicherte Spiele (M7): ein Eintrag je Spiel plus Index für die Liste. Daten werden beim Lesen streng geprüft. */
@Service()
export class GameRepository {
  private readonly storage = inject(GAME_STORAGE);
  private readonly index = signal<SavedGameEntry[]>(this.readIndex());
  readonly entries = this.index.asReadonly();

  list(): SavedGameEntry[] {
    return this.index();
  }

  /** Zuletzt gespieltes, nicht beendetes Spiel. */
  latestRunning(): SavedGameEntry | null {
    return this.index().find((e) => !e.finished) ?? null;
  }

  /** Speichert den Verlauf; beendete Spiele kompakt (nur Endstand). `false`, wenn der Speicher voll oder blockiert ist. */
  save(id: string, createdAt: number, history: History, updatedAt: number): boolean {
    const state = current(history);
    const finished = state.step.kind === 'finished';
    const compact: History = finished ? { entries: [{ event: null, state }], cursor: 0 } : history;
    const game: SavedGame = { format: SAVE_FORMAT, version: SAVE_VERSION, id, createdAt, updatedAt, history: compact };
    const winnerId = state.step.kind === 'finished' ? state.step.winnerId : null;
    const entry: SavedGameEntry = {
      id,
      createdAt,
      updatedAt,
      players: state.players.map((p) => ({ name: p.name, color: p.color })),
      round: state.round,
      phase: state.phase,
      finished,
      winnerName: state.players.find((p) => p.id === winnerId)?.name ?? null,
    };
    const index = [entry, ...this.index().filter((e) => e.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt);
    try {
      this.storage?.setItem(GAME_KEY(id), JSON.stringify(game));
      this.storage?.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      return false;
    }
    this.index.set(index);
    return this.storage !== null;
  }

  load(id: string): Result<SavedGame> {
    try {
      const raw = this.storage?.getItem(GAME_KEY(id));
      if (!raw) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Spiel nicht gefunden.' } };
      return parseSavedGame(JSON.parse(raw));
    } catch {
      return { ok: false, error: { code: 'INVALID_INPUT', message: 'Spielstand beschädigt.' } };
    }
  }

  remove(id: string): void {
    const index = this.index().filter((e) => e.id !== id);
    try {
      this.storage?.removeItem(GAME_KEY(id));
      this.storage?.removeItem(SEEN_KEY(id));
      this.storage?.setItem(INDEX_KEY, JSON.stringify(index));
    } catch {
      // Speicher blockiert: Liste trotzdem aktualisieren.
    }
    this.index.set(index);
  }

  exportJson(id: string): string | null {
    const r = this.load(id);
    return r.ok ? JSON.stringify(r.value, null, 2) : null;
  }

  /** Importiert eine Datei (nicht vertrauenswürdig): Größe begrenzt, streng geprüft; bei Bedarf neue ID. */
  importJson(text: string, nowMs: number): Result<SavedGame> {
    if (text.length > MAX_IMPORT) return { ok: false, error: { code: 'INVALID_INPUT', message: 'Datei ist zu groß.' } };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, error: { code: 'INVALID_INPUT', message: 'Die Datei ist kein gültiges JSON.' } };
    }
    const parsed = parseSavedGame(data);
    if (!parsed.ok) return parsed;
    const exists = this.index().some((e) => e.id === parsed.value.id);
    const id = exists ? newGameId(nowMs) : parsed.value.id;
    if (!this.save(id, parsed.value.createdAt, parsed.value.history, nowMs)) {
      return { ok: false, error: { code: 'INVALID_INPUT', message: 'Speicher ist voll.' } };
    }
    return { ok: true, value: { ...parsed.value, id } };
  }

  markSeen(id: string, atMs: number): void {
    try {
      this.storage?.setItem(SEEN_KEY(id), String(atMs));
    } catch {
      // ohne Speicher keine Abwesenheitserkennung über Neustarts
    }
  }

  lastSeen(id: string): number | null {
    try {
      const n = Number(this.storage?.getItem(SEEN_KEY(id)));
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
      return null;
    }
  }

  private readIndex(): SavedGameEntry[] {
    try {
      const raw = this.storage?.getItem(INDEX_KEY);
      const data = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(data) ? (data.filter(isEntry) as SavedGameEntry[]) : [];
    } catch {
      return [];
    }
  }
}

/** Neue Spiel-ID (Format passt zu `parseSavedGame`). */
export function newGameId(nowMs: number): string {
  return `g-${nowMs.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

function isEntry(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const x = e as Record<string, unknown>;
  return typeof x['id'] === 'string' && typeof x['updatedAt'] === 'number' && Array.isArray(x['players']) && typeof x['finished'] === 'boolean';
}
