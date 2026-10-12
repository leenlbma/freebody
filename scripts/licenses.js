// SPDX-License-Identifier: MIT
'use strict';
/**
 * 开发依赖许可证检查：node scripts/licenses.js
 * 遍历 node_modules 中实际安装的所有包（含间接依赖），只允许宽松许可证；
 * 发现 GPL / AGPL / LGPL / SSPL 或未声明许可证的包即失败。
 * 这些包只在开发和测试时使用，不会进入 index.html。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'node_modules');
const ALLOW = new Set([
  'MIT',
  'ISC',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  '0BSD',
  'CC0-1.0',
  'CC-BY-4.0',
  'BlueOak-1.0.0',
  'Python-2.0',
  'MPL-2.0' // axe-core：只在测试中注入页面，不修改、不分发
]);

function licenseOf(pkg) {
  let l = pkg.license || (pkg.licenses && pkg.licenses.map((x) => x.type || x).join(' OR '));
  if (l && typeof l === 'object') l = l.type;
  return l ? String(l) : '';
}
/** SPDX 表达式：OR 只需其一被允许，AND 需全部被允许 */
function allowed(expr) {
  const e = expr.replace(/[()]/g, '').trim();
  if (!e) return false;
  if (/ OR /.test(e)) return e.split(/ OR /).some(allowed);
  return e.split(/ AND /).every((x) => ALLOW.has(x.trim()));
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return out;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith('.')) continue;
    const p = path.join(dir, n);
    if (n.startsWith('@')) {
      walk(p, out);
      continue;
    }
    const pj = path.join(p, 'package.json');
    if (fs.existsSync(pj)) {
      const pkg = JSON.parse(fs.readFileSync(pj, 'utf8'));
      if (pkg.name && pkg.version) out.set(pkg.name + '@' + pkg.version, licenseOf(pkg));
      walk(path.join(p, 'node_modules'), out);
    }
  }
  return out;
}

if (!fs.existsSync(ROOT)) {
  console.log('[skip] 没有 node_modules（先运行 npm ci）');
  process.exit(0);
}
const all = walk(ROOT, new Map());
const count = {};
const bad = [];
for (const [id, l] of all) {
  count[l || '（未声明）'] = (count[l || '（未声明）'] || 0) + 1;
  if (!allowed(l)) bad.push(`${id}: ${l || '（未声明）'}`);
}
console.log(
  `[info] 开发依赖共 ${all.size} 个包：` +
    Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join('，')
);
if (bad.length) {
  console.error('[fail] 以下包的许可证不在允许列表中：\n  ' + bad.join('\n  '));
  process.exit(1);
}
console.log('[ok] 许可证检查通过（运行时零依赖，以上均为开发工具）');
