// SPDX-License-Identifier: MIT
// 加密备份往返；API Key 可以只在本次使用。只用测试内临时写入的虚构记录
const fs = require('fs');
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

const FAKE = {
  v: 1,
  goals: { kcal: 2000, p: 120, c: 220, f: 60 },
  meals: [{ id: 'e2e1', date: '2026-10-12', meal: '午餐', name: '虚构测试餐', kcal: 520, p: 30, c: 60, f: 15 }]
};

test('加密备份：导出不含明文；错误密码被拒；正确密码可恢复', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await page.evaluate((d) => localStorage.setItem('freeBody_v1', JSON.stringify(d)), FAKE);
  await page.reload();
  await openSection(page, 'settings');
  await page.locator('.bk-enc > summary').click();
  await page.locator('#bkPw').fill('测试密码 2026');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#exp').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.enc\.json$/);
  const file = await dl.path();
  const text = fs.readFileSync(file, 'utf8');
  expect(text).not.toContain('虚构测试餐');
  expect(JSON.parse(text).freebody).toBe('backup-enc');

  await page.evaluate(() => localStorage.removeItem('freeBody_v1'));
  await page.reload();
  await openSection(page, 'settings');
  page.on('dialog', (d) => d.accept());
  await page.locator('.bk-enc > summary').click();
  await page.locator('#bkPw').fill('错误密码');
  await page.locator('#imp').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('密码不正确');
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBeNull();

  await page.locator('#bkPw').fill('测试密码 2026');
  await page.locator('#imp').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('导入成功');
  const meals = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).meals);
  expect(meals.map((m) => m.name)).toEqual(['虚构测试餐']);
  expect(errs).toEqual([]);
});

test('加密备份：没填密码时提示先填密码', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((d) => localStorage.setItem('freeBody_v1', JSON.stringify(d)), FAKE);
  await page.reload();
  await openSection(page, 'settings');
  await page.locator('.bk-enc > summary').click();
  await page.locator('#bkPw').fill('pw');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#exp').click()]);
  const file = await dl.path();
  await page.locator('#bkPw').fill('');
  await page.locator('#imp').setInputFiles(file);
  await expect(page.locator('#toast')).toContainText('请在「加密备份」中填写密码');
  await expect(page.locator('#bkPw')).toBeFocused();
});

test('API Key 取消「记住」后不写入本机存储', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'settings');
  await page.locator('#aiCard > summary').click();
  await page.locator('#aiKey').fill('sk-fake-for-test');
  await page.locator('#aiRemember').uncheck();
  await page.locator('#aiSave').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_ai_v1')));
  expect(stored.key).toBeUndefined();
  expect(stored.remember).toBe(false);
  await expect(page.locator('#aiSum')).toContainText('Key 仅本次');
  await page.reload();
  await openSection(page, 'settings');
  await page.locator('#aiCard > summary').click();
  await expect(page.locator('#aiKey')).toHaveValue('');
  await expect(page.locator('#aiRemember')).not.toBeChecked();
});
