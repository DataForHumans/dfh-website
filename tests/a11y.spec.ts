import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Every page in the build, found from dist/ so new pages are tested automatically. */
function builtPages(): string[] {
  const dist = path.join(process.cwd(), 'dist');
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      return e.isDirectory() ? walk(full) : [full];
    });
  return walk(dist)
    .filter((f) => f.endsWith('.html'))
    .map((f) => '/' + path.relative(dist, f).split(path.sep).join('/'))
    .map((p) => (p.endsWith('/index.html') ? p.slice(0, -'index.html'.length) : p))
    .sort();
}

const PAGES = builtPages();
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test('the build has pages to test', () => {
  expect(PAGES.length).toBeGreaterThan(5);
});

for (const pagePath of PAGES) {
  test.describe(pagePath, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(pagePath);
    });

    test('has no WCAG 2.1 A or AA violations (axe)', async ({ page }) => {
      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const summary = results.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(' ')).join('\n    ')}`,
      );
      expect(summary, summary.join('\n')).toEqual([]);
    });

    test('has one h1 and the main landmarks', async ({ page }) => {
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('header.site-header')).toHaveCount(1);
      await expect(page.locator('nav[aria-label="Main"]')).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);
      await expect(page.locator('footer.site-footer')).toHaveCount(1);
    });

    test('every image has alt text', async ({ page }) => {
      const missing = await page.locator('img:not([alt])').count();
      expect(missing).toBe(0);
    });

    test('skip link is the first focusable element and moves focus to main', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium');
      await page.keyboard.press('Tab');
      const skip = page.locator('a.skip-link');
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });

    test('touch targets in nav, footer and buttons are at least 44px tall', async ({ page }) => {
      const small = await page
        .locator('.site-nav a, .site-footer__links a, .button, .type-filter a')
        .evaluateAll((els) =>
          els
            .filter((el) => (el as HTMLElement).offsetParent !== null)
            .map((el) => ({ text: el.textContent?.trim(), h: el.getBoundingClientRect().height }))
            .filter((r) => r.h < 44),
        );
      expect(small, JSON.stringify(small)).toEqual([]);
    });
  });
}

test.describe('focus and motion', () => {
  test('focused links and buttons show a visible outline', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // logo
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(2);
  });

  test('prefers-reduced-motion turns off transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const duration = await page
      .locator('.button')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(duration).toBeLessThanOrEqual(0.001);
  });
});

test.describe('contact form', () => {
  test('is a Netlify form with a honeypot and labeled fields', async ({ page }) => {
    await page.goto('/contact/');
    const form = page.locator('form[name="contact"]');
    await expect(form).toHaveAttribute('data-netlify', 'true');
    await expect(form).toHaveAttribute('netlify-honeypot', 'company-website');
    await expect(form.locator('input[name="form-name"]')).toHaveValue('contact');
    await expect(form.locator('input[name="company-website"]')).toBeHidden();
    for (const label of ['Name', 'Email', 'Organization (optional)', 'Message']) {
      await expect(form.getByLabel(label, { exact: true })).toBeVisible();
    }
  });

  test('shows error text tied to each empty required field and focuses the first', async ({ page }) => {
    await page.goto('/contact/');
    const form = page.locator('form[name="contact"]');
    await form.getByRole('button', { name: 'Send message' }).click();

    // The visible "Error: " prefix comes from CSS and is part of what screen readers announce.
    const name = form.getByLabel('Name', { exact: true });
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAccessibleDescription('Error: Enter your name.');
    await expect(form.getByLabel('Message', { exact: true })).toHaveAccessibleDescription('Error: Enter a message.');

    await form.getByLabel('Email', { exact: true }).fill('not-an-email');
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByLabel('Email', { exact: true })).toHaveAccessibleDescription(
      'Error: Enter your email address, like name@example.org.',
    );

    await name.fill('Test');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#name-error')).toBeHidden();

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
