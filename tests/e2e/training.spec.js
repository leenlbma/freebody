// SPDX-License-Identifier: MIT
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');
const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')));
const action = (page, name) => page.locator(`#sessBox [data-ss="${name}"]`).first();
const plans = (page) =>
  page.locator('#ssPlans').evaluate((el) => {
    el.open = true;
  });
const more = (page) =>
  page.locator('#ssMore').evaluate((el) => {
    el.open = true;
  });

test('训练计划：失败后可重试，重启继续训练，撤销组与完成小结一致', async ({ page }) => {
  const errors = watchErrors(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await openSection(page, 'train');
  await plans(page);
  await page.locator('[data-ss=newplan]').click();
  await page.locator('#peName2').fill('测试上肢');
  await page.locator('#pe-ex-0').fill('杠铃卧推');
  await page.locator('#pe-sets-0').fill('2');
  await page.locator('#pe-lo-0').fill('8');
  await page.locator('#pe-rule-0').selectOption('double');
  await page.locator('#pe-hi-0').fill('12');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__failSave = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'freeBody_v1' && window.__failSave) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await action(page, 'pe-save').click();
  await expect(page.locator('#peName2')).toHaveValue('测试上肢');
  expect(await page.evaluate(() => window.__freeBody.state.plans.length)).toBe(0);
  await page.evaluate(() => {
    window.__failSave = false;
  });
  await action(page, 'pe-save').click();
  expect((await state(page)).plans).toHaveLength(1);
  await plans(page);
  await page.locator('[data-ss=editplan]').click();
  await page.locator('#peName2').fill('测试上肢 A');
  await action(page, 'pe-save').click();
  await plans(page);
  await page.locator('#ssPlans [data-ss=start]').click();
  await action(page, 'adj').click();
  await page.locator('[data-ss=w][data-v="1"]').click();
  await page.locator('[data-ss=rir][data-v="3"]').click();
  await action(page, 'done').click();
  expect((await state(page)).workouts).toHaveLength(1);
  await action(page, 'rest-add').click();
  await action(page, 'rest-skip').click();
  await page.reload();
  await openSection(page, 'train');
  await expect(page.locator('#sessBox')).toContainText('测试上肢 A');
  await more(page);
  await page.locator('li[data-ss=undo]').click();
  expect((await state(page)).workouts).toHaveLength(0);
  await action(page, 'flag').click();
  await action(page, 'done').click();
  await action(page, 'finish').click();
  const saved = await state(page);
  expect(saved.active).toBeNull();
  expect(saved.sessions).toHaveLength(1);
  expect(saved.sessions[0].sets).toBe(1);
  expect(saved.workouts).toHaveLength(1);
  expect(saved.workouts[0].wrist).toBe(true);
  await action(page, 'summary-close').click();
  await plans(page);
  await page.locator('[data-ss=editplan]').click();
  await action(page, 'pe-delplan').click();
  expect((await state(page)).plans).toHaveLength(0);
  expect((await state(page)).workouts).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('自由训练：空队列可添加动作，队列切换与放弃只删除本次记录', async ({ page }) => {
  const errors = watchErrors(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await openSection(page, 'train');
  await plans(page);
  await page.locator('[data-ss=free]').click();
  await expect(page.locator('#sessBox')).toContainText('添加第一个动作');
  await page.locator('#ssEx').fill('俯卧撑');
  await action(page, 'addex').click();
  await action(page, 'done').click();
  await action(page, 'rest-skip').click();
  await more(page);
  await action(page, 'addset').click();
  expect((await state(page)).active.items[0].sets).toHaveLength(4);
  await page.locator('#ssEx').fill('深蹲');
  await action(page, 'addex').click();
  await more(page);
  await page.locator('[data-ss=pick][data-v="0"]').click();
  expect((await state(page)).active.cur).toBe(0);
  await action(page, 'skip').click();
  expect((await state(page)).active.cur).toBe(1);
  await action(page, 'discard').click();
  const saved = await state(page);
  expect(saved.active).toBeNull();
  expect(saved.workouts).toHaveLength(0);
  expect(saved.sessions).toHaveLength(0);
  expect(errors).toEqual([]);
});
