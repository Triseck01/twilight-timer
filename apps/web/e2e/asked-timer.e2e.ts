import { expect, test } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations, playThroughActionPhase } from './fixtures';

// Uhr läuft echt weiter; runFor springt vor. Daher kleine Toleranz (Regex).
test('Sekundärphase: Bedenkzeit je Person groß, nach jeder Antwort wieder 0:00; Tisch-Timer klein (W1–W3, W7)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5); // Anna 5, Ben 8 (Naalu), Cem 1, Dana 3, Emil 2
  for (const card of [5, 8, 1, 4, 2]) await choose(page, card);
  await page.getByTestId('card-badge-8').click();
  await page.getByRole('button', { name: 'Primär erledigt' }).click();

  await expect(page.getByTestId('asked-timer-label')).toHaveText('Cem');
  await page.clock.runFor(20_000);
  await expect(page.getByTestId('asked-timer')).toHaveText(/^0:2\d$/);
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await expect(page.getByTestId('asked-timer-label')).toHaveText('Dana');
  await expect(page.getByTestId('asked-timer')).toHaveText(/^0:0\d$/);
  await expect(page.getByTestId('table-timer')).toHaveText(/^0:2\d$/);
});

test('Agenda-Fenster: Bedenkzeit je Person, nach jeder Antwort wieder 0:00 (W1–W3, W7)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5);
  for (const card of [5, 8, 1, 4, 2]) await choose(page, card);
  await playThroughActionPhase(page);
  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await page.getByRole('button', { name: 'Vorgelesen', exact: true }).click();

  await expect(page.getByTestId('asked-timer-label')).toHaveText('Anna');
  await page.clock.runFor(35_000);
  await expect(page.getByTestId('asked-timer')).toHaveText(/^0:3\d$/);
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await expect(page.getByTestId('asked-timer-label')).toHaveText('Ben');
  await expect(page.getByTestId('asked-timer')).toHaveText(/^0:0\d$/);
  await expect(page.getByTestId('table-timer')).toHaveText(/^0:3\d$/);
  await expectNoA11yViolations(page);
});
