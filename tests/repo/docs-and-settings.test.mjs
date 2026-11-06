// AC8: Dokumentationsdateien mit Zweckzeile; README nennt Befehle.
// AC9: docs/milestones/** nur mit Nutzerbestätigung; Dev-Server-Hook registriert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exists, read, readJson } from './helpers.mjs';

const DOCS = ['CLAUDE.md', 'AGENTS.md', 'AGENT.md', 'BRAIN.md', 'README.md'];

for (const file of DOCS) {
  test(`${file} existiert und hat eine Zweckzeile`, () => {
    assert.ok(exists(file), `${file} fehlt`);
    assert.match(read(file), /^> \*\*Zweck:\*\* .+/m);
  });
}

test('CLAUDE.md importiert AGENTS.md, AGENT.md und BRAIN.md', () => {
  const md = read('CLAUDE.md');
  for (const f of ['@AGENTS.md', '@AGENT.md', '@BRAIN.md']) assert.ok(md.includes(f), `${f} fehlt`);
});

test('README nennt Einrichtung, Tests und Dev-Server-Befehl', () => {
  const md = read('README.md');
  for (const cmd of ['scripts/bootstrap.sh', 'npm ci', 'npm run verify', 'npm test', 'npm run dev']) {
    assert.ok(md.includes(cmd), `README nennt "${cmd}" nicht`);
  }
});

test('settings.json: Änderungen an docs/milestones/** erfordern Bestätigung (ask)', () => {
  const ask = readJson('.claude', 'settings.json').permissions?.ask ?? [];
  assert.ok(ask.includes('Edit(/docs/milestones/**)'));
  assert.ok(ask.includes('Write(/docs/milestones/**)'));
});

test('settings.json: Dev-Server-Hook ist als PreToolUse für Bash registriert', () => {
  const groups = readJson('.claude', 'settings.json').hooks?.PreToolUse ?? [];
  const cmds = groups.filter((g) => g.matcher === 'Bash').flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(cmds.some((c) => c.includes('.claude/hooks/block-dev-server.mjs')));
});
