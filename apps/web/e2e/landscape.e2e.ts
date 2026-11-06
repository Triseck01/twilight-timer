import { expect, test, type Page } from '@playwright/test';
import { choose, createGame, expectNoA11yViolations, fillPlayer, playThroughActionPhase, type TestPlayer } from './fixtures';

/**
 * M7-UI: Das iPad quer wird ausgenutzt (U1–U8). Gemessen in CSS-Pixeln (iPad Pro 11 quer: 1194 × 834).
 * U1: Der Inhalt der Hauptspalte reicht bis an den unteren Rand (abzüglich Rand von 2 rem + Toleranz).
 */
async function expectLandscapeUsed(page: Page, logo: string | null) {
  const m = await page.evaluate((logoSel) => {
    const main = document.querySelector('main.main')!;
    const bottoms = [...main.querySelectorAll('*')]
      // nur sichtbarer Inhalt: Elemente ohne Kinder oder mit Rahmen (gestreckte Hüllen zählen nicht)
      .filter((e) => e.getClientRects().length > 0 && !e.closest('[role="dialog"]'))
      .filter((e) => e.children.length === 0 || parseFloat(getComputedStyle(e).borderBottomWidth) > 0)
      .map((e) => e.getBoundingClientRect().bottom);
    const big = document.querySelector('app-countdown.large .time');
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const clipped = [...main.querySelectorAll<HTMLElement>('[data-testid$="faction"], [data-testid$="name"], .chip, .label')].filter(
      (e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > main.getBoundingClientRect().right + 1,
    );
    return {
      scroll: document.documentElement.scrollHeight - window.innerHeight,
      gap: window.innerHeight - Math.max(...bottoms),
      clock: big ? parseFloat(getComputedStyle(big).fontSize) / rem : null,
      logo: logoSel ? (document.querySelector(logoSel)?.getBoundingClientRect().width ?? 0) : null,
      clipped: clipped.map((e) => e.textContent?.trim()),
    };
  }, logo);
  expect(m.scroll, 'kein Scrollen').toBeLessThanOrEqual(0);
  expect(m.gap, 'kein leerer Streifen unten (U1)').toBeLessThanOrEqual(56);
  if (m.clock !== null) expect(m.clock, 'Uhr ≥ 16 rem (U3)').toBeGreaterThanOrEqual(16);
  if (m.logo !== null) expect(m.logo, 'Logo ≥ 96 px (U2)').toBeGreaterThanOrEqual(96);
  expect(m.clipped, 'nichts abgeschnitten').toEqual([]);
}

const logoCount = (page: Page, chip: string) => page.getByTestId(chip).locator('img, .initials').count();

test('5 Spieler: alle Phasen nutzen den Platz, große Logos, Logos in Leisten und „Als Nächstes“ (U1–U6, U8)', async ({ page }) => {
  await createGame(page, 5);
  await expectLandscapeUsed(page, '[data-testid="picker-logo"] img');
  await expect(page.getByTestId('next-picker').locator('img, .initials')).toHaveCount(1); // U5

  for (const card of [5, 8, 1, 4, 2]) await choose(page, card);
  await expectLandscapeUsed(page, '[data-testid="active-logo"] img');
  expect(await logoCount(page, 'initiative-chip')).toBe(5); // U4
  await expect(page.getByTestId('next-actor').locator('img, .initials')).toHaveCount(1); // U5
  await expectNoA11yViolations(page);

  await page.getByTestId('card-badge-8').click();
  await page.getByRole('button', { name: 'Primär erledigt' }).click();
  await expectLandscapeUsed(page, null);
  expect(await logoCount(page, 'secondary-chip')).toBe(4);
  await page.getByRole('button', { name: 'Rest: alle Nein' }).click();

  await playThroughActionPhase(page);
  await page.getByRole('button', { name: 'Ja', exact: true }).click();
  await expectLandscapeUsed(page, null); // Status
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await expectLandscapeUsed(page, '[data-testid="speaker"] img');
  await page.getByRole('button', { name: 'Vorgelesen', exact: true }).click();
  await expectLandscapeUsed(page, null);
  expect(await logoCount(page, 'queue-chip')).toBe(5);
  await page.getByRole('button', { name: 'Niemand mehr' }).click();
  await page.getByRole('button', { name: 'Niemand mehr' }).click();
  await expectLandscapeUsed(page, '[data-testid="voter-logo"] img');
  expect(await logoCount(page, 'queue-chip')).toBe(5);
  await expectNoA11yViolations(page);
});

const EIGHT: readonly TestPlayer[] = [
  { name: 'Maximilian', color: 'Rot', search: 'jol', faction: 'The Universities of Jol-Nar' },
  { name: 'Ben', color: 'Schwarz', search: 'mahact', faction: 'The Mahact Gene-Sorcerers' },
  { name: 'Cem', color: 'Neonpink', search: 'vuil', faction: "The Vuil'raith Cabal" },
  { name: 'Dana', color: 'Gold', search: 'nomad', faction: 'The Nomad' },
  { name: 'Emil', color: 'Blau', search: 'keleres', faction: 'The Council Keleres' },
  { name: 'Fritzi', color: 'Grün', search: 'sol', faction: 'The Federation of Sol' },
  { name: 'Gustav', color: 'Lila', search: 'nekro', faction: 'The Nekro Virus' },
  { name: 'Hanne', color: 'Neonorange', search: 'hacan', faction: 'The Emirates of Hacan' },
];

test('8 Spieler mit langen Volksnamen: nichts abgeschnitten, kein Scrollen (U8)', async ({ page }) => {
  await page.goto('./neues-spiel');
  await page.getByRole('button', { name: 'Weiter' }).click();
  for (let i = 3; i < 8; i++) await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  for (let i = 0; i < 8; i++) await fillPlayer(page, i, EIGHT[i]!);
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: 'Spiel starten' }).click();
  await expectLandscapeUsed(page, '[data-testid="picker-logo"] img');
  for (const card of [1, 2, 3, 4, 5, 6, 7, 8]) await choose(page, card);
  await expectLandscapeUsed(page, '[data-testid="active-logo"] img');
  expect(await logoCount(page, 'initiative-chip')).toBe(8);
  await expectNoA11yViolations(page);
});
