// SPDX-License-Identifier: MIT
const fs = require('fs');
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

async function history(page) {
  await openSection(page, 'settings');
  await page.locator('#historyCard').evaluate((el) => {
    el.open = true;
  });
  await page.locator('#historyRefresh').click();
  await expect(page.locator('[data-history-export]')).not.toHaveCount(0);
}

test('恢复点可校验导出；损坏的主记录可从恢复点恢复', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await openSection(page, 'body');
  await page.locator('#bW').fill('70.5');
  await page.locator('#bSave').click();
  await history(page);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-history-export]').first().click()
  ]);
  const text = fs.readFileSync(await download.path(), 'utf8');
  expect(JSON.parse(text).body[0].weight).toBe(70.5);
  expect(text).not.toContain('aiConfig');
  await page.evaluate(() => localStorage.setItem('freeBody_v1', '{broken'));
  await page.reload();
  await expect(page.locator('#stBanner')).toContainText('无法读取');
  await history(page);
  page.on('dialog', (d) => d.accept());
  await page.locator('[data-history-restore]').first().click();
  await expect(page.locator('#toast')).toContainText('导入成功');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).body[0].weight)).toBe(70.5);
  expect(errors).toEqual([]);
});

test('完整性失败不改变主记录；清空数据会删除恢复点与旧键', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'body');
  await page.locator('#bW').fill('70');
  await page.locator('#bSave').click();
  await history(page);
  const before = await page.evaluate(() => localStorage.getItem('freeBody_v1'));
  const id = await page.locator('[data-history-restore]').first().getAttribute('data-history-restore');
  await page.evaluate(async (id) => {
    const db = await new Promise((res, rej) => {
      const req = indexedDB.open('freebody-history', 1);
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction('snapshots', 'readwrite'),
        store = tx.objectStore('snapshots'),
        req = store.get(id);
      req.onsuccess = () => {
        const row = req.result;
        row.json = '{"v":1,"meals":[],"goals":{}}';
        store.put(row);
      };
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, id);
  await page.locator('[data-history-restore]').first().click();
  await expect(page.locator('#toast')).toContainText('完整性校验失败');
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe(before);
  await page.evaluate((before) => localStorage.setItem('fitTracker_v1', before), before);
  page.on('dialog', (d) => d.accept());
  await page.locator('#wipe').click();
  await expect(page.locator('#toast')).toContainText('已清空');
  await page.locator('#historyRefresh').click();
  await expect(page.locator('[data-history-export]')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('fitTracker_v1'))).toBeNull();
  await page.reload();
  expect(await page.evaluate(() => window.__freeBody.state.body.length)).toBe(0);
});

test('演示模式不读取、导出或清空真实恢复点', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'body');
  await page.locator('#bW').fill('70');
  await page.locator('#bSave').click();
  await history(page);
  await Promise.all([page.waitForEvent('load'), page.locator('#demoBtn').click()]);
  await expect(page).toHaveURL(/#demo$/);
  await openSection(page, 'settings');
  await page.locator('#historyCard').evaluate((el) => {
    el.open = true;
  });
  await expect(page.locator('#historyList')).toContainText('演示模式');
  await expect(page.locator('#historyClear')).toBeDisabled();
  await expect(page.locator('[data-history-export]')).toHaveCount(0);
  await Promise.all([page.waitForEvent('load'), page.locator('#stBanner [data-st=exitdemo]').click()]);
  await expect(page).not.toHaveURL(/#demo$/);
  await history(page);
});
