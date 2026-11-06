import { expect, test, type Page } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations } from './fixtures';

const active = (page: Page) => page.getByTestId('active-name');
async function intervene(page: Page, name: string) {
  await page.getByRole('button', { name: 'Eingriffe' }).click();
  await page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
}

test('Eingriffe in der Aktionsphase mit Undo (E2–E5, E8, E11, E12)', async ({ page }) => {
  await createGame(page, 5); // Anna 5, Ben 8 (Naalu), Cem 1, Dana 3, Emil 2
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await expect(active(page)).toHaveText('Ben');

  await page.getByRole('button', { name: 'Eingriffe' }).click();
  await expectNoA11yViolations(page);
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

  // E3 Zug überspringen
  await intervene(page, 'Zug überspringen');
  await page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' }).click();
  await expect(active(page)).toHaveText('Cem');

  // E2 Aktiven wählen → Anna
  await intervene(page, 'Aktiven Spieler wählen');
  await page.getByRole('dialog').getByRole('button', { name: 'Anna' }).click();
  await expect(active(page)).toHaveText('Anna');

  // E4 Zusatzzug für Dana, danach weiter nach Anna (Reihenfolge Ben, Cem, Emil, Dana, Anna → Ben)
  await intervene(page, 'Zusatzzug gewähren');
  await page.getByRole('dialog').getByRole('button', { name: 'Dana' }).click();
  await expect(active(page)).toHaveText('Dana');
  await page.getByRole('button', { name: 'Nächster Spieler' }).click();
  await expect(active(page)).toHaveText('Ben');

  // E5 Karten tauschen: Ben (8) ↔ Cem (1) → Initiative-Leiste ändert sich
  await intervene(page, 'Strategiekarten tauschen');
  await page.getByRole('dialog').getByRole('button', { name: /^8 · Imperium/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^1 · Führungsstärke/ }).click();
  await expect(page.getByTestId('card-badge-1')).toBeVisible(); // Ben hält jetzt Karte 1

  // E8 Bank +1 Minute für Ben
  await intervene(page, 'Bank ±1 Minute');
  await page.getByRole('button', { name: 'Ben: +1 Minute' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByTestId('bank')).toContainText('31:');

  // E11 Undo nimmt Eingriffe einzeln zurück
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByTestId('bank')).toContainText('30:');
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(page.getByTestId('card-badge-8')).toBeVisible();
});

test('Spiel beenden → Sieger → Feier überspringen → Endauswertung; Undo zurück (E9, E13–E15)', async ({ page }) => {
  await createGame(page, 5);
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await page.getByRole('button', { name: 'Nächster Spieler' }).click();

  await intervene(page, 'Spiel beenden');
  await expect(page.getByRole('dialog')).toContainText('Spiel wirklich beenden?');
  await page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Spiel beendet');
  await expect(page.getByTestId('winner-question')).toHaveText('Wer hat gewonnen?');
  await expectNoA11yViolations(page);
  await page.getByTestId('winner-option').filter({ hasText: 'Dana' }).click();

  await expect(page.getByTestId('celebration-title')).toHaveText('Sieg für Dana!');
  await page.getByTestId('celebration').click();
  await expect(page.getByTestId('celebration')).toHaveCount(0);

  await expect(page.getByTestId('final-winner')).toContainText('Dana');
  await expect(page.getByTestId('player-round-row')).toHaveCount(5);
  await expectNoA11yViolations(page);

  // Start zeigt „Spiel beendet“; zurück ins Spiel per Undo
  await page.getByRole('button', { name: 'Zurück ins Spiel' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Runde 1 · Aktionsphase');
});

test('Thunder\'s Edge: „Eingriffe“ steht oben (E10)', async ({ page }) => {
  await page.goto('./neues-spiel');
  await page.getByRole('checkbox', { name: "Thunder's Edge" }).check();
  await page.getByRole('button', { name: 'Weiter' }).click();
  const { fillPlayer, PLAYERS } = await import('./fixtures');
  for (let i = 0; i < 3; i++) await fillPlayer(page, i, PLAYERS[i]!);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  const iv = page.getByRole('button', { name: 'Eingriffe' });
  await expect(iv).toHaveClass(/prominent/);
  const ivBox = (await iv.boundingBox())!;
  const pauseBox = (await page.getByRole('button', { name: 'Pause' }).boundingBox())!;
  expect(ivBox.y).toBeLessThan(pauseBox.y);
});
