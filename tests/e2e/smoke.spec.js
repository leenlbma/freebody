// SPDX-License-Identifier: MIT
// 冒烟：空数据与演示数据下，每个页面都能打开且没有脚本错误
const { test, expect } = require('./fixtures');
const { SECTIONS, openSection, watchErrors } = require('./helpers');

for (const mode of ['empty', 'demo']) {
  test(`所有页面可打开（${mode === 'demo' ? '演示数据' : '空数据'}）`, async ({ page }) => {
    const errs = watchErrors(page);
    await page.goto(mode === 'demo' ? '/#demo' : '/');
    await expect(page.locator('nav')).toBeVisible();
    for (const id of SECTIONS) {
      await openSection(page, id);
    }
    expect(errs).toEqual([]);
  });
}

test('底部导航四个入口可用，当前项有 aria-current', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  const tabs = page.locator('nav button[data-go]');
  const n = await tabs.count();
  expect(n).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute('aria-current', 'page');
  }
  expect(errs).toEqual([]);
});

test('底部导航在视口内（安全区适配）', async ({ page }) => {
  await page.goto('/');
  const box = await page.locator('nav').boundingBox();
  const vh = page.viewportSize().height;
  expect(box.y + box.height).toBeLessThanOrEqual(vh + 1);
  expect(box.y + box.height).toBeGreaterThan(vh - 2);
});

test('快速记录：输入一行文字后出现估算并可记录', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await openSection(page, 'dietAdd');
  await page.locator('[data-fatab=quick]').click();
  const box = page.locator('#qText2');
  await box.fill('鸡蛋2个 米饭1碗');
  await expect(page.locator('#qPrev2')).toContainText('鸡蛋');
  await page.locator('#qAdd2').click();
  const meals = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).meals.length);
  expect(meals).toBe(2);
  expect(errs).toEqual([]);
});
