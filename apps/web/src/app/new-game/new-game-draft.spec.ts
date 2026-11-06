import {
  addPlayer,
  emptyDraft,
  maxPlayers,
  movePlayer,
  removePlayer,
  setPlayer,
  setVariant,
  step2Problems,
  toSetup,
  type Draft,
} from './new-game-draft';

function filled(n: number): Draft {
  const colors = ['black', 'red', 'blue', 'green', 'gold', 'purple', 'neon-orange', 'neon-pink'];
  const factions = ['sol', 'hacan', 'letnev', 'xxcha', 'jol-nar', 'mentak', 'arborec', 'yin'];
  let d = emptyDraft();
  while (d.players.length < n) d = addPlayer(d);
  d.players.forEach((p, i) => (d = setPlayer(d, p.key, { name: `Name ${i + 1}`, color: colors[i]!, factionId: factions[i]! })));
  return d;
}

describe('Entwurf „Neues Spiel“', () => {
  it('beginnt mit 3 leeren Spielern und Standard-Varianten (PoK an, Handelswaren an)', () => {
    const d = emptyDraft();
    expect(d.players).toHaveLength(3);
    expect(d.players.every((p) => p.name === '' && p.color === null && p.factionId === null)).toBe(true);
    expect(d.variants).toEqual({ pok: true, thundersEdge: false, discordantStars: false, tradeGoods: true });
  });

  it('höchstens 8 Spieler mit PoK, 6 ohne; mindestens 3', () => {
    expect(maxPlayers(emptyDraft())).toBe(8);
    expect(maxPlayers(setVariant(emptyDraft(), 'pok', false))).toBe(6);
    let d = emptyDraft();
    for (let i = 0; i < 10; i++) d = addPlayer(d);
    expect(d.players).toHaveLength(8);
    for (let i = 0; i < 10; i++) d = removePlayer(d, d.players[0]!.key);
    expect(d.players).toHaveLength(3);
  });

  it('Pfeile verschieben in der Sitzreihenfolge (ohne über den Rand)', () => {
    let d = filled(3);
    const [a, b, c] = d.players.map((p) => p.key);
    d = movePlayer(d, c!, -1);
    expect(d.players.map((p) => p.key)).toEqual([a, c, b]);
    d = movePlayer(d, a!, -1);
    expect(d.players.map((p) => p.key)).toEqual([a, c, b]);
    d = movePlayer(d, b!, 1);
    expect(d.players.map((p) => p.key)).toEqual([a, c, b]);
  });

  it('vollständig ausgefüllt → keine Probleme', () => {
    expect(step2Problems(filled(5))).toEqual([]);
  });

  it('nennt, was fehlt (N3)', () => {
    const d = setPlayer(setPlayer(filled(3), filled(3).players[1]!.key, { name: '  ' }), filled(3).players[2]!.key, { factionId: null, color: null });
    expect(step2Problems(d)).toEqual(['Spieler 2: Name fehlt', 'Spieler 3: Farbe fehlt', 'Spieler 3: Volk fehlt']);
  });

  it('Volk aus abgewählter Erweiterung wird gemeldet', () => {
    let d = setVariant(filled(3), 'discordantStars', true);
    d = setPlayer(d, d.players[0]!.key, { factionId: 'axis' });
    expect(step2Problems(d)).toEqual([]);
    d = setVariant(d, 'discordantStars', false);
    expect(step2Problems(d)).toEqual(['Spieler 1: Volk gehört zu keiner gewählten Erweiterung']);
  });

  it('zu viele Spieler nach Abwählen von PoK wird gemeldet', () => {
    expect(step2Problems(setVariant(filled(7), 'pok', false))).toContain('Höchstens 6 Spieler ohne Prophecy of Kings');
  });

  it('wandelt in ein Spiel-Setup: Sitzreihenfolge, IDs, Namen getrimmt, Sprecher = Position 1', () => {
    let d = filled(3);
    d = setPlayer(d, d.players[0]!.key, { name: '  Anna ' });
    d = movePlayer(d, d.players[2]!.key, -1);
    const setup = toSetup(d);
    expect(setup.players.map((p) => p.name)).toEqual(['Anna', 'Name 3', 'Name 2']);
    expect(setup.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(setup.speakerId).toBeUndefined();
    expect(setup.variants).toEqual(d.variants);
  });
});
