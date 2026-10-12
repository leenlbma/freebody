'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('演示数据：结构完整、id 唯一、日期在近 4 周内', () => {
  const a = load();
  const d = a.demoData('2026-10-12');
  const keys = Object.keys(a.defaults());
  for (const k of keys) assert.ok(k in d, '缺少字段 ' + k);
  const ids = [];
  for (const k of ['meals', 'workouts', 'cardio', 'sleep', 'body', 'recov', 'labs', 'notes']) {
    for (const x of d[k]) {
      ids.push(x.id);
      assert.ok(x.date >= '2026-09-15' && x.date <= '2026-10-12', k + ' 日期越界 ' + x.date);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(d.meals.length > 50 && d.workouts.length > 50 && d.sleep.length === 28);
});

test('演示数据：可直接用于核心计算，同一天结果确定', () => {
  const a = load();
  a.S = a.demoData('2026-10-12');
  assert.ok(a.dayTot('2026-10-11').k > 1000);
  assert.ok(a.readiness('2026-10-11'));
  assert.ok(Array.isArray([...a.otSignals('2026-10-11')]));
  assert.ok(a.hasUserData(a.S));
  assert.equal(JSON.stringify(a.demoData('2026-10-12')), JSON.stringify(a.demoData('2026-10-12')));
});

test('演示模式（#demo）：不读取也不写入本机存储', () => {
  const real = JSON.stringify({ v: 1, meals: [{ id: 'm1', date: '2026-10-12', meal: '午餐', name: '真实记录', kcal: 500 }] });
  const a = load({ hash: '#demo', storage: { freeBody_v1: real } });
  assert.equal(a.DEMO, true);
  assert.ok(!a.S.meals.some((m) => m.name === '真实记录'));
  a.S.meals.push({ id: 'x', date: '2026-10-12', meal: '午餐', name: '演示中新增', kcal: 1 });
  assert.equal(a.save(), true);
  assert.equal(a.storage.getItem('freeBody_v1'), real);
  assert.equal(a.storage.getItem('freeBody_meta_v1'), null);
  const b = load();
  assert.equal(b.DEMO, false);
});
