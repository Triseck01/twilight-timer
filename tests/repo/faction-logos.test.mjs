// M2 (Logo-Entscheidung des Nutzers, ADR 0006): Logos liegen an EINER Stelle und passen zur Liste im Code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { path, read } from './helpers.mjs';

const DIR = path('apps', 'web', 'public', 'factions');
const files = () => readdirSync(DIR).filter((f) => !f.startsWith('.'));
const codeIds = () => {
  const block = read('apps', 'web', 'src', 'app', 'core', 'faction-logo.ts').split('new Set([')[1].split(']);')[0];
  return [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
};
const domainIds = () => [...read('packages', 'domain', 'src', 'factions.ts').matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]);

test('Logo-Ordner enthält nur WebP-Dateien mit Volks-IDs aus dem Katalog', () => {
  const known = new Set(domainIds());
  for (const f of files()) {
    assert.match(f, /^[a-z0-9-]+\.webp$/, f);
    assert.ok(known.has(f.replace('.webp', '')), `${f} gehört zu keinem Volk`);
    const head = readFileSync(`${DIR}/${f}`).subarray(0, 12).toString('latin1');
    assert.ok(head.startsWith('RIFF') && head.endsWith('WEBP'), `${f} ist kein WebP`);
    assert.ok(statSync(`${DIR}/${f}`).size <= 50_000, `${f} ist zu groß`);
  }
});

test('Liste im Code (faction-logo.ts) entspricht genau den Dateien', () => {
  assert.deepEqual([...codeIds()].sort(), files().map((f) => f.replace('.webp', '')).sort());
});

test('Hinweis auf Rechteinhaber in README und App', () => {
  assert.match(read('README.md'), /Fan-Projekt/);
  assert.match(read('apps', 'web', 'src', 'app', 'start', 'start-page.ts'), /Fan-Projekt/);
});

test('ADR zur Logo-Entscheidung vorhanden', () => {
  const adrs = readdirSync(path('docs', 'adr')).filter((f) => /^\d{4}-.*\.md$/.test(f));
  assert.ok(adrs.some((f) => /logo/i.test(f)), 'ADR zu Logos fehlt');
});
