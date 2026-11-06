import { expect, test } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations } from './fixtures';

/** „m:ss“ → Sekunden. */
const seconds = (t: string | null) => {
  const [m, s] = (t ?? '').trim().split(':').map(Number);
  return m! * 60 + s!;
};

test.describe('Hauptmenü und Fortsetzen (M3-H)', () => {
  test('Spiel → Hauptmenü → Uhr steht → fortsetzen → weiter (H1–H3, H6)', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
    await createGame(page, 5);
    await choose(page, 5);
    await page.clock.runFor(30_000);
    await expect(page.getByTestId('countdown')).toHaveText(/^4:[23]\d$/);
    const before = await page.getByTestId('countdown').textContent();

    await page.getByRole('link', { name: 'Hauptmenü' }).click();
    await expect(page).toHaveURL(/\/twilight-timer\/$/);
    const cont = page.getByRole('link', { name: /Spiel fortsetzen/ });
    await expect(cont).toContainText('Runde 1 · Strategiephase');
    await expectNoA11yViolations(page);

    await page.clock.runFor(600_000);
    await cont.click();
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    // 10 Minuten im Hauptmenü zählen nicht (Toleranz: wenige echte Sekunden des Testlaufs)
    const after = seconds(await page.getByTestId('countdown').textContent());
    expect(Math.abs(after - seconds(before))).toBeLessThanOrEqual(3);
    await page.getByRole('button', { name: 'Fortsetzen' }).click();
    await expect(page.getByTestId('picker-name')).toHaveText('Ben');
    await page.clock.runFor(10_000);
    await expect.poll(async () => seconds(await page.getByTestId('countdown').textContent())).toBeLessThan(after - 5);
  });

  test('„Neues Spiel“ bei laufendem Spiel fragt nach (H4)', async ({ page }) => {
    await createGame(page, 3);
    await page.getByRole('link', { name: 'Hauptmenü' }).click();
    await page.getByRole('button', { name: 'Neues Spiel' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Laufendes Spiel verwerfen?');
    await expectNoA11yViolations(page);
    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByRole('link', { name: /Spiel fortsetzen/ })).toBeVisible();
    await page.getByRole('button', { name: 'Neues Spiel' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Verwerfen' }).click();
    await expect(page).toHaveURL(/\/neues-spiel$/);
    await page.goto('./');
    await expect(page.getByRole('link', { name: /Spiel fortsetzen/ })).toHaveCount(0);
  });
});
