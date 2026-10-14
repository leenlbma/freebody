// SPDX-License-Identifier: MIT
/* 08-state.js — 备份结构校验：封装纯逻辑，不读取状态、存储或 DOM */
var StateCodec = (function () {
  function checkObject(x, at) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(at + ' 应为对象');
  }
  function checkRecord(x, at, kind) {
    checkObject(x, at);
    [
      'id',
      'date',
      'name',
      'food',
      'meal',
      'exercise',
      'ex',
      'note',
      'text',
      'title',
      'bed',
      'wake',
      'unit',
      'desc',
      'status',
      'dose',
      'time',
      'alt'
    ].forEach(function (k) {
      if (x[k] !== undefined && typeof x[k] !== 'string') throw new Error(at + '.' + k + ' 应为文本');
    });
    ['kcal', 'p', 'c', 'f', 'g', 'weight', 'reps', 'rpe', 'rir', 'dur', 'q', 'bf', 'waist', 'rhr'].forEach(
      function (k) {
        if (x[k] != null && (typeof x[k] !== 'number' || !isFinite(x[k])))
          throw new Error(at + '.' + k + ' 应为有限数字');
      }
    );
    if (
      x.date != null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(x.date) ||
        (function () {
          var a = x.date.split('-'),
            d = new Date(+a[0], +a[1] - 1, +a[2]);
          return d.getFullYear() !== +a[0] || d.getMonth() + 1 !== +a[1] || d.getDate() !== +a[2];
        })())
    )
      throw new Error(at + '.date 日期无效');
    ['tags', 'trig', 'prs', 'aliases'].forEach(function (k) {
      if (
        x[k] !== undefined &&
        (!Array.isArray(x[k]) ||
          x[k].some(function (v) {
            return typeof v !== 'string';
          }))
      )
        throw new Error(at + '.' + k + ' 应为文本数组');
    });
    ['items', 'servings'].forEach(function (k) {
      if (x[k] === undefined) return;
      if (!Array.isArray(x[k])) throw new Error(at + '.' + k + ' 应为数组');
      x[k].forEach(function (v, i) {
        checkRecord(v, at + '.' + k + '[' + i + ']', kind === 'sessions' && k === 'items' ? 'summary' : null);
      });
    });
    if (Array.isArray(x.sets))
      x.sets.forEach(function (v, i) {
        checkRecord(v, at + '.sets[' + i + ']');
      });
    else if (
      x.sets != null &&
      !(kind === 'summary' && typeof x.sets === 'string') &&
      (typeof x.sets !== 'number' || !isFinite(x.sets))
    )
      throw new Error(at + '.sets 应为数字或数组');
    ['units', 'nutrimentsPer100g'].forEach(function (k) {
      if (x[k] == null) return;
      checkObject(x[k], at + '.' + k);
      Object.keys(x[k]).forEach(function (n) {
        if (typeof x[k][n] !== 'number' || !isFinite(x[k][n])) throw new Error(at + '.' + k + ' 应包含数字');
      });
    });
  }
  function normalize(input, strict, d) {
    checkObject(input, '备份');
    var r = JSON.parse(
      JSON.stringify(input, function (key, value) {
        if (typeof value === 'number' && !isFinite(value)) throw new Error(key + ' 应为有限数字');
        return value;
      })
    );
    if (r.v !== undefined && r.v !== 1) throw new Error('不支持的备份版本');
    Object.keys(d).forEach(function (k) {
      if (r[k] === undefined) r[k] = d[k];
      if (Array.isArray(d[k])) {
        if (!Array.isArray(r[k])) throw new Error(k + ' 应为数组');
        r[k].forEach(function (x, i) {
          checkRecord(x, k + '[' + i + ']', k);
        });
      } else if (d[k] && typeof d[k] === 'object') {
        if (!strict && (k === 'goals' || k === 'profile') && (!r[k] || typeof r[k] !== 'object' || Array.isArray(r[k])))
          r[k] = d[k];
        checkObject(r[k], k);
      } else if (typeof d[k] === 'string' && typeof r[k] !== 'string') throw new Error(k + ' 应为文本');
    });
    ['goals', 'profile'].forEach(function (k) {
      Object.keys(d[k]).forEach(function (f) {
        if (r[k][f] === undefined) r[k][f] = d[k][f];
        var v = r[k][f],
          t = typeof d[k][f];
        if ((t === 'number' && (typeof v !== 'number' || !isFinite(v))) || (t === 'string' && typeof v !== t))
          throw new Error(k + '.' + f + ' 类型不符');
      });
    });
    checkObject(r.goals.mealSplit, 'goals.mealSplit');
    Object.keys(r.goals.mealSplit).forEach(function (k) {
      if (typeof r.goals.mealSplit[k] !== 'number' || !isFinite(r.goals.mealSplit[k]))
        throw new Error('goals.mealSplit 应包含数字');
    });
    ['suppLog', 'rehabLog'].forEach(function (k) {
      Object.keys(r[k]).forEach(function (day) {
        checkObject(r[k][day], k + '.' + day);
        Object.keys(r[k][day]).forEach(function (id) {
          var v = r[k][day][id];
          if (k === 'suppLog') {
            checkObject(v, k + '.' + day + '.' + id);
            if (v.at != null && typeof v.at !== 'string') throw new Error('suppLog.at 应为文本');
          } else if (typeof v !== 'number' || !isFinite(v)) throw new Error('rehabLog 应包含数字');
        });
      });
    });
    Object.keys(r.exRules).forEach(function (k) {
      checkObject(r.exRules[k], 'exRules.' + k);
    });
    [
      [r, 'run800Hist'],
      [r.profile, 'height'],
      [r.goals, 'weight']
    ].forEach(function (pair) {
      var v = pair[0][pair[1]];
      if (v != null && (typeof v !== 'number' || !isFinite(v))) throw new Error(pair[1] + ' 应为数字');
    });
    r.plans.forEach(function (pl) {
      if (!Array.isArray(pl.items)) throw new Error('plans.items 应为数组');
    });
    if (r.active != null) {
      checkRecord(r.active, 'active');
      if (
        !Array.isArray(r.active.items) ||
        r.active.items.some(function (it) {
          return !Array.isArray(it.sets);
        })
      )
        throw new Error('active.items 缺少逐组记录');
    }
    return r;
  }
  return { normalize: normalize };
})();
