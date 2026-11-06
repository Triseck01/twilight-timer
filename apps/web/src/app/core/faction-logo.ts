import { FACTIONS } from '@twilight-timer/domain';

// Erzeugt von scripts/import-faction-logos.mjs – einzige Stelle, an der Logos eingebunden werden (ADR 0006).
const LOGO_IDS: ReadonlySet<string> = new Set([
  'arborec',
  'argent',
  'axis',
  'bastion',
  'bentor',
  'cabal',
  'celdauri',
  'cheiran',
  'creuss',
  'crimson',
  'cymiae',
  'deepwrought',
  'dih-mohn',
  'edyn',
  'empyrean',
  'firmament-obsidian',
  'florzen',
  'free-systems',
  'ghemina',
  'ghoti',
  'gledge',
  'hacan',
  'ilyxum',
  'jol-nar',
  'keleres',
  'khrask',
  'kjalengard',
  'kollecc',
  'kolume',
  'kortali',
  'kyro',
  'l1z1x',
  'lanefir',
  'letnev',
  'li-zho',
  'mahact',
  'mentak',
  'mirveda',
  'mortheus',
  'muaat',
  'myko-mentori',
  'naalu',
  'naaz-rokha',
  'nekro',
  'nivyn',
  'nokar',
  'nomad',
  'olradin',
  'ral-nel',
  'rhodun',
  'roh-dhna',
  'saar',
  'sardakk',
  'sol',
  'titans',
  'tnelis',
  'vaden',
  'vaylerian',
  'veldyr',
  'winnu',
  'xxcha',
  'yin',
  'yssaril',
  'zelian',
]);

/** Pfad zum Logo eines Volks oder `null`, wenn keines vorliegt. */
export function factionLogo(id: string): string | null {
  return LOGO_IDS.has(id) ? `factions/${id}.webp` : null;
}

const SKIP = new Set(['the', 'of']);

/** Kürzel als Ersatz für ein fehlendes Logo, z. B. „The Federation of Sol“ → „FS“. */
export function factionInitials(id: string): string {
  const name = FACTIONS.find((f) => f.id === id)?.en ?? '';
  const words = name.split(/[\s/]+/).filter((w) => w && !SKIP.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
