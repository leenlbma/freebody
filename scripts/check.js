#!/usr/bin/env node
// SPDX-License-Identifier: MIT
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
// eslint-disable-next-line no-misleading-character-class -- 单独匹配 U+FE0F 变体选择符
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
// 食物库：id / 名称唯一、每条有来源 ref、热量与宏量营养大致自洽
const foods = JSON.parse(fs.readFileSync(path.join(root, 'data', 'foods.json'), 'utf8')).foods;
const seen = new Set(),
  seenName = new Set();
const ALCOHOL = new Set(['beer', 'red-wine']);
for (const f of foods) {
  if (seen.has(f.id)) throw new Error('食物 id 重复: ' + f.id);
  if (seenName.has(f.name)) throw new Error('食物名称重复: ' + f.name);
  seen.add(f.id);
  seenName.add(f.name);
  if (!f.ref || !f.source) throw new Error('食物缺少 source / ref: ' + f.id);
  const est = 4 * f.p + 4 * f.c + 9 * f.f;
  if (!ALCOHOL.has(f.id) && Math.abs(est - f.kcal) > Math.max(20, f.kcal * 0.3))
    throw new Error(`食物热量与宏量不符: ${f.id} kcal=${f.kcal} 估算=${Math.round(est)}`);
}

// 导入包：JSON Schema（schema/freebody.schema.json）校验示例文件与文档中的示例；无第三方依赖的精简校验器，覆盖本 schema 用到的关键字
const schema = JSON.parse(fs.readFileSync(path.join(root, 'schema', 'freebody.schema.json'), 'utf8'));
function jsType(v) {
  return v === null
    ? 'null'
    : Array.isArray(v)
      ? 'array'
      : typeof v === 'number'
        ? Number.isInteger(v)
          ? 'integer'
          : 'number'
        : typeof v;
}
function validate(sc, v, at, errs) {
  if (sc.$ref) {
    const d = sc.$ref.replace(/^#\/\$defs\//, '');
    if (!schema.$defs[d]) throw new Error('schema 引用不存在: ' + sc.$ref);
    return validate(schema.$defs[d], v, at, errs);
  }
  const n0 = errs.length,
    t = jsType(v);
  if ('const' in sc && v !== sc.const) errs.push(`${at} 应为 ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) errs.push(`${at} 不在 ${sc.enum.join('/')} 中`);
  if (sc.type && !(sc.type === t || (sc.type === 'number' && t === 'integer'))) {
    errs.push(`${at} 类型应为 ${sc.type}，实际 ${t}`);
    return;
  }
  if (t === 'string') {
    if (sc.minLength != null && [...v].length < sc.minLength) errs.push(`${at} 过短`);
    if (sc.maxLength != null && [...v].length > sc.maxLength) errs.push(`${at} 过长`);
    if (sc.pattern && !new RegExp(sc.pattern).test(v)) errs.push(`${at} 格式不符 ${sc.pattern}`);
  }
  if (t === 'number' || t === 'integer') {
    if (sc.minimum != null && v < sc.minimum) errs.push(`${at} 小于 ${sc.minimum}`);
    if (sc.maximum != null && v > sc.maximum) errs.push(`${at} 大于 ${sc.maximum}`);
  }
  if (t === 'array') {
    if (sc.minItems != null && v.length < sc.minItems) errs.push(`${at} 至少 ${sc.minItems} 项`);
    if (sc.maxItems != null && v.length > sc.maxItems) errs.push(`${at} 最多 ${sc.maxItems} 项`);
    if (sc.items) v.forEach((x, i) => validate(sc.items, x, `${at}[${i}]`, errs));
  }
  if (t === 'object') {
    for (const k of sc.required || []) if (!(k in v)) errs.push(`${at} 缺少 ${k}`);
    for (const k of Object.keys(v)) {
      if (sc.properties && sc.properties[k]) validate(sc.properties[k], v[k], `${at}.${k}`, errs);
      else if (sc.additionalProperties === false) errs.push(`${at} 不允许的字段 ${k}`);
    }
  }
  if (
    sc.anyOf &&
    !sc.anyOf.some((s2) => {
      const e2 = [];
      validate(s2, v, at, e2);
      return !e2.length;
    })
  )
    errs.push(`${at} 不满足 anyOf`);
  if (sc.oneOf) {
    const res = sc.oneOf.map((s2) => {
      const e2 = [];
      validate(s2, v, at, e2);
      return e2;
    });
    const ok = res.filter((e2) => !e2.length).length;
    if (ok !== 1) {
      // 按 type 找到对应分支给出具体原因
      const hit = sc.oneOf.findIndex((s2) => {
        const d = s2.$ref && schema.$defs[s2.$ref.replace(/^#\/\$defs\//, '')];
        return d && d.properties && d.properties.type && v && d.properties.type.const === v.type;
      });
      errs.push(...(hit >= 0 && ok === 0 ? res[hit] : [`${at} 应恰好匹配一种条目类型（type=${v && v.type}）`]));
    }
  }
  return errs.length === n0;
}
function checkPack(obj, name) {
  const errs = [];
  validate(schema, obj, '$', errs);
  if (errs.length) throw new Error(`${name} 不符合 schema：\n  ` + errs.slice(0, 8).join('\n  '));
  const ids = new Set();
  for (const e of obj.entries) {
    const k = e.type + '|' + e.id;
    if (ids.has(k)) throw new Error(`${name} 中 id 重复: ${e.id}`);
    ids.add(k);
  }
  return obj.entries.length;
}
const impDir = path.join(root, 'examples', 'import');
let nPack = 0,
  nEnt = 0;
for (const n of fs
  .readdirSync(impDir)
  .filter((x) => x.endsWith('.json'))
  .sort()) {
  nEnt += checkPack(JSON.parse(fs.readFileSync(path.join(impDir, n), 'utf8')), 'examples/import/' + n);
  nPack++;
}
// 文档与 skill 中的 JSON 示例（```json 代码块且含 "freebody": "import"）同样必须通过
const docFiles = [
  'docs/data-format.md',
  'docs/data-format.en.md',
  'skills/freebody-coach/SKILL.md',
  'skills/freebody-coach/SKILL.en.md'
];
let nDoc = 0;
for (const f of docFiles) {
  const fp = path.join(root, f);
  if (!fs.existsSync(fp)) throw new Error('缺少文档 ' + f);
  const md = fs.readFileSync(fp, 'utf8');
  for (const m of md.matchAll(/```json\n([\s\S]*?)```/g))
    if (/"freebody"\s*:\s*"import"/.test(m[1])) {
      checkPack(JSON.parse(m[1]), f + ' 中的示例');
      nDoc++;
    }
}
// 反例必须被拒绝，防止校验器失效
for (const bad of [
  { freebody: 'import', version: 1, entries: [] },
  { freebody: 'import', version: 1, entries: [{ type: 'meal', id: 'x', date: '2026-13-01', name: 'a', kcal: 1 }] },
  { freebody: 'import', version: 1, entries: [{ type: 'body', id: 'b', date: '2026-01-01' }] },
  {
    freebody: 'import',
    version: 1,
    entries: [{ type: 'workout', id: 'w', date: '2026-01-01', exercise: 'x', sets: [{ reps: 1.5 }] }]
  }
]) {
  const e = [];
  validate(schema, bad, '$', e);
  if (!e.length) throw new Error('schema 校验器未能拒绝反例: ' + JSON.stringify(bad));
}
// skill：通用 Agent Skill 格式（frontmatter 含 name / description；description 不超过 1024 字符、不含尖括号）
for (const f of ['SKILL.md', 'SKILL.en.md']) {
  const sk = fs.readFileSync(path.join(root, 'skills', 'freebody-coach', f), 'utf8');
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(sk);
  const dm = fm && /^description:\s*(?:"([^"\n]+)"|([^\n]+))$/m.exec(fm[1]);
  if (!fm || !/^name:\s*freebody-coach\s*$/m.test(fm[1]) || !dm)
    throw new Error('skills/freebody-coach/' + f + ' 缺少 frontmatter name / description');
  const desc = dm[1] || dm[2];
  if (desc.length > 1024 || /[<>]/.test(desc))
    throw new Error('skills/freebody-coach/' + f + ' 的 description 超过 1024 字符或含尖括号');
  if (!/#import=/.test(desc) || !/schema/.test(desc))
    throw new Error('skills/freebody-coach/' + f + ' 的 description 须写明输出（导入包 / #import 链接）');
}
// 「复制给你的 AI」提示词：README 与 skills/freebody-coach/PROMPT.md 必须逐字一致
const promptRe = (lang) =>
  new RegExp('<!-- freebody-prompt:' + lang + ' -->\\n```text\\n([\\s\\S]*?)\\n```\\n<!-- /freebody-prompt -->', 'g');
const getPrompts = (f, lang) =>
  [...fs.readFileSync(path.join(root, f), 'utf8').matchAll(promptRe(lang))].map((m) => m[1]);
const promptMd = 'skills/freebody-coach/PROMPT.md';
for (const [readme, lang] of [
  ['README.md', 'zh'],
  ['README.en.md', 'en']
]) {
  const a = getPrompts(readme, lang),
    b = getPrompts(promptMd, lang);
  if (a.length !== 1 || b.length !== 1)
    throw new Error(`提示词（${lang}）应在 ${readme} 与 ${promptMd} 中各出现一次，实际 ${a.length} / ${b.length}`);
  if (a[0] !== b[0]) {
    const la = a[0].split('\n'),
      lb = b[0].split('\n');
    let i = 0;
    while (i < la.length && la[i] === lb[i]) i++;
    throw new Error(`${readme} 与 ${promptMd} 的提示词（${lang}）不一致，第 ${i + 1} 行：\n  ${la[i]}\n  ${lb[i]}`);
  }
  const n = a[0].split('\n').length;
  if (n < 3 || n > 6) throw new Error(`提示词（${lang}）共 ${n} 行，应为 3–6 行（规则只写在 skill 里）`);
}
// 规则只写在 skill 正文里：正文必须包含导入链接格式、估算标注与 schema 地址
for (const f of ['SKILL.md', 'SKILL.en.md']) {
  const body = fs
    .readFileSync(path.join(root, 'skills', 'freebody-coach', f), 'utf8')
    .replace(/^---\n[\s\S]*?\n---\n/, '');
  for (const must of [
    'https://leenlbma.github.io/freebody/#import=',
    '"estimated": true',
    'https://raw.githubusercontent.com/leenlbma/freebody/main/schema/freebody.schema.json'
  ])
    if (!body.includes(must)) throw new Error(`skills/freebody-coach/${f} 正文缺少 ${must}`);
}
console.log(`[ok] 导入包 schema 校验通过（示例 ${nPack} 个、${nEnt} 条；文档示例 ${nDoc} 个；反例均被拒绝）`);
console.log('[ok] skill frontmatter 与正文要点齐全；README 与 PROMPT.md 的提示词（中 / 英）一致');
const prov = { fdc: 0, recipe: 0, legacy: 0 };
for (const f of foods) {
  if (/^USDA FDC: /.test(f.ref)) prov.fdc++;
  else if (/配方/.test(f.ref)) prov.recipe++;
  else prov.legacy++;
}
console.log(
  `[ok] 食物库 ${foods.length} 项，id / ref 校验通过（具体 USDA 条目 ${prov.fdc}、自拟配方 ${prov.recipe}、旧版同类近似 ${prov.legacy}）`
);
console.log(`[ok] 语法检查通过（${scripts.length} 段脚本）`);
