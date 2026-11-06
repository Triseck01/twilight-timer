// AC5 (Struktur) + AC7: Monorepo-Aufbau, TypeScript 6.0.x fest, ADRs vorhanden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { exists, read, readJson, path } from './helpers.mjs';

const require = createRequire(path('package.json'));

test('Monorepo: Workspaces apps/web und packages/domain mit turbo.json', () => {
  assert.ok(exists('turbo.json'));
  assert.equal(readJson('apps', 'web', 'package.json').name, '@twilight-timer/web');
  assert.equal(readJson('packages', 'domain', 'package.json').name, '@twilight-timer/domain');
});

test('Web-App hängt von @twilight-timer/domain ab', () => {
  const web = readJson('apps', 'web', 'package.json');
  assert.ok(web.dependencies?.['@twilight-timer/domain'], 'Abhängigkeit fehlt');
});

test('Angular 22.2 in apps/web', () => {
  const web = readJson('apps', 'web', 'package.json');
  assert.match(web.dependencies['@angular/core'], /^[~^]?22\.2\./);
});

test('domain hat keine Laufzeit-Abhängigkeiten (framework-frei)', () => {
  const domain = readJson('packages', 'domain', 'package.json');
  assert.deepEqual(Object.keys(domain.dependencies ?? {}), []);
});

test('TypeScript ist nur im Root und exakt auf 6.0.x festgelegt', () => {
  assert.match(readJson('package.json').devDependencies.typescript, /^6\.0\.\d+$/);
  for (const ws of ['apps/web', 'packages/domain']) {
    const pkg = readJson(...ws.split('/'), 'package.json');
    assert.equal(pkg.devDependencies?.typescript, undefined, `${ws} darf TypeScript nicht selbst festlegen`);
  }
  assert.match(require('typescript/package.json').version, /^6\.0\./);
});

test('ADR zu TypeScript-Pin und zu überholten Konzeptabschnitten', () => {
  const adrs = readdirSync(path('docs', 'adr')).filter((f) => /^\d{4}-.*\.md$/.test(f));
  const text = adrs.map((f) => read('docs', 'adr', f)).join('\n');
  assert.match(text, /TypeScript 6\.0/);
  assert.match(text, /§7\.1/);
});
