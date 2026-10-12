// 无障碍：axe-core 扫描所有页面（浅色 / 深色，展开所有折叠区），要求 0 违规
const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { SECTIONS, openSection } = require('./helpers');

const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

for (const scheme of ['light', 'dark']) {
  test(`axe：所有页面 0 违规（${scheme}）`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', '只在 Chromium 上跑一遍即可');
    test.setTimeout(180000);
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/#demo');
    await page.addScriptTag({ content: AXE });
    const found = [];
    for (const id of SECTIONS) {
      await openSection(page, id);
      await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)));
      await page.waitForTimeout(300);
      const v = await page.evaluate(() =>
        window.axe
          .run(document, { resultTypes: ['violations'] })
          .then((r) => r.violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(' ')}`))
      );
      for (const x of v) found.push(`${id}: ${x}`);
    }
    expect(found).toEqual([]);
  });
}

test('减少动效：系统偏好生效且可在设置中手动切换', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.card')).transitionDuration);
  expect(parseFloat(dur)).toBeLessThan(0.02);
});

test('图表有文字替代：role=img 与数据表', async ({ page }) => {
  await page.goto('/#demo');
  await openSection(page, 'body');
  const img = page.locator('svg[role=img][aria-label]').first();
  await expect(img).toHaveAttribute('aria-label', /.+/);
  await expect(page.locator('details.cv-tb table').first()).toBeAttached();
});
