// M0b AC4, AC5, AC7: Prüft einen echten Produktions-Build (eigener Ausgabeordner, Build-Version "probe1234").
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from './helpers.mjs';

const VERSION = 'probe1234';
let out;
let browser;
let html;

before(() => {
  out = mkdtempSync(join(tmpdir(), 'tt-build-'));
  const res = spawnSync('npm', ['run', 'build', '-w', '@twilight-timer/web', '--', '--output-path', out], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, BUILD_VERSION: VERSION },
  });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  browser = join(out, 'browser');
  html = readFileSync(join(browser, 'index.html'), 'utf8');
});

after(() => rmSync(out, { recursive: true, force: true }));

const csp = () => html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)?.[1];

test('AC4: CSP-Meta-Tag vorhanden; script-src ohne unsafe-inline/unsafe-eval', () => {
  const policy = csp();
  assert.ok(policy, 'CSP-Meta-Tag fehlt');
  const directives = Object.fromEntries(policy.split(';').map((d) => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
  assert.deepEqual(directives['default-src'], ["'self'"]);
  assert.ok(directives['script-src'], 'script-src fehlt');
  assert.ok(!directives['script-src'].includes("'unsafe-inline'"));
  assert.ok(!directives['script-src'].includes("'unsafe-eval'"));
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['base-uri'], ["'self'"]);
});

test('AC4: keine Inline-Skripte und keine Inline-Event-Handler im gebauten HTML', () => {
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, 'Inline-<script> gefunden');
  assert.doesNotMatch(html, /\son[a-z]+="/, 'Inline-Event-Handler (onload=…) gefunden');
});

test('AC5: Produktions-Build erzeugt ngsw.json, Service Worker und Manifest; Base-Href /twilight-timer/', () => {
  assert.match(html, /<base href="\/twilight-timer\/">/);
  for (const f of ['ngsw.json', 'ngsw-worker.js', 'manifest.webmanifest']) {
    assert.ok(existsSync(join(browser, f)), `${f} fehlt`);
  }
  const ngsw = JSON.parse(readFileSync(join(browser, 'ngsw.json'), 'utf8'));
  const app = ngsw.assetGroups.find((g) => g.name === 'app');
  assert.equal(app.installMode, 'prefetch');
  assert.ok(app.urls.some((u) => u.endsWith('/index.html')), 'index.html nicht vorab gecacht');
  assert.ok(app.urls.some((u) => /\/main-[A-Z0-9]+\.js$/.test(u)), 'main-*.js nicht vorab gecacht');
});

test('AC7: Build-Version aus BUILD_VERSION steckt im Bundle', () => {
  const main = readdirSync(browser).find((f) => /^main-.*\.js$/.test(f));
  assert.ok(readFileSync(join(browser, main), 'utf8').includes(VERSION));
});
