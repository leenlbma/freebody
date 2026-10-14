// SPDX-License-Identifier: MIT
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

test('首次使用：教练提示词可直接复制，拒绝剪贴板时有手动路径', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text) => {
          window.__copied = text;
          return Promise.resolve();
        }
      }
    })
  );
  await page.goto('/');
  await page.locator('#ovAlerts [data-coach=copy]').click();
  const prompt = /<!-- freebody-prompt:zh -->\n```text\n([\s\S]*?)\n```/.exec(
    fs.readFileSync(path.join(__dirname, '../../skills/freebody-coach/PROMPT.md'), 'utf8')
  )[1];
  expect(await page.evaluate(() => window.__copied)).toBe(prompt);
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBeNull();
  await page.locator('#ovAlerts [data-coach=import]').click();
  await expect(page.locator('#ipText')).toBeFocused();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) },
      configurable: true
    })
  );
  await openSection(page, 'settings');
  await page.locator('#coachCard [data-coach=copy]').click();
  await expect(page.locator('#coachText')).toHaveAttribute('open', '');
  await expect(page.locator('#coachPrompt')).toHaveValue(prompt);
  await expect(page.locator('#coachPrompt')).toBeFocused();
});

test('食物详情明确标注同类近似值及包装核对建议', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await openSection(page, 'diet');
  await page.locator('[data-addmeal=午餐]').click();
  await page.locator('#faSearch').fill('米饭');
  await page.locator('[data-fplus]').first().click();
  await openSection(page, 'diet');
  await page.locator('[data-entry]').first().click();
  await expect(page.locator('#foodEvidence')).toContainText('同类近似值');
  await page.locator('#foodEvidence').evaluate((el) => {
    el.open = true;
  });
  await expect(page.locator('#foodEvidence')).toContainText('包装');
  expect(errors).toEqual([]);
});

test('准备度显示实际参与项目、有限依据和经验规则说明', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'sleep');
  await page.locator('#slBed').fill('23:00');
  await page.locator('#slWake').fill('07:00');
  await page.locator('[data-q="4"]').click();
  await page.locator('#slSave').click();
  await openSection(page, 'hormone');
  await expect(page.locator('#readyEvidence')).toContainText('依据有限');
  await page.locator('#readyEvidence').evaluate((el) => {
    el.open = true;
  });
  await expect(page.locator('#readyEvidence')).toContainText('不是生理测量');
  await expect(page.locator('#readyEvidence table')).toContainText('睡眠时长');
  await expect(page.locator('#readyEvidence table')).toContainText('睡眠质量');
});

test('普通记录保存失败保留表单，不显示成功或清空输入', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'body');
  await page.locator('#bW').fill('70.5');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    window.__failSave = true;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'freeBody_v1' && window.__failSave) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#bSave').click();
  await expect(page.locator('#toast')).toContainText('没有保存');
  await expect(page.locator('#bW')).toHaveValue('70.5');
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBeNull();
  expect(await page.evaluate(() => window.__freeBody.state.body.length)).toBe(0);
  await page.evaluate(() => {
    window.__failSave = false;
  });
  await page.locator('#bSave').click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')));
  expect(saved.body).toHaveLength(1);
  expect(saved.body[0].weight).toBe(70.5);
});

test('手机窄屏首次使用和新增卡片不横向溢出，只读页面仍可读内容', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.locator('#stBanner')).toContainText('只读');
  expect(await second.locator('#overview').getAttribute('inert')).toBeNull();
  await openSection(second, 'settings');
  await expect(second.locator('#pfSave')).toBeDisabled();
  await expect(second.locator('#coachCard')).toContainText('搭配 AI');
});

for (const example of [
  {
    mode: 'food',
    nameField: '#cuName',
    name: '虚构自定义餐',
    fields: [
      ['#cuName', '虚构自定义餐'],
      ['#cuG', '150'],
      ['#cuK', '123'],
      ['#cuP', '10']
    ]
  },
  {
    mode: 'combo',
    nameField: '#coName',
    name: '虚构组合餐',
    fields: [
      ['#coName', '虚构组合餐'],
      ['#coText', '米饭 100g + 鸡蛋 50g']
    ]
  }
]) {
  test(`自定义食物保存失败保留输入，重试只写入一份：${example.mode}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/');
    await openSection(page, 'diet');
    await page.locator('[data-addmeal=午餐]').click();
    await page.locator('[data-fatab=custom]').click();
    await page.getByText('新建 / 管理', { exact: true }).click();
    await page.locator(`[data-cfmode=${example.mode}]`).click();
    for (const [selector, value] of example.fields) await page.locator(selector).fill(value);
    const before = await page.evaluate(() => localStorage.getItem('freeBody_v1'));
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      window.__failSave = true;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'freeBody_v1' && window.__failSave) throw new DOMException('full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.locator('#cuAdd').click();
    await expect(page.locator('#toast')).toContainText('没有保存');
    for (const [selector, value] of example.fields) await expect(page.locator(selector)).toHaveValue(value);
    expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe(before);
    expect(await page.evaluate(() => window.__freeBody.state.customFoods.length)).toBe(0);
    await page.evaluate(() => {
      window.__failSave = false;
    });
    await page.locator('#cuAdd').click();
    await expect(page.locator('#toast')).toContainText(`已保存「${example.name}」`);
    await expect(page.locator(example.nameField)).toHaveValue('');
    const foods = await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).customFoods);
    expect(foods).toHaveLength(1);
    expect(foods[0].name).toBe(example.name);
    await page.reload();
    expect(await page.evaluate(() => window.__freeBody.state.customFoods[0].name)).toBe(example.name);
    expect(errors).toEqual([]);
  });
}

test('无效配置在合并前被拒绝，已有个人资料和清单保持完整', async ({ page }) => {
  await page.goto('/');
  await openSection(page, 'settings');
  await page.locator('#pfName').fill('虚构用户');
  await page.locator('#pfSave').click();
  const before = await page.evaluate(() => localStorage.getItem('freeBody_v1'));
  let confirmations = 0;
  page.on('dialog', async (d) => {
    confirmations++;
    await d.accept();
  });
  await page.locator('#exFile').setInputFiles({
    name: 'invalid-config.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        title: '测试配置',
        profile: { name: '错误替换' },
        injuries: [{ name: '测试', desc: { bad: 1 } }]
      })
    )
  });
  await expect(page.locator('#toast')).toContainText('配置无效');
  expect(confirmations).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe(before);
  expect(await page.evaluate(() => window.__freeBody.state.profile.name)).toBe('虚构用户');
  expect(await page.evaluate(() => window.__freeBody.state.injuries.length)).toBe(0);
});
