'use strict';
// 存储安全：用量阈值只提示一次、写满兜底、备份提醒、旧键迁移
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('quotaLevel：70 / 90 各提示一次，回落后重新计入', () => {
  const a = load();
  const w = {};
  assert.equal(a.quotaLevel(50, w), 0);
  assert.equal(a.quotaLevel(71, w), 70);
  assert.equal(a.quotaLevel(80, w), 0, '70 只提示一次');
  assert.equal(a.quotaLevel(92, w), 90);
  assert.equal(a.quotaLevel(95, w), 0, '90 只提示一次');
  assert.equal(a.quotaLevel(60, w), 0);
  assert.equal(a.quotaLevel(72, w), 70, '回落到 65% 以下后，再次超过 70% 会再提示');
  const w2 = {};
  assert.equal(a.quotaLevel(91, w2), 90, '直接超过 90 时提示 90');
  assert.equal(a.quotaLevel(75, w2), 0, '此时 70 也视为已提示');
});

test('save：用量超过 70% 时提示一次，并记入辅助状态', () => {
  const a = load({ quota: 10_000_000 });
  a.storage.setItem('filler', 'x'.repeat(Math.round(a.LS_QUOTA * 0.72)));
  assert.equal(a.save(), true);
  assert.deepEqual(a.calls.alert, [70]);
  assert.ok(a.STORE.pct >= 72);
  assert.equal(JSON.parse(a.storage.getItem(a.METAKEY)).warned[70], 1);
  a.save();
  assert.deepEqual(a.calls.alert, [70], '不重复提示');
});

test('save：写满时返回 false、给出导出提示，内存中的数据保留', () => {
  const a = load({ quota: 3000 });
  a.S.notes.push({ id: 'n1', date: '2026-10-12', text: 'x'.repeat(4000) });
  assert.equal(a.save(), false);
  assert.equal(a.STORE.err, 'quota');
  assert.deepEqual(a.calls.alert, ['quota']);
  assert.equal(a.S.notes.length, 1);
  assert.equal(a.storage.getItem(a.KEY), null);
  a.S.notes = [];
  assert.equal(a.save(), true, '腾出空间后恢复正常');
  assert.equal(a.STORE.err, null);
});

test('isQuotaErr：兼容各浏览器的名称与错误码', () => {
  const a = load();
  assert.ok(a.isQuotaErr({ name: 'QuotaExceededError' }));
  assert.ok(a.isQuotaErr({ name: 'NS_ERROR_DOM_QUOTA_REACHED' }));
  assert.ok(a.isQuotaErr({ code: 22 }));
  assert.ok(!a.isQuotaErr(new Error('x')));
  assert.ok(!a.isQuotaErr(null));
});

test('backupDue：距上次备份 30 天；从未备份按首次使用；可推迟；无数据不提醒', () => {
  const a = load();
  const d = '2026-10-12';
  assert.equal(a.backupDue({ lastBackup: '2026-09-13' }, d, true), false); // 29 天
  assert.equal(a.backupDue({ lastBackup: '2026-09-12' }, d, true), true); // 30 天
  assert.equal(a.backupDue({ firstUse: '2026-09-01' }, d, true), true);
  assert.equal(a.backupDue({ firstUse: '2026-10-01' }, d, true), false);
  assert.equal(a.backupDue({ lastBackup: '2026-08-01', snooze: '2026-10-15' }, d, true), false);
  assert.equal(a.backupDue({ lastBackup: '2026-08-01' }, d, false), false);
  assert.equal(a.backupDue({}, d, true), false);
});

test('firstDataDate / hasUserData', () => {
  const a = load();
  assert.equal(a.hasUserData(a.S), false, '默认数据（补剂清单等）不算用户数据');
  a.S.sleep.push({ date: '2026-09-20' });
  a.S.meals.push({ date: '2026-08-02' });
  assert.equal(a.hasUserData(a.S), true);
  assert.equal(a.firstDataDate(a.S), '2026-08-02');
});

test('首次保存记录 firstUse 为最早的记录日期', () => {
  const a = load();
  a.S.meals.push({ date: '2026-07-01', kcal: 1 });
  a.save();
  assert.equal(JSON.parse(a.storage.getItem(a.METAKEY)).firstUse, '2026-07-01');
});

test('load：从旧键名迁移且保留旧键；缺字段用默认值补齐', () => {
  const a = load({
    storage: {
      fitTracker_v1: JSON.stringify({ v: 1, meals: [{ date: '2026-10-01', kcal: 300 }], goals: { kcal: 2000 } })
    }
  });
  assert.equal(a.S.meals.length, 1);
  assert.equal(a.S.goals.kcal, 2000);
  assert.equal(a.S.goals.sleepH, 7);
  assert.ok(Array.isArray(a.S.notes));
  assert.ok(a.storage.getItem('freeBody_v1'));
  assert.ok(a.storage.getItem('fitTracker_v1'));
});

test('本机数据损坏：保留原文，不用默认值覆盖，并提示', () => {
  for (const raw of ['{broken', '[1,2]', '42']) {
    const a = load({ storage: { freeBody_v1: raw } });
    assert.equal(a.STORE.bad, raw, raw);
    assert.equal(a.save(), false, raw);
    assert.equal(a.storage.getItem('freeBody_v1'), raw, raw);
    assert.ok(a.calls.alert.includes('corrupt'), raw);
  }
});

test('本机数据部分字段类型不对时仍能读取（goals / profile 回退默认）', () => {
  const a = load({ storage: { freeBody_v1: JSON.stringify({ v: 1, meals: [], goals: null, profile: 3 }) } });
  assert.equal(a.STORE.bad, null);
  assert.equal(typeof a.S.goals.kcal, 'number');
  assert.equal(typeof a.S.profile, 'object');
  assert.equal(a.save(), true);
});

test('空存储不算损坏', () => {
  const a = load();
  assert.equal(a.STORE.bad, null);
  assert.equal(a.save(), true);
});
