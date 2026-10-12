// SPDX-License-Identifier: MIT
'use strict';
// 导入包：校验、预览状态、合并去重、撤销快照
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load } = require('./harness');

const pack = (entries, extra) => ({ freebody: 'import', version: 1, source: '测试', entries, ...extra });
const meal = (o) => ({
  type: 'meal',
  id: 'm1',
  date: '2026-10-12',
  meal: '午餐',
  name: '米饭',
  g: 200,
  kcal: 232,
  p: 5,
  c: 51,
  f: 0.6,
  estimated: true,
  ...o
});
const plan = (a, pk) => {
  a.IMP.rows = a.impPlan(pk);
  return a.IMP.rows.map((r) => r.status);
};

test('示例导入包全部有效，可导入，重复导入全部「已存在」', () => {
  const a = load();
  const pk = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'import', 'day-sample.json'), 'utf8'));
  const st = plan(a, pk);
  assert.ok(!st.includes('bad'), st.join());
  a.impApply();
  assert.equal(a.IMP.phase, 'done');
  assert.deepEqual(
    plan(a, pk),
    pk.entries.map(() => 'same')
  );
});

test('饮食：新增 → 已存在 → 修改后为更新，不产生重复记录', () => {
  const a = load();
  assert.deepEqual(plan(a, pack([meal()])), ['new']);
  a.impApply();
  assert.equal(a.S.meals.length, 1);
  const m = a.S.meals[0];
  assert.equal(m.imp, 'm1');
  assert.equal(m.src, 'import');
  assert.equal(m.est, true);
  assert.equal(m.name, '米饭 200g');
  assert.deepEqual(plan(a, pack([meal()])), ['same']);
  assert.deepEqual(plan(a, pack([meal({ kcal: 250 })])), ['update']);
  a.impApply();
  assert.equal(a.S.meals.length, 1);
  assert.equal(a.S.meals[0].kcal, 250);
});

test('训练：每组一条记录，重复导入整体替换', () => {
  const a = load();
  const wo = (sets) => ({ type: 'workout', id: 'w1', date: '2026-10-12', exercise: '杠铃深蹲', sets });
  plan(
    a,
    pack([
      wo([
        { reps: 5, weight: 60, rir: 2 },
        { reps: 5, weight: 60, rir: 1 }
      ])
    ])
  );
  a.impApply();
  assert.equal(a.S.workouts.length, 2);
  assert.deepEqual([...a.S.workouts.map((x) => x.id)], ['w1#1', 'w1#2']);
  assert.equal(a.S.workouts[1].rpe, 9);
  assert.deepEqual(
    plan(
      a,
      pack([
        wo([
          { reps: 5, weight: 60, rir: 2 },
          { reps: 5, weight: 60, rir: 1 }
        ])
      ])
    ),
    ['same']
  );
  assert.deepEqual(plan(a, pack([wo([{ reps: 5, weight: 62.5, rir: 2 }])])), ['update']);
  a.impApply();
  assert.equal(a.S.workouts.length, 1);
  assert.equal(a.S.workouts[0].weight, 62.5);
});

test('睡眠 / 身体：同一天已有记录时合并，保留未提供的字段', () => {
  const a = load();
  a.S.sleep.push({ id: 'own', date: '2026-10-12', bed: '23:00', wake: '07:00', dur: 8, q: 4, note: '自己记的' });
  a.S.body.push({ id: 'b0', date: '2026-10-12', weight: 70, waist: 80 });
  assert.deepEqual(
    plan(
      a,
      pack([
        { type: 'sleep', id: 's1', date: '2026-10-12', bed: '23:30', wake: '07:00' },
        { type: 'body', id: 'b1', date: '2026-10-12', weight: 70.4 }
      ])
    ),
    ['merge', 'merge']
  );
  a.impApply();
  assert.equal(a.S.sleep.length, 1);
  assert.equal(a.S.sleep[0].dur, 7.5);
  assert.equal(a.S.sleep[0].q, 4);
  assert.equal(a.S.sleep[0].note, '自己记的');
  assert.equal(a.S.body.length, 1);
  assert.equal(a.S.body[0].weight, 70.4);
  assert.equal(a.S.body[0].waist, 80);
});

test('补剂：按名称匹配清单（不区分大小写），没有则新增并打卡', () => {
  const a = load();
  a.S.supps = [{ id: 'c', name: '肌酸', dose: '5g', time: '' }];
  plan(
    a,
    pack([
      { type: 'supplement', id: 'p1', date: '2026-10-12', name: '肌酸', time: '08:00' },
      { type: 'supplement', id: 'p2', date: '2026-10-12', name: 'Omega-3' }
    ])
  );
  a.impApply();
  assert.equal(a.S.supps.length, 2);
  assert.equal(a.S.suppLog['2026-10-12'].c.at, '08:00');
  assert.deepEqual(plan(a, pack([{ type: 'supplement', id: 'p1', date: '2026-10-12', name: '肌酸', time: '08:00' }])), [
    'same'
  ]);
});

test('无效条目标为「无效」并说明原因，不影响其他条目', () => {
  const a = load();
  const rows = a.impPlan(
    pack([
      meal(),
      meal(), // 包内重复 id
      { type: 'note', id: '-bad', date: '2026-10-12', text: 'x' },
      { type: 'cardio', id: 'c1', date: '2026-10-12' },
      meal({ id: 'm2', date: '2026-13-01' }),
      meal({ id: 'm3', kcal: undefined }),
      { type: 'body', id: 'b1', date: '2026-10-12' }
    ])
  );
  assert.deepEqual(
    rows.map((r) => r.status),
    ['new', 'bad', 'bad', 'bad', 'bad', 'bad', 'bad']
  );
  assert.match(rows[1].reason, /重复/);
  assert.match(rows[3].reason, /不支持的类型 cardio/);
  assert.match(rows[5].reason, /缺少 kcal/);
  assert.match(rows[6].reason, /至少填一项/);
});

test('包级错误：完整备份、版本、空包、数量上限', () => {
  const a = load();
  assert.throws(() => a.impPlan({ v: 1, meals: [] }), /完整备份/);
  assert.throws(() => a.impPlan({ freebody: 'import', version: 2, entries: [meal()] }), /版本 2 较新/);
  assert.throws(() => a.impPlan(pack([])), /entries 为空/);
  assert.throws(() => a.impPlan(pack(Array.from({ length: 2001 }, (_, i) => meal({ id: 'm' + i })))), /最多导入 2000/);
  assert.deepEqual(
    a.impPlan([meal()]).map((r) => r.status),
    ['new'],
    '直接给数组也接受'
  );
});

test('撤销：impApply 写入前保存快照', () => {
  const a = load();
  a.S.meals.push({ id: 'x', date: '2026-10-11', kcal: 100 });
  plan(a, pack([meal()]));
  a.impApply();
  const snap = JSON.parse(a.IMP.undo);
  assert.equal(snap.meals.length, 1);
  assert.equal(a.S.meals.length, 2);
});

test('链接：base64url 解码（未压缩与 deflate-raw 压缩）', async () => {
  const a = load();
  const json = JSON.stringify(pack([meal()]));
  const plain = Buffer.from(json, 'utf8').toString('base64url');
  assert.equal(await a.impDecode(plain), json);
  const z = require('zlib').deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url');
  assert.equal(await a.impDecode('z.' + z), json);
  await assert.rejects(a.impDecode('z.' + z.slice(0, 20)), /不完整/);
  await assert.rejects(a.impDecode('x'.repeat(60001)), /链接过长/);
  assert.equal(a.impStrip('```json\n{"a":1}\n```'), '{"a":1}');
});
