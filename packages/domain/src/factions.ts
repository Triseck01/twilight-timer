/**
 * Völkerkatalog (M2/D1). Quellen und Belege: docs/planning/06-factions-research.md, 07-factions-names-logos.md.
 * Anzeige „Englisch / Deutsch“; Discordant Stars (Fan-Erweiterung) nur Englisch.
 */
export type Expansion = 'base' | 'pok' | 'keleres' | 'te' | 'ds';

export interface Faction {
  readonly id: string;
  readonly en: string;
  readonly de: string | null;
  readonly expansion: Expansion;
}

/** Naalu: hält den Initiative-0-Token (Konzept §3.7). */
export const NAALU_ID = 'naalu';

export const FACTIONS: readonly Faction[] = [
  // Basisspiel
  { id: 'arborec', en: 'The Arborec', de: 'Das Arborec', expansion: 'base' },
  { id: 'letnev', en: 'The Barony of Letnev', de: 'Das Baronat von Letnev', expansion: 'base' },
  { id: 'saar', en: 'The Clan of Saar', de: 'Der Clan der Zaar', expansion: 'base' },
  { id: 'muaat', en: 'The Embers of Muaat', de: 'Die Glut von Muaat', expansion: 'base' },
  { id: 'hacan', en: 'The Emirates of Hacan', de: 'Die Emirate von Hacan', expansion: 'base' },
  { id: 'sol', en: 'The Federation of Sol', de: 'Die Sol-Föderation', expansion: 'base' },
  { id: 'creuss', en: 'The Ghosts of Creuss', de: 'Die Geister von Creuss', expansion: 'base' },
  { id: 'l1z1x', en: 'The L1Z1X Mindnet', de: 'Das L1Z1X-Gedankennetz', expansion: 'base' },
  { id: 'mentak', en: 'The Mentak Coalition', de: 'Die Mentak-Koalition', expansion: 'base' },
  { id: 'naalu', en: 'The Naalu Collective', de: 'Das Naalu-Kollektiv', expansion: 'base' },
  { id: 'nekro', en: 'The Nekro Virus', de: 'Das Nekro-Virus', expansion: 'base' },
  { id: 'sardakk', en: 'Sardakk N\'orr', de: 'Die Sardakk N’orr', expansion: 'base' },
  { id: 'jol-nar', en: 'The Universities of Jol-Nar', de: 'Die Universitäten von Jol-Nar', expansion: 'base' },
  { id: 'winnu', en: 'The Winnu', de: 'Die Winnu', expansion: 'base' },
  { id: 'xxcha', en: 'The Xxcha Kingdom', de: 'Das Xxcha-Königreich', expansion: 'base' },
  { id: 'yin', en: 'The Yin Brotherhood', de: 'Die Yin-Bruderschaft', expansion: 'base' },
  { id: 'yssaril', en: 'The Yssaril Tribes', de: 'Die Yssaril-Stämme', expansion: 'base' },
  // Prophecy of Kings
  { id: 'argent', en: 'The Argent Flight', de: 'Die Silberschwingen', expansion: 'pok' },
  { id: 'empyrean', en: 'The Empyrean', de: 'Die Empyrier', expansion: 'pok' },
  { id: 'mahact', en: 'The Mahact Gene-Sorcerers', de: 'Die Mahactanischen Gen-Hexer', expansion: 'pok' },
  { id: 'naaz-rokha', en: 'The Naaz-Rokha Alliance', de: 'Die Naaz-Rokha-Allianz', expansion: 'pok' },
  { id: 'nomad', en: 'The Nomad', de: 'Der Nomade', expansion: 'pok' },
  { id: 'titans', en: 'The Titans of Ul', de: 'Die Titanen des Ul', expansion: 'pok' },
  { id: 'cabal', en: 'The Vuil\'raith Cabal', de: 'Die Vuil’raith-Verschwörung', expansion: 'pok' },
  // Council Keleres (Codex III; liegt Thunder's Edge bei)
  { id: 'keleres', en: 'The Council Keleres', de: 'Die Keleres des Rates', expansion: 'keleres' },
  // Thunder's Edge
  { id: 'crimson', en: 'The Crimson Rebellion', de: 'Die Purpurrote Rebellion', expansion: 'te' },
  { id: 'deepwrought', en: 'The Deepwrought Scholarate', de: 'Die Gedankenschmiede', expansion: 'te' },
  { id: 'firmament-obsidian', en: 'The Firmament / The Obsidian', de: 'Das Firmament / Der Obsidian', expansion: 'te' },
  { id: 'bastion', en: 'The Last Bastion', de: 'Die Letzte Bastion', expansion: 'te' },
  { id: 'ral-nel', en: 'The Ral Nel Consortium', de: 'Das Ral-Nel-Konsortium', expansion: 'te' },
  // Discordant Stars (inoffiziell)
  { id: 'axis', en: 'The Shipwrights of Axis', de: null, expansion: 'ds' },
  { id: 'bentor', en: 'The Bentor Conglomerate', de: null, expansion: 'ds' },
  { id: 'celdauri', en: 'The Celdauri Trade Confederation', de: null, expansion: 'ds' },
  { id: 'cheiran', en: 'The Cheiran Hordes', de: null, expansion: 'ds' },
  { id: 'cymiae', en: 'The Savages of Cymiae', de: null, expansion: 'ds' },
  { id: 'dih-mohn', en: 'The Dih-Mohn Flotilla', de: null, expansion: 'ds' },
  { id: 'edyn', en: 'The Edyn Mandate', de: null, expansion: 'ds' },
  { id: 'florzen', en: 'The Florzen Profiteers', de: null, expansion: 'ds' },
  { id: 'free-systems', en: 'The Free Systems Compact', de: null, expansion: 'ds' },
  { id: 'ghemina', en: 'The Ghemina Raiders', de: null, expansion: 'ds' },
  { id: 'ghoti', en: 'The Ghoti Wayfarers', de: null, expansion: 'ds' },
  { id: 'gledge', en: 'The GLEdge Union', de: null, expansion: 'ds' },
  { id: 'ilyxum', en: 'The Augurs of Ilyxum', de: null, expansion: 'ds' },
  { id: 'kjalengard', en: 'The Berserkers of Kjalengard', de: null, expansion: 'ds' },
  { id: 'kollecc', en: 'The Kollecc Society', de: null, expansion: 'ds' },
  { id: 'kolume', en: 'The Monks of Kolume', de: null, expansion: 'ds' },
  { id: 'kortali', en: 'The Kortali Tribunal', de: null, expansion: 'ds' },
  { id: 'kyro', en: 'The Kyro Sodality', de: null, expansion: 'ds' },
  { id: 'lanefir', en: 'The Lanefir Remnants', de: null, expansion: 'ds' },
  { id: 'li-zho', en: 'The Li-Zho Dynasty', de: null, expansion: 'ds' },
  { id: 'khrask', en: 'The L\'tokk Khrask', de: null, expansion: 'ds' },
  { id: 'mirveda', en: 'The Mirveda Protectorate', de: null, expansion: 'ds' },
  { id: 'mortheus', en: 'The Glimmer of Mortheus', de: null, expansion: 'ds' },
  { id: 'myko-mentori', en: 'The Myko-Mentori', de: null, expansion: 'ds' },
  { id: 'nivyn', en: 'The Nivyn Star Kings', de: null, expansion: 'ds' },
  { id: 'nokar', en: 'The Nokar Sellships', de: null, expansion: 'ds' },
  { id: 'olradin', en: 'The Olradin League', de: null, expansion: 'ds' },
  { id: 'rhodun', en: 'The Zealots of Rhodun', de: null, expansion: 'ds' },
  { id: 'roh-dhna', en: 'Roh\'Dhna Mechatronics', de: null, expansion: 'ds' },
  { id: 'tnelis', en: 'The Tnelis Syndicate', de: null, expansion: 'ds' },
  { id: 'vaden', en: 'The Vaden Banking Clans', de: null, expansion: 'ds' },
  { id: 'vaylerian', en: 'The Vaylerian Scourge', de: null, expansion: 'ds' },
  { id: 'veldyr', en: 'The Veldyr Sovereignty', de: null, expansion: 'ds' },
  { id: 'zelian', en: 'The Zelian Purifier', de: null, expansion: 'ds' },
];

export function factionLabel(id: string): string {
  const f = FACTIONS.find((x) => x.id === id);
  if (!f) return '';
  return f.de ? `${f.en} / ${f.de}` : f.en;
}

/** Völker der gewählten Erweiterungen; Keleres braucht PoK oder Thunder's Edge. */
export function availableFactions(x: { readonly pok: boolean; readonly thundersEdge: boolean; readonly discordantStars: boolean }): Faction[] {
  const enabled: Record<Expansion, boolean> = {
    base: true,
    pok: x.pok,
    keleres: x.pok || x.thundersEdge,
    te: x.thundersEdge,
    ds: x.discordantStars,
  };
  return FACTIONS.filter((f) => enabled[f.expansion]);
}
