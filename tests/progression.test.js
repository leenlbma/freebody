'use strict';
// 进阶规则：线性 / 双重进阶 / 保持；未做满不加重；连续未完成减载；恢复期与伤处不适保持
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const SQ = '杠铃深蹲', BP = '杠铃卧推';
const w = (date, exercise, sets, reps, weight, extra) => ({ date, exercise, sets, reps, weight, rir: 2, ...extra });

test('线性：做满加重，下肢 ≥ 60kg 加 5kg，上肢 ≥ 20kg 加 2.5kg', () => {
  const a = load();
  a.S.workouts = [w('2026-10-10', SQ, 3, 5, 60), w('2026-10-10', BP, 3, 5, 40)];
  const sq = a.nextTarget(SQ, 3);
  assert.equal(sq.kind, 'up'); assert.equal(sq.w, 65); assert.equal(sq.reps, 5); assert.equal(sq.sets, 3);
  const bp = a.nextTarget(BP, 3);
  assert.equal(bp.kind, 'up'); assert.equal(bp.w, 42.5);
  assert.equal(a.defInc(SQ, 40), 2.5);
  assert.equal(a.defInc('侧平举', 8), 1);
});

test('线性：有一组没做满就不加重', () => {
  const a = load();
  a.S.workouts = [w('2026-10-10', SQ, 2, 5, 60), w('2026-10-10', SQ, 1, 4, 60)];
  const t = a.nextTarget(SQ);
  assert.equal(t.kind, 'hold'); assert.equal(t.w, 60); assert.equal(t.reps, 5);
});

test('减载：连续 2 次没做满，重量 × 0.9 并取整到 2.5kg', () => {
  const a = load();
  a.S.workouts = [
    w('2026-10-06', SQ, 3, 5, 60),
    w('2026-10-08', SQ, 2, 5, 60), w('2026-10-08', SQ, 1, 3, 60),
    w('2026-10-10', SQ, 2, 5, 60), w('2026-10-10', SQ, 1, 4, 60),
  ];
  const t = a.nextTarget(SQ);
  assert.equal(t.kind, 'deload'); assert.equal(t.w, 55); assert.equal(t.reps, 5);
});

test('减载：同一重量连续 3 次总次数没有增加', () => {
  const a = load();
  a.S.exRules = { [SQ]: { rule: 'double', lo: 8, hi: 12 } };
  a.S.workouts = ['2026-10-04', '2026-10-07', '2026-10-10'].map((d) => w(d, SQ, 3, 9, 60));
  const t = a.nextTarget(SQ);
  assert.equal(t.kind, 'deload'); assert.equal(t.w, 55); assert.equal(t.reps, 8);
});

test('双重进阶：都到上限才加重，否则把最少的一组 +1', () => {
  const a = load();
  a.S.exRules = { '哑铃卧推': { rule: 'double', lo: 8, hi: 12 } };
  a.S.workouts = [w('2026-10-10', '哑铃卧推', 3, 12, 20)];
  let t = a.nextTarget('哑铃卧推');
  assert.equal(t.kind, 'up'); assert.equal(t.w, 22.5); assert.equal(t.reps, 8);
  a.S.workouts = [w('2026-10-10', '哑铃卧推', 2, 12, 20), w('2026-10-10', '哑铃卧推', 1, 10, 20)];
  t = a.nextTarget('哑铃卧推');
  assert.equal(t.kind, 'reps'); assert.equal(t.w, 20); assert.equal(t.reps, 11);
});

test('保持：规则为 hold、恢复期前 2 周、伤处不适', () => {
  let a = load();
  a.S.exRules = { [SQ]: { rule: 'hold' } };
  a.S.workouts = [w('2026-10-10', SQ, 3, 5, 60)];
  assert.equal(a.nextTarget(SQ).kind, 'hold');

  a = load();
  a.S.recoveryStart = '2026-10-08';
  a.S.workouts = [w('2026-10-10', SQ, 3, 5, 60)];
  assert.equal(a.recWeek('2026-10-12'), 1);
  const r = a.nextTarget(SQ);
  assert.equal(r.kind, 'hold'); assert.equal(r.w, 60); assert.match(r.why, /恢复期第1周/);

  a = load();
  a.S.workouts = [w('2026-10-10', SQ, 3, 5, 60, { wrist: true })];
  assert.equal(a.nextTarget(SQ).kind, 'hold');
});

test('自重动作每组 +1 次；没有历史返回 null；只看所选日期之前', () => {
  const a = load();
  a.S.workouts = [w('2026-10-10', '引体向上', 3, 8, 0), w('2026-10-12', SQ, 3, 5, 60)];
  const t = a.nextTarget('引体向上');
  assert.equal(t.kind, 'reps'); assert.equal(t.reps, 9);
  assert.equal(a.nextTarget('硬拉'), null);
  assert.equal(a.nextTarget(SQ), null, '当天的训练不作为「上次」');
});
