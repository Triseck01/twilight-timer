// AC3: scripts/bootstrap.sh prüft Homebrew und Node 26, nennt Befehle und fragt vor jeder Installation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { path } from './helpers.mjs';

const SCRIPT = path('scripts', 'bootstrap.sh');

/** Legt ein Verzeichnis mit Stub-Programmen an, die jeden Aufruf in calls.log protokollieren. */
function sandbox({ brew = true, nodeVersion = 'v26.13.0' } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'tt-bootstrap-'));
  const log = join(dir, 'calls.log');
  const stub = (name, body = '') => {
    const file = join(dir, name);
    writeFileSync(file, `#!/bin/bash\necho "${name} $*" >> "${log}"\n${body}\n`);
    chmodSync(file, 0o755);
  };
  if (brew) stub('brew');
  if (nodeVersion) stub('node', `[ "$1" = "-v" ] && echo "${nodeVersion}"`);
  stub('npm');
  return { dir, log };
}

function run(box, input = '') {
  const res = spawnSync('/bin/bash', [SCRIPT], {
    input,
    encoding: 'utf8',
    env: { PATH: `${box.dir}:/usr/bin:/bin`, HOME: box.dir },
  });
  const calls = existsSync(box.log) ? readFileSync(box.log, 'utf8') : '';
  rmSync(box.dir, { recursive: true, force: true });
  return { ...res, output: res.stdout + res.stderr, calls };
}

test('bootstrap.sh existiert', () => {
  assert.ok(existsSync(SCRIPT));
});

test('ohne Homebrew: nennt Installationsbefehl, installiert nichts, Exit ≠ 0', () => {
  const r = run(sandbox({ brew: false, nodeVersion: null }));
  assert.notEqual(r.status, 0);
  assert.match(r.output, /brew\.sh/);
  assert.doesNotMatch(r.calls, /^npm /m);
});

test('Node 25 + Antwort "n": nennt "brew upgrade node", führt es nicht aus, Exit ≠ 0', () => {
  const r = run(sandbox({ nodeVersion: 'v25.3.0' }), 'n\n');
  assert.notEqual(r.status, 0);
  assert.match(r.output, /brew upgrade node/);
  assert.doesNotMatch(r.calls, /^brew (upgrade|install)/m);
  assert.doesNotMatch(r.calls, /^npm /m);
});

test('Node fehlt + Antwort "n": nennt "brew install node", führt es nicht aus', () => {
  const r = run(sandbox({ nodeVersion: null }), 'n\n');
  assert.notEqual(r.status, 0);
  assert.match(r.output, /brew install node/);
  assert.doesNotMatch(r.calls, /^brew install/m);
});

test('Node 25 + Antwort "j": führt "brew upgrade node" aus', () => {
  const r = run(sandbox({ nodeVersion: 'v25.3.0' }), 'j\n');
  assert.match(r.calls, /^brew upgrade node$/m);
});

test('Node 26 vorhanden: fragt nichts, führt "npm ci" aus und nennt die nächsten Befehle', () => {
  const r = run(sandbox());
  assert.equal(r.status, 0, r.output);
  assert.match(r.calls, /^npm ci/m);
  assert.doesNotMatch(r.calls, /^brew (upgrade|install)/m);
  assert.match(r.output, /npm run verify/);
  assert.match(r.output, /npm run dev/);
});
