import { expect, test, type Page } from '@playwright/test';
import { expectNoA11yViolations } from './fixtures';

const PLAYERS = [
  { name: 'Anna', color: 'Rot / Red', search: 'sol', faction: 'The Federation of Sol' },
  { name: 'Ben', color: 'Schwarz / Black', search: 'naalu', faction: 'The Naalu Collective' },
  { name: 'Cem', color: 'Neonpink / Neon pink', search: 'hacan', faction: 'The Emirates of Hacan' },
  { name: 'Dana', color: 'Gold', search: 'nomad', faction: 'The Nomad' },
  { name: 'Emil', color: 'Blau / Blue', search: 'keleres', faction: 'The Council Keleres' },
];

async function fillPlayer(page: Page, index: number, p: (typeof PLAYERS)[number]) {
  const row = page.getByTestId('player-row').nth(index);
  await row.getByRole('textbox').fill(p.name);
  await row.getByRole('radio', { name: p.color }).check({ force: true });
  await row.getByTestId('choose-faction').click();
  await page.getByTestId('faction-search').fill(p.search);
  await page.getByTestId('faction-option').filter({ hasText: p.faction }).click();
}

test('Spiel mit 5 Spielern über drei Schritte anlegen (Q1), barrierefrei (Q2)', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('link', { name: 'Neues Spiel / New game' }).click();

  // Schritt 1
  await expect(page.getByRole('heading', { level: 2 }).first()).toContainText('1/3');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Weiter / Next' }).click();

  // Schritt 2
  await expect(page.getByRole('heading', { level: 2 })).toContainText('2/3');
  await page.getByRole('button', { name: 'Spieler hinzufügen / Add player' }).click();
  await page.getByRole('button', { name: 'Spieler hinzufügen / Add player' }).click();
  await expect(page.getByTestId('player-row')).toHaveCount(5);
  await expect(page.getByRole('button', { name: 'Weiter / Next' })).toBeDisabled();
  await expectNoA11yViolations(page);
  for (const [i, p] of PLAYERS.entries()) await fillPlayer(page, i, p);
  // Emil an Position 1 schieben → wird Sprecher
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: `Nach oben: Spieler ${5 - i}` }).click();
  await expect(page.getByTestId('player-row').first()).toContainText('Sprecher / Speaker');
  await expect(page.getByTestId('player-row').first().getByRole('textbox')).toHaveValue('Emil');
  await page.getByTestId('player-row').nth(1).getByTestId('choose-faction').click();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Schließen / Close' }).click();
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Weiter / Next' }).click();

  // Schritt 3
  await expect(page.getByRole('heading', { level: 2 })).toContainText('3/3');
  await expect(page.getByTestId('summary')).toContainText('Emil');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Spiel starten / Start game' }).click();

  // Platzhalter
  await expect(page).toHaveURL(/\/spiel$/);
  const items = page.getByRole('listitem');
  await expect(items).toHaveCount(5);
  await expect(items.first()).toContainText('Emil');
  await expect(items.first()).toContainText('Sprecher / Speaker');
  await expect(items.filter({ hasText: 'Ben' })).toContainText('Initiative 0');
  await expectNoA11yViolations(page);
});
