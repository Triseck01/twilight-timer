import { expect, test } from '@playwright/test';
import { createGame, expectNoA11yViolations } from './fixtures';

// M7-T: Ankündigung des Nächsten. Uhr läuft echt weiter; runFor springt vor – daher kleine Toleranz (Regex).
test('Strategie und Aktion: 8 s Ankündigung, Zeit läuft erst danach, Antippen startet sofort (T1–T4)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-06T18:00:00Z') });
  await createGame(page, 5, { announce: true }); // Anna 5, Ben 8 (Naalu), Cem 1, Dana 3, Emil 2
  const announce = page.getByTestId('announce');

  // T1: erste Wahl wird angekündigt
  await expect(page.getByTestId('announce-name')).toHaveText('Anna');
  await expect(announce).toContainText('ist dran');
  await expectNoA11yViolations(page);
  await page.clock.runFor(9_000);
  await expect(announce).toHaveCount(0);
  await expect(page.getByTestId('countdown')).toHaveText(/^(5:00|4:5\d)$/); // T2: Wahlzeit erst nach der Ankündigung

  // jede weitere Wahl: Ankündigung, Antippen startet sofort
  for (const [card, next] of [[5, 'Ben'], [8, 'Cem'], [1, 'Dana'], [3, 'Emil']] as const) {
    await page.getByTestId(`card-${card}`).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Wählen' }).click();
    await expect(page.getByTestId('announce-name')).toHaveText(next);
    await announce.click();
    await expect(announce).toHaveCount(0);
  }
  await page.getByTestId('card-2').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Wählen' }).click();

  // T1/T2: erster Zug der Aktionsphase (Ben) – 8 s ohne Zugzeit, Bank unverändert
  await expect(page.getByTestId('announce-name')).toHaveText('Ben');
  await page.clock.runFor(9_000);
  await expect(announce).toHaveCount(0);
  await expect(page.getByTestId('countdown')).toHaveText(/^(1:30|1:2\d)$/);
  await expect(page.getByTestId('bank')).toContainText('30:00');

  // nächster Zug: Ankündigung für Cem
  await page.getByTestId('card-badge-8').click();
  await page.getByRole('button', { name: 'Primär erledigt' }).click();
  await page.getByRole('button', { name: 'Rest: alle Nein' }).click();
  await expect(page.getByTestId('announce-name')).toHaveText('Cem');
  await expectNoA11yViolations(page);
});
