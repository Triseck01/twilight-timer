import { expect, test } from '@playwright/test';
import { choose, createGame } from './fixtures';

test('Aktionsphase: alle Bedienelemente ohne Scrollen sichtbar, auch in der Sekundärphase (iPad quer)', async ({ page }) => {
  await createGame(page, 5);
  for (const card of [5, 8, 1, 3, 2]) await choose(page, card);
  const viewport = page.viewportSize()!;
  const inView = async (name: string | RegExp) => {
    const box = (await page.getByRole('button', { name, exact: typeof name === 'string' }).boundingBox())!;
    expect(box.y + box.height, `${name} unten abgeschnitten`).toBeLessThanOrEqual(viewport.height);
  };
  await inView('Nächster Spieler');
  await expect(page.getByRole('link', { name: 'Hauptmenü' })).toBeInViewport();
  await page.getByTestId('card-badge-8').click();
  await page.getByRole('button', { name: 'Primär erledigt' }).click();
  for (const name of ['Ja', 'Nein', 'Rest: alle Nein']) await inView(name);
});
