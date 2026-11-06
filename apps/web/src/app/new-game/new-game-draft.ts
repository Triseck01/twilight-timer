import { availableFactions, type GameSetup, type Variants } from '@twilight-timer/domain';

/** Eingaben von „Neues Spiel“, bevor ein Spiel angelegt wird (reine Daten, unveränderlich). */
export interface DraftPlayer {
  /** Stabiler Schlüssel für die Liste (ändert sich beim Verschieben nicht). */
  readonly key: number;
  readonly name: string;
  readonly color: string | null;
  readonly factionId: string | null;
}

export interface Draft {
  readonly variants: Variants;
  readonly players: readonly DraftPlayer[];
  readonly nextKey: number;
}

const MIN_PLAYERS = 3;

const blank = (key: number): DraftPlayer => ({ key, name: '', color: null, factionId: null });

export function emptyDraft(): Draft {
  return {
    variants: { pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true },
    players: [blank(1), blank(2), blank(3)],
    nextKey: 4,
  };
}

export const maxPlayers = (d: Draft) => (d.variants.pok ? 8 : 6);

export function setVariant(d: Draft, key: keyof Variants, value: boolean): Draft {
  return { ...d, variants: { ...d.variants, [key]: value } };
}

export function addPlayer(d: Draft): Draft {
  if (d.players.length >= 8) return d;
  return { ...d, players: [...d.players, blank(d.nextKey)], nextKey: d.nextKey + 1 };
}

export function removePlayer(d: Draft, key: number): Draft {
  if (d.players.length <= MIN_PLAYERS) return d;
  return { ...d, players: d.players.filter((p) => p.key !== key) };
}

export function setPlayer(d: Draft, key: number, patch: Partial<Omit<DraftPlayer, 'key'>>): Draft {
  return { ...d, players: d.players.map((p) => (p.key === key ? { ...p, ...patch } : p)) };
}

/** Verschiebt einen Spieler um eine Position (▲ = −1, ▼ = +1). */
export function movePlayer(d: Draft, key: number, direction: -1 | 1): Draft {
  const from = d.players.findIndex((p) => p.key === key);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= d.players.length) return d;
  const players = [...d.players];
  [players[from], players[to]] = [players[to]!, players[from]!];
  return { ...d, players };
}

/** Was in Schritt 2 noch fehlt (leer = „Weiter“ erlaubt). Farben/Völker sind in der Oberfläche bereits eindeutig. */
export function step2Problems(d: Draft): string[] {
  const problems: string[] = [];
  const max = maxPlayers(d);
  if (d.players.length > max) problems.push(`Höchstens ${max} Spieler ohne Prophecy of Kings`);
  const allowed = new Set(availableFactions(d.variants).map((f) => f.id));
  d.players.forEach((p, i) => {
    const who = `Spieler ${i + 1}`;
    if (!p.name.trim()) problems.push(`${who}: Name fehlt`);
    if (!p.color) problems.push(`${who}: Farbe fehlt`);
    if (!p.factionId) problems.push(`${who}: Volk fehlt`);
    else if (!allowed.has(p.factionId)) problems.push(`${who}: Volk gehört zu keiner gewählten Erweiterung`);
  });
  return problems;
}

/** Spiel-Setup in Sitzreihenfolge; Sprecher ist Position 1 (Domain-Standard). */
export function toSetup(d: Draft): GameSetup {
  return {
    variants: d.variants,
    players: d.players.map((p, i) => ({ id: `p${i + 1}`, name: p.name.trim(), color: p.color ?? '', factionId: p.factionId ?? '' })),
  };
}
