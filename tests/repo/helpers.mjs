import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const path = (...parts) => join(ROOT, ...parts);
export const exists = (...parts) => existsSync(path(...parts));
export const read = (...parts) => readFileSync(path(...parts), 'utf8');
export const readJson = (...parts) => JSON.parse(read(...parts));
