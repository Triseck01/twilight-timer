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

/** Wählt in der Strategiephase eine Karte: antippen und in der Abfrage bestätigen (M3-C). */
export async function choose(page: Page, card: number): Promise<void> {
  await page.getByTestId(`card-${card}`).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Wählen' }).click();
}

/**
 * Spielt die Aktionsphase schnell durch: Karte nutzen → Primär → (Politik: Sprecher wählen) → „Rest: alle Nein“,
 * danach passen alle. Nach jedem Klick wird gewartet, bis die Oberfläche den nächsten Schritt zeigt – sonst
 * entscheidet die Schleife auf einem halb gezeichneten Stand (z. B. Passen, obwohl noch eine Karte offen ist).
 */
export async function playThroughActionPhase(page: Page): Promise<void> {
  const done = page.getByTestId('agenda-question').or(page.getByRole('heading', { level: 1, name: /Statusphase/ }));
  const speakerQuestion = page.getByTestId('speaker-question');
  const rest = page.getByRole('button', { name: 'Rest: alle Nein' });
  const pass = page.getByRole('button', { name: 'Passen', exact: true });
  const next = done.or(speakerQuestion).or(rest).or(pass);
  for (let i = 0; i < 60; i++) {
    await expect(next.first()).toBeVisible();
    if (await done.first().isVisible()) return;
    if (await speakerQuestion.isVisible()) {
      await page.locator('[data-testid="speaker-option"]:enabled').first().click();
      await expect(speakerQuestion).toBeHidden();
      continue;
    }
    if (await rest.isVisible()) {
      await rest.click();
      await expect(rest).toBeHidden();
      continue;
    }
    if (await pass.isDisabled()) {
      // Passen gesperrt → der Aktive hat noch eine Karte: nutzen und Primär abschließen
      await page.locator('[data-testid^="card-badge-"]:enabled').first().click();
      await page.getByRole('button', { name: 'Primär erledigt' }).click();
      await expect(speakerQuestion.or(rest).first()).toBeVisible();
      continue;
    }
    const before = await page.getByTestId('active-name').textContent();
    await pass.click();
    await page.getByRole('dialog').getByRole('button', { name: 'Passen' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(done.first().or(page.getByTestId('active-name').filter({ hasNotText: before ?? '' }))).toBeVisible();
  }
  throw new Error('Aktionsphase endete nicht');
}
