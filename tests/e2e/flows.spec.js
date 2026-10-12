// SPDX-License-Identifier: MIT
// 常用记录流程：从空数据开始，每一步都检查写入本机存储的结果。拍照识别用拦截的假接口，不访问网络。
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1') || 'null'));
// 1×1 像素 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('今天页：补剂一键打卡、开始训练并完成一组', async ({ page }) => {
  const errs = watchErrors(page);
  await page.locator('#ovSuppAll').click();
  const s1 = await state(page);
  expect(Object.keys(s1.suppLog).length).toBe(1);
  await page.locator('#ovTrain [data-ss=rec]').click();
  page.on('dialog', (d) => d.accept());
  await page.locator('#sessBox [data-ss=done]').click();
  expect((await state(page)).active.items[0].sets.some((x) => x.done)).toBe(true);
  await page.locator('#sessBox [data-ss=finish]').click();
  await expect.poll(async () => (await state(page)).workouts.length).toBeGreaterThan(0);
  expect(errs).toEqual([]);
});

test('训练页：手动记录力量训练', async ({ page }) => {
  const errs = watchErrors(page);
  await openSection(page, 'train');
  await page.locator('#wManual > summary').click();
  await page.locator('[data-ex=杠铃卧推]').click();
  await page.locator('#wS').fill('3');
  await page.locator('#wR').fill('8');
  await page.locator('#wW').fill('40');
  await page.locator('#wAdd').click();
  const w = (await state(page)).workouts;
  expect(w.length).toBe(1);
  expect([w[0].ex || w[0].exercise, w[0].sets, w[0].reps, w[0].weight]).toEqual(['杠铃卧推', 3, 8, 40]);
  expect(errs).toEqual([]);
});

test('睡眠与身体指标：保存当日记录并出现在列表中', async ({ page }) => {
  const errs = watchErrors(page);
  await openSection(page, 'sleep');
  await page.locator('#slBed').fill('23:30');
  await page.locator('#slWake').fill('07:00');
  await page.locator('[data-q="4"]').click();
  await page.locator('#slSave').click();
  const sl = (await state(page)).sleep;
  expect(sl.length).toBe(1);
  expect(sl[0].dur).toBe(7.5);
  await openSection(page, 'body');
  await page.locator('#bW').fill('70.5');
  await page.locator('#bSave').click();
  expect((await state(page)).body[0].weight).toBe(70.5);
  await expect(page.locator('#bList')).toContainText('70.5');
  expect(errs).toEqual([]);
});

test('饮食：搜索添加、打开条目详情、修改目标', async ({ page }) => {
  const errs = watchErrors(page);
  await openSection(page, 'diet');
  await page.locator('[data-addmeal="加餐"]').click();
  await page.locator('#faSearch').fill('香蕉');
  await page.locator('[data-fplus]').first().click();
  const m = (await state(page)).meals;
  expect(m.length).toBe(1);
  expect(m[0].meal).toBe('加餐');
  await openSection(page, 'diet');
  await page.locator('[data-entry]').first().click();
  await page.locator('section#dietFood.on').waitFor();
  await openSection(page, 'diet');
  await page.locator('details:has(#gK)').evaluate((d) => (d.open = true));
  await page.locator('#gK').fill('2100');
  await page.locator('#gSave').click();
  expect((await state(page)).goals.kcal).toBe(2100);
  expect(errs).toEqual([]);
});

test('拍照识别：假接口返回结果后一键记录', async ({ page }) => {
  const errs = watchErrors(page);
  const resp = {
    items: [{ name: '米饭', grams: 200, leftRatio: 0, per100g: { kcal: 130, p: 2.7, c: 28, f: 0.3 }, confidence: 0.9 }],
    note: ''
  };
  await page.route('**/chat/completions', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(resp) } }] })
    })
  );
  await page.evaluate(() =>
    localStorage.setItem(
      'freeBody_ai_v1',
      JSON.stringify({ prov: 'custom', base: 'https://ai.example.invalid/v1', model: 'fake-vl', key: 'fake' })
    )
  );
  await page.reload();
  await openSection(page, 'dietAI');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-ai=lib]').click()]);
  await fc.setFiles({ name: 'meal.png', mimeType: 'image/png', buffer: PNG });
  // 单张模式在配置齐全时选完照片自动开始识别
  await page.locator('#aiRec').click();
  const m = (await state(page)).meals;
  expect(m.length).toBe(1);
  expect(m[0].name).toContain('米饭');
  expect(m[0].kcal).toBeGreaterThan(0);
  expect(errs).toEqual([]);
});

test('CSV 导入：身体指标', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await openSection(page, 'settings');
  await page.locator('#csvFile').setInputFiles({
    name: 'body.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('date,weight\n2026-10-01,70\n2026-10-02,69.8\n')
  });
  await expect(page.locator('#toast')).toContainText('导入 2 行');
  expect((await state(page)).body.length).toBe(2);
});

test('键盘：数字键切换页面，方向键切换日期', async ({ page }) => {
  await page.locator('body').click({ position: { x: 5, y: 400 } });
  await page.keyboard.press('2');
  await expect(page.locator('section#train.on')).toBeVisible();
  const day = page.locator('header').getByText(/\d+月\d+日/);
  const d0 = await day.innerText();
  await page.keyboard.press('ArrowLeft');
  await expect(day).not.toHaveText(d0);
  await page.keyboard.press('t');
  await expect(day).toHaveText(d0);
});
