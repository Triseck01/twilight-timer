// AC6: In packages/domain bricht der Lint bei Date.now, new Date(), window, document ab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { ROOT } from './helpers.mjs';

const eslint = new ESLint({ cwd: ROOT });
const DOMAIN_FILE = 'packages/domain/src/probe.ts';

async function errors(code, filePath = DOMAIN_FILE) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((m) => m.severity === 2);
}

const FORBIDDEN = {
  'Date.now()': 'export const t = Date.now();\n',
  'new Date() ohne Argument': 'export const d = new Date();\n',
  'window': 'export const w = window.innerWidth;\n',
  'document': 'export const el = document.body;\n',
  'performance.now()': 'export const p = performance.now();\n',
};

for (const [name, code] of Object.entries(FORBIDDEN)) {
  test(`domain: ${name} ist verboten`, async () => {
    const errs = await errors(code);
    assert.ok(errs.length > 0, `kein Lint-Fehler für ${name}`);
  });
}

test('domain: reine Funktion mit injizierter Zeit ist erlaubt', async () => {
  const errs = await errors('export const elapsed = (startMs: number, nowMs: number): number => nowMs - startMs;\n');
  assert.deepEqual(errs, []);
});

test('domain: new Date(ms) mit Argument ist erlaubt', async () => {
  const errs = await errors('export const d = (ms: number): Date => new Date(ms);\n');
  assert.deepEqual(errs, []);
});
