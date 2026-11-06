// M2-L / L4: Oberflächentexte nur über das Wörterbuch – keine fest eingetragenen Texte in Angular-Vorlagen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { path } from './helpers.mjs';

const APP = path('apps', 'web', 'src', 'app');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

/** Liefert alle Vorlagen: .html-Dateien und `template: \`…\`` in Komponenten. */
function templates() {
  const files = walk(APP).filter((f) => !f.endsWith('.spec.ts'));
  const out = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    if (f.endsWith('.html')) out.push({ f, t: src });
    if (f.endsWith('.ts')) for (const m of src.matchAll(/template:\s*`([\s\S]*?)`/g)) out.push({ f, t: m[1] });
  }
  return out;
}

const LETTERS = /[A-Za-zÄÖÜäöüß]/;

function problems(tpl) {
  const found = [];
  const noInterp = tpl.replace(/\{\{[\s\S]*?\}\}/g, '').replace(/<!--[\s\S]*?-->/g, '');
  // Statische Attribute mit sichtbarem/vorlesbarem Text
  for (const m of noInterp.matchAll(/\s(aria-label|placeholder|title|alt)="([^"]*)"/g)) if (LETTERS.test(m[2])) found.push(`${m[1]}="${m[2]}"`);
  // Textknoten: Tags und Steuerblöcke (@if … {, } @else {, }) entfernen
  const text = noInterp
    // Tags inkl. Attributwerten mit > (z. B. [disabled]="a >= b")
    .replace(/<\/?[A-Za-z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g, ' ')
    .replace(/@\w+[^{]*\{/g, ' ')
    .replace(/[{}]/g, ' ');
  for (const chunk of text.split(/\s{2,}|\n/)) if (LETTERS.test(chunk)) found.push(chunk.trim());
  return found;
}

test('Vorlagen enthalten keine fest eingetragenen Texte (alles über i18n)', () => {
  const all = templates();
  assert.ok(all.length >= 6, 'zu wenige Vorlagen gefunden – Testlogik prüfen');
  const bad = all.flatMap(({ f, t }) => problems(t).map((p) => `${f.replace(APP + '/', '')}: ${p}`));
  assert.deepEqual(bad, []);
});

test('Prüfung schlägt bei festem Text an (Selbsttest)', () => {
  assert.deepEqual(problems('<p>Hallo</p>'), ['Hallo']);
  assert.deepEqual(problems('<button aria-label="Schließen">x</button>'), ['aria-label="Schließen"', 'x']);
  assert.deepEqual(problems('@if (a) { <p>{{ t("x") }}</p> } @else { <span>▲</span> }'), []);
  assert.deepEqual(problems('<button [disabled]="n >= max()" (click)="go()">{{ t("x") }}</button>'), []);
});
