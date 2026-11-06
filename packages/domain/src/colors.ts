/** Spielerfarben (Entscheidung des Nutzers), feste Reihenfolge; Namen zweisprachig. */
export interface PlayerColor {
  readonly id: string;
  readonly de: string;
  readonly en: string;
  readonly hex: string;
}

export const PLAYER_COLORS: readonly PlayerColor[] = [
  { id: 'black', de: 'Schwarz', en: 'Black', hex: '#1b1b1f' },
  { id: 'red', de: 'Rot', en: 'Red', hex: '#d32f2f' },
  { id: 'blue', de: 'Blau', en: 'Blue', hex: '#1e6fe0' },
  { id: 'green', de: 'Grün', en: 'Green', hex: '#2e9e44' },
  { id: 'gold', de: 'Gold', en: 'Gold', hex: '#d4a72c' },
  { id: 'purple', de: 'Lila', en: 'Purple', hex: '#8e44c9' },
  { id: 'neon-orange', de: 'Neonorange', en: 'Neon orange', hex: '#ff7a00' },
  { id: 'neon-pink', de: 'Neonpink', en: 'Neon pink', hex: '#ff2fb4' },
];

export function colorLabel(id: string): string {
  const c = PLAYER_COLORS.find((x) => x.id === id);
  if (!c) return '';
  return c.de === c.en ? c.de : `${c.de} / ${c.en}`;
}
