// AC4: Claude kann keinen Dev-Server starten (PreToolUse-Hook, Exit 2 = blockiert).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { path } from './helpers.mjs';

const HOOK = path('.claude', 'hooks', 'block-dev-server.mjs');

function hook(payload) {
  return spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: 'utf8' });
}
const bash = (command) => hook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } });

test('Hook-Skript existiert', () => {
  assert.ok(existsSync(HOOK));
});

const BLOCKED = [
  'ng serve',
  'ng s',
  'npx ng serve',
  'npx ng serve --host 0.0.0.0',
  'npm start',
  'npm run start',
  'npm run dev',
  'npm run dev -- --filter web',
  'npm -w apps/web run start',
  'npm run start --workspace @twilight-timer/web',
  'turbo dev',
  'turbo run dev',
  'npx turbo run dev',
  'cd apps/web && ng serve',
  'cd apps/web; npm start',
  'npx http-server dist',
  'npx serve dist',
  'python3 -m http.server 8080',
];

for (const command of BLOCKED) {
  test(`blockiert: ${command}`, () => {
    const r = bash(command);
    assert.equal(r.status, 2, `Exit-Code war ${r.status}`);
    assert.match(r.stderr, /Dev-Server/);
  });
}

const ALLOWED = [
  'npm test',
  'npm run test',
  'npm run build',
  'npm run verify',
  'npm run lint',
  'npm ci',
  'ng build',
  'ng test --watch=false',
  'npx turbo run build',
  'git commit -m "docs: Befehl ng serve dokumentiert"',
  "grep -r 'npm run dev' README.md",
  'node --test tests/repo/',
];

for (const command of ALLOWED) {
  test(`erlaubt: ${command}`, () => {
    const r = bash(command);
    assert.equal(r.status, 0, r.stderr);
  });
}

test('andere Werkzeuge als Bash werden nicht geprüft', () => {
  const r = hook({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: 'x', content: 'ng serve' } });
  assert.equal(r.status, 0);
});

test('ungültiges JSON blockiert nicht (kein Fehlalarm)', () => {
  const r = spawnSync(process.execPath, [HOOK], { input: 'kein json', encoding: 'utf8' });
  assert.equal(r.status, 0);
});
