// SPDX-License-Identifier: MIT
// 数据可靠性：错误备份、导入保存失败与同源多窗口；只用虚构记录。
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

const pack = {
  freebody: 'import',
  version: 1,
  entries: [{ type: 'meal', id: 'safe-meal', date: '2026-10-12', name: '虚构餐', meal: '午餐', kcal: 500 }]
};

test('错误备份在覆盖前被拒绝，原记录和模型配置保留', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem(
      'freeBody_v1',
      JSON.stringify({
        v: 1,
        goals: {},
        meals: [],
        notes: [{ id: 'original', date: '2026-10-12', text: '原有虚构记录' }]
      })
    );
    localStorage.setItem('freeBody_ai_v1', JSON.stringify({ provider: 'custom', key: 'fake-original-key' }));
  });
  await page.reload();
  await openSection(page, 'settings');
  const before = await page.evaluate(() => ({
    data: localStorage.getItem('freeBody_v1'),
    ai: localStorage.getItem('freeBody_ai_v1')
  }));
  let confirmations = 0;
  page.on('dialog', async (d) => {
    confirmations++;
    await d.accept();
  });
  for (const bad of [{ workouts: null }, { plans: [{ name: '坏计划', items: {} }] }, { meals: [null] }, { v: 2 }]) {
    const data = { v: 1, meals: [], goals: {}, aiConfig: { key: 'fake-replacement' }, ...bad };
    await page
      .locator('#imp')
      .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    await expect(page.locator('#toast')).toContainText('导入失败');
    expect(
      await page.evaluate(() => ({
        data: localStorage.getItem('freeBody_v1'),
        ai: localStorage.getItem('freeBody_ai_v1')
      }))
    ).toEqual(before);
  }
  expect(confirmations).toBe(0);
  expect(errs).toEqual([]);
});

test('导入保存失败保留预览；重试后只保存一份', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await openSection(page, 'impPack');
  await page.locator('#ipText').fill(JSON.stringify(pack));
  await page.locator('#ipGo').click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__failSave = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'freeBody_v1' && window.__failSave) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#ipOk').click();
  await expect(page.locator('.imp-err')).toContainText('尚未保存');
  await expect(page.locator('.imp-done')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBeNull();
  expect(await page.evaluate(() => window.__freeBody.state.meals.length)).toBe(0);
  await page.evaluate(() => {
    window.__failSave = false;
  });
  await page.locator('#ipOk').click();
  await expect(page.locator('.imp-done')).toContainText('已导入 1 条');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).meals.length)).toBe(1);
  expect(errs).toEqual([]);
});

test('两个窗口只有一个写入者；离开持锁页面后另一个可继续', async ({ page, context }) => {
  await page.goto('/');
  await openSection(page, 'settings');
  await page.locator('#pfName').fill('窗口 A');
  await page.locator('#pfSave').click();
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('#stBanner')).toContainText('只读');
  await expect(second.locator('#overview')).toHaveAttribute('data-readonly', 'true');
  const before = await page.evaluate(() => localStorage.getItem('freeBody_v1'));
  const result = await second.evaluate(() => window.__freeBody._importCSV('date,weight\n2026-10-12,70'));
  expect(result).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe(before);
  await page.goto('about:blank');
  await second.reload();
  await expect(second.locator('#overview')).not.toHaveAttribute('data-readonly', 'true');
  second.on('dialog', (d) => d.accept());
  expect(await second.evaluate(() => window.__freeBody._importCSV('date,weight\n2026-10-12,70'))).toContain(
    '导入 1 行'
  );
  const data = await second.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')));
  expect(data.profile.name).toBe('窗口 A');
  expect(data.body[0].weight).toBe(70);
});
