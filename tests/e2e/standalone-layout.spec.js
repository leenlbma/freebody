// SPDX-License-Identifier: MIT
// 注入 CSS 视口单位与安全区，验证布局规则；不能模拟 iOS 27 系统保留区或安装缓存。
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

async function standalone(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });
    // 旧代码据此移除安装声明；新版本无论 CSS 特性是否可用都应保留声明。
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (property, value) => property === 'anchor-name' || supports(property, value);
  });
}

async function bottom(page, height) {
  await expect
    .poll(async () => {
      const nav = await page.locator('#nav').boundingBox();
      return Math.abs(nav.y + nav.height - height);
    })
    .toBeLessThanOrEqual(1);
  const nav = await page.locator('#nav').boundingBox();
  const main = await page.locator('#main').boundingBox();
  expect(main.y + main.height).toBeLessThanOrEqual(nav.y + 1);
  for (const button of await page.locator('#nav button').all()) {
    const box = await button.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.y + box.height).toBeLessThanOrEqual(height - 12);
  }
}

for (const [name, top, dynamic, visible] of [
  ['安全区正常', 59, 844, 844],
  ['冷启动动态视口少了顶部安全区', 59, 785, 844],
  ['旧安装不透明状态栏与零安全区', 0, 785, 785]
]) {
  test(`iOS 主屏幕竖屏：${name}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 390, height: visible });
    await standalone(page);
    const html = fs
      .readFileSync(path.join(__dirname, '../../index.html'), 'utf8')
      .replace(/<style>[\s\S]*?<\/style>/, (css) =>
        css
          .replace(/env\(safe-area-inset-top(?:,0px)?\)/g, `${top}px`)
          .replace(/env\(safe-area-inset-bottom\)/g, top ? '34px' : '0px')
          .replace(/100dvh/g, `${dynamic}px`)
          .replace(/100vh/g, '844px')
      );
    await page.route('**/', (route) => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('/');
    await expect(page.locator('meta[name=apple-mobile-web-app-capable]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name=apple-mobile-web-app-status-bar-style]')).toHaveAttribute(
      'content',
      'black-translucent'
    );
    await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href', 'manifest.webmanifest');
    await bottom(page, visible);
    await openSection(page, 'settings');
    await page.locator('#main').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await page.locator('#main').evaluate((el) => el.scrollTop)).toBeGreaterThan(100);
    const last = await page.locator('#aboutLine').boundingBox();
    const nav = await page.locator('#nav').boundingBox();
    expect(last.y + last.height).toBeLessThanOrEqual(nav.y);
    await bottom(page, visible);
    await page.locator('#nav button').first().click();
    expect(await page.locator('#main').evaluate((el) => el.scrollTop)).toBe(0);
    await openSection(page, 'selftest');
    await expect(page.locator('#stfList')).toContainText('主屏幕安装配置');
    await expect(page.locator('#stfList')).toContainText('视口单位 vh / dvh');
    expect(errors).toEqual([]);
  });
}

test('iOS 主屏幕：旋转、保存、重载及导入操作栏', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await standalone(page);
  await page.goto('/');
  await bottom(page, 844);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#nav')).toHaveCSS('flex-direction', 'column');
  await expect(page.locator('#nav')).toHaveCSS('position', 'fixed');
  await page.setViewportSize({ width: 390, height: 844 });
  // 应用原有 resize 重绘延迟 200ms；先等方向变化结束，再开始输入记录。
  await page.waitForTimeout(300);
  await bottom(page, 844);
  await openSection(page, 'body');
  await page.locator('#bW').fill('70.5');
  await page.locator('#bSave').click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).body.length)).toBe(1);
  await page.reload();
  await bottom(page, 844);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('freeBody_v1')).body.length)).toBe(1);
  await openSection(page, 'impPack');
  await page
    .locator('#ipText')
    .fill(
      JSON.stringify({ freebody: 'import', version: 1, entries: [{ type: 'body', date: '2026-10-14', weight: 71 }] })
    );
  await page.locator('#ipGo').click();
  await expect(page.locator('.imp-bar')).toBeVisible();
  const bar = await page.locator('.imp-bar').boundingBox();
  const nav = await page.locator('#nav').boundingBox();
  expect(bar.y + bar.height).toBeLessThanOrEqual(nav.y);
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#nav')).toHaveCSS('position', 'fixed');
  await expect(page.locator('#nav')).toHaveCSS('flex-direction', 'column');
});
