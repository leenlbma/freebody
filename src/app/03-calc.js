// SPDX-License-Identifier: MIT
/* 03-calc.js — 核心计算（无 DOM）：饮食合计、份量换算、预警、恢复期、BMR / 目标、1RM、准备度、肌群疲劳、进阶规则、快速输入解析 */
/* ---------- 计算 ---------- */
function dayMeals(d) {
  return S.meals.filter(function (m) {
    return m.date === d;
  });
}
function dayTot(d) {
  var t = { k: 0, p: 0, c: 0, f: 0 };
  dayMeals(d).forEach(function (m) {
    t.k += m.kcal || 0;
    t.p += m.p || 0;
    t.c += m.c || 0;
    t.f += m.f || 0;
  });
  return t;
}
function vol(w) {
  return (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
}
function dayVol(d) {
  return S.workouts
    .filter(function (w) {
      return w.date === d;
    })
    .reduce(function (s, w) {
      return s + vol(w);
    }, 0);
}
function weekInfo(d) {
  var ws = weekStart(d),
    we = addDays(ws, 6),
    inW = function (x) {
      return x.date >= ws && x.date <= we;
    };
  var days = {};
  S.workouts.filter(inW).forEach(function (w) {
    days[w.date] = 1;
  });
  return {
    ws: ws,
    we: we,
    days: Object.keys(days).length,
    vol: S.workouts.filter(inW).reduce(function (s, w) {
      return s + vol(w);
    }, 0),
    stair: S.cardio.filter(inW).reduce(function (s, c) {
      return s + (c.min || 0);
    }, 0),
    swimM: S.swims.filter(inW).reduce(function (s, c) {
      return s + (c.dist || 0);
    }, 0),
    swimN: S.swims.filter(inW).length,
    stairDays: Object.keys(
      S.cardio.filter(inW).reduce(function (o, c) {
        o[c.date] = 1;
        return o;
      }, {})
    ).length
  };
}
function recWeek(d) {
  if (!S.recoveryStart) return null;
  var n = diffDays(S.recoveryStart, d);
  if (n < 0) return 0;
  return Math.floor(n / 7) + 1;
}
function recAdvice(wk) {
  if (wk == null) return null;
  if (wk === 0) return ['info', '恢复期尚未开始（起始日：' + S.recoveryStart + '）。'];
  if (wk <= 2)
    return [
      'warn',
      '恢复期第' + wk + '周：轻重量为主，每组留 3-4 次余力（RPE ≤ 7），重点找回动作模式；出现关节不适立即降重。'
    ];
  if (wk <= 4) return ['info', '恢复期第' + wk + '周：可逐步加重（每周约 2.5-5%），RPE 7-8，留 2-3 次余力。'];
  if (wk <= 6)
    return ['info', '恢复期第' + wk + '周：接近常规强度，RPE ≈ 8，主项可偶尔 8.5-9；与私教确认后进入常规计划。'];
  return ['ok', '已度过 6 周恢复期，可按常规计划推进（注意周期性减载）。'];
}
function parseT(s) {
  s = String(s || '')
    .trim()
    .replace('：', ':');
  if (!s) return null;
  var a = s.split(':').map(Number);
  if (a.some(isNaN)) return null;
  var t = 0;
  a.forEach(function (x) {
    t = t * 60 + x;
  });
  return t > 0 ? t : null;
}
function fmtT(t) {
  if (t == null) return '-';
  var m = Math.floor(t / 60),
    s = t - m * 60;
  var ss = (Math.round(s * 100) / 100).toFixed(s % 1 ? 2 : 0);
  if (s < 10) ss = '0' + ss;
  return m + ':' + ss;
}
function pbEntries() {
  var a = S.pb100br.map(function (x) {
    return { id: x.id, date: x.date, sec: x.sec, type: x.type, note: x.note, src: 'pb' };
  });
  S.swims.forEach(function (w) {
    if (w.stroke === '蛙泳' && w.dist === 100 && w.sec)
      a.push({ id: w.id, date: w.date, sec: w.sec, type: '游泳记录', note: w.note, src: 'swim' });
  });
  return a.sort(function (x, y) {
    return x.date < y.date ? -1 : 1;
  });
}
function sleepDur(b, w) {
  if (!b || !w) return null;
  var a = b.split(':'),
    c = w.split(':');
  var m = +c[0] * 60 + +c[1] - (+a[0] * 60 + +a[1]);
  if (m <= 0) m += 1440;
  return m / 60;
}
function sleepOf(d) {
  return S.sleep.find(function (s) {
    return s.date === d;
  });
}
function recovOf(d) {
  return S.recov.find(function (s) {
    return s.date === d;
  });
}
function suppDone(d) {
  return S.suppLog[d] || {};
}

/* 过度训练/恢复不足预警：近3天 vs 前4-17天基线 */
function otSignals(d) {
  var sig = [],
    recent = [],
    base = [];
  for (var i = 0; i < 3; i++) recent.push(addDays(d, -i));
  for (var j = 3; j < 17; j++) base.push(addDays(d, -j));
  var get = function (days, fn) {
    return avg(days.map(fn));
  };
  var rhrOf = function (x) {
    var r = recovOf(x);
    if (r && r.rhr != null) return r.rhr;
    var b = S.body.find(function (y) {
      return y.date === x;
    });
    return b ? b.rhr : null;
  };
  var rR = get(recent, rhrOf),
    rB = get(base, rhrOf);
  if (rR != null && rB != null && rR - rB >= 5) sig.push('晨起静息心率较基线升高 ' + r1(rR - rB) + ' bpm');
  var hv = function (x) {
    var r = recovOf(x);
    return r ? r.hrv : null;
  };
  var hR = get(recent, hv),
    hB = get(base, hv);
  if (hR != null && hB != null && hB > 0 && (hB - hR) / hB >= 0.1)
    sig.push('HRV 较基线下降 ' + Math.round(((hB - hR) / hB) * 100) + '%');
  var sd = function (x) {
    var s = sleepOf(x);
    return s ? s.dur : null;
  };
  var sR = get(recent, sd);
  if (sR != null && sR < 6.5) sig.push('近3天平均睡眠 ' + r1(sR) + ' h（偏少）');
  var sq = function (x) {
    var s = sleepOf(x);
    return s ? s.q : null;
  };
  var qR = get(recent, sq);
  if (qR != null && qR <= 2.5) sig.push('睡眠质量偏差（均 ' + r1(qR) + '/5）');
  var f = function (k) {
    return function (x) {
      var r = recovOf(x);
      return r ? r[k] : null;
    };
  };
  var st = get(recent, f('stress'));
  if (st != null && st >= 4) sig.push('压力偏高（均 ' + r1(st) + '/5）');
  var en = get(recent, f('energy'));
  if (en != null && en <= 2) sig.push('精力偏低（均 ' + r1(en) + '/5）');
  var so = get(recent, f('soreness'));
  if (so != null && so >= 4) sig.push('肌肉酸痛持续偏高（均 ' + r1(so) + '/5）');
  var mo = get(recent, f('mood'));
  if (mo != null && mo <= 2) sig.push('情绪偏低（均 ' + r1(mo) + '/5）');
  var ap = get(recent, f('appetite'));
  if (ap != null && ap <= 2) sig.push('食欲下降（均 ' + r1(ap) + '/5）');
  return sig;
}
var MEALS = ['早餐', '午餐', '晚餐', '加餐'],
  SPLIT0 = [25, 35, 30, 10];
var SRC_LBL = {
  lib: '内置库',
  quick: '快速输入',
  photo: '教练照片估算',
  ai: '拍照识别估算',
  import: 'AI 导入',
  custom: '自定义'
};
function mealOfHour(h) {
  return h < 10 ? '早餐' : h < 14 ? '午餐' : h < 17 ? '加餐' : h < 21 ? '晚餐' : '加餐';
}
/** 份量换算：优先 servings，兼容旧 units */
function unitsOf(f) {
  var u = {};
  if (!f) return u;
  if (f.servings && f.servings.length)
    f.servings.forEach(function (s) {
      if (s && s.unit && s.g > 0) u[s.unit] = s.g;
    });
  else if (f.units) for (var k in f.units) u[k] = f.units[k];
  return u;
}
function per100(f) {
  var o = { kcal: f.kcal, p: f.p, c: f.c, f: f.f };
  if (f.na != null) o.na = f.na;
  if (f.fib != null) o.fib = f.fib;
  return o;
}
/** 由食物（每100g）与克数生成记录字段（含营养快照） */
function fromFood(f, g, amount, unit) {
  var r = g / 100,
    o = {
      foodId: f.id,
      name: f.name.replace(/[（(].*?[）)]/g, ''),
      amount: amount != null ? amount : Math.round(g),
      unit: unit || 'g',
      g: Math.round(g),
      nutrimentsPer100g: per100(f),
      src: f.custom ? 'custom' : 'lib',
      kcal: Math.round(f.kcal * r),
      p: r1(f.p * r),
      c: r1(f.c * r),
      f: r1(f.f * r)
    };
  if (f.na != null) o.na = Math.round(f.na * r);
  if (f.fib != null) o.fib = r1(f.fib * r);
  return o;
}
/* 目标怎么来的：BMR（Mifflin-St Jeor / Katch-McArdle）× PAL → 缺口 → 手动偏移；蛋白按 g/kg */
var PAL = [
  [1.4, '久坐（PAL 1.4）'],
  [1.55, '轻度活动（1.55）'],
  [1.75, '中度活动（1.75）'],
  [2.0, '高活动（2.0）']
];
var GMODE = { cut: ['减脂', -0.15], keep: ['维持', 0], bulk: ['增肌', 0.1] };
function tgtCfg() {
  var c = S.goals.calc || {};
  return {
    sex: c.sex || '',
    age: c.age != null ? c.age : null,
    pal: c.pal || 1.55,
    mode: c.mode || 'keep',
    adj: c.adj || 0,
    pkg: c.pkg || 1.6,
    fatPct: c.fatPct || 25,
    km: !!c.km
  };
}
function latestBody(k) {
  var b = S.body
    .filter(function (x) {
      return x[k] != null;
    })
    .sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    })[0];
  return b ? b[k] : null;
}
function calcTarget(c) {
  var w = latestBody('weight'),
    bf = latestBody('bf'),
    h = S.profile.height,
    miss = [],
    bmr = null,
    how = '';
  if (c.km && w != null && bf != null) {
    var lbm = w * (1 - bf / 100);
    bmr = 370 + 21.6 * lbm;
    how = 'Katch-McArdle：370 + 21.6 × 瘦体重 ' + r1(lbm) + ' kg';
  } else {
    if (w == null) miss.push('体重（数据 › 身体）');
    if (!h) miss.push('身高（我的 › 个人配置）');
    if (c.age == null) miss.push('年龄');
    if (!c.sex) miss.push('性别');
    if (!miss.length) {
      bmr = 10 * w + 6.25 * h - 5 * c.age + (c.sex === 'm' ? 5 : -161);
      how = 'Mifflin-St Jeor：10 × ' + w + ' + 6.25 × ' + h + ' − 5 × ' + c.age + (c.sex === 'm' ? ' + 5' : ' − 161');
    }
  }
  if (bmr == null) return { miss: miss };
  var tdee = bmr * c.pal,
    gm = GMODE[c.mode] || GMODE.keep,
    goal = tdee * (1 + gm[1]),
    kcal = Math.round((goal + c.adj) / 10) * 10,
    p = w != null ? Math.round(c.pkg * w) : null,
    fat = Math.round((kcal * c.fatPct) / 100 / 9),
    carb = p != null ? Math.max(0, Math.round((kcal - p * 4 - fat * 9) / 4)) : null;
  return { bmr: bmr, how: how, tdee: tdee, gm: gm, goal: goal, kcal: kcal, p: p, f: fat, c: carb, w: w, bf: bf };
}
function epley(w) {
  if (!w.weight || !w.reps) return null;
  return w.reps === 1 ? w.weight : w.weight * (1 + w.reps / 30);
}
/**
 * 准备度分数（0-100，仅供参考）：
 * 睡眠时长 20% · 睡眠质量 10% · 静息心率相对14天基线 20% · HRV 相对基线 20% · 主观（精力/情绪/酸痛/压力）30%
 * 缺失项按剩余权重归一，至少需要 2 项。
 */
function readiness(d) {
  var parts = [],
    add = function (w, v, n) {
      if (v != null && !isNaN(v)) parts.push({ w: w, v: Math.max(0, Math.min(1, v)), n: n });
    };
  var s = sleepOf(d),
    r = recovOf(d),
    g = S.goals;
  if (s) {
    add(0.2, (s.dur - 4) / Math.max(1, g.sleepH - 4), '睡眠时长');
    if (s.q) add(0.1, (s.q - 1) / 4, '睡眠质量');
  }
  var rhrOf = function (x) {
    var rr = recovOf(x);
    if (rr && rr.rhr != null) return rr.rhr;
    var b = S.body.find(function (y) {
      return y.date === x;
    });
    return b ? b.rhr : null;
  };
  var base = function (fn) {
    var a = [];
    for (var i = 1; i <= 14; i++) {
      var v = fn(addDays(d, -i));
      if (v != null) a.push(v);
    }
    return a.length >= 3 ? avg(a) : null;
  };
  var rh = rhrOf(d),
    rb = base(rhrOf);
  if (rh != null && rb != null) add(0.2, 0.6 + (rb - rh) / 10, '静息心率');
  var hv = r && r.hrv,
    hb = base(function (x) {
      var q = recovOf(x);
      return q ? q.hrv : null;
    });
  if (hv != null && hb) add(0.2, 0.6 + ((hv - hb) / hb) * 2, 'HRV');
  if (r) {
    var sub = [
      r.energy ? (r.energy - 1) / 4 : null,
      r.mood ? (r.mood - 1) / 4 : null,
      r.soreness ? (5 - r.soreness) / 4 : null,
      r.stress ? (5 - r.stress) / 4 : null
    ].filter(function (x) {
      return x != null;
    });
    if (sub.length) add(0.3, avg(sub), '主观');
  }
  if (parts.length < 2) return null;
  var tw = parts.reduce(function (a, p) {
    return a + p.w;
  }, 0);
  return {
    weight: tw,
    score: Math.round(
      (parts.reduce(function (a, p) {
        return a + p.w * p.v;
      }, 0) /
        tw) *
        100
    ),
    parts: parts
  };
}
/* ==========================================================
 * 肌群模型：动作 → 主/次要肌群，疲劳累计与恢复半衰期
 * ========================================================== */
/** @type {Record<string, [string, number]>} 肌群 id → [名称, 恢复半衰期（小时）] 肌群：[名称, 恢复半衰期(小时)]；下肢与下背恢复较慢 */
var MUS = {
  chest: ['胸', 36],
  back: ['背', 36],
  delts: ['肩', 30],
  biceps: ['二头', 24],
  triceps: ['三头', 24],
  forearms: ['前臂', 20],
  core: ['核心', 20],
  lowback: ['下背', 54],
  glutes: ['臀', 48],
  quads: ['股四头', 48],
  hams: ['腘绳', 48],
  calves: ['小腿', 30]
};
/** @type {Array<[string, string[], string[]]>} 动作关键词 → [主要肌群, 次要肌群] 关键词 → [主要肌群, 次要肌群]（按顺序匹配，越具体越靠前；计入：主要 1 组，次要 0.5 组） */
var EX_MUS = [
  ['俯身飞鸟', ['delts'], ['back']],
  ['反向飞鸟', ['delts'], ['back']],
  ['面拉', ['delts'], ['back']],
  ['侧平举', ['delts'], []],
  ['前平举', ['delts'], []],
  ['推举', ['delts'], ['triceps']],
  ['肩推', ['delts'], ['triceps']],
  ['卧推', ['chest'], ['triceps', 'delts']],
  ['俯卧撑', ['chest'], ['triceps', 'delts', 'core']],
  ['飞鸟', ['chest'], ['delts']],
  ['夹胸', ['chest'], []],
  ['胸推', ['chest'], ['triceps']],
  ['臂屈伸', ['triceps'], ['chest']],
  ['下压', ['triceps'], []],
  ['三头', ['triceps'], []],
  ['腿弯举', ['hams'], []],
  ['弯举', ['biceps'], ['forearms']],
  ['引体', ['back'], ['biceps', 'forearms']],
  ['下拉', ['back'], ['biceps']],
  ['划船', ['back'], ['biceps', 'lowback']],
  ['耸肩', ['back'], []],
  ['罗马尼亚', ['hams', 'glutes'], ['lowback']],
  ['硬拉', ['hams', 'glutes', 'lowback'], ['back', 'forearms']],
  ['背伸', ['lowback'], ['glutes']],
  ['山羊挺身', ['lowback'], ['glutes', 'hams']],
  ['深蹲', ['quads', 'glutes'], ['core', 'lowback']],
  ['腿举', ['quads', 'glutes'], []],
  ['腿屈伸', ['quads'], []],
  ['弓步', ['quads', 'glutes'], ['hams']],
  ['箭步', ['quads', 'glutes'], ['hams']],
  ['保加利亚', ['quads', 'glutes'], ['hams']],
  ['臀推', ['glutes'], ['hams']],
  ['臀桥', ['glutes'], ['hams']],
  ['提踵', ['calves'], []],
  ['平板', ['core'], []],
  ['卷腹', ['core'], []],
  ['举腿', ['core'], []],
  ['死虫', ['core'], []],
  ['腹', ['core'], []],
  ['农夫', ['forearms'], ['back', 'core']],
  ['握力', ['forearms'], []]
];
function musclesOf(name) {
  name = name || '';
  for (var i = 0; i < EX_MUS.length; i++)
    if (name.indexOf(EX_MUS[i][0]) >= 0) return { p: EX_MUS[i][1], s: EX_MUS[i][2] };
  return { p: [], s: [] };
}
function rirOf(w) {
  return w.rir != null ? w.rir : w.rpe != null ? Math.max(0, 10 - w.rpe) : null;
}
var FATIGUE_RECOVERING = 1.5,
  FATIGUE_HIGH = 4,
  STALE_DAYS = 7;
function trainTs(d) {
  var a = d.split('-');
  return new Date(+a[0], +a[1] - 1, +a[2], 18).getTime();
}
function nowTs() {
  if (sel === today()) return Date.now();
  var a = sel.split('-');
  return new Date(+a[0], +a[1] - 1, +a[2], 23, 59).getTime();
}
/** 计算每个肌群：剩余疲劳 f（有效组数×0.5^(经过小时/半衰期)）、近7天有效组数、上次训练日期、状态 */
function muscleState() {
  var now = nowTs(),
    st = {};
  Object.keys(MUS).forEach(function (k) {
    st[k] = { f: 0, sets7: 0, last: null };
  });
  S.workouts.forEach(function (w) {
    if (w.date > sel) return;
    var r = rirOf(w);
    if (r != null && r > 4) return;
    var m = musclesOf(w.exercise),
      n = w.sets || 1,
      hrs = Math.max(0, (now - trainTs(w.date)) / 36e5);
    /** @type {Array<[string[], number]>} */ ([
      [m.p, 1],
      [m.s, 0.5]
    ]).forEach(function (pr) {
      pr[0].forEach(function (k) {
        var s = st[k];
        s.f += n * pr[1] * Math.pow(0.5, hrs / MUS[k][1]);
        if (diffDays(w.date, sel) < 7) s.sets7 += n * pr[1];
        if (!s.last || w.date > s.last) s.last = w.date;
      });
    });
  });
  Object.keys(st).forEach(function (k) {
    var s = st[k];
    s.days = s.last ? diffDays(s.last, sel) : null;
    s.status = !s.last
      ? 'never'
      : s.f >= FATIGUE_HIGH
        ? 'fatigued'
        : s.f >= FATIGUE_RECOVERING
          ? 'recovering'
          : s.days > STALE_DAYS
            ? 'stale'
            : 'recovered';
    s.eta = s.f >= FATIGUE_RECOVERING ? Math.ceil((MUS[k][1] * Math.log(s.f / FATIGUE_RECOVERING)) / Math.LN2) : 0;
  });
  return st;
}
var ST_LABEL = {
  never: '未训练',
  fatigued: '恢复中（疲劳高）',
  recovering: '恢复中',
  recovered: '已恢复',
  stale: '太久没练'
};
/** @type {Array<[string, string, string[]]>} */
var SPLITS = [
  ['推', 'push', ['chest', 'delts', 'triceps']],
  ['拉', 'pull', ['back', 'biceps', 'forearms']],
  ['腿', 'legs', ['quads', 'hams', 'glutes', 'calves']],
  ['核心与下背', 'core', ['core', 'lowback']]
];
/** 今日推荐：优先选择主要肌群均已恢复、且最久没练的部位；准备度低或无可练部位时建议休息/有氧 */
function recommend() {
  var st = muscleState(),
    rd = readiness(sel),
    hasHist = S.workouts.length > 0;
  if (rd && rd.score < 50)
    return { rest: true, title: '今天以休息或轻松有氧为主', why: '准备度 ' + rd.score + '，恢复信号偏弱。' };
  var cands = SPLITS.map(function (sp) {
    var ms = sp[2],
      ok = ms.slice(0, 2).every(function (k) {
        return ['recovered', 'stale', 'never'].indexOf(st[k].status) >= 0;
      }),
      days = Math.min.apply(
        null,
        ms.slice(0, 2).map(function (k) {
          return st[k].days == null ? 99 : st[k].days;
        })
      );
    return { sp: sp, ok: ok, days: days };
  }).filter(function (c) {
    return c.ok;
  });
  if (!hasHist)
    return { title: '全身训练（入门）', why: '还没有训练记录，从全身动作开始，每个动作留 2–3 次余力。', keys: [] };
  if (!cands.length) return { rest: true, title: '各部位仍在恢复，建议有氧或休息', why: '主要肌群剩余疲劳较高。' };
  cands.sort(function (a, b) {
    return b.days - a.days;
  });
  var c = cands[0];
  var inj =
    S.injuries.some(function (x) {
      return x.status !== '已恢复';
    }) && S.restricted.length
      ? '；注意避开受限动作'
      : '';
  return {
    title:
      c.sp[0] +
      '（' +
      c.sp[2]
        .map(function (k) {
          return MUS[k][0];
        })
        .join('、') +
      '）',
    why:
      c.sp[2]
        .map(function (k) {
          return MUS[k][0];
        })
        .slice(0, 2)
        .join('、') +
      '已恢复，' +
      (c.days >= 99 ? '尚未练过' : '距上次训练 ' + c.days + ' 天') +
      inj +
      '。',
    keys: c.sp[2],
    split: c.sp[1]
  };
}

/* ==========================================================
 * 自动进阶：线性 / 双重进阶 / 保持；未做满不加重，连续未完成减载
 * ========================================================== */
var RULE_LABEL = { linear: '线性', double: '双重进阶', hold: '保持' };
function exRule(ex) {
  var r = (S.exRules || {})[ex] || {};
  return { rule: r.rule || 'linear', lo: r.lo || null, hi: r.hi || null, inc: r.inc || null };
}
function defInc(ex, w) {
  var p = musclesOf(ex).p,
    lower = p.some(function (k) {
      return ['quads', 'hams', 'glutes', 'lowback'].indexOf(k) >= 0;
    });
  return lower ? (w >= 60 ? 5 : 2.5) : w >= 20 ? 2.5 : 1;
}
/** 该动作在某日期之前的训练记录（按日分组，每组展开为单组） */
function exHistory(ex, before) {
  var by = {};
  S.workouts.forEach(function (w) {
    if (w.exercise === ex && w.date < before) (by[w.date] = by[w.date] || []).push(w);
  });
  return Object.keys(by)
    .sort()
    .map(function (d) {
      var sets = [];
      by[d].forEach(function (w) {
        for (var k = 0; k < (w.sets || 1); k++) sets.push(w);
      });
      return {
        d: d,
        sets: sets,
        w: Math.max.apply(
          null,
          sets.map(function (x) {
            return x.weight || 0;
          })
        ),
        minR: Math.min.apply(
          null,
          sets.map(function (x) {
            return x.reps || 0;
          })
        ),
        tot: sets.reduce(function (a, x) {
          return a + (x.reps || 0);
        }, 0)
      };
    });
}
/** 是否完成：有目标次数则每组≥目标；双重进阶看是否全部达到上限；否则以首组次数为基准 */
function sessComplete(s, rule, need) {
  return s.sets.every(function (x) {
    var t = x.target && x.target.reps ? x.target.reps : need;
    return (x.reps || 0) >= t;
  });
}
function roundW(v, st) {
  return Math.round(v / st) * st;
}
/**
 * 下次目标：返回 {w, reps, sets, why, kind}；kind = up/reps/hold/deload
 * 规则优先级：恢复期前2周 → 伤处不适 → 连续2次未完成/停滞减载 → 各规则
 */
function nextTarget(ex, setsN) {
  var rule = exRule(ex),
    hist = exHistory(ex, sel),
    last = hist[hist.length - 1],
    wk = recWeek(sel);
  if (!last) return null;
  var w = last.w,
    inc = rule.inc || defInc(ex, w),
    n = setsN || last.sets.length,
    base =
      (last.sets[0].target && last.sets[0].target.reps) || (rule.rule === 'double' ? rule.lo || 8 : last.sets[0].reps);
  var keepR = rule.rule === 'double' ? Math.max(rule.lo || 1, last.minR) : base;
  var out = function (w2, r2, why, kind) {
    return { w: r1(w2), reps: r2, sets: n, why: why, kind: kind, rule: rule.rule };
  };
  if (wk && wk <= 2) return out(w, keepR, '恢复期第' + wk + '周，先保持 ' + w + 'kg，每组留 3–4 次余力。', 'hold');
  if (
    last.sets.some(function (x) {
      return x.wrist;
    })
  )
    return out(w, keepR, '上次标记了' + flagLabel() + '，先保持重量，确认无痛再加。', 'hold');
  if (!w) return out(0, last.minR + 1, '自重动作，下次每组争取多做 1 次。', 'reps');
  var need = rule.rule === 'double' ? rule.lo || 8 : base,
    done = sessComplete(last, rule, need);
  var fails = 0;
  for (var i = hist.length - 1; i >= 0 && hist[i].w >= w; i--) {
    if (sessComplete(hist[i], rule, need)) break;
    fails++;
  }
  var flat = 0;
  for (var j = hist.length - 1; j > 0 && hist[j].w === w && hist[j].tot <= hist[j - 1].tot && hist[j - 1].w === w; j--)
    flat++;
  var top = rule.rule === 'double' ? last.minR >= (rule.hi || 12) : done;
  if (rule.rule !== 'hold' && (fails >= 2 || (flat >= 2 && !top)))
    return out(
      roundW(w * 0.9, inc >= 2.5 ? 2.5 : 0.5),
      rule.rule === 'double' ? rule.lo || 8 : base,
      (fails >= 2 ? '连续 ' + fails + ' 次没做满' : '连续 ' + (flat + 1) + ' 次没有进步') + '，减载 10% 再重新往上加。',
      'deload'
    );
  if (rule.rule === 'hold') return out(w, keepR, '这个动作设为保持，维持重量和次数。', 'hold');
  if (rule.rule === 'double') {
    var lo = rule.lo || 8,
      hi = rule.hi || 12;
    if (last.minR >= hi)
      return out(w + inc, lo, '每组都做到了 ' + hi + ' 次上限，加 ' + inc + 'kg，次数回到 ' + lo + '。', 'up');
    var t = Math.min(hi, Math.max(lo, last.minR + 1));
    return out(w, t, '还没全部做到 ' + hi + ' 次，先在 ' + w + 'kg 把最少的那组提到 ' + t + ' 次。', 'reps');
  }
  if (done) {
    var rr = avg(last.sets.map(rirOf));
    return out(
      w + inc,
      base,
      '上次 ' +
        last.sets.length +
        ' 组都做满 ' +
        base +
        ' 次' +
        (rr != null && rr <= 0.5 ? '（接近力竭，加重后注意动作）' : '') +
        '，加 ' +
        inc +
        'kg。',
      'up'
    );
  }
  return out(w, base, '上次有组没做满 ' + base + ' 次，不加重，先在原重量做满。', 'hold');
}

/* ---------- 自动化：快速输入 / 一键操作 / 训练建议 ---------- */
/** 当前时段默认餐次 */
function mealByHour() {
  var h = new Date().getHours();
  return h < 10 ? '早餐' : h < 14 ? '午餐' : h < 17 ? '加餐' : h < 21 ? '晚餐' : '加餐';
}
function normName(n) {
  return String(n)
    .replace(/[（(].*?[）)]/g, '')
    .replace(/\s/g, '')
    .toLowerCase();
}
/** 在食物库中匹配名称：自定义优先；完全相等 > 文本包含最长关键字 > 关键字包含文本 */
function matchFood(name) {
  var t = normName(name);
  if (!t) return null;
  var best = null,
    score = 0,
    cs = S.customFoods || [],
    list = cs.concat(FOOD_DB.foods || []);
  list.forEach(function (f) {
    var bonus = f.custom ? 5 : 0;
    [f.name].concat(f.aliases || []).forEach(function (k) {
      k = normName(k);
      if (!k) return;
      var sc = 0;
      if (k === t) sc = 1000 + bonus * 100;
      else if (t.indexOf(k) >= 0 && k.length >= 2) sc = 100 + k.length + bonus;
      else if (k.indexOf(t) >= 0 && t.length >= 2) sc = 50 + t.length + bonus;
      if (sc > score) {
        score = sc;
        best = f;
      }
    });
  });
  return best;
}
var CN_NUM = { '半': 0.5, '一': 1, '两': 2, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
var COUNT_UNITS = '个|只|勺|碗|杯|片|根|盒|份|袋|瓶|块|把',
  KCAL_UNITS = 'kcal|千卡|大卡|卡';
/** 解析一行文字为营养估算：如 "鸡胸肉200g 米饭1碗 鸡蛋2个"、"外卖 650"（只填热量）、自定义食物或组合名 */
function parseQuick(text) {
  var out = { items: [], miss: [] },
    cs = (S.customFoods || [])
      .filter(function (f) {
        return f.custom;
      })
      .sort(function (a, b) {
        return b.name.length - a.name.length;
      });
  var U = '(?:' + KCAL_UNITS + '|kg|g|克|ml|毫升|' + COUNT_UNITS + ')';
  text = String(text || '');
  // 自定义名称（可能含 + 等分隔符）先整体替换为占位符，保证优先匹配
  cs.forEach(function (f, i) {
    if (f.name && text.indexOf(f.name) >= 0) text = text.split(f.name).join(' \u0001' + i + '\u0001');
  });
  text = text
    .replace(new RegExp('([半一两二三四五六])(' + COUNT_UNITS + ')', 'g'), function (m, a, b) {
      return CN_NUM[a] + b;
    })
    .replace(
      new RegExp('([^\\s\\d,，、;；+])\\s+(\\d+(?:\\.\\d+)?\\s*' + U + '?)(?=$|[\\s,，、;；+])', 'gi'),
      function (m, a, b) {
        return a + b.replace(/\s+/g, ''); // "苹果 150 克" → "苹果150克"
      }
    );
  // 数量写在前面且与名称隔开："150g 米饭" → "150g米饭"（必须带单位，避免把"外卖 650"里的数字吞掉）
  text = text.replace(
    new RegExp('(^|[\\s,，、;；+])(\\d+(?:\\.\\d+)?\\s*' + U + ')\\s+(?=[^\\s\\d,，、;；+])', 'gi'),
    function (m, a, b) {
      return a + b.replace(/\s+/g, '');
    }
  );
  text.split(/[，,、;；\n+]+|\s+/).forEach(function (tok) {
    tok = tok.trim();
    if (!tok) return;
    var name = tok,
      q = null,
      u = '',
      m = tok.match(new RegExp('^(.*?)(\\d+(?:\\.\\d+)?)\\s*(' + U + ')?$', 'i'));
    if (m && m[1]) {
      name = m[1];
      q = +m[2];
      u = (m[3] || '').toLowerCase();
    } else {
      m = tok.match(new RegExp('^(\\d+(?:\\.\\d+)?)\\s*(' + U + ')?(.+)$', 'i'));
      if (m) {
        q = +m[1];
        u = (m[2] || '').toLowerCase();
        name = m[3];
      }
    }
    // eslint-disable-next-line no-control-regex -- \u0001 是解析时使用的内部占位符
    var ph = name.match(/^\u0001(\d+)\u0001$/),
      label = ph ? cs[+ph[1]].name : name;
    if (new RegExp('^(?:' + KCAL_UNITS + ')$', 'i').test(u)) {
      out.items.push({ name: label, kcal: q, p: 0, c: 0, f: 0, src: 'quick', kcalOnly: true });
      return;
    }
    var fav =
      !ph &&
      S.favFoods.find(function (x) {
        return normName(x.food) === normName(name);
      });
    if (fav && (!u || u === '份')) {
      var k = q || 1;
      out.items.push({
        name: fav.food + (k !== 1 ? ' ×' + k : ''),
        kcal: fav.kcal * k,
        p: fav.p * k,
        c: fav.c * k,
        f: fav.f * k,
        src: 'custom'
      });
      return;
    }
    var f = ph ? cs[+ph[1]] : matchFood(name);
    if (!f) {
      if (q != null && !u && q >= 50 && name) {
        out.items.push({ name: name, kcal: q, p: 0, c: 0, f: 0, src: 'quick', kcalOnly: true });
        return;
      }
      out.miss.push(
        // eslint-disable-next-line no-control-regex -- 同上，还原内部占位符
        tok.replace(/\u0001(\d+)\u0001/, function (x, i) {
          return cs[+i].name;
        })
      );
      return;
    }
    var units = unitsOf(f),
      g,
      amt = q,
      unit = u || '';
    if (u === 'g' || u === '克' || u === 'ml' || u === '毫升') g = q;
    else if (u === 'kg') g = q * 1000;
    else if (u) {
      if (units[u]) g = q * units[u];
      else {
        out.miss.push(label + q + u + '（未知单位）');
        return;
      }
    } else if (q != null) {
      var fu = Object.keys(units)[0];
      if (q >= 10 || !fu) {
        g = q;
        unit = 'g';
      } else {
        g = q * units[fu];
        unit = fu;
      }
    } else {
      var fu2 = Object.keys(units)[0];
      g = fu2 ? units[fu2] : 100;
      amt = fu2 ? 1 : 100;
      unit = fu2 || 'g';
    }
    if (unit === '克') unit = 'g';
    var it = fromFood(f, g, amt, unit);
    it.name = f.custom
      ? f.name + (unit === '份' && amt !== 1 ? ' ×' + amt : unit !== '份' ? ' ' + Math.round(g) + 'g' : '')
      : it.name + ' ' + Math.round(g) + 'g';
    out.items.push(it);
  });
  return out;
}
