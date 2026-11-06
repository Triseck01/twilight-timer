import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Barrierefreiheit (Q2): keine axe-Verstöße nach WCAG 2.x A/AA. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
