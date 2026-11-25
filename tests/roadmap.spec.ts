import { expect, test, type Page } from '@playwright/test';

const exhibit = (page: Page) => page.locator('[data-roadmap-exhibit]');
const map = (page: Page) => exhibit(page).getByRole('region', { name: 'Systems map' });
const matrix = (page: Page) => exhibit(page).getByRole('region', { name: 'Prioritization matrix' });
const sequence = (page: Page) => exhibit(page).getByRole('region', { name: 'Implementation sequence' });
const detail = (page: Page) => exhibit(page).locator('[data-detail-title]');

async function openRoadmap(page: Page) {
  await page.goto('/services/');
  const report = page.locator('.sample-report__disclosure');
  await expect(exhibit(page)).toHaveAttribute('data-enhanced', '');
  if ((await report.getAttribute('open')) === null) await report.locator('summary').click();
  await expect(exhibit(page)).toBeVisible();
}

test('coordinates the three panels and highlights many-to-many relationships', async ({ page }) => {
  await openRoadmap(page);
  const donor = map(page).getByRole('button', { name: 'Donor CRM' });
  await donor.click();
  await expect(donor).toHaveAttribute('aria-pressed', 'true');
  await expect(matrix(page).locator('.is-related')).toHaveCount(2);
  await expect(sequence(page).locator('.is-related')).toHaveCount(2);
  await expect(exhibit(page).locator('[data-detail-copy]')).toContainText('Develop shared reporting views');

  const marker = matrix(page).getByRole('button', { name: /Opportunity 3: Connect donor/ });
  await marker.click();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(sequence(page).getByRole('button', { name: 'Connect donor and volunteer records' })).toHaveAttribute('aria-pressed', 'true');
  await expect(donor).toHaveClass(/is-related/);
  await expect(map(page).getByRole('button', { name: 'Volunteer system' })).toHaveClass(/is-related/);
  await expect(map(page).getByRole('button', { name: 'Program records' })).not.toHaveClass(/is-related/);

  await sequence(page).getByRole('button', { name: 'Automate monthly reporting' }).click();
  await expect(matrix(page).getByRole('button', { name: /Opportunity 2:/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page).locator('[data-from="reconciliation"]')).toHaveClass(/is-related/);
  await expect(map(page).locator('[data-from="donor"]')).not.toHaveClass(/is-related/);
  await expect(exhibit(page).getByRole('status')).toContainText('Automate monthly reporting selected');
});

test('keyboard previews, activation and reset preserve clear accessible state', async ({ page }) => {
  await openRoadmap(page);
  const marker = matrix(page).getByRole('button', { name: /Opportunity 1:/ });
  await marker.focus();
  await expect(detail(page)).toHaveText('Standardize reporting definitions');
  await expect(marker).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Space');
  await expect(marker).toHaveAttribute('aria-pressed', 'true');

  const donor = map(page).getByRole('button', { name: 'Donor CRM' });
  await donor.focus();
  await expect(detail(page)).toHaveText('Donor CRM');
  await expect(marker).toHaveAttribute('aria-pressed', 'true');

  const reset = exhibit(page).getByRole('button', { name: 'Clear selection' });
  await reset.focus();
  await expect(detail(page)).toHaveText('Standardize reporting definitions');
  await page.keyboard.press('Enter');
  await expect(detail(page)).toHaveText('Connect systems to decisions');
  await expect(exhibit(page).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(exhibit(page).getByRole('status')).toHaveText('Roadmap selection cleared.');
});

test('a newer keyboard preview takes precedence over a stationary pointer', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile', 'Mouse hover requires the desktop project');
  await openRoadmap(page);
  const selected = map(page).getByRole('button', { name: 'Donor CRM' });
  await selected.click();
  const marker = matrix(page).getByRole('button', { name: /Opportunity 5:/ });
  await marker.hover();
  await expect(detail(page)).toHaveText('Refresh internal templates');
  await page.mouse.move(1, 1);
  await expect(detail(page)).toHaveText('Donor CRM');
  await marker.hover();
  const step = sequence(page).getByRole('button', { name: 'Develop shared reporting views' });
  await step.focus();
  await expect(detail(page)).toHaveText('Develop shared reporting views');
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
});

test('mobile tap selections remain active across the stacked views and disclosure', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile', 'Tap interaction requires the mobile project');
  await page.goto('/services/');
  const report = page.locator('.sample-report__disclosure');
  const summary = report.locator('summary');
  await expect(report).not.toHaveAttribute('open', '');
  await summary.tap();
  await matrix(page).getByRole('button', { name: /Opportunity 4:/ }).tap();
  const step = sequence(page).getByRole('button', { name: 'Develop shared reporting views' });
  await exhibit(page).getByRole('navigation', { name: 'Roadmap views' }).getByRole('link', { name: 'Sequence' }).tap();
  await expect(page).toHaveURL(/#roadmap-sequence$/);
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  await expect(map(page).getByRole('button', { name: 'Grant reporting' })).toHaveClass(/is-related/);
  await summary.tap();
  await summary.tap();
  await expect(step).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(await page.evaluate(() => innerWidth));
});

test('the disclosure and related systems remain readable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 320, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto('/services/');
    await page.locator('.sample-report__disclosure summary').click();
    await expect(map(page).getByText('Manual reconciliation', { exact: true })).toBeVisible();
    await expect(matrix(page).getByText('Strategic builds', { exact: true })).toBeVisible();
    await expect(sequence(page).getByText('Standardize reporting definitions')).toBeVisible();
    await expect(exhibit(page).getByText('These are the related systems', { exact: false })).toBeVisible();
    await expect(exhibit(page).getByRole('button', { name: 'Clear selection' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  } finally {
    await context.close();
  }
});

test('decoration is inert and Roadmap selections respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.locator('[data-network-accent]').evaluateAll((nodes) =>
    nodes.every((node) => node.getAttribute('aria-hidden') === 'true' && getComputedStyle(node).pointerEvents === 'none')
  )).toBe(true);
  await expect(page.getByRole('link', { name: 'Book a free call' }).first()).toBeVisible();

  await openRoadmap(page);
  const marker = matrix(page).getByRole('button', { name: /Opportunity 2:/ });
  await marker.click();
  expect(await marker.evaluate((node) => getComputedStyle(node).animationName)).toBe('none');
  expect(await marker.evaluate((node) =>
    getComputedStyle(node).transitionDuration.split(',').every((duration) => parseFloat(duration) < 0.001)
  )).toBe(true);
  await expect(detail(page)).toHaveText('Automate monthly reporting');
});
