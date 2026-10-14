// SPDX-License-Identifier: MIT
// 注入 VisualViewport 事件验证定位逻辑，不代替 Safari 真机绘制与工具栏手势测试。
const { test, expect } = require('./fixtures');
const { openSection, watchErrors } = require('./helpers');

async function viewportFixture(page, { ios = true, standalone = false, available = true } = {}) {
  // iPhone 13 项目默认可见高度是 664px（屏幕高度 844px）；统一容器后再注入视口变化。
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ ios, standalone, available }) => {
      Object.defineProperty(navigator, 'userAgent', {
        value: ios ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)' : 'Mozilla/5.0 (X11; Linux x86_64)',
        configurable: true
      });
      Object.defineProperty(navigator, 'standalone', { value: standalone, configurable: true });
      const viewport = new EventTarget();
      Object.assign(viewport, { width: 390, height: 725, offsetTop: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: available ? viewport : undefined, configurable: true });
      window.__setViewport = (props, event = 'resize') => {
        Object.assign(viewport, props);
        viewport.dispatchEvent(new Event(event));
      };
    },
    { ios, standalone, available }
  );
}

async function expectBottom(page, bottom) {
  await expect
    .poll(async () => {
      const box = await page.locator('#nav').boundingBox();
      return Math.abs(box.y + box.height - bottom);
    })
    .toBeLessThanOrEqual(1);
}

test('iOS Safari：工具栏收放、可见视口偏移、键盘恢复与安全区', async ({ page }) => {
  const errors = watchErrors(page);
  await viewportFixture(page);
  await page.goto('/');
  await expectBottom(page, 725);
  for (const [height, offsetTop, event] of [
    [844, 0, 'resize'],
    [500, 120, 'scroll'],
    [725, 0, 'resize'],
    [844, 0, 'resize']
  ]) {
    await page.evaluate(({ height, offsetTop, event }) => window.__setViewport({ height, offsetTop }, event), {
      height,
      offsetTop,
      event
    });
    await expectBottom(page, height + offsetTop);
  }
  // 安全区 / 大字体导致导航高度变化时，只计入一次 padding，按钮保持可点击。
  await page.addStyleTag({ content: '#nav{padding-bottom:34px} #nav button{font-size:18px}' });
  await expectBottom(page, 844);
  const nav = await page.locator('#nav').boundingBox();
  const button = await page.locator('#nav button').first().boundingBox();
  expect(Math.abs(nav.y + nav.height - button.y - button.height - 34)).toBeLessThanOrEqual(1);
  for (const tab of await page.locator('#nav button').all()) {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-current', 'page');
  }
  await openSection(page, 'selftest');
  await expect(page.locator('#stfList')).toContainText('可见视口');
  expect(errors).toEqual([]);
});

test('iOS Safari：横屏、桌面侧栏、缩放和返回页面后恢复定位', async ({ page }) => {
  await viewportFixture(page);
  await page.goto('/');
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#nav')).toHaveCSS('flex-direction', 'column');
  await expect(page.locator('#nav')).toHaveCSS('top', '0px');
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#nav')).toHaveCSS('top', '0px');
  await page.setViewportSize({ width: 390, height: 844 });
  await expectBottom(page, 725);
  await page.evaluate(() => window.__setViewport({ scale: 2, height: 400 }));
  await expect(page.locator('html')).not.toHaveClass(/browser-viewport/);
  await page.evaluate(() => window.__setViewport({ scale: 1, height: 844 }));
  await expectBottom(page, 844);
  await page.evaluate(() => {
    window.__setViewport({ height: 725 }, 'silent');
    window.dispatchEvent(new Event('pageshow'));
  });
  await expectBottom(page, 725);
});

for (const [name, options] of [
  ['非 iOS 浏览器', { ios: false }],
  ['无 VisualViewport', { available: false }]
]) {
  test(`${name}保留原有底栏定位`, async ({ page }) => {
    await viewportFixture(page, options);
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/browser-viewport/);
    await expectBottom(page, 844);
    await expect(page.locator('#nav')).toHaveCSS('bottom', '0px');
  });
}
