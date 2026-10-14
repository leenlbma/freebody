// SPDX-License-Identifier: MIT
const fs = require('fs');
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

async function choose(page, trigger, date) {
  await page.locator(trigger).click();
  await page.locator('#dSel').fill(date);
  await page.locator('#dateApply').click();
  await expect(page.locator('#dateDialog')).not.toBeVisible();
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')));

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00+08:00'));
  await page.goto('/');
});

test('页面日期：紧凑顶栏、跨页补记、取消和返回今天', async ({ page }) => {
  const errors = watchErrors(page);
  await expect(page.locator('#dTrigger')).toContainText('今天');
  await expect(page.locator('#dateContext')).not.toBeVisible();
  const title = await page.locator('#appTitle').boundingBox();
  const trigger = await page.locator('#dTrigger').boundingBox();
  expect(Math.abs(title.y + title.height / 2 - trigger.y - trigger.height / 2)).toBeLessThan(2);
  await page.locator('#dTrigger').click();
  await page.locator('[data-date-quick="-1"]').click();
  await expect(page.locator('#dTrigger')).toContainText('昨天');
  await expect(page.locator('#dateContext')).toContainText('10月14日');
  await openSection(page, 'body');
  await page.locator('#bW').fill('70.5');
  await page.locator('#dTrigger').click();
  await page.locator('#dSel').fill('2025-12-31');
  await page.keyboard.press('Escape');
  await expect(page.locator('section#body')).toHaveClass(/on/);
  await expect(page.locator('#dTrigger')).toBeFocused();
  await expect(page.locator('#bW')).toHaveValue('70.5');
  await choose(page, '#dTrigger', '2026-10-14');
  await expect(page.locator('#bW')).toHaveValue('70.5');
  await page.locator('#bSave').click();
  expect((await saved(page)).body[0].date).toBe('2026-10-14');
  for (const section of ['settings', 'impPack', 'selftest', 'notes']) {
    await openSection(page, section);
    await expect(page.locator('#dTrigger')).not.toBeVisible();
    await expect(page.locator('#dateContext')).not.toBeVisible();
  }
  await openSection(page, 'data');
  await expect(page.locator('#dateContext')).toContainText('统计截至：10月14日');
  await page.locator('#dToday').click();
  await expect(page.locator('#dateContext')).not.toBeVisible();
  await choose(page, '#dTrigger', '2025-12-31');
  await expect(page.locator('#dateContext')).toContainText('2025年12月31日');
  expect(errors).toEqual([]);
});

test('成绩与化验：默认跟随、单条日期隔离，保存后恢复默认', async ({ page }) => {
  await openSection(page, 'perf');
  await choose(page, '#dTrigger', '2026-10-13');
  for (const id of ['pbD', 'rnD', 'ptD', 'lbDate']) await expect(page.locator('#' + id)).toHaveValue('2026-10-13');
  await page.locator('#pbT').fill('1:30.50');
  await page.locator('#pbN').fill('补记比赛');
  await choose(page, '#pbDTrigger', '2025-12-31');
  await expect(page.locator('#pbDTrigger')).toContainText('本条日期：2025年12月31日');
  await expect(page.locator('#pbT')).toHaveValue('1:30.50');
  await expect(page.locator('#rnD')).toHaveValue('2026-10-13');
  await choose(page, '#dTrigger', '2026-10-12');
  await expect(page.locator('#pbD')).toHaveValue('2025-12-31');
  await expect(page.locator('#rnD')).toHaveValue('2026-10-12');
  await page.locator('#pbAdd').click();
  expect((await saved(page)).pb100br[0]).toMatchObject({ date: '2025-12-31', note: '补记比赛' });
  await expect(page.locator('#pbD')).toHaveValue('2026-10-12');
  await expect(page.locator('#pbDTrigger')).not.toContainText('本条');
  await choose(page, '#rnDTrigger', '2026-10-10');
  await page.locator('#rnDTrigger').click();
  await page.locator('#dateFollow').click();
  await expect(page.locator('#rnD')).toHaveValue('2026-10-12');
  await page.locator('#rnT').fill('2:45.3');
  await page.locator('#rnAdd').click();
  expect((await saved(page)).run800[0].date).toBe('2026-10-12');
  await page.locator('#ptV').fill('40');
  await choose(page, '#ptDTrigger', '2026-10-11');
  await page.locator('#ptAdd').click();
  expect((await saved(page)).perfLog[0].date).toBe('2026-10-11');
  await openSection(page, 'hormone');
  await page.locator('details:has(#lbName)').evaluate((el) => {
    el.open = true;
  });
  await page.locator('#lbName').fill('测试指标');
  await page.locator('#lbVal').fill('4.2');
  await choose(page, '#lbDateTrigger', '2026-10-09');
  await page.locator('#lbAdd').click();
  expect((await saved(page)).labs[0].date).toBe('2026-10-09');
  await expect(page.locator('#lbDate')).toHaveValue('2026-10-12');
});

test('独立日期保存失败保留选择，恢复起始日可设置和清除', async ({ page }) => {
  await openSection(page, 'perf');
  await choose(page, '#pbDTrigger', '2026-10-01');
  await page.locator('#pbT').fill('1:30');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__failDateSave = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'freeBody_v1' && window.__failDateSave) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#pbAdd').click();
  await expect(page.locator('#toast')).toContainText('没有保存');
  await expect(page.locator('#pbD')).toHaveValue('2026-10-01');
  await expect(page.locator('#pbT')).toHaveValue('1:30');
  await page.evaluate(() => {
    window.__failDateSave = false;
  });
  await page.locator('#pbAdd').click();
  expect((await saved(page)).pb100br[0].date).toBe('2026-10-01');
  await openSection(page, 'train');
  await page.locator('details:has(#rStart)').evaluate((el) => {
    el.open = true;
  });
  await choose(page, '#rStartTrigger', '2026-09-01');
  await page.locator('#rSave').click();
  expect((await saved(page)).recoveryStart).toBe('2026-09-01');
  await page.locator('#rStartTrigger').click();
  await page.locator('#dateClear').click();
  await page.locator('#rSave').click();
  expect((await saved(page)).recoveryStart).toBe('');
  await expect(page.locator('#dTrigger')).toContainText('今天');
});

test('饮食月历同步顶栏、表单默认日期，取消面板不改变选中日', async ({ page }) => {
  await openSection(page, 'diet');
  await page.locator('#calCard').evaluate((el) => {
    el.open = true;
  });
  await page.locator('[data-calday="2026-10-10"]').click();
  await expect(page.locator('#dateContext')).toContainText('10月10日');
  await expect(page.locator('#pbD')).toHaveValue('2026-10-10');
  await page.locator('#dTrigger').click();
  await page.locator('#dNext').click();
  await expect(page.locator('#dSel')).toHaveValue('2026-10-11');
  await page.locator('#dPrev').click();
  await page.locator('#dateClose').click();
  await expect(page.locator('#dateContext')).toContainText('10月10日');
});

test('日期面板：窄屏、桌面、主屏幕导航和无障碍', async ({ page, browserName }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });
  });
  await page.reload();
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(300);
    await choose(page, '#dTrigger', '2025-12-31');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 600) {
      const nav = await page.locator('#nav').boundingBox();
      expect(Math.abs(nav.y + nav.height - 844)).toBeLessThanOrEqual(1);
    }
    await page.locator('#dTrigger').click();
    const panel = await page.locator('#dateDialog').boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(width);
    expect(panel.y + panel.height).toBeLessThanOrEqual(844);
    await page.keyboard.press('Escape');
  }
  if (browserName === 'chromium') {
    await page.addScriptTag({ content: fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8') });
    for (const scheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.locator('#dTrigger').click();
      const violations = await page.evaluate(() => window.axe.run(document).then((r) => r.violations.map((v) => v.id)));
      expect(violations).toEqual([]);
      await page.keyboard.press('Escape');
    }
  }
  expect(errors).toEqual([]);
});
