// SPDX-License-Identifier: MIT
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('营养数据明确区分条目参考、配方、同类近似和用户估算', () => {
  const a = load({ foods: true });
  const labels = new Set(a.FOOD_DB.foods.map((f) => a.EVIDENCE.food(f).label));
  assert.ok(labels.has('USDA 条目参考') && labels.has('配方估算') && labels.has('同类近似值'));
  const fdc = a.EVIDENCE.food({ ref: 'USDA FDC: Rice, raw <test>' });
  assert.equal(new URL(fdc.url).hostname, 'fdc.nal.usda.gov');
  assert.ok(fdc.url.includes('%3Ctest%3E'));
  assert.match(a.EVIDENCE.food({ src: 'import' }).label, /估算/);
  assert.match(a.EVIDENCE.food({ custom: true, source: '包装数值' }).label, /自定义/);
});

test('准备度解释显示缺失依据与实际归一权重，不把经验模型当作生理测量', () => {
  const a = load();
  assert.equal(a.EVIDENCE.readiness(null).label, '数据不足');
  a.S.sleep = [{ date: '2026-10-12', dur: 7, q: 5 }];
  const result = a.EVIDENCE.readiness(a.readiness('2026-10-12'));
  assert.equal(result.label, '依据有限');
  assert.equal(
    result.rows.reduce((sum, r) => sum + r.weight, 0),
    100
  );
  assert.match(result.note, /经验规则/);
  a.S.recov = [{ date: '2026-10-12', energy: 4, mood: 4 }];
  assert.equal(a.EVIDENCE.readiness(a.readiness('2026-10-12')).label, '相对趋势参考');
  assert.equal(a.num('1e999'), null);
  a.S.goals.sleepH = 4;
  a.S.sleep[0].dur = 4;
  const edge = a.readiness('2026-10-12');
  assert.ok(Number.isFinite(edge.score));
  assert.equal(edge.parts.find((p) => p.n === '睡眠时长').v, 0);
});

test('训练推荐：入门、低准备度、全身疲劳与恢复后的分组选择', () => {
  const a = load();
  assert.match(a.recommend().title, /入门/);
  a.S.sleep = [{ date: '2026-10-12', dur: 4, q: 1 }];
  assert.equal(a.recommend().rest, true);
  a.S = a.defaults();
  a.S.workouts = ['卧推', '划船', '深蹲'].map((exercise) => ({
    date: '2026-10-12',
    exercise,
    sets: 20,
    reps: 5,
    weight: 40,
    rir: 1
  }));
  assert.equal(a.recommend().rest, true);
  a.S.workouts = [{ date: '2026-10-01', exercise: '卧推', sets: 3, reps: 5, weight: 40 }];
  assert.ok(a.recommend().keys.includes('back'));
  a.S.injuries = [{ status: '康复中' }];
  a.S.restricted = [{ name: '某动作' }];
  assert.match(a.recommend().why, /受限动作/);
  a.S.injuries[0].status = '已恢复';
  assert.ok(!a.recommend().why.includes('受限动作'));
});
