import { expect, test, type Page } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations, playThroughActionPhase } from './fixtures';

const heading = (page: Page) => page.getByRole('heading', { level: 1 });
const big = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

async function agenda(page: Page, n: 1 | 2) {
  await expect(page.getByTestId('agenda-title')).toHaveText(`Agenda ${n} von 2 – Sprecher liest vor`);
  await big(page, 'Vorgelesen').click();
  await expect(page.getByTestId('window-title')).toHaveText('Sobald eine Agenda aufgedeckt wird');
  await page.getByRole('button', { name: 'Niemand mehr' }).click();
  await expect(page.getByTestId('window-title')).toHaveText('Nachdem eine Agenda aufgedeckt wurde');
  await page.getByRole('button', { name: 'Niemand mehr' }).click();
  for (let i = 0; i < 5; i++) await big(page, 'Stimme abgegeben').click();
  await expect(page.getByTestId('resolve-title')).toHaveText('Ergebnis abhandeln');
  await big(page, 'Abgehandelt').click();
}

test('Rundenzyklus mit „Ja“: Status, zwei Agenden mit Zeitfenstern, Runde 2 beginnt beim Sprecher (G1–G11)', async ({ page }) => {
  await createGame(page, 5); // Sprecher Anna
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await playThroughActionPhase(page);

  // G1
  await expect(page.getByTestId('agenda-question')).toHaveText('Agendaphase aktiv?');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Ja', exact: true }).click();

  // G2
  await expect(heading(page)).toHaveText('Runde 1 · Statusphase');
  await expect(page.getByTestId('status-step')).toHaveCount(8);
  await expect(page.getByTestId('scoring-chip').first()).toContainText('Ben');
  await expectNoA11yViolations(page);
  await big(page, 'Weiter').click();

  // G3, G8–G10: Agenda 1 mit Zeitfenstern ab Sprecher, Wiederholung nach „Ja“
  await expect(heading(page)).toHaveText('Runde 1 · Agendaphase');
  await expect(page.getByTestId('speaker')).toContainText('Anna');
  await big(page, 'Vorgelesen').click();
  await expect(page.getByTestId('window-question')).toHaveText('Anna: Aktionskarte spielen?');
  await page.getByRole('button', { name: 'Ja, gespielt' }).click();
  for (const name of ['Ben', 'Cem', 'Dana', 'Emil']) {
    await expect(page.getByTestId('window-question')).toHaveText(`${name}: Aktionskarte spielen?`);
    await page.getByRole('button', { name: 'Nein', exact: true }).click();
  }
  // nach dem „Ja“ beginnt die Runde erneut – Anna wird noch einmal gefragt
  await expect(page.getByTestId('window-question')).toHaveText('Anna: Aktionskarte spielen?');
  await expectNoA11yViolations(page);
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await expect(page.getByTestId('window-title')).toHaveText('Nachdem eine Agenda aufgedeckt wurde');
  await page.getByRole('button', { name: 'Niemand mehr' }).click();

  // G4: Abstimmung links vom Sprecher, Sprecher zuletzt
  await expect(page.getByTestId('voter-name')).toHaveText('Ben');
  await expect(page.getByTestId('countdown')).toHaveText(/^(3:00|2:5\d)$/);
  await expectNoA11yViolations(page);
  for (const name of ['Ben', 'Cem', 'Dana', 'Emil', 'Anna']) {
    await expect(page.getByTestId('voter-name')).toHaveText(name);
    await big(page, 'Stimme abgegeben').click();
  }
  // G11
  await expect(page.getByTestId('resolve-title')).toHaveText('Ergebnis abhandeln');
  await big(page, 'Abgehandelt').click();

  // Agenda 2 mit Hinweis
  await expect(page.getByTestId('planets-hint')).toHaveText('Nach dieser Agenda: Planeten spielbereit machen');
  await agenda(page, 2);

  // G5: Runde 2 beim Sprecher, Handelswaren
  await expect(heading(page)).toHaveText('Runde 2 · Strategiephase');
  await expect(page.getByTestId('picker-name')).toHaveText('Anna');
  await expect(page.getByTestId('card-4-goods')).toHaveText('+1 Handelsware');

  // G7: Ende von Runde 2 – keine Agendafrage mehr
  for (const card of [4, 6, 7, 1, 2]) await choose(page, card);
  await playThroughActionPhase(page);
  await expect(heading(page)).toHaveText('Runde 2 · Statusphase');
});

test('Rundenzyklus mit „Nein“: keine Agenda, Frage kommt in Runde 2 wieder (G1, G7)', async ({ page }) => {
  await createGame(page, 3);
  for (const card of [1, 2, 3, 4, 5, 6]) await choose(page, card);
  await playThroughActionPhase(page);
  await page.getByRole('button', { name: 'Nein', exact: true }).click();
  await big(page, 'Weiter').click();
  await expect(heading(page)).toHaveText('Runde 2 · Strategiephase');
  // Undo über die Phasengrenze zurück in die Statusphase (G6)
  await page.getByRole('button', { name: 'Rückgängig' }).click();
  await expect(heading(page)).toHaveText('Runde 1 · Statusphase');
  await big(page, 'Weiter').click();
  for (const card of [1, 2, 3, 4, 5, 6]) await choose(page, card);
  await playThroughActionPhase(page);
  await expect(page.getByTestId('agenda-question')).toBeVisible();
});

test('Agendaphase: alle Bedienelemente ohne Scrollen sichtbar (G6)', async ({ page }) => {
  await createGame(page, 5);
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  await playThroughActionPhase(page);
  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await big(page, 'Weiter').click();
  await big(page, 'Vorgelesen').click();
  for (const name of ['Niemand mehr', 'Nein', 'Ja, gespielt', 'Agenda ersetzt']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
  }
});
