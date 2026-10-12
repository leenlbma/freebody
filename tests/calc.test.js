'use strict';
// 核心计算：饮食合计、预警信号、准备度、1RM、BMR / 目标、疲劳半衰期
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const D = '2026-10-12';
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('dayTot：只合计当天，缺省字段按 0', () => {
  const a = load();
  a.S.meals = [
    { date: D, kcal: 500, p: 30, c: 60, f: 12 },
    { date: D, kcal: 250, p: 5 },
    { date: '2026-10-11', kcal: 900, p: 50, c: 80, f: 30 }
  ];
  assert.deepEqual({ ...a.dayTot(D) }, { k: 750, p: 35, c: 60, f: 12 });
  assert.deepEqual({ ...a.dayTot('2026-10-01') }, { k: 0, p: 0, c: 0, f: 0 });
});

test('otSignals：近 3 天对比前 4–17 天基线', () => {
  const a = load();
  assert.deepEqual([...a.otSignals(D)], [], '没有数据时没有信号');
  for (let i = 3; i < 17; i++) a.S.recov.push({ date: a.addDays(D, -i), rhr: 55, hrv: 60 });
  for (let i = 0; i < 3; i++) {
    a.S.recov.push({ date: a.addDays(D, -i), rhr: 62, hrv: 50 });
    a.S.sleep.push({ date: a.addDays(D, -i), dur: 6, q: 4 });
  }
  const s = a.otSignals(D);
  assert.equal(s.length, 3);
  assert.match(s[0], /静息心率较基线升高 7 bpm/);
  assert.match(s[1], /HRV 较基线下降 17%/);
  assert.match(s[2], /平均睡眠 6 h/);
});

test('otSignals：主观指标阈值', () => {
  const a = load();
  for (let i = 0; i < 3; i++)
    a.S.recov.push({ date: a.addDays(D, -i), stress: 4, energy: 2, soreness: 4, mood: 3, appetite: 3 });
  const s = a.otSignals(D).join('|');
  assert.match(s, /压力偏高/);
  assert.match(s, /精力偏低/);
  assert.match(s, /肌肉酸痛持续偏高/);
  assert.doesNotMatch(s, /情绪偏低|食欲下降/);
});

test('readiness：满分睡眠 + 心率 / HRV 与基线持平 + 主观最好 = 84', () => {
  const a = load();
  a.S.goals.sleepH = 7;
  a.S.sleep.push({ date: D, dur: 7, q: 5 });
  for (let i = 1; i <= 14; i++) a.S.recov.push({ date: a.addDays(D, -i), rhr: 55, hrv: 60 });
  a.S.recov.push({ date: D, rhr: 55, hrv: 60, energy: 5, mood: 5, soreness: 1, stress: 1 });
  const r = a.readiness(D);
  // (0.2×1 + 0.1×1 + 0.2×0.6 + 0.2×0.6 + 0.3×1) / 1.0 = 0.84
  assert.equal(r.score, 84);
  assert.equal(r.parts.length, 5);
});

test('readiness：只有一项时返回 null；缺项按剩余权重归一', () => {
  const a = load();
  a.S.goals.sleepH = 7;
  a.S.sleep.push({ date: D, dur: 5.5 });
  assert.equal(a.readiness(D), null);
  a.S.recov.push({ date: D, energy: 3, mood: 3, soreness: 3, stress: 3 });
  // 睡眠 (5.5-4)/3 = 0.5（权重 0.2）；主观 0.5（权重 0.3） → 50
  assert.equal(a.readiness(D).score, 50);
});

test('epley 1RM', () => {
  const a = load();
  near(a.epley({ weight: 100, reps: 5 }), 100 * (1 + 5 / 30));
  assert.equal(a.epley({ weight: 120, reps: 1 }), 120);
  assert.equal(a.epley({ weight: 0, reps: 5 }), null);
  assert.equal(a.epley({ weight: 60 }), null);
});

test('BMR / 目标：Mifflin-St Jeor 与 Katch-McArdle', () => {
  const a = load();
  a.S.profile.height = 180;
  a.S.body = [
    { date: '2026-10-01', weight: 82 },
    { date: '2026-10-10', weight: 80, bf: 20 }
  ];
  const base = { sex: 'm', age: 30, pal: 1.55, mode: 'keep', adj: 0, pkg: 1.6, fatPct: 25, km: false };
  const m = a.calcTarget(base);
  assert.equal(m.bmr, 10 * 80 + 6.25 * 180 - 5 * 30 + 5); // 1780，取最近一次体重
  assert.equal(m.kcal, 2760); // 1780 × 1.55 = 2759 → 取整到 10
  assert.equal(m.p, 128); // 1.6 g/kg × 80
  assert.equal(m.f, Math.round((2760 * 0.25) / 9));
  assert.equal(m.c, Math.round((2760 - 128 * 4 - m.f * 9) / 4));
  assert.equal(a.calcTarget({ ...base, sex: 'f' }).bmr, 1780 - 166);
  near(a.calcTarget({ ...base, km: true }).bmr, 370 + 21.6 * 64);
  const cut = a.calcTarget({ ...base, mode: 'cut' });
  assert.equal(cut.kcal, Math.round((1780 * 1.55 * 0.85) / 10) * 10);
  a.S.profile.height = null;
  assert.deepEqual([...a.calcTarget({ ...base, age: null }).miss], ['身高（我的 › 个人配置）', '年龄']);
});

test('肌群疲劳：有效组数 × 0.5^(小时 / 半衰期)', () => {
  const a = load(); // 今天 = 2026-10-12 12:00
  a.S.workouts = [
    { date: '2026-10-10', exercise: '杠铃卧推', sets: 4, reps: 5, weight: 60, rir: 2 },
    { date: '2026-10-11', exercise: '侧平举', sets: 3, reps: 15, weight: 8, rir: 6 } // RIR > 4 不计入
  ];
  const st = a.muscleState();
  const h = 42; // 10-10 18:00 → 10-12 12:00
  near(st.chest.f, 4 * Math.pow(0.5, h / 36));
  near(st.triceps.f, 4 * 0.5 * Math.pow(0.5, h / 24));
  near(st.delts.f, 4 * 0.5 * Math.pow(0.5, h / 30));
  assert.equal(st.chest.status, 'recovering');
  assert.equal(st.chest.sets7, 4);
  assert.equal(st.chest.eta, Math.ceil((36 * Math.log(st.chest.f / 1.5)) / Math.LN2));
  assert.equal(st.triceps.status, 'recovered');
  assert.equal(st.quads.status, 'never');
  assert.equal(a.MUS.lowback[1], 54);
});

test('肌群疲劳：太久没练标为 stale，近 7 天组数不含更早的训练', () => {
  const a = load();
  a.S.workouts = [{ date: '2026-09-30', exercise: '杠铃深蹲', sets: 5, reps: 5, weight: 80, rir: 1 }];
  const st = a.muscleState();
  assert.equal(st.quads.status, 'stale');
  assert.equal(st.quads.sets7, 0);
  assert.equal(st.quads.days, 12);
});

test('sleepDur 跨午夜', () => {
  const a = load();
  assert.equal(a.sleepDur('23:30', '07:00'), 7.5);
  assert.equal(a.sleepDur('01:00', '08:30'), 7.5);
  assert.equal(a.sleepDur('', '07:00'), null);
});

test('weekInfo / dayVol：按周一到周日统计训练天数、容量与有氧', () => {
  const a = load();
  a.S.workouts = [
    { date: '2026-10-12', sets: 3, reps: 10, weight: 50 },
    { date: '2026-10-12', sets: 2, reps: 5, weight: 100 },
    { date: '2026-10-14', sets: 3, reps: 8, weight: 40 },
    { date: '2026-10-19', sets: 5, reps: 5, weight: 60 } // 下一周
  ];
  a.S.cardio = [{ date: '2026-10-13', min: 20 }];
  a.S.swims = [{ date: '2026-10-15', dist: 800 }];
  assert.equal(a.dayVol('2026-10-12'), 1500 + 1000);
  const w = a.weekInfo('2026-10-15');
  assert.equal(w.ws, '2026-10-12');
  assert.equal(w.we, '2026-10-18');
  assert.equal(w.days, 2);
  assert.equal(w.vol, 2500 + 960);
  assert.equal(w.stair, 20);
  assert.equal(w.stairDays, 1);
  assert.equal(w.swimM, 800);
  assert.equal(w.swimN, 1);
});

test('recAdvice：恢复期分阶段提示', () => {
  const a = load();
  assert.equal(a.recAdvice(null), null);
  assert.equal(a.recAdvice(1)[0], 'warn');
  assert.equal(a.recAdvice(3)[0], 'info');
  assert.equal(a.recAdvice(7)[0], 'ok');
});
