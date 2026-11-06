import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './fixtures';

test.describe('Start und Einstellungen', () => {
  test('Startbildschirm: Neues Spiel und Einstellungen, barrierefrei', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twilight Timer');
    await expect(page.getByRole('link', { name: 'Neues Spiel / New game' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('Einstellung bleibt nach dem Neuladen erhalten (Q1/E3)', async ({ page }) => {
    await page.goto('./');
    await page.getByRole('link', { name: 'Einstellungen / Settings' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Einstellungen / Settings');
    await page.getByRole('button', { name: 'Zugzeit erhöhen' }).click();
    await page.getByRole('button', { name: 'Zugzeit erhöhen' }).click();
    await expect(page.getByTestId('turnSec')).toHaveText('2:00');
    await expect(page.getByRole('button', { name: 'Eigene / Custom' })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByTestId('turnSec')).toHaveText('2:00');
    await expect(page.getByRole('button', { name: 'Eigene / Custom' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('Einstellungsseite ist barrierefrei (mit und ohne Gutschrift)', async ({ page }) => {
    await page.goto('./einstellungen');
    await expectNoA11yViolations(page);
    await page.getByRole('button', { name: 'Hybrid' }).click();
    await expect(page.getByTestId('bankCapSec')).toHaveCount(0);
    await expectNoA11yViolations(page);
  });

  test('Direktaufruf einer Unterseite funktioniert (SPA-Fallback wie auf GitHub Pages)', async ({ page }) => {
    await page.goto('./einstellungen');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Einstellungen / Settings');
  });
});
