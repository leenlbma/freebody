// SPDX-License-Identifier: MIT
/* 04-import.js — 导入（无 DOM）：CSV 解析、导入包校验 / 合并 / 去重 / 撤销、链接解码 */
/* ---------- 批量导入 CSV ---------- */
var CSV_ALIAS = {
  '日期': 'date',
  '餐次': 'meal',
  '食物': 'food',
  '热量': 'kcal',
  '蛋白质': 'p',
  '蛋白': 'p',
  '碳水': 'c',
  '脂肪': 'f',
  '动作': 'exercise',
  '组数': 'sets',
  '次数': 'reps',
  '重量': 'weight',
  '备注': 'note',
  '体重': 'weight',
  '体脂': 'bf',
  '腰围': 'waist',
  '静息心率': 'rhr',
  '入睡': 'bed',
  '起床': 'wake',
  '质量': 'q',
  '指标': 'name',
  '数值': 'value',
  '单位': 'unit',
  '下限': 'lo',
  '上限': 'hi',
  '时长': 'min',
  '层数': 'floors',
  '心率': 'hr',
  '泳姿': 'stroke',
  '距离': 'dist',
  '用时': 'time',
  'swolf': 'swolf'
};
/** @type {Array<[string, string, string[], string[]]>} 数据键、名称、列、必填列 类型识别顺序即优先级；cols 为模板列 */
var CSV_TYPES = [
  ['workouts', '力量训练', ['date', 'exercise', 'sets', 'reps', 'weight', 'rpe', 'note'], ['exercise', 'sets', 'reps']],
  ['meals', '饮食', ['date', 'meal', 'food', 'kcal', 'p', 'c', 'f'], ['food']],
  ['labs', '化验', ['date', 'name', 'value', 'unit', 'lo', 'hi', 'note'], ['name', 'value']],
  ['sleep', '睡眠', ['date', 'bed', 'wake', 'q', 'note'], ['bed', 'wake']],
  ['swims', '游泳', ['date', 'stroke', 'dist', 'time', 'swolf', 'note'], ['stroke', 'dist']],
  ['cardio', '爬楼', ['date', 'min', 'floors', 'hr'], ['min']],
  ['body', '身体指标', ['date', 'weight', 'bf', 'waist', 'rhr'], []]
];
function parseCSV(txt) {
  txt = txt.replace(/^\ufeff/, '');
  var rows = [],
    row = [],
    f = '',
    q = false;
  for (var i = 0; i < txt.length; i++) {
    var ch = txt[i];
    if (q) {
      if (ch === '"') {
        if (txt[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(f);
      f = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && txt[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else f += ch;
  }
  if (f || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(function (r) {
    return r.some(function (c) {
      return c.trim();
    });
  });
}
function normDate(s) {
  var m = String(s || '')
    .trim()
    .match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  return m ? m[1] + '-' + pad(+m[2]) + '-' + pad(+m[3]) : null;
}
function normTime(s) {
  var m = String(s || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})/);
  return m ? pad(+m[1]) + ':' + m[2] : null;
}
function importCSV(txt) {
  if (!storeCanWrite(false)) return null;
  var snapshot = JSON.stringify(S);
  var rows = parseCSV(txt);
  if (rows.length < 2) throw new Error('至少需要表头和一行数据');
  var hd = rows[0].map(function (h) {
    h = h.trim();
    return CSV_ALIAS[h] || h.toLowerCase();
  });
  var type = CSV_TYPES.find(function (t) {
    return (
      hd.indexOf('date') >= 0 &&
      t[3].every(function (c) {
        return hd.indexOf(c) >= 0;
      }) &&
      (t[3].length ||
        ['weight', 'bf', 'waist', 'rhr'].some(function (c) {
          return hd.indexOf(c) >= 0;
        }))
    );
  });
  if (!type) throw new Error('无法识别类型，请检查表头（需含 date 列）');
  var data = rows.slice(1).map(function (r) {
      var o = {};
      hd.forEach(function (h, i) {
        o[h] = (r[i] || '').trim();
      });
      return o;
    }),
    ok = 0,
    bad = 0;
  if (!confirm('识别为「' + type[1] + '」，共 ' + data.length + ' 行，确定导入？')) return null;
  data.forEach(function (o) {
    var d = normDate(o.date);
    if (!d) {
      bad++;
      return;
    }
    var n = function (k) {
      return num(o[k]);
    };
    if (type[0] === 'meals') {
      var p = n('p') || 0,
        c = n('c') || 0,
        f = n('f') || 0,
        k = n('kcal');
      if (k == null) k = p * 4 + c * 4 + f * 9;
      S.meals.push({ id: uid(), date: d, meal: o.meal || '加餐', food: o.food, kcal: k, p: p, c: c, f: f });
    } else if (type[0] === 'workouts') {
      if (!n('sets') || !n('reps')) {
        bad++;
        return;
      }
      S.workouts.push({
        id: uid(),
        date: d,
        exercise: o.exercise,
        sets: n('sets'),
        reps: n('reps'),
        weight: n('weight') || 0,
        rpe: n('rpe'),
        note: o.note || '',
        wrist: false
      });
    } else if (type[0] === 'labs') {
      if (n('value') == null) {
        bad++;
        return;
      }
      S.labs.push({
        id: uid(),
        date: d,
        name: o.name,
        value: n('value'),
        unit: o.unit || '',
        lo: n('lo'),
        hi: n('hi'),
        note: o.note || ''
      });
    } else if (type[0] === 'sleep') {
      var b = normTime(o.bed),
        w = normTime(o.wake);
      if (!b || !w) {
        bad++;
        return;
      }
      S.sleep = S.sleep.filter(function (x) {
        return x.date !== d;
      });
      S.sleep.push({ id: uid(), date: d, bed: b, wake: w, dur: sleepDur(b, w), q: n('q'), note: o.note || '' });
    } else if (type[0] === 'swims') {
      if (!n('dist')) {
        bad++;
        return;
      }
      S.swims.push({
        id: uid(),
        date: d,
        stroke: o.stroke,
        dist: n('dist'),
        sec: parseT(o.time),
        swolf: n('swolf'),
        note: o.note || ''
      });
    } else if (type[0] === 'cardio') {
      if (!n('min')) {
        bad++;
        return;
      }
      S.cardio.push({ id: uid(), date: d, min: n('min'), floors: n('floors'), hr: n('hr') });
    } else if (type[0] === 'body') {
      /** @type {BodyRec} */
      var ob = { weight: n('weight'), bf: n('bf'), waist: n('waist'), rhr: n('rhr') };
      if (ob.weight == null && ob.bf == null && ob.waist == null && ob.rhr == null) {
        bad++;
        return;
      }
      S.body = S.body.filter(function (x) {
        return x.date !== d;
      });
      ob.id = uid();
      ob.date = d;
      S.body.push(ob);
    }
    ok++;
  });
  if (!save()) {
    S = JSON.parse(snapshot);
    return null;
  }
  return type[1] + '：导入 ' + ok + ' 行' + (bad ? '，跳过 ' + bad + ' 行无效' : '');
}
/* ===== v2.5 导入包：AI 教练生成数据 → 本机预览 → 确认后合并（只在本机处理，不经过服务器）。格式见 docs/data-format.md ===== */
var IMP = { phase: 'paste', text: '', pack: null, rows: [], err: null, undo: null, res: null, viaLink: false };
var IMP_MAX_LINK = 60000,
  IMP_MAX_TEXT = 2097152,
  IMP_MAX_N = 2000;
var IMP_TYPES = {
  meal: ['饮食', 'diet'],
  workout: ['训练', 'train'],
  supplement: ['补剂', 'pill'],
  sleep: ['睡眠', 'moon'],
  body: ['身体', 'body'],
  note: ['心得', 'note']
};
var IMP_MEAL = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
var IMP_ST = {
  'new': ['新增', 'ok'],
  update: ['更新', 'acc'],
  merge: ['合并', 'acc'],
  same: ['已存在', 'mut'],
  bad: ['无效', 'bad']
};
var IMP_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/,
  IMP_D = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  IMP_T = /^([01]\d|2[0-3]):[0-5]\d$/;
function impErr(m) {
  /** @type {ImpError} */
  var e = new Error(m);
  e.imp = true;
  return e;
}
/* 数字字段：缺省返回 undefined；类型或范围不对抛出说明 */
function impN(e, k, lo, hi, int) {
  var v = e[k];
  if (v == null) return undefined;
  if (typeof v !== 'number' || !isFinite(v)) throw impErr(k + ' 应为数字');
  if (v < lo || v > hi) throw impErr(k + ' 超出范围 ' + lo + '–' + hi);
  if (int && v !== Math.round(v)) throw impErr(k + ' 应为整数');
  return v;
}
function impS(e, k, max, req) {
  var v = e[k];
  if (v == null || v === '') {
    if (req) throw impErr('缺少 ' + k);
    return undefined;
  }
  if (typeof v !== 'string') throw impErr(k + ' 应为文本');
  v = v.trim();
  if (!v && req) throw impErr('缺少 ' + k);
  if (v.length > max) throw impErr(k + ' 超过 ' + max + ' 字');
  return v;
}
function impFind(arr, id) {
  for (var i = 0; i < arr.length; i++) if (arr[i].imp === id || arr[i].id === id) return arr[i];
  return null;
}
function impSame(a, b, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i],
      x = a[k],
      y = b[k];
    if (x == null && y == null) continue;
    if (JSON.stringify(x) !== JSON.stringify(y)) return false;
  }
  return true;
}
function impKcal(n) {
  return Math.round(n) + ' kcal';
}
/** 单条：校验 + 规范化为 FreeBody 记录 + 与本机数据比对，返回预览行 */
function impRow(e, seen, src) {
  var row = {
    entry: e,
    type: e && e.type,
    id: e && e.id,
    date: e && e.date,
    status: 'bad',
    title: '',
    detail: '',
    tags: []
  };
  try {
    if (!e || typeof e !== 'object' || Array.isArray(e)) throw impErr('条目应为对象');
    if (!IMP_TYPES[e.type]) throw impErr('不支持的类型 ' + (e.type == null ? '(缺少 type)' : String(e.type)));
    if (typeof e.id !== 'string' || !IMP_ID.test(e.id))
      throw impErr('id 缺失或格式不对（字母数字开头，可含 . _ : -，最长 64）');
    if (seen[e.type + '|' + e.id]) throw impErr('包内重复的 id');
    seen[e.type + '|' + e.id] = 1;
    if (typeof e.date !== 'string' || !IMP_D.test(e.date)) throw impErr('date 应为 YYYY-MM-DD');
    var t = e.type,
      id = e.id,
      d = e.date,
      old,
      /** @type {any} 按 type 不同为 Meal / Workout[] / SleepRec / BodyRec */
      rec;
    if (t === 'meal') {
      var nm = impS(e, 'name', 80, true),
        ml = e.meal == null ? null : IMP_MEAL[String(e.meal).toLowerCase()] || e.meal,
        tm = impS(e, 'time', 5);
      if (tm && !IMP_T.test(tm)) throw impErr('time 应为 HH:MM');
      if (ml == null && tm) ml = mealOfHour(+tm.slice(0, 2));
      if (MEALS.indexOf(ml) < 0) throw impErr('meal 应为 早餐 / 午餐 / 晚餐 / 加餐');
      var g = impN(e, 'g', 0, 5000),
        k = impN(e, 'kcal', 0, 10000);
      if (k == null) throw impErr('缺少 kcal');
      var p = impN(e, 'p', 0, 1000),
        c = impN(e, 'c', 0, 2000),
        f = impN(e, 'f', 0, 1000),
        fib = impN(e, 'fib', 0, 300),
        na = impN(e, 'na', 0, 50000),
        lo = impN(e, 'lo', 0, 10000),
        hi = impN(e, 'hi', 0, 10000);
      if (e.estimated != null && typeof e.estimated !== 'boolean') throw impErr('estimated 应为 true / false');
      var disp = nm + (g && !/\d\s*(g|克|ml|毫升)$/i.test(nm) ? ' ' + Math.round(g) + 'g' : '');
      rec = {
        id: id,
        imp: id,
        date: d,
        meal: ml,
        food: disp,
        name: disp,
        kcal: r1(k),
        p: r1(p || 0),
        c: r1(c || 0),
        f: r1(f || 0),
        src: 'import',
        via: 'import',
        est: !!e.estimated
      };
      if (fib != null) rec.fib = r1(fib);
      if (na != null) rec.na = Math.round(na);
      if (lo != null && hi != null && hi >= lo) {
        rec.lo = lo;
        rec.hi = hi;
      }
      if (g) {
        rec.g = r1(g);
        rec.amount = r1(g);
        rec.unit = 'g';
        var q = 100 / g;
        rec.nutrimentsPer100g = { kcal: r1(k * q), p: r1((p || 0) * q), c: r1((c || 0) * q), f: r1((f || 0) * q) };
      }
      var nt = impS(e, 'note', 200);
      if (nt) rec.note = nt;
      row.title = ml + ' · ' + disp;
      row.detail = impKcal(k) + ' · 蛋白 ' + r1(p || 0) + ' · 碳水 ' + r1(c || 0) + ' · 脂肪 ' + r1(f || 0) + ' g';
      if (rec.est) row.tags.push('估算');
      old = impFind(S.meals, id);
      row.recs = [rec];
      row.old = old;
      row.status = !old
        ? 'new'
        : impSame(old, rec, ['date', 'meal', 'name', 'kcal', 'p', 'c', 'f', 'g', 'est', 'fib', 'na', 'note'])
          ? 'same'
          : 'update';
    } else if (t === 'workout') {
      var ex = impS(e, 'exercise', 60, true);
      if (!Array.isArray(e.sets) || !e.sets.length) throw impErr('sets 应为非空数组');
      if (e.sets.length > 50) throw impErr('sets 最多 50 组');
      if (e.flag != null && typeof e.flag !== 'boolean') throw impErr('flag 应为 true / false');
      var wn = impS(e, 'note', 200) || '';
      rec = e.sets.map(function (s, i) {
        if (!s || typeof s !== 'object') throw impErr('第 ' + (i + 1) + ' 组格式不对');
        var r = impN(s, 'reps', 0, 500, true);
        if (r == null) throw impErr('第 ' + (i + 1) + ' 组缺少 reps');
        var w = impN(s, 'weight', 0, 1000) || 0,
          ri = impN(s, 'rir', 0, 10);
        return {
          id: id + '#' + (i + 1),
          imp: id,
          date: d,
          exercise: ex,
          sets: 1,
          reps: r,
          weight: w,
          rir: ri == null ? null : ri,
          rpe: ri == null ? null : 10 - ri,
          note: impS(s, 'note', 100) || wn,
          wrist: !!e.flag,
          via: 'import'
        };
      });
      var grp = {};
      rec.forEach(function (x) {
        var k2 = x.reps + '×' + (x.weight ? x.weight + 'kg' : '自重');
        grp[k2] = (grp[k2] || 0) + 1;
      });
      var ks = Object.keys(grp);
      row.title = ex;
      row.detail =
        rec.length +
        ' 组 · ' +
        ks
          .map(function (k2) {
            return k2.replace('×', ' 次 × ') + (grp[k2] > 1 ? ' ×' + grp[k2] : '');
          })
          .join('，') +
        (rec[0].rir != null
          ? ' · RIR ' +
            rec
              .map(function (x) {
                return x.rir == null ? '-' : x.rir;
              })
              .join('/')
          : '');
      if (e.flag) row.tags.push(S.profile.injuryFlagLabel || '伤处不适');
      old = S.workouts.filter(function (w) {
        return w.imp === id;
      });
      row.recs = rec;
      row.old = old;
      row.status = !old.length
        ? 'new'
        : old.length === rec.length &&
            rec.every(function (x, i) {
              return impSame(old[i], x, ['date', 'exercise', 'reps', 'weight', 'rir', 'wrist', 'note']);
            })
          ? 'same'
          : 'update';
    } else if (t === 'supplement') {
      var sn = impS(e, 'name', 40, true),
        ds = impS(e, 'dose', 40),
        at = impS(e, 'time', 5);
      if (at && !IMP_T.test(at)) throw impErr('time 应为 HH:MM');
      var sp = S.supps.find(function (x) {
          return x.name.trim().toLowerCase() === sn.toLowerCase();
        }),
        lg = sp && S.suppLog[d] && S.suppLog[d][sp.id];
      row.title = sn + (ds ? ' ' + ds : '');
      row.detail = (at ? '打卡 ' + at : '打卡') + (sp ? '' : ' · 将新增到补剂清单');
      row.recs = [{ name: sn, dose: ds || '', at: at || '', imp: id, date: d }];
      row.status = !lg ? 'new' : !at || lg.at === at ? 'same' : 'update';
    } else if (t === 'sleep') {
      var bd = impS(e, 'bed', 5, true),
        wk = impS(e, 'wake', 5, true);
      if (!IMP_T.test(bd) || !IMP_T.test(wk)) throw impErr('bed / wake 应为 HH:MM');
      var qq = impN(e, 'q', 1, 5, true),
        sn2 = impS(e, 'note', 200);
      old =
        impFind(S.sleep, id) ||
        S.sleep.find(function (x) {
          return x.date === d;
        });
      /** @type {SleepRec} */
      rec = { date: d, bed: bd, wake: wk, dur: sleepDur(bd, wk) };
      rec.q = qq != null ? qq : old ? old.q : null;
      rec.note = sn2 != null ? sn2 : old ? old.note || '' : '';
      row.title = '睡眠 ' + bd + '–' + wk;
      row.detail = r1(rec.dur) + ' 小时' + (rec.q ? ' · 质量 ' + rec.q + '/5' : '');
      row.recs = [rec];
      row.old = old;
      row.status = !old
        ? 'new'
        : impSame(old, rec, ['date', 'bed', 'wake', 'q', 'note'])
          ? 'same'
          : old.imp === id || old.id === id
            ? 'update'
            : 'merge';
    } else if (t === 'body') {
      var bo = {
        weight: impN(e, 'weight', 20, 400),
        bf: impN(e, 'bf', 2, 75),
        waist: impN(e, 'waist', 30, 250),
        rhr: impN(e, 'rhr', 20, 220, true)
      };
      if (bo.weight == null && bo.bf == null && bo.waist == null && bo.rhr == null)
        throw impErr('weight / bf / waist / rhr 至少填一项');
      old =
        impFind(S.body, id) ||
        S.body.find(function (x) {
          return x.date === d;
        });
      rec = { date: d };
      ['weight', 'bf', 'waist', 'rhr'].forEach(function (k2) {
        rec[k2] = bo[k2] != null ? bo[k2] : old && old[k2] != null ? old[k2] : null;
      });
      row.title = '身体指标';
      row.detail = [
        ['weight', '体重 ', ' kg'],
        ['bf', '体脂 ', '%'],
        ['waist', '腰围 ', ' cm'],
        ['rhr', '静息心率 ', ' bpm']
      ]
        .filter(function (x) {
          return bo[x[0]] != null;
        })
        .map(function (x) {
          return x[1] + bo[x[0]] + x[2];
        })
        .join(' · ');
      row.recs = [rec];
      row.old = old;
      row.status = !old
        ? 'new'
        : impSame(old, rec, ['weight', 'bf', 'waist', 'rhr'])
          ? 'same'
          : old.imp === id || old.id === id
            ? 'update'
            : 'merge';
    } else if (t === 'note') {
      var tx = impS(e, 'text', 2000, true),
        ti = impS(e, 'title', 60),
        tg = e.tags == null ? [] : e.tags;
      if (
        !Array.isArray(tg) ||
        tg.length > 10 ||
        tg.some(function (x) {
          return typeof x !== 'string' || !x.trim() || x.length > 20;
        })
      )
        throw impErr('tags 应为最多 10 个、每个不超过 20 字的文本');
      rec = {
        id: id,
        imp: id,
        date: d,
        title: ti || '',
        text: tx,
        tags: tg.map(function (x) {
          return x.trim();
        }),
        from: src || ''
      };
      row.title = ti || '心得';
      row.detail = tx.length > 60 ? tx.slice(0, 60) + '…' : tx;
      old = impFind(S.notes, id);
      row.recs = [rec];
      row.old = old;
      row.status = !old ? 'new' : impSame(old, rec, ['date', 'title', 'text', 'tags']) ? 'same' : 'update';
    }
  } catch (x) {
    if (!x.imp) throw x;
    row.status = 'bad';
    row.reason = x.message;
    if (!row.title) row.title = IMP_TYPES[row.type] ? IMP_TYPES[row.type][0] : '未知条目';
  }
  return row;
}
/** 解析整包（对象）；包级错误抛出 */
function impPlan(pk) {
  if (Array.isArray(pk)) pk = { freebody: 'import', version: 1, entries: pk };
  if (!pk || typeof pk !== 'object') throw impErr('内容不是 FreeBody 导入包');
  if (pk.freebody !== 'import') {
    if (pk.v === 1 && (pk.meals || pk.workouts)) throw impErr('这是完整备份文件，请用「导入 JSON」恢复备份。');
    throw impErr('缺少 "freebody": "import"，不是 FreeBody 导入包');
  }
  if (pk.version !== 1)
    throw impErr(
      typeof pk.version === 'number' && pk.version > 1
        ? '导入包版本 ' + pk.version + ' 较新，请先更新 FreeBody'
        : 'version 应为 1'
    );
  if (!Array.isArray(pk.entries) || !pk.entries.length) throw impErr('entries 为空');
  if (pk.entries.length > IMP_MAX_N) throw impErr('一次最多导入 ' + IMP_MAX_N + ' 条，请拆分');
  var seen = {},
    src = typeof pk.source === 'string' ? pk.source.slice(0, 60) : '';
  return pk.entries.map(function (e) {
    return impRow(e, seen, src);
  });
}
function impStrip(t) {
  t = String(t || '').trim();
  var m = /^```[a-z]*\s*([\s\S]*?)\s*```$/i.exec(t);
  if (m) t = m[1].trim();
  return t;
}
function impB64(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  if (/[^A-Za-z0-9+/=]/.test(s)) throw impErr('链接中含有无效字符');
  while (s.length % 4) s += '=';
  var b = atob(s),
    u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
var IMP_CUT = '链接内容不完整，可能在转发时被截断。请让 AI 改为输出 JSON，然后用「粘贴导入」。';
/** 链接载荷 → JSON 文本（Promise）。z. 前缀 = deflate-raw 压缩；否则为未压缩 UTF-8 JSON 的 base64url */
function impDecode(s) {
  return new Promise(function (res, rej) {
    try {
      s = decodeURIComponent(s);
    } catch (e) {}
    if (s.length > IMP_MAX_LINK)
      return rej(impErr('链接过长（' + s.length + ' 字符），请让 AI 输出 JSON，改用「粘贴导入」。'));
    var z = s.slice(0, 2) === 'z.',
      u;
    try {
      u = impB64(z ? s.slice(2) : s);
    } catch (e) {
      return rej(impErr(IMP_CUT));
    }
    var txt = function (b) {
      try {
        res(new TextDecoder('utf-8', { fatal: true }).decode(b));
      } catch (e) {
        rej(impErr(IMP_CUT));
      }
    };
    if (!z) return txt(u);
    if (typeof DecompressionStream === 'undefined')
      return rej(impErr('当前浏览器不支持压缩链接，请让 AI 输出 JSON，改用「粘贴导入」。'));
    try {
      new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(
        function (ab) {
          txt(new Uint8Array(ab));
        },
        function () {
          rej(impErr(IMP_CUT));
        }
      );
    } catch (e) {
      rej(impErr(IMP_CUT));
    }
  });
}
function impLinkPart(t) {
  var m = /#import=([^\s]+)/.exec(t);
  return m ? m[1] : null;
}
/** 文本 / 链接 → 预览 */
function impLoad(t, viaLink) {
  IMP.err = null;
  IMP.viaLink = !!viaLink;
  var lp = viaLink ? t : impLinkPart(t);
  var go = function (json) {
    var pk;
    if (json.length > IMP_MAX_TEXT) {
      IMP.err = '内容过大（超过 2 MB），请拆分后再导入。';
      return impShow();
    }
    try {
      pk = JSON.parse(impStrip(json));
    } catch (e) {
      IMP.err = lp ? IMP_CUT : '不是有效的 JSON：' + e.message;
      return impShow();
    }
    try {
      IMP.rows = impPlan(pk);
      IMP.pack = pk;
      IMP.phase = 'preview';
    } catch (e) {
      if (!e.imp) throw e;
      IMP.err = e.message;
    }
    impShow();
  };
  if (lp)
    impDecode(lp).then(go, function (e) {
      IMP.err = e.message;
      impShow();
    });
  else go(t);
}
function impShow() {
  if (IMP.err && IMP.viaLink) IMP.phase = 'paste';
  if (cur !== 'impPack') show('impPack', true);
  else rImp();
}
function impCount() {
  var c = { 'new': 0, update: 0, merge: 0, same: 0, bad: 0 };
  IMP.rows.forEach(function (r) {
    c[r.status]++;
  });
  return c;
}
/** 写入：逐条按预览时的判断合并；写前保存快照，可撤销 */
function impApply() {
  if (!storeCanWrite(false)) return;
  var rows = IMP.rows.filter(function (r) {
    return r.status === 'new' || r.status === 'update' || r.status === 'merge';
  });
  if (!rows.length) return;
  IMP.undo = JSON.stringify(S);
  rows.forEach(function (r) {
    var rec = r.recs[0],
      i;
    if (r.type === 'meal') {
      i = S.meals.indexOf(r.old);
      if (i >= 0) S.meals[i] = rec;
      else S.meals.push(rec);
    } else if (r.type === 'workout') {
      S.workouts = S.workouts.filter(function (w) {
        return w.imp !== r.id;
      });
      r.recs.forEach(function (x) {
        S.workouts.push(x);
      });
    } else if (r.type === 'supplement') {
      var sp = S.supps.find(function (x) {
        return x.name.trim().toLowerCase() === rec.name.toLowerCase();
      });
      if (!sp) {
        sp = { id: uid(), name: rec.name, dose: rec.dose, time: '' };
        S.supps.push(sp);
      }
      var L = S.suppLog[rec.date] || (S.suppLog[rec.date] = {}),
        n = new Date();
      L[sp.id] = {
        at: rec.at || (L[sp.id] && L[sp.id].at) || pad(n.getHours()) + ':' + pad(n.getMinutes()),
        imp: r.id
      };
    } else if (r.type === 'sleep' || r.type === 'body') {
      var arr = S[r.type];
      if (r.old) {
        for (var k in rec) r.old[k] = rec[k];
        r.old.imp = r.old.imp || r.id;
      } else {
        rec.id = r.id;
        rec.imp = r.id;
        arr.push(rec);
      }
    } else if (r.type === 'note') {
      i = S.notes.indexOf(r.old);
      if (i >= 0) S.notes[i] = rec;
      else S.notes.push(rec);
    }
  });
  if (!save()) {
    S = JSON.parse(IMP.undo);
    IMP.rows = impPlan(
      IMP.pack ||
        IMP.rows.map(function (r) {
          return r.entry;
        })
    );
    IMP.err = '导入尚未保存，请先处理上方的存储提示，再重试。';
    IMP.phase = 'preview';
    rImp();
    return;
  }
  IMP.err = null;
  var c = impCount();
  IMP.res = {
    n: rows.length,
    c: c,
    dates: rows
      .map(function (r) {
        return r.date;
      })
      .sort()
  };
  IMP.phase = 'done';
  impClearHash();
  toast('已导入 ' + rows.length + ' 条');
  rImp();
}
function impClearHash() {
  if (/^#import=/.test(location.hash))
    try {
      history.replaceState(null, '', location.pathname + location.search);
    } catch (e) {
      location.hash = '';
    }
}
function impReset() {
  IMP.phase = 'paste';
  IMP.rows = [];
  IMP.pack = null;
  IMP.err = null;
  IMP.res = null;
  IMP.viaLink = false;
}
function impWd(d) {
  var x = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return +d.slice(5, 7) + '月' + +d.slice(8, 10) + '日 ' + DT_WD[x.getDay()] + (d === today() ? ' · 今天' : '');
}
