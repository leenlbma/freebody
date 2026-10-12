// SPDX-License-Identifier: MIT
'use strict';
/**
 * 合并端到端测试的覆盖率：FB_COVERAGE=1 npx playwright test 之后运行
 *   node scripts/e2e-coverage.js [--min 70]
 * 按 src/app 模块（以及 charts / icons）统计已执行字符比例；低于 --min 时失败。
 * 这是字符级的 V8 块覆盖，和单元测试的行覆盖率口径不同，二者不要直接比较。
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'test-results', 'e2e-coverage');
const mi = process.argv.indexOf('--min');
const MIN = mi > 0 ? +process.argv[mi + 1] : 0;

if (!fs.existsSync(DIR)) {
  console.error('[fail] 没有覆盖率数据：先运行 FB_COVERAGE=1 npx playwright test --project=chromium');
  process.exit(1);
}
const files = fs.readdirSync(DIR);
const srcs = files.filter((f) => /^app-\w+\.js$/.test(f));
if (srcs.length !== 1) {
  console.error(`[fail] 应恰好有一份应用脚本，实际 ${srcs.length} 份（构建后请清空 ${DIR} 重跑）`);
  process.exit(1);
}
const source = fs.readFileSync(path.join(DIR, srcs[0]), 'utf8');
const hit = new Uint8Array(source.length);
let runs = 0;
for (const f of files.filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const [s, e] of d.ranges) hit.fill(1, s, e);
  runs++;
}

// 模块边界：每个模块第二行的 "/* NN-name.js — 说明 */"
const marks = [];
const re = /\/\* (\d\d-[\w-]+\.js) — /g;
let m;
while ((m = re.exec(source))) marks.push([m.index, m[1]]);
if (!marks.length) {
  console.error('[fail] 没找到模块标记');
  process.exit(1);
}
const rows = [];
let all = 0,
  allHit = 0;
marks.forEach(([s, name], i) => {
  const e = i + 1 < marks.length ? marks[i + 1][0] : source.length;
  let n = 0,
    h = 0;
  for (let k = s; k < e; k++) {
    const c = source.charCodeAt(k);
    if (c === 32 || c === 10 || c === 9 || c === 13) continue; // 不计空白
    n++;
    if (hit[k]) h++;
  }
  rows.push([name, n, h]);
  all += n;
  allHit += h;
});
const pct = (h, n) => (n ? (100 * h) / n : 100).toFixed(1);
console.log(`端到端覆盖率（${runs} 个测试，Chromium，按非空白字符）`);
for (const [name, n, h] of rows) console.log(`  ${name.padEnd(22)} ${pct(h, n).padStart(5)}%`);
const total = +pct(allHit, all);
console.log(`  ${'合计 src/app'.padEnd(20)} ${total.toFixed(1).padStart(5)}%`);
if (MIN && total < MIN) {
  console.error(`[fail] 端到端覆盖率 ${total}% 低于 ${MIN}%`);
  process.exit(1);
}
