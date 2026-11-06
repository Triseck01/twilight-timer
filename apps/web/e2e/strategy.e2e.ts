import { expect, test } from '@playwright/test';
import { createGame, expectNoA11yViolations } from './fixtures';

test.describe('Strategiephase (M3)', () => {
  test('5 Spieler: komplette Wahl liefert die richtige Aktionsreihenfolge (S1, S3, S6)', async ({ page }) => {
    await createGame(page, 5);
    await expect(page.getByTestId('pick-progress')).toHaveText('Wahl 1 von 5');
    await expect(page.getByTestId('next-picker')).toHaveText('Als Nächstes: Ben');
    await expect(page.getByTestId('countdown')).toHaveText(/^(5:00|4:5\d)$/);
    await expectNoA11yViolations(page);
    // Anna 5, Ben (Naalu) 8, Cem 1, Dana 3, Emil 2
    for (const card of [5, 8, 1, 3, 2]) await page.getByTestId(`card-${card}`).click();
    const rows = page.getByTestId('order-row');
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(0)).toContainText('Ben');
    await expect(rows.nth(0).locator('.initiative')).toHaveText('0');
    await expect(rows.nth(1)).toContainText('Cem');
    await expect(rows.nth(2)).toContainText('Emil');
    await expect(rows.nth(3)).toContainText('Dana');
    await expect(rows.nth(4)).toContainText('Anna');
    await expectNoA11yViolations(page);
  });

  test('3 Spieler: zwei Durchgänge in derselben Reihenfolge, niedrigere Karte zählt', async ({ page }) => {
    await createGame(page, 3);
    for (const card of [8, 3, 6]) await page.getByTestId(`card-${card}`).click();
    await expect(page.getByTestId('pick-progress')).toHaveText('Wahl 4 von 6 · Durchgang 2');
    await expect(page.getByTestId('picker-name')).toHaveText('Anna');
    for (const card of [2, 7, 1]) await page.getByTestId(`card-${card}`).click();
    // Anna 8+2 → 2, Ben (Naalu) → 0, Cem 6+1 → 1
    const rows = page.getByTestId('order-row');
    await expect(rows.nth(0)).toContainText('Ben');
    await expect(rows.nth(1)).toContainText('Cem');
    await expect(rows.nth(2)).toContainText('Anna');
  });

  test('vergebene Karte gesperrt mit Wähler; Undo holt den vorigen Wähler zurück (S3, S5)', async ({ page }) => {
    await createGame(page, 5);
    await expect(page.getByRole('button', { name: 'Rückgängig' })).toBeDisabled();
    await page.getByTestId('card-1').click();
    await expect(page.getByTestId('card-1')).toBeDisabled();
    await expect(page.getByTestId('card-1')).toContainText('Anna');
    await expect(page.getByTestId('picker-name')).toHaveText('Ben');
    await page.getByRole('button', { name: 'Rückgängig' }).click();
    await expect(page.getByTestId('picker-name')).toHaveText('Anna');
    await expect(page.getByTestId('card-1')).toBeEnabled();
    await page.getByRole('button', { name: 'Wiederholen' }).click();
    await expect(page.getByTestId('picker-name')).toHaveText('Ben');
  });

  test('Restzeit läuft live, wird rot im Minus; Pause hält sie an (S2, S4, S7)', async ({ page }) => {
    // Uhr läuft echt weiter; runFor springt vor. Daher kleine Toleranz (wenige echte Sekunden).
    await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
    await createGame(page, 5);
    await expect(page.getByTestId('countdown')).toHaveText(/^(5:00|4:5\d)$/);
    await page.clock.runFor(61_000);
    await expect(page.getByTestId('countdown')).toHaveText(/^3:5\d$/);
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByTestId('pause-overlay')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fortsetzen' })).toBeFocused();
    await expectNoA11yViolations(page);
    await page.clock.runFor(600_000);
    await expect(page.getByTestId('pause-duration')).toHaveText(/^10:0\d$/);
    await page.getByRole('button', { name: 'Fortsetzen' }).click();
    // 10 Minuten Pause haben nichts gekostet
    await expect(page.getByTestId('countdown')).toHaveText(/^3:5\d$/);
    await page.clock.runFor(250_000);
    await expect(page.getByTestId('countdown')).toHaveText(/^-0:1\d$/);
    await expect(page.getByTestId('countdown')).toHaveClass(/overtime/);
  });
});
