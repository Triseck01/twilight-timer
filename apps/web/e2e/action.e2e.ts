import { expect, test, type Page } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations } from './fixtures';

const big = (page: Page) => page.getByRole('button', { name: /^(Nächster Spieler|Primär erledigt)$/ });
const active = (page: Page) => page.getByTestId('active-name');

async function pass(page: Page) {
  await page.getByRole('button', { name: 'Passen', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Passen' }).click();
}

test('komplette Aktionsphase mit 5 Spielern (A1–A11)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5);
  // Anna 5, Ben (Naalu) 8, Cem 1, Dana 3, Emil 2 → Ben, Cem, Emil, Dana, Anna
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Runde 1 · Aktionsphase');
  await expect(active(page)).toHaveText('Ben');
  await expect(page.getByTestId('big-label')).toHaveText('Zugzeit');
  await expect(page.getByTestId('bank')).toHaveText('Bank 30:00');
  await expect(page.getByTestId('passed-count')).toHaveText('0/5 gepasst');
  await expect(page.getByRole('button', { name: 'Passen', exact: true })).toBeDisabled();
  await expect(page.getByTestId('pass-hint')).toHaveText('Erst Strategiekarte nutzen');
  await expectNoA11yViolations(page);

  // Zugzeit abgelaufen → große Uhr zeigt die Bank (A3)
  await page.clock.runFor(100_000);
  await expect(page.getByTestId('big-label')).toHaveText('Bank');
  await expect(page.getByTestId('turn-over')).toBeVisible();

  // Ben: Strategiekarte → Primär → Sekundär reihum (A5, A6)
  await page.getByTestId('card-badge-8').click();
  await expect(big(page)).toHaveText('Primär erledigt');
  await expect(page.getByTestId('pass-hint')).toHaveText('Erst „Primär erledigt“');
  await big(page).click();
  await expect(page.getByTestId('secondary-question')).toHaveText('Cem: Sekundärfähigkeit nutzen?');
  await expectNoA11yViolations(page);
  for (const answer of ['Ja', 'Nein', 'Ja', 'Nein']) await page.getByRole('button', { name: answer, exact: true }).click();
  await expect(active(page)).toHaveText('Cem');
  // Bens Überzug (≈ 10 s) ist von der Bank abgezogen
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByTestId('secondary-question')).toHaveText('Anna: Sekundärfähigkeit nutzen?');
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await expect(active(page)).toHaveText('Cem');

  await big(page).click(); // Cem taktisch
  await expect(active(page)).toHaveText('Emil');
  await page.getByTestId('card-badge-2').click();
  await big(page).click();
  await page.getByRole('button', { name: 'Rest: alle Nein' }).click();
  await expect(active(page)).toHaveText('Dana');
  await big(page).click(); // Dana taktisch (Karte 3 bleibt)
  await big(page).click(); // Anna taktisch (Karte 5 bleibt)
  await expect(active(page)).toHaveText('Ben');

  // Passen mit Rückfrage (A7)
  await page.getByRole('button', { name: 'Passen', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Ben passt?');
  await expectNoA11yViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
  await expect(active(page)).toHaveText('Ben');
  await pass(page);
  await expect(page.getByTestId('passed-count')).toHaveText('1/5 gepasst');
  await expect(page.getByTestId('initiative-chip').first()).toContainText('gepasst');

  await expect(active(page)).toHaveText('Cem');
  await page.getByTestId('card-badge-1').click();
  await big(page).click();
  await page.getByRole('button', { name: 'Rest: alle Nein' }).click();
  await expect(active(page)).toHaveText('Emil');
  await pass(page);
  await expect(active(page)).toHaveText('Dana');

  // Dana spielt ihre Karte (Politik), nachdem Ben und Emil gepasst haben: beide werden gefragt (A11)
  await page.getByTestId('card-badge-3').click();
  await big(page).click();
  await page.getByTestId('speaker-option').filter({ hasText: 'Emil' }).click(); // Politik: neuer Sprecher
  const chips = page.getByTestId('secondary-chip');
  await expect(chips).toHaveCount(4);
  await expect(chips.nth(0)).toContainText('Emil');
  await expect(chips.nth(0)).toContainText('gepasst');
  await expect(chips.nth(2)).toContainText('Ben');
  await expect(chips.nth(2)).toContainText('gepasst');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expect(active(page)).toHaveText('Anna'); // nächster nicht gepasster

  await page.getByTestId('card-badge-5').click();
  await big(page).click();
  await page.getByRole('button', { name: 'Rest: alle Nein' }).click();
  await expect(active(page)).toHaveText('Cem');
  await pass(page); // Cem
  await pass(page); // Dana
  await expect(active(page)).toHaveText('Anna');
  // Alle anderen haben gepasst: Anna bekommt je Aktion eine neue Zugzeit
  await page.clock.runFor(60_000);
  await big(page).click();
  await expect(active(page)).toHaveText('Anna');
  await expect(page.getByTestId('countdown')).toHaveText(/^1:(30|29|28)$/);
  await pass(page);
  await expect(page.getByTestId('agenda-question')).toHaveText('Agendaphase aktiv?');
  await expectNoA11yViolations(page);
});
