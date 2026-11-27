import { expect, test, type Locator, type Page } from '@playwright/test';

const exhibit = (page: Page) => page.locator('connection-map');
const button = (page: Page, label: string) => exhibit(page).getByRole('button', { name: label, exact: true });
const heading = (page: Page) => exhibit(page).locator('[data-map-heading]');
const stage = (page: Page, name: string) => button(page, name);
const svg = (page: Page) => exhibit(page).locator('[data-map-scene]');
const progress = async (page: Page) => exhibit(page).locator('[data-map-progress]').evaluate(node => parseFloat(node.style.width) * 0.38);
const visibility = (page: Page, selector: string) => svg(page).locator(selector).evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('opacity'))));

async function open(page: Page) {
  await page.goto('/services/');
  await expect(svg(page)).toBeVisible();
}

async function start(page: Page) {
  const initial = new Date('2026-11-27T12:00:00Z');
  await page.clock.install({ time: initial });
  await page.clock.pauseAt(new Date(initial.getTime() + 1000));
  await open(page);
  await svg(page).evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect(button(page, 'Pause')).toBeVisible();
  await page.clock.runFor(80);
}

async function advanceTo(page: Page, time: number) {
  const delta = time - await progress(page);
  expect(delta).toBeGreaterThan(0);
  await page.clock.runFor(Math.ceil(delta * 1000 / 16) * 16);
}

function item(page: Page, id: string): Locator {
  return svg(page).locator(`[data-map-item="${id}"]`);
}

test('Home links to the canonical offering and the old fragment still reaches it', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'Explore the Connection Map' });
  await expect(link).toHaveAttribute('href', '/services/#connection-map');
  await page.goto('/services/#data-roadmap');
  await expect(page.locator('#connection-map h2').first()).toHaveText('The Connection Map');
  await expect(page.locator('#data-roadmap')).toHaveCount(1);
  const offset = await page.locator('#data-roadmap').evaluate(node =>
    node.getBoundingClientRect().top - node.closest('section')!.getBoundingClientRect().top);
  expect(Math.abs(offset)).toBeLessThanOrEqual(1);
  await expect(exhibit(page).locator('.connection-map__context').getByText('Community Food Network', { exact: true })).toBeVisible();
});

test('one continuous run takes staff knowledge through the map and into the report', async ({ page }) => {
  await start(page);
  await advanceTo(page, 1.09);
  expect(await visibility(page, '[data-map-person]')).toEqual([1, 1, 1]);
  expect((await visibility(page, '[data-map-item]')).every(alpha => alpha === 0)).toBe(true);

  await advanceTo(page, 1.65);
  expect((await visibility(page, '[data-map-item]')).filter(alpha => alpha > 0)).toHaveLength(3);
  await advanceTo(page, 3.55);
  expect((await visibility(page, '[data-map-item]')).filter(alpha => alpha > 0)).toHaveLength(9);
  const system = item(page, 'sys-inventory');
  const saved = await system.elementHandle();
  await advanceTo(page, 7.9);
  const grouped = await system.getAttribute('transform');
  await advanceTo(page, 8.5);
  await expect(heading(page)).toHaveText('See how the organization works.');
  expect(await system.getAttribute('transform')).toBe(grouped);
  await advanceTo(page, 14.5);
  expect(await system.getAttribute('transform')).not.toBe(grouped);
  expect(await system.evaluate((node, original) => node === original, saved)).toBe(true);
  expect(await visibility(page, '[data-map-flow]')).toEqual([1, 1, 1, 1]);
  expect(await visibility(page, '[data-map-proposal]')).toEqual([0, 0, 0]);

  await advanceTo(page, 15.5);
  await expect(heading(page)).toHaveText('Reveal the connections worth making.');
  expect(await visibility(page, '[data-map-proposal]')).toEqual([0, 0, 0]);
  await advanceTo(page, 18);
  expect(await visibility(page, '[data-map-proposal]')).toEqual([1, 0, 0]);
  await expect(svg(page).locator('[data-map-callout]')).toHaveText('Match food to demand.');
  await advanceTo(page, 21);
  expect(await visibility(page, '[data-map-proposal]')).toEqual([1, 1, 0]);
  await expect(svg(page).locator('[data-map-callout]')).toHaveText('Schedule volunteers when needed.');
  await advanceTo(page, 24.5);
  expect(await visibility(page, '[data-map-proposal]')).toEqual([1, 1, 1]);
  expect(await visibility(page, '[data-map-marker]')).toEqual([1, 1, 1]);
  expect(await visibility(page, '[data-map-item^="obs-"]')).toEqual([0, 0, 0, 0]);
  await expect(svg(page).locator('[data-map-callout]')).toHaveText('Identify volunteers who also donate.');

  await advanceTo(page, 25.55);
  await expect(heading(page)).toHaveText('Decide what to do first.');
  await expect(svg(page).locator('[data-map-priorities]')).toHaveAttribute('opacity', '0');
  await advanceTo(page, 31.25);
  const ranked = svg(page).locator('[data-map-ranked="2"]');
  const originalRow = await ranked.elementHandle();
  const rowBesideMatrix = await ranked.getAttribute('transform');
  const matrix = svg(page).locator('[data-map-matrix]');
  const matrixBesideRanking = await matrix.getAttribute('transform');
  expect(await svg(page).locator('[data-map-ranked]').evaluateAll(rows => rows.map(row => row.getAttribute('data-map-ranked')))).toEqual(['2', '1', '3']);
  await advanceTo(page, 32.65);
  await expect(heading(page)).toHaveText('Leave with a plan that belongs to you.');
  expect(await ranked.getAttribute('transform')).toBe(rowBesideMatrix);
  await advanceTo(page, 34.8);
  expect(await matrix.getAttribute('transform')).not.toBe(matrixBesideRanking);
  expect(await ranked.getAttribute('transform')).not.toBe(rowBesideMatrix);
  expect(await ranked.evaluate((node, original) => node === original, originalRow)).toBe(true);
  await advanceTo(page, 38.2);
  await expect(button(page, 'Replay')).toBeVisible();
  await expect(svg(page).locator('[data-map-report]')).toHaveAttribute('opacity', '1');
  await expect(svg(page).locator('[data-map-report]')).toContainText('A clear path forward. Yours to keep.');
  await expect(exhibit(page).locator('[role="status"]')).toBeEmpty();
  await page.clock.runFor(4000);
  expect(await progress(page)).toBe(38);
  await button(page, 'Replay').evaluate(el => (el as HTMLButtonElement).click());
  await page.clock.runFor(200);
  expect(await progress(page)).toBeLessThan(0.3);
  await expect(button(page, 'Pause')).toBeVisible();
});

test('pause and resume preserve time, including offscreen and hidden intervals', async ({ page }) => {
  await start(page);
  await advanceTo(page, 3);
  await button(page, 'Pause').evaluate(el => (el as HTMLButtonElement).click());
  const paused = await progress(page);
  await page.clock.runFor(2000);
  expect(await progress(page)).toBe(paused);
  await button(page, 'Play').evaluate(el => (el as HTMLButtonElement).click());
  await page.clock.runFor(600);
  expect(await progress(page)).toBeGreaterThan(paused + 0.5);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(90);
  const offscreen = await progress(page);
  await page.clock.runFor(2500);
  expect(await progress(page)).toBe(offscreen);
  await svg(page).evaluate(node => node.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(90);
  await page.clock.runFor(600);
  expect(await progress(page)).toBeGreaterThan(offscreen + 0.5);
  expect(await progress(page)).toBeLessThan(offscreen + 0.8);

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await progress(page);
  await page.clock.runFor(2400);
  expect(await progress(page)).toBe(hidden);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(600);
  expect(await progress(page)).toBeGreaterThan(hidden + 0.5);
  expect(await progress(page)).toBeLessThan(hidden + 0.8);
});

test('keyboard selection is persistent and a focused control suppresses hover previews', async ({ page, isMobile }) => {
  await open(page);
  await stage(page, 'Connect').focus();
  await page.keyboard.press('Enter');
  await expect(stage(page, 'Connect')).toHaveAttribute('aria-current', 'true');
  await expect(heading(page)).toHaveText('Reveal the connections worth making.');
  await expect(exhibit(page).locator('[role="status"]')).toHaveText('Connect. Three proposed connections are visible.');
  if (!isMobile) {
    await stage(page, 'Map').hover();
    await expect(stage(page, 'Map')).not.toHaveAttribute('data-preview', '');
    await expect(heading(page)).toHaveText('Reveal the connections worth making.');
  }
  await page.keyboard.press('Tab');
  await expect(stage(page, 'Plan')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(stage(page, 'Plan')).toHaveAttribute('aria-current', 'true');
  await expect(button(page, 'Replay')).toBeVisible();
});

test('mouse hover previews a different stage and restores the committed frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Mouse preview is only available for a mouse pointer');
  await open(page);
  await stage(page, 'Connect').click();
  await stage(page, 'Map').hover();
  await expect(stage(page, 'Map')).toHaveAttribute('data-preview', '');
  await expect(stage(page, 'Connect')).toHaveAttribute('aria-current', 'true');
  await expect(heading(page)).toHaveText('See how the organization works.');
  await exhibit(page).locator('[data-map-heading]').hover();
  await expect(heading(page)).toHaveText('Reveal the connections worth making.');
  await stage(page, 'Map').hover();
  await stage(page, 'Map').click();
  await exhibit(page).locator('[data-map-heading]').hover();
  await expect(stage(page, 'Map')).toHaveAttribute('aria-current', 'true');
  await expect(heading(page)).toHaveText('See how the organization works.');
});

test('touch selection stays in Plan after taps and scrolling', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Requires a touch-enabled viewport');
  await open(page);
  await stage(page, 'Map').tap();
  await stage(page, 'Plan').tap();
  await page.evaluate(() => window.scrollTo(0, 0));
  await svg(page).scrollIntoViewIfNeeded();
  await expect(stage(page, 'Plan')).toHaveAttribute('aria-current', 'true');
  await expect(button(page, 'Replay')).toBeVisible();
});

test('the dedicated layouts retain a selection across resizes without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1120, height: 900 });
  await open(page);
  await stage(page, 'Plan').click();
  await expect(svg(page)).toHaveAttribute('viewBox', '0 0 1000 410');
  for (const width of [320, 390, 720, 900, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(svg(page)).toHaveAttribute('viewBox', width <= 720 ? '0 0 360 520' : '0 0 1000 410');
    await expect(stage(page, 'Plan')).toHaveAttribute('aria-current', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    for (const control of await exhibit(page).getByRole('button').all()) {
      const box = await control.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
  }
});

test('reduced motion gets completed stages without autoplay or animated transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  expect(await visibility(page, '[data-map-item]')).toEqual(Array(12).fill(1));
  await expect(button(page, 'Play')).toBeHidden();
  await stage(page, 'Plan').click();
  await expect(svg(page).locator('[data-map-report]')).toHaveAttribute('opacity', '1');
  expect(await progress(page)).toBe(38);
  await svg(page).scrollIntoViewIfNeeded();
  expect(await progress(page)).toBe(38);
});

test('without JavaScript the mission, all stages, opportunity order, and ownership remain readable', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 320, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto('/services/#connection-map');
    const sample = exhibit(page);
    await expect(svg(page)).toBeHidden();
    await expect(sample.getByText('Help more neighbors reliably access nutritious food.', { exact: false })).toBeVisible();
    await expect(sample.locator('details')).toHaveAttribute('open', '');
    await expect(sample.locator('details')).toContainText('Now, opportunity 2. Schedule volunteers when needed. Matrix category: Quick wins.');
    await expect(sample.locator('details')).toContainText('Next, opportunity 1. Match food to demand. Matrix category: Strategic builds.');
    await expect(sample.locator('details')).toContainText('Later, opportunity 3. Identify volunteers who also donate. Matrix category: Lower priority.');
    await expect(sample.locator('details')).toContainText('A clear path forward. Yours to keep.');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  } finally {
    await context.close();
  }
});

test('decorative network artwork stays inert', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('[data-network-accent]').evaluateAll(nodes =>
    nodes.length > 0 && nodes.every(node => node.getAttribute('aria-hidden') === 'true' && getComputedStyle(node).pointerEvents === 'none')
  )).toBe(true);
  await expect(page.getByRole('link', { name: 'Book a free call' }).first()).toBeVisible();
});
