import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { choose, createGame, expectNoA11yViolations } from './fixtures';

const seconds = (t: string | null) => {
  const [m, s] = (t ?? '').trim().split(':').map(Number);
  return m! * 60 + s!;
};

test('Neuladen mitten im Zug: Spiel und Zeit laufen korrekt weiter, Undo bleibt (P1, P2)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5);
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await expect(page.getByTestId('active-name')).toHaveText('Ben');
  await page.clock.runFor(20_000);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Runde 1 · Aktionsphase');
  await expect(page.getByTestId('active-name')).toHaveText('Ben');
  await expect(page.getByTestId('pause-overlay')).toHaveCount(0);
  expect(seconds(await page.getByTestId('countdown').textContent())).toBeLessThanOrEqual(70);
  await expect(page.getByRole('button', { name: 'Rückgängig' })).toBeEnabled();
});

test('lange Abwesenheit (> 5 min) → Pause ab der letzten Aktivität (P3)', async ({ page, context }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5);
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await page.clock.runFor(10_000);
  const before = seconds(await page.getByTestId('countdown').textContent());
  await page.close(); // App geschlossen

  const later = await context.newPage();
  await later.clock.install({ time: new Date('2026-11-06T18:30:00Z') }); // 30 Minuten später
  await later.goto('./spiel');
  await expect(later.getByTestId('pause-overlay')).toBeVisible();
  expect(Math.abs(seconds(await later.getByTestId('countdown').textContent()) - before)).toBeLessThanOrEqual(6);
});

test('Gespeicherte Spiele: Liste, Fortsetzen, Export/Import, Löschen (P4, P6)', async ({ page }, testInfo) => {
  await createGame(page, 3);
  await page.getByRole('link', { name: 'Hauptmenü' }).click();
  await expect(page.getByRole('link', { name: /Spiel fortsetzen/ })).toBeVisible();
  await page.getByRole('link', { name: 'Gespeicherte Spiele' }).click();
  const row = page.getByTestId('saved-game');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Anna');
  await expect(row).toContainText('Runde 1 · Strategiephase');
  await expectNoA11yViolations(page);

  // Export
  const downloadPromise = page.waitForEvent('download');
  await row.getByRole('button', { name: 'Exportieren' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^twilight-timer-.*\.json$/);
  const file = testInfo.outputPath('spiel.json');
  await download.saveAs(file);
  expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ format: 'twilight-timer-game' });

  // Import derselben Datei → zweites Spiel
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByTestId('import-message')).toHaveText('Spiel importiert.');
  await expect(page.getByTestId('saved-game')).toHaveCount(2);

  // Ungültige Datei
  await page.locator('input[type="file"]').setInputFiles({ name: 'kaputt.json', mimeType: 'application/json', buffer: Buffer.from('{kaputt') });
  await expect(page.getByTestId('import-message')).toContainText('Import fehlgeschlagen');
  await expect(page.getByTestId('saved-game')).toHaveCount(2);

  // Löschen mit Rückfrage
  await page.getByTestId('saved-game').first().getByRole('button', { name: 'Löschen' }).click();
  await expectNoA11yViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByTestId('saved-game')).toHaveCount(1);

  // Fortsetzen
  await page.getByTestId('saved-game').getByRole('button', { name: 'Fortsetzen' }).click();
  await expect(page).toHaveURL(/\/spiel$/);
  await expect(page.getByTestId('picker-name')).toHaveText('Anna');
});
