// SPDX-License-Identifier: MIT
// 端到端测试的 test 对象：设置 FB_COVERAGE=1 时，在 Chromium 上收集应用脚本的 V8 覆盖率，
// 每个测试写一份已执行区间到 test-results/e2e-coverage/，由 scripts/e2e-coverage.js 合并统计。
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const base = require('@playwright/test');

const DIR = path.join(__dirname, '..', '..', 'test-results', 'e2e-coverage');

/** V8 块覆盖：同一函数内后出现的区间更内层，按顺序覆盖即可得到每个字符的执行次数 */
function executed(entry) {
  const n = entry.source.length;
  const hit = new Uint8Array(n);
  for (const fn of entry.functions) {
    for (const r of fn.ranges) hit.fill(r.count > 0 ? 1 : 0, r.startOffset, Math.min(r.endOffset, n));
  }
  const out = [];
  let s = -1;
  for (let i = 0; i <= n; i++) {
    if (i < n && hit[i]) {
      if (s < 0) s = i;
    } else if (s >= 0) {
      out.push([s, i]);
      s = -1;
    }
  }
  return out;
}

const test = base.test.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    const on = !!process.env.FB_COVERAGE && browserName === 'chromium';
    if (on) await page.coverage.startJSCoverage({ resetOnNavigation: false });
    await use(page);
    if (!on) return;
    const list = await page.coverage.stopJSCoverage();
    const apps = list.filter((e) => e.source && e.source.includes('var FB_VERSION ='));
    if (!apps.length) return;
    fs.mkdirSync(DIR, { recursive: true });
    const name = crypto.createHash('sha1').update(testInfo.titlePath.join('/')).digest('hex').slice(0, 12);
    const groups = new Map();
    for (const app of apps) {
      const id = crypto.createHash('sha1').update(app.source).digest('hex').slice(0, 10);
      const src = path.join(DIR, `app-${id}.js`);
      if (!fs.existsSync(src)) fs.writeFileSync(src, app.source);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(...executed(app));
    }
    for (const [id, ranges] of groups) {
      fs.writeFileSync(
        path.join(DIR, `${name}-${id}.json`),
        JSON.stringify({ src: id, title: testInfo.title, ranges })
      );
    }
  }
});

module.exports = { test, expect: base.expect };
