// SPDX-License-Identifier: MIT
// 数据：演示模式不碰本机存储；链接导入；损坏数据不被覆盖
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { openSection, watchErrors } = require('./helpers');

test('演示模式：有数据可看，但不读取也不写入 localStorage', async ({ page }) => {
  const errs = watchErrors(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  await page.goto('/#demo');
  await expect(page.locator('#stBanner')).toContainText('演示');
  await openSection(page, 'diet');
  await page.locator('#themeBtn').click();
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('freeBody')));
  expect(keys).toEqual([]);
  expect(errs).toEqual([]);
});

test('链接导入：设备测试文档中的示例链接可预览并导入，重复导入为「已存在」', async ({ page }) => {
  const errs = watchErrors(page);
  const md = fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'device-test.md'), 'utf8');
  const frag = md.split('](https://leenlbma.github.io/freebody/#import=')[1].split(')')[0];
  await page.goto('/#import=' + frag);
  await expect(page.locator('.imp-list')).toContainText('香蕉');
  await page.locator('#ipOk').click();
  const n = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).meals.length);
  expect(n).toBe(1);
  await page.goto('about:blank');
  await page.goto('/#import=' + frag);
  await expect(page.locator('.imp-stats')).toContainText('已存在');
  expect(errs).toEqual([]);
});

test('本机数据损坏时提示，且不覆盖原数据', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('freeBody_v1', '{broken'));
  await page.reload();
  await expect(page.locator('#stBanner')).toContainText('无法读取');
  await page.locator('#themeBtn').click(); // 触发一次保存
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe('{broken');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('[data-st=rawexp]').click()]);
  expect(dl.suggestedFilename()).toMatch(/^freebody-raw-.*\.txt$/);
  page.on('dialog', (d) => d.accept());
  await page.locator('[data-st=reset]').click();
  await expect(page.locator('#stBanner')).toBeEmpty();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).v)).toBeTruthy();
});
