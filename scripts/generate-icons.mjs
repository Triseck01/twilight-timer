// Erzeugt die PNG-Icons der PWA aus apps/web/public/icons/icon.svg.
// Aufruf nach jeder Änderung am SVG: node scripts/generate-icons.mjs (PNGs werden committet).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'web', 'public', 'icons');
const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');

const TARGETS = {
  'icon-32.png': 32,
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-maskable-512.png': 512,
  'apple-touch-icon.png': 180,
};

for (const [file, size] of Object.entries(TARGETS)) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
  writeFileSync(join(dir, file), png);
  console.log(`${file} (${size}×${size})`);
}
