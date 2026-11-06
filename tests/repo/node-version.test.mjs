// AC2: Falsche Node-Version → npm bricht mit verständlicher Meldung ab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { read, readJson } from './helpers.mjs';

test('package.json verlangt Node 26 per devEngines mit onFail=error', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.devEngines?.runtime?.name, 'node');
  assert.match(pkg.devEngines.runtime.version, /^>=26\./);
  assert.equal(pkg.devEngines.runtime.onFail, 'error');
  assert.match(pkg.engines?.node ?? '', /^>=26\./);
});

test('.npmrc setzt engine-strict und .node-version nennt Node 26', () => {
  assert.match(read('.npmrc'), /^engine-strict=true$/m);
  assert.match(read('.node-version').trim(), /^26\.\d+\.\d+$/);
});

test('npm erzwingt devEngines: unpassende Version → Abbruch mit EBADDEVENGINES', () => {
  // Gegenprobe des Mechanismus: Wir verlangen eine Version, die es nicht gibt.
  const dir = mkdtempSync(join(tmpdir(), 'tt-devengines-'));
  try {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'probe',
        version: '1.0.0',
        private: true,
        devEngines: { runtime: { name: 'node', version: '<1', onFail: 'error' } },
      }),
    );
    const res = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dir, encoding: 'utf8' });
    assert.notEqual(res.status, 0, 'npm install hätte fehlschlagen müssen');
    assert.match(res.stderr, /EBADDEVENGINES/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
