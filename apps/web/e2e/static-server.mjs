// Statischer Server NUR für die Playwright-Tests: liefert den Produktions-Build unter /twilight-timer/ aus
// (wie GitHub Pages, inkl. SPA-Fallback auf index.html). Bindet nur an 127.0.0.1; Playwright startet und beendet ihn.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../dist/web/browser', import.meta.url)));
const BASE = '/twilight-timer/';
const PORT = Number(process.env.PORT ?? 4310);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function fileFor(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath.slice(BASE.length)));
  const file = resolve(ROOT, rel);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null; // Pfad-Traversal abweisen
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (!path.startsWith(BASE)) {
    res.writeHead(302, { location: BASE }).end();
    return;
  }
  const file = (await fileFor(path)) ?? join(ROOT, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(PORT, '127.0.0.1');
