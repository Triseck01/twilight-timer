// M0b AC1–AC3, AC5 (Konfiguration), AC8 (Workflow): PWA-Quelldateien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exists, read, readJson, path } from './helpers.mjs';

const PUBLIC = ['apps', 'web', 'public'];
const manifest = () => readJson(...PUBLIC, 'manifest.webmanifest');

/** Liest Breite und Höhe aus dem IHDR-Block einer PNG-Datei. */
function pngSize(file) {
  const buf = readFileSync(file);
  assert.equal(buf.toString('ascii', 1, 4), 'PNG', `${file} ist kein PNG`);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test('AC1: Manifest mit Name, standalone, Querformat, dunklen Farben', () => {
  const m = manifest();
  assert.equal(m.name, 'Twilight Timer');
  assert.ok(m.short_name && m.short_name.length <= 12, 'short_name fehlt oder zu lang');
  assert.equal(m.display, 'standalone');
  assert.equal(m.orientation, 'landscape');
  assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
  assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
  assert.equal(m.lang, 'de');
});

test('AC1: start_url und scope sind relativ (funktionieren unter /twilight-timer/)', () => {
  const m = manifest();
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
});

test('AC2: eigene Icons 192/512, maskable und Apple-Touch-Icon 180 mit korrekter Größe', () => {
  const icons = manifest().icons;
  const find = (size, purpose) => icons.find((i) => i.sizes === size && (i.purpose ?? 'any') === purpose);
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const icon = find(size, purpose);
    assert.ok(icon, `Icon ${size} ${purpose} fehlt im Manifest`);
    const [w, h] = size.split('x').map(Number);
    assert.deepEqual(pngSize(path(...PUBLIC, icon.src)), { width: w, height: h });
  }
  assert.deepEqual(pngSize(path(...PUBLIC, 'icons', 'apple-touch-icon.png')), { width: 180, height: 180 });
});

test('AC2: Icon-Quelle als SVG im Repo, keine Angular-Standardgrafiken', () => {
  assert.ok(exists(...PUBLIC, 'icons', 'icon.svg'));
  assert.ok(!exists(...PUBLIC, 'favicon.ico'), 'Angular-Standard-favicon.ico muss ersetzt sein');
  for (const icon of manifest().icons) assert.doesNotMatch(icon.src, /icon-\d+x\d+\.png$/, 'Angular-Standard-Iconname');
});

test('AC3: index.html enthält iPad-Meta-Tags, Manifest-Link und Favicon', () => {
  const html = read('apps', 'web', 'src', 'index.html');
  assert.match(html, /<html lang="de">/);
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/);
  assert.match(html, /<link rel="icon" type="image\/png" href="icons\/icon-32\.png">/);
  assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes">/);
  assert.match(html, /<meta name="mobile-web-app-capable" content="yes">/);
  assert.match(html, /<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Twilight Timer">/);
  assert.match(html, /<meta name="theme-color" content="#[0-9a-f]{6}">/i);
  assert.match(html, /<meta name="viewport" content="[^"]*viewport-fit=cover[^"]*">/);
});

test('AC5: Service Worker in angular.json (nur Produktion) und ngsw-config vorhanden', () => {
  const build = readJson('apps', 'web', 'angular.json').projects.web.architect.build;
  assert.equal(build.configurations.production.serviceWorker, 'ngsw-config.json');
  assert.notEqual(build.options.serviceWorker, 'ngsw-config.json', 'SW nicht in der Entwicklungskonfiguration');
  assert.equal(build.configurations.production.baseHref, '/twilight-timer/');
  const ngsw = readJson('apps', 'web', 'ngsw-config.json');
  const app = ngsw.assetGroups.find((g) => g.name === 'app');
  assert.equal(app.installMode, 'prefetch');
});

test('AC8: Deploy-Job veröffentlicht nur nach grünem verify und nur bei Push auf main', () => {
  const yml = read('.github', 'workflows', 'ci.yml');
  assert.match(yml, /deploy:\n(?:.*\n)*?\s+needs: verify/);
  assert.match(yml, /if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/);
  assert.match(yml, /actions\/upload-pages-artifact@v\d+/);
  assert.match(yml, /actions\/deploy-pages@v\d+/);
  assert.match(yml, /BUILD_VERSION=\$\{GITHUB_SHA::7\}/, "AC7: kurze Commit-Kennung");
  assert.match(yml, /cp .*index\.html .*404\.html/);
  assert.match(yml, /pages: write/);
});
