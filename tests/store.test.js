// SPDX-License-Identifier: MIT
'use strict';
// 存储安全：用量阈值只提示一次、写满兜底、备份提醒、旧键迁移
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, memStorage } = require('./harness');

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

test('界面保存失败回滚操作并保留导出草稿，重试只生成一条记录', () => {
  const a = load({ quota: 3000 });
  const record = { id: 'n', date: '2026-10-12', text: '待保存' };
  a.storage.setItem('filler', 'x'.repeat(2500));
  a.S.notes.push(record);
  assert.equal(a.save(true), false);
  assert.equal(a.S.notes.length, 0);
  assert.equal(JSON.parse(a.STORE.draft).notes[0].text, '待保存');
  a.storage.removeItem('filler');
  a.S.notes.push(record);
  assert.equal(a.save(true), true);
  assert.equal(JSON.parse(a.storage.getItem(a.KEY)).notes.length, 1);
  assert.equal(a.STORE.draft, null);
});

test('计划、进行中的训练和个人配置也需要备份保护', () => {
  for (const edit of [
    (s) => {
      s.profile.name = '测试';
    },
    (s) => {
      s.goals.kcal = 2000;
    },
    (s) => {
      s.plans.push({ name: '测试', items: [] });
    },
    (s) => {
      s.active = { items: [] };
    }
  ]) {
    const a = load();
    edit(a.S);
    assert.equal(a.hasUserData(a.S), true);
  }
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

test('备份校验：缺省字段补齐，输入不被修改；演示数据和训练会话仍兼容', () => {
  const a = load();
  const input = { v: 1, meals: [], goals: {} };
  const next = a.stateNormalize(input, true);
  assert.ok(Array.isArray(next.workouts));
  assert.equal(next.goals.sleepH, 7);
  assert.equal(input.goals.sleepH, undefined);
  assert.ok(a.stateNormalize(a.demoData('2026-10-12'), true).meals.length > 0);
  const full = a.defaults();
  full.plans = [{ name: '测试', items: [{ ex: '深蹲', sets: 3 }] }];
  full.sessions = [{ date: '2026-10-12', sets: 2, items: [{ ex: '深蹲', sets: '5×60 / 5×60', miss: false }] }];
  full.active = { date: '2026-10-12', items: [{ ex: '深蹲', sets: [{ weight: 60, reps: 5 }] }] };
  full.customFoods = [{ name: '测试餐', aliases: ['别名'], units: { 份: 100 }, servings: [{ g: 100 }] }];
  full.suppLog = { '2026-10-12': { test: { at: '12:00' } } };
  full.rehabLog = { '2026-10-12': { test: 1 } };
  full.exRules = { '深蹲': { rule: 'linear' } };
  assert.equal(a.stateNormalize(full, true).active.items[0].sets[0].weight, 60);
  const restored = load({ storage: { freeBody_v1: JSON.stringify(full) } });
  assert.equal(restored.STORE.bad, null);
  assert.equal(restored.S.sessions[0].items[0].sets, '5×60 / 5×60');
});

test('备份校验：拒绝错误数组、嵌套类型、数值和版本；本机损坏原文保留', () => {
  const a = load();
  const bad = [
    null,
    [],
    { workouts: null },
    { workouts: [null] },
    { plans: [{ name: '坏计划' }] },
    { profile: { height: '170' } },
    { goals: { weight: {} } },
    { goals: [] },
    { profile: 3 },
    { meals: [{ name: 1 }] },
    { meals: [{ kcal: '520' }] },
    { meals: [{ date: '2026-02-30' }] },
    { notes: [{ tags: [1] }] },
    { plans: [{ items: {} }] },
    { workouts: [{ sets: '3' }] },
    { customFoods: [{ units: [] }] },
    { customFoods: [{ units: { 份: '100' } }] },
    { goals: { kcal: '2000' } },
    { goals: { mealSplit: [] } },
    { goals: { mealSplit: { 早餐: '25' } } },
    { suppLog: { date: [] } },
    { suppLog: { date: { id: '12:00' } } },
    { suppLog: { date: { id: { at: 12 } } } },
    { rehabLog: { date: { id: '1' } } },
    { exRules: { 深蹲: null } },
    { active: { items: [{ ex: '深蹲', sets: 3 }] } },
    { recoveryStart: 1 },
    { v: 2 }
  ];
  assert.throws(() => a.stateNormalize({ meals: [{ kcal: Infinity }] }, true), /有限数字/);
  for (const value of bad) {
    assert.throws(() => a.stateNormalize(value, true), JSON.stringify(value));
    if (value && !Array.isArray(value)) {
      const raw = JSON.stringify(value);
      const b = load({ storage: { freeBody_v1: raw } });
      // 本机的 goals / profile 历史上允许回退；其他错误必须保护原文。
      if (('goals' in value && Array.isArray(value.goals)) || value.profile === 3) continue;
      assert.equal(b.STORE.bad, raw);
      assert.equal(b.save(), false);
      assert.equal(b.storage.getItem(b.KEY), raw);
    }
  }
});

test('多页面：即使没有收到 storage 事件，过期页面也不能覆盖新记录或清空数据', () => {
  const storage = memStorage();
  const first = load({ sharedStorage: storage });
  first.save();
  const second = load({ sharedStorage: storage });
  first.S.notes.push({ id: 'A', date: '2026-10-12', text: '窗口 A' });
  first.save();
  const latest = storage.getItem(first.KEY);
  second.S.notes.push({ id: 'B', date: '2026-10-12', text: '窗口 B' });
  assert.equal(second.save(), false);
  assert.equal(second.storeCanWrite(true), false);
  assert.equal(second.STORE.err, 'conflict');
  assert.equal(storage.getItem(first.KEY), latest);
  assert.equal(second.S.notes[0].id, 'B', '保留本页修改供导出');
  assert.ok(second.calls.alert.includes('conflict'));
  storage.removeItem(first.KEY);
  assert.equal(first.save(), false, '其他页面清空后也不能重新写回旧数据');
});

test('Web Locks：只允许持锁页面写入，页面关闭释放锁后可以继续', async () => {
  let held = false;
  const locks = {
    request: async (name, opt, fn) => {
      assert.equal(name, 'freebody-write');
      assert.equal(opt.ifAvailable, true);
      if (held) return fn(null);
      held = true;
      try {
        return await fn({ name });
      } finally {
        held = false;
      }
    }
  };
  const storage = memStorage();
  const first = load({ sharedStorage: storage, locks });
  first.storeLock();
  assert.equal(first.STORE.writer, true);
  assert.ok(first.save());
  const second = load({ sharedStorage: storage, locks });
  second.storeLock();
  assert.equal(second.STORE.writer, false);
  assert.equal(second.save(), false);
  assert.ok(second.calls.alert.includes('readonly'));
  first.STORE.release();
  await new Promise(setImmediate);
  second.storeLock();
  assert.equal(second.STORE.writer, true);
  assert.ok(second.save());
  second.STORE.release();
});

test('Web Locks 不可用时保留保存前的冲突检查', async () => {
  const a = load({ locks: { request: () => Promise.reject(new Error('unsupported')) } });
  a.storeLock();
  await new Promise(setImmediate);
  assert.equal(a.STORE.writer, true);
  assert.ok(a.save());
  a.storage.setItem(a.KEY, '{}');
  assert.equal(a.save(), false);
  assert.equal(a.storage.getItem(a.KEY), '{}');
});
