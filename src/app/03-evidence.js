// SPDX-License-Identifier: MIT
/* 03-evidence.js — 营养来源与经验规则解释，纯函数，无存储与 DOM */
var EVIDENCE = (function () {
  function food(f) {
    var ref = String(f.ref || ''),
      source = String(f.source || '');
    if (/^USDA FDC: /.test(ref))
      return {
        label: 'USDA 条目参考',
        reference: ref,
        note: '按条目名称参考数据库，由本项目整理；份量与烹饪差异仍会影响实际摄入。',
        url: 'https://fdc.nal.usda.gov/food-search?query=' + encodeURIComponent(ref.slice(10))
      };
    if (/配方/.test(ref))
      return {
        label: '配方估算',
        reference: ref,
        note: '按列出的食材与熟重系数计算。用油、配比和做法改变时，请调整份量或数值。'
      };
    if (/同类条目/.test(ref))
      return {
        label: '同类近似值',
        reference: ref,
        note: '没有对应的具体数据库条目。适合趋势记录，有包装时优先使用营养成分表。'
      };
    return {
      label: f.src === 'import' || f.src === 'ai' ? '识别或导入估算' : '手动或自定义数值',
      reference: source,
      note: '请核对来源和份量。照片与文字只能估算，不能直接测量实际摄入。'
    };
  }
  function readiness(rd) {
    if (!rd)
      return { label: '数据不足', rows: [], note: '至少需要 2 项记录；心率与 HRV 还需要近 14 天至少 3 天的个人基线。' };
    var total = rd.parts.reduce(function (sum, p) {
      return sum + p.w;
    }, 0);
    return {
      label: total < 0.5 ? '依据有限' : '相对趋势参考',
      rows: rd.parts.map(function (p) {
        return { name: p.n, weight: Math.round((p.w / total) * 100), value: Math.round(p.v * 100) };
      }),
      note: '这是经验规则，不是生理测量。缺失项不计入，已有项目重新分配权重；分数用于和自己的近期状态比较。'
    };
  }
  return { food: food, readiness: readiness };
})();
