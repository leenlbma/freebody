// SPDX-License-Identifier: MIT
// 真正安装 Service Worker，验证离线启动与等待用户确认的更新；隔离端口，不修改项目产物。
const http = require('http');
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./fixtures');
const { openSection } = require('./helpers');
test.use({ serviceWorkers: 'allow' });
let server, origin, version;
const root = path.join(__dirname, '../..');
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
    if (
      ![
        'index.html',
        'sw.js',
        'manifest.webmanifest',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-192.png',
        'icons/icon-maskable-512.png'
      ].includes(file)
    ) {
      res.writeHead(404).end();
      return;
    }
    let body = fs.readFileSync(path.join(root, file));
    if (file === 'index.html')
      body = body.toString().replace('</head>', '<meta name="pwa-test-version" content="' + version + '"></head>');
    if (file === 'sw.js')
      body = body.toString().replace(/var VERSION = ['"][^'"]+['"];/, "var VERSION = 'test-" + version + "';");
    res
      .writeHead(200, {
        'Content-Type': file.endsWith('.js')
          ? 'application/javascript'
          : file.endsWith('.png')
            ? 'image/png'
            : file.endsWith('webmanifest')
              ? 'application/manifest+json'
              : 'text/html',
        'Cache-Control': 'no-store'
      })
      .end(body);
  });
  await new Promise((res) => server.listen(0, '127.0.0.1', res));
  origin = 'http://127.0.0.1:' + server.address().port;
});
test.afterAll(async () => {
  await new Promise((res) => server.close(res));
});
test.beforeEach(() => {
  version = 1;
});
async function install(page) {
  await page.goto(origin);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForLoadState('networkidle');
}
test('已安装应用离线重启，记录和本机恢复点仍可用', async ({ page, context }) => {
  await install(page);
  await page.evaluate(() => {
    const b = document.createElement('button');
    b.dataset.sub = 'body';
    document.body.appendChild(b);
    b.click();
    b.remove();
  });
  await page.locator('#bW').fill('70.5');
  await page.locator('#bSave').click();
  await openSection(page, 'settings');
  await page.locator('#historyCard').evaluate((el) => {
    el.open = true;
  });
  await expect(page.locator('[data-history-export]')).not.toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#ovTrain')).toBeVisible();
  expect(await page.evaluate(() => window.__freeBody.state.body[0].weight)).toBe(70.5);
  await openSection(page, 'settings');
  await page.locator('#historyCard').evaluate((el) => {
    el.open = true;
  });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-history-export]').first().click()
  ]);
  expect(JSON.parse(fs.readFileSync(await download.path(), 'utf8')).body[0].weight).toBe(70.5);
  await context.setOffline(false);
});
test('新版本等待确认再接管，更新后保留已有记录', async ({ page }) => {
  await install(page);
  const before = await page.evaluate(() => {
    localStorage.setItem(
      'freeBody_v1',
      JSON.stringify({ v: 1, meals: [], goals: {}, notes: [{ id: 'n', date: '2026-10-12', text: '虚构保留记录' }] })
    );
    return localStorage.getItem('freeBody_v1');
  });
  await page.reload();
  version = 2;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
  });
  await expect(page.locator('#swUpd')).toBeVisible();
  await expect(page.locator('meta[name=pwa-test-version]')).toHaveAttribute('content', '1');
  await page.locator('#swUpd').click();
  await expect(page.locator('meta[name=pwa-test-version]')).toHaveAttribute('content', '2');
  expect(await page.evaluate(() => localStorage.getItem('freeBody_v1'))).toBe(before);
});
