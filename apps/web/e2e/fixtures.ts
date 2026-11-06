import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Barrierefreiheit (Q2): keine axe-Verstöße nach WCAG 2.x A/AA. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export interface TestPlayer {
  readonly name: string;
  readonly color: string;
  readonly search: string;
  readonly faction: string;
}

export const PLAYERS: readonly TestPlayer[] = [
  { name: 'Anna', color: 'Rot', search: 'sol', faction: 'The Federation of Sol' },
  { name: 'Ben', color: 'Schwarz', search: 'naalu', faction: 'The Naalu Collective' },
  { name: 'Cem', color: 'Neonpink', search: 'hacan', faction: 'The Emirates of Hacan' },
  { name: 'Dana', color: 'Gold', search: 'nomad', faction: 'The Nomad' },
  { name: 'Emil', color: 'Blau', search: 'keleres', faction: 'The Council Keleres' },
];

export async function fillPlayer(page: Page, index: number, p: TestPlayer): Promise<void> {
  const row = page.getByTestId('player-row').nth(index);
  await row.getByRole('textbox').fill(p.name);
  await row.getByRole('radio', { name: p.color }).check({ force: true });
  await row.getByTestId('choose-faction').click();
  await page.getByTestId('faction-search').fill(p.search);
  await page.getByTestId('faction-option').filter({ hasText: p.faction }).click();
}

/** Legt über die Oberfläche ein Spiel mit den ersten `n` Testspielern an und landet in der Spielansicht. */
export async function createGame(page: Page, n: number): Promise<void> {
  await page.goto('./neues-spiel');
  await page.getByRole('button', { name: 'Weiter' }).click();
  for (let i = 3; i < n; i++) await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  for (let i = 0; i < n; i++) await fillPlayer(page, i, PLAYERS[i]!);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expect(page).toHaveURL(/\/spiel$/);
}
