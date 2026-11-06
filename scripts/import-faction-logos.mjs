// Übernimmt Völker-Logos aus einem Ordner (Dateinamen wie im Fandom-Wiki gespeichert) nach apps/web/public/factions/<id>.webp
// und schreibt die Liste in apps/web/src/app/core/faction-logo.ts neu. Aufruf: node scripts/import-faction-logos.mjs <ordner>
// Logos sind urheberrechtlich geschützt (ADR 0006). Zum Entfernen: Ordner public/factions leeren und Skript mit leerem Ordner laufen lassen.
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? 'logos');
const target = join(ROOT, 'apps', 'web', 'public', 'factions');
const map = JSON.parse(readFileSync(join(ROOT, 'scripts', 'faction-logo-map.json'), 'utf8'));

const isWebp = (file) => {
  const head = readFileSync(file).subarray(0, 12).toString('latin1');
  return head.startsWith('RIFF') && head.endsWith('WEBP');
};

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
const imported = [];
for (const [id, file] of Object.entries(map)) {
  const from = join(source, file);
  if (!existsSync(from)) {
    console.warn(`fehlt: ${id} (${file})`);
    continue;
  }
  if (!isWebp(from)) {
    console.warn(`kein WebP, übersprungen: ${file}`);
    continue;
  }
  copyFileSync(from, join(target, `${id}.webp`));
  imported.push(id);
}

const list = imported.map((id) => `  '${id}',`).join('\n');
writeFileSync(
  join(ROOT, 'apps', 'web', 'src', 'app', 'core', 'faction-logo.ts'),
  `import { FACTIONS } from '@twilight-timer/domain';

// Erzeugt von scripts/import-faction-logos.mjs – einzige Stelle, an der Logos eingebunden werden (ADR 0006).
const LOGO_IDS: ReadonlySet<string> = new Set([
${list}
]);

/** Pfad zum Logo eines Volks oder \`null\`, wenn keines vorliegt. */
export function factionLogo(id: string): string | null {
  return LOGO_IDS.has(id) ? \`factions/\${id}.webp\` : null;
}

const SKIP = new Set(['the', 'of']);

/** Kürzel als Ersatz für ein fehlendes Logo, z. B. „The Federation of Sol“ → „FS“. */
export function factionInitials(id: string): string {
  const name = FACTIONS.find((f) => f.id === id)?.en ?? '';
  const words = name.split(/[\\s/]+/).filter((w) => w && !SKIP.has(w.toLowerCase()));
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
`,
);
console.log(`${imported.length} Logos übernommen nach apps/web/public/factions`);
