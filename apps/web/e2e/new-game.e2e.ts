import { expect, test } from '@playwright/test';
import { expectNoA11yViolations, fillPlayer, PLAYERS } from './fixtures';

test('Spiel mit 5 Spielern über drei Schritte anlegen (Q1), barrierefrei (Q2)', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Neues Spiel' }).click();

  // Schritt 1
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('1/3');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Schritt 2
  await expect(page.getByRole('heading', { level: 2 })).toContainText('2/3');
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  await expect(page.getByTestId('player-row')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Weiter' })).toBeDisabled();
  await expectNoA11yViolations(page);
  for (const [i, p] of PLAYERS.entries()) await fillPlayer(page, i, p);
  // Emil an Position 1 schieben → wird Sprecher
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: `Nach oben: Spieler ${5 - i}` }).click();
  await expect(page.getByTestId('player-row').first()).toContainText('Sprecher');
  await expect(page.getByTestId('player-row').first().getByRole('textbox')).toHaveValue('Emil');
  await page.getByTestId('player-row').nth(1).getByTestId('choose-faction').click();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Schließen' }).click();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Schritt 3
  await expect(page.getByRole('heading', { level: 2 })).toContainText('3/3');
  await expect(page.getByTestId('summary')).toContainText('Emil');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  // Spielansicht: Strategiephase, Sprecher Emil wählt zuerst
  await expect(page).toHaveURL(/\/spiel$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Runde 1 · Strategiephase');
  await expect(page.getByTestId('picker-name')).toHaveText('Emil');
  await expectNoA11yViolations(page);
});
