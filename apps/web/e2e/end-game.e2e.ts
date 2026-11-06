import { expect, test, type Page } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations, playThroughActionPhase } from './fixtures';

const heading = (page: Page) => page.getByRole('heading', { level: 1 });

test('Kleiner Knopf „Spiel beenden“ in der Steuerleiste: Rückfrage, Abbrechen, Bestätigen (SE2)', async ({ page }) => {
  await createGame(page, 5);
  await expect(heading(page)).toHaveText('Runde 1 · Strategiephase');

  await page.getByRole('button', { name: 'Spiel beenden', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Spiel wirklich beenden?');
  await expectNoA11yViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await expect(heading(page)).toHaveText('Runde 1 · Strategiephase');

  await page.getByRole('button', { name: 'Spiel beenden', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' }).click();
  await expect(heading(page)).toHaveText('Spiel beendet');
  await expect(page.getByTestId('winner-question')).toHaveText('Wer hat gewonnen?');
});

test('Statusphase: „Spiel beenden (Siegpunktziel erreicht)“ neben „Weiter“ (SE1, SE3)', async ({ page }) => {
  await createGame(page, 5);
  for (const card of [5, 8, 1, 4, 2]) await choose(page, card);
  await playThroughActionPhase(page);
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await expect(heading(page)).toHaveText('Runde 1 · Statusphase');

  await expect(page.getByRole('button', { name: 'Weiter', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Spiel beenden (Siegpunktziel erreicht)' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' }).click();
  await expect(heading(page)).toHaveText('Spiel beendet');
  await page.getByRole('button', { name: 'Ohne Sieger beenden' }).click();
  await expect(page.getByTestId('final-winner')).toHaveText('Ohne Sieger');
  await expectNoA11yViolations(page);
});
