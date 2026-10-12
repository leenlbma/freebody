#!/usr/bin/env node
/** 自检：确认 index.html 为最新构建、内联脚本可被解析。用法：node scripts/check.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length < 4) throw new Error('未找到内联脚本，请先运行 npm run build');
scripts.forEach((s, i) => new vm.Script(s, { filename: `index.html#script${i}` }));
// 产物中不应残留 emoji（UI 统一使用 SVG 图标）
const emoji = html.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2705}\u{FE0F}]/u);
if (emoji) throw new Error('产物中发现 emoji: ' + emoji[0]);
for (const ph of ['/*__STYLES__*/', '/*__DATA__*/', '/*__ICONS__*/', '/*__CHARTS__*/', '/*__APP__*/']) {
  if (html.includes(ph)) throw new Error('存在未替换的占位符 ' + ph);
}
// PWA：sw.js 已生成且可解析，manifest 图标存在
const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (sw.includes('__VERSION__') || sw.includes('__ASSETS__')) throw new Error('sw.js 未生成，请先运行 npm run build');
new vm.Script(sw, { filename: 'sw.js' });
const mf = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
for (const i of mf.icons) if (!fs.existsSync(path.join(root, i.src))) throw new Error('manifest 图标缺失: ' + i.src);
if (!mf.icons.some((i) => i.purpose === 'maskable')) throw new Error('manifest 缺少 maskable 图标');
console.log(`[ok] 语法检查通过（${scripts.length} 段脚本）`);
