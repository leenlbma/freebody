#!/usr/bin/env node
/**
 * 构建脚本：把 src/ 模板、样式、脚本与 data/、examples/ 中的 JSON 内联成单文件 index.html。
 * 用法：node scripts/build.js   （无第三方依赖，Node >= 14）
 * 产物：项目根目录 index.html，可直接双击/手机浏览器打开，离线可用。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// 1) 读取并校验食物库
const foods = JSON.parse(read('data/foods.json'));
if (!Array.isArray(foods.foods)) throw new Error('data/foods.json 缺少 foods 数组');
const ids = new Set();
for (const f of foods.foods) {
  for (const k of ['id', 'name']) if (!f[k]) throw new Error(`食物条目缺少 ${k}: ${JSON.stringify(f)}`);
  for (const k of ['kcal', 'p', 'c', 'f']) {
    if (typeof f[k] !== 'number' || f[k] < 0) throw new Error(`食物 ${f.id} 的 ${k} 必须为非负数字`);
  }
  if (f.aliases !== undefined && !(Array.isArray(f.aliases) && f.aliases.every((x) => typeof x === 'string'))) {
    throw new Error(`食物 ${f.id} 的 aliases 必须为字符串数组`);
  }
  if (f.units !== undefined && (typeof f.units !== 'object' || Object.values(f.units).some((g) => typeof g !== 'number' || g <= 0))) {
    throw new Error(`食物 ${f.id} 的 units 必须为 {单位: 克数>0}`);
  }
  if (f.servings !== undefined && !(Array.isArray(f.servings) && f.servings.every((s) => s && typeof s.unit === 'string' && typeof s.g === 'number' && s.g > 0))) {
    throw new Error(`食物 ${f.id} 的 servings 必须为 [{unit, g>0}] 数组`);
  }
  for (const k of ['na', 'fib']) {
    if (f[k] !== undefined && (typeof f[k] !== 'number' || f[k] < 0)) throw new Error(`食物 ${f.id} 的 ${k} 必须为非负数字或省略`);
  }
  if (typeof f.source !== 'string' || !f.source) throw new Error(`食物 ${f.id} 缺少 source（数据来源）`);
  if (ids.has(f.id)) throw new Error(`重复的食物 id: ${f.id}`);
  ids.add(f.id);
}

// 2) 读取可选示例配置（examples/*.json）
const exDir = path.join(root, 'examples');
const examples = fs.existsSync(exDir)
  ? fs.readdirSync(exDir).filter((n) => n.endsWith('.json')).sort()
      .map((n) => JSON.parse(fs.readFileSync(path.join(exDir, n), 'utf8')))
  : [];

// 3) 应用脚本：src/app/*.js 按文件名顺序拼接，包在同一个 IIFE 中（模块共享作用域，顺序即执行顺序）
const appDir = path.join(root, 'src', 'app');
const appFiles = fs.readdirSync(appDir).filter((n) => /^\d{2}-[\w-]+\.js$/.test(n)).sort();
if (!appFiles.length) throw new Error('src/app/ 下没有模块');
const app = [
  '/*!',
  ' * FreeBody — 应用脚本（由 scripts/build.js 从 src/app/*.js 合并）',
  ' * 单页离线健身记录：饮食 / 训练 / 补剂 / 睡眠 / 身体指标 / 激素与恢复 / 伤病与限制',
  ' * 数据仅存于浏览器 localStorage（键：freeBody_v1，自动从旧键 fitTracker_v1 迁移），可导出/导入 JSON。',
  ' * 模块：' + appFiles.join('、'),
  ' * 本项目不提供医疗建议。MIT License.',
  ' */',
  '(function(){',
  "'use strict';",
].join('\n') + '\n' + appFiles.map((n) => fs.readFileSync(path.join(appDir, n), 'utf8')).join('') + '})();\n';

// 4) 内联：样式、数据、图标、图表库、应用脚本依次注入模板（JSON 中的 "</" 转义，避免提前闭合 <script>）
const data = 'window.FIT_DATA = ' + JSON.stringify({ foods, examples }).replace(/<\//g, '<\\/') + ';';
const html = read('src/index.template.html')
  .replace('/*__STYLES__*/', () => read('src/styles.css'))
  .replace('/*__DATA__*/', () => data)
  .replace('/*__ICONS__*/', () => read('src/icons.js'))
  .replace('/*__CHARTS__*/', () => read('src/charts.js'))
  .replace('/*__APP__*/', () => app);

const banner = `<!-- 由 scripts/build.js 生成，请勿直接编辑；修改 src/、data/、examples/ 后重新构建 -->\n`;
fs.writeFileSync(path.join(root, 'index.html'), html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + banner));
// 5) PWA：生成 sw.js（版本号 = package 版本 + 产物内容哈希，内容变化即触发更新）
const crypto = require('crypto');
const pkg = JSON.parse(read('package.json'));
const manifest = read('manifest.webmanifest');
const mf = JSON.parse(manifest);
const assets = ['./', './index.html', './manifest.webmanifest'].concat(mf.icons.map((i) => './' + i.src), ['./icons/apple-touch-icon.png']);
for (const a of assets.slice(3)) if (!fs.existsSync(path.join(root, a))) throw new Error('缺少 PWA 图标 ' + a + '（运行 scripts/make-icons.py）');
const hash = crypto.createHash('sha256').update(html).update(manifest).digest('hex').slice(0, 10);
const swVersion = pkg.version + '-' + hash;
fs.writeFileSync(path.join(root, 'sw.js'), read('src/sw.template.js').replace('__VERSION__', swVersion).replace('__ASSETS__', JSON.stringify(assets)));
console.log(`[ok] sw.js 已生成（版本 ${swVersion}，预缓存 ${assets.length} 项）`);
console.log(`[ok] index.html 已生成（食物 ${foods.foods.length} 项，示例配置 ${examples.length} 个，${(Buffer.byteLength(html) / 1024).toFixed(1)} KB）`);
