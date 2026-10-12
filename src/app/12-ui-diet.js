// SPDX-License-Identifier: MIT
/* 12-ui-diet.js — 饮食：餐次、添加食物、食物详情、日历、目标推导、自定义食物 */
/* ---------- 饮食（v2.1）：餐次分配 / 记录快照 / 最近常吃 / 月历 / 目标推导 / 自定义与组合 ---------- */
/** 旧版"练前/练后"等餐次计入加餐 */
function mealGroup(m) {
  return MEALS.indexOf(m) >= 0 ? m : '加餐';
}
function mealSplit() {
  var s = S.goals.mealSplit || {},
    o = {},
    sum = 0;
  MEALS.forEach(function (m, i) {
    o[m] = s[m] != null ? s[m] : SPLIT0[i];
    sum += o[m];
  });
  o._sum = sum || 100;
  return o;
}
function mealTarget(m) {
  var s = mealSplit();
  return Math.round((S.goals.kcal * s[m]) / s._sum);
}
var curMeal = null;
function dMeal() {
  return curMeal || mealByHour();
}
function mkMeal(o) {
  var m = {
    id: uid(),
    date: sel,
    meal: o.meal || dMeal(),
    food: o.name || o.food,
    name: o.name || o.food,
    kcal: Math.round(o.kcal || 0),
    p: r1(o.p || 0),
    c: r1(o.c || 0),
    f: r1(o.f || 0),
    src: o.src || 'custom'
  };
  ['foodId', 'amount', 'unit', 'g', 'nutrimentsPer100g', 'lo', 'hi', 'na', 'fib', 'kcalOnly', 'via'].forEach(
    function (k) {
      if (o[k] != null && o[k] !== '') m[k] = o[k];
    }
  );
  return m;
}
function cloneMeal(m) {
  var o = JSON.parse(JSON.stringify(m));
  o.id = uid();
  o.date = sel;
  o.meal = dMeal();
  return o;
}
function mealLabel(m) {
  return m.food || m.name || '';
}
function mealTags(m) {
  var t = '';
  if (m.src === 'ai' || m.est) t += '<span class="tag est">估算</span> ';
  else if (m.src === 'photo')
    t +=
      '<span class="tag est">估算' + (m.lo && m.hi ? ' ' + Math.round(m.lo) + '–' + Math.round(m.hi) : '') + '</span> ';
  else if (m.kcalOnly) t += '<span class="tag">仅热量</span> ';
  if (m.meal && MEALS.indexOf(m.meal) < 0) t += '<span class="tag">' + esc(m.meal) + '</span> ';
  return t;
}
/** 最近 / 最常吃：近 60 天按次数、再按最近日期排序，取 8 项 */
function recentFoods() {
  var from = addDays(today(), -60),
    map = {},
    list = [];
  S.meals.forEach(function (m) {
    if (m.date < from) return;
    var k = normName(mealLabel(m)) + '|' + Math.round(m.kcal || 0);
    var e = map[k];
    if (!e) {
      e = map[k] = { m: m, n: 0, last: '' };
      list.push(e);
    }
    e.n++;
    if (m.date >= e.last) {
      e.last = m.date;
      e.m = m;
    }
  });
  return list
    .sort(function (a, b) {
      return b.n - a.n || (a.last < b.last ? 1 : -1);
    })
    .slice(0, 8)
    .map(function (e) {
      return e.m;
    });
}
function dayMicro(d) {
  var na = null,
    fib = null;
  dayMeals(d).forEach(function (m) {
    if (m.na != null) na = (na || 0) + m.na;
    if (m.fib != null) fib = (fib || 0) + m.fib;
  });
  return { na: na, fib: fib };
}
function mealTot(arr) {
  var t = { k: 0, p: 0, c: 0, f: 0 };
  arr.forEach(function (m) {
    t.k += m.kcal || 0;
    t.p += m.p || 0;
    t.c += m.c || 0;
    t.f += m.f || 0;
  });
  return t;
}
/** 剩余热量大环（自绘 SVG） */
function kcalRing(eaten, goal) {
  var r = 54,
    C = 2 * Math.PI * r,
    pc = goal ? Math.min(eaten / goal, 1) : 0,
    over = goal && eaten > goal,
    left = Math.round(goal - eaten);
  return (
    '<svg viewBox="0 0 140 140" class="ring" role="img" aria-label="剩余热量 ' +
    left +
    ' kcal"><circle cx="70" cy="70" r="' +
    r +
    '" class="rg-bg"/><circle cx="70" cy="70" r="' +
    r +
    '" class="rg-fg' +
    (over ? ' over' : '') +
    (pc ? '' : ' zero') +
    '" stroke-dasharray="' +
    (C * pc).toFixed(1) +
    ' ' +
    C.toFixed(1) +
    '" transform="rotate(-90 70 70)"/>' +
    '<text x="70" y="70" class="rg-n">' +
    Math.abs(left) +
    '</text><text x="70" y="92" class="rg-l">' +
    (over ? 'kcal 超出' : 'kcal 剩余') +
    '</text></svg>'
  );
}
function rDiet() {
  var g = S.goals,
    t = dayTot(sel),
    mi = dayMicro(sel);
  var bar = function (n, v, gl, col) {
    var pc = gl ? Math.min((v / gl) * 100, 100) : 0;
    return (
      '<div class="mbar"><div class="hrow"><span>' +
      n +
      '</span><span class="mut">' +
      Math.round(v) +
      ' / ' +
      gl +
      ' g</span></div><div class="bar"><i style="width:' +
      pc +
      '%;background:' +
      col +
      '"></i></div></div>'
    );
  };
  $('#dietSum').innerHTML =
    '<div class="dsum-top"><div class="dsum-s"><b>' +
    Math.round(t.k) +
    '</b><span>已摄入</span></div>' +
    kcalRing(t.k, g.kcal) +
    '<div class="dsum-s"><b>' +
    g.kcal +
    '</b><span>目标</span></div></div>' +
    '<div class="mbars">' +
    bar('蛋白质', t.p, g.p, 'var(--p)') +
    bar('碳水', t.c, g.c, 'var(--c)') +
    bar('脂肪', t.f, g.f, 'var(--f)') +
    '</div>' +
    (mi.na != null || mi.fib != null
      ? '<div class="mut" style="font-size:12px;margin-top:6px;text-align:center">' +
        (mi.na != null ? '钠 ' + Math.round(mi.na) + ' mg' : '') +
        (mi.na != null && mi.fib != null ? ' · ' : '') +
        (mi.fib != null ? '膳食纤维 ' + r1(mi.fib) + ' g' : '') +
        '</div>'
      : '') +
    (t.p && t.p < g.p * 0.9 && sel < today()
      ? '<div class="mut" style="color:var(--warn);text-align:center">蛋白质明显低于目标</div>'
      : '');
  var ms = dayMeals(sel);
  $('#mealCards').innerHTML = MEALS.map(function (meal) {
    var arr = ms.filter(function (m) {
        return mealGroup(m.meal) === meal;
      }),
      mt = mealTot(arr),
      tg = mealTarget(meal);
    return (
      '<div class="card meal"><div class="meal-h"><div><b>' +
      meal +
      '</b><div class="mut">' +
      Math.round(mt.k) +
      ' / ' +
      tg +
      ' kcal' +
      (arr.length ? ' · 蛋白 ' + r1(mt.p) + ' · 碳水 ' + r1(mt.c) + ' · 脂肪 ' + r1(mt.f) : '') +
      '</div></div><button class="plus" data-addmeal="' +
      meal +
      '" aria-label="添加到' +
      meal +
      '">' +
      IC('plus') +
      '</button></div>' +
      (arr.length
        ? '<ul class="list entries">' +
          arr
            .map(function (m) {
              return (
                '<li><div class="ent" data-entry="' +
                m.id +
                '"><div>' +
                mealTags(m) +
                esc(mealLabel(m)) +
                '</div><span class="ek">' +
                Math.round(m.kcal || 0) +
                ' kcal</span></div></li>'
              );
            })
            .join('') +
          '</ul>'
        : '') +
      '</div>'
    );
  }).join('');
  var sp = mealSplit();
  $('#gK').value = g.kcal;
  $('#gP').value = g.p;
  $('#gC').value = g.c;
  $('#gF').value = g.f;
  MEALS.forEach(function (m, i) {
    $('#gS' + i).value = sp[m];
  });
  gHint();
  rCal();
  rTarget();
}

/* ---------- 添加食物页：搜索 / 最近 / 自定义 / 快速加 ---------- */
var faTab = 'recent',
  addMeal = null;
var FA_TABS = [
  ['recent', '最近'],
  ['search', '搜索'],
  ['custom', '自定义'],
  ['quick', '快速加']
];
function findFood(id) {
  return (
    allFoods().find(function (f) {
      return f.id === id;
    }) || null
  );
}
function servTxt(f) {
  var u = unitsOf(f),
    k = Object.keys(u)[0];
  return k ? '1' + k + ' ≈ ' + u[k] + 'g' : '每 100g';
}
function frow(key, title, sub) {
  return (
    '<div class="frow" data-fopen="' +
    esc(key) +
    '"><div><b>' +
    esc(title) +
    '</b><span class="mut">' +
    sub +
    '</span></div><button class="plus sm" data-fplus="' +
    esc(key) +
    '" aria-label="直接添加">' +
    IC('plus') +
    '</button></div>'
  );
}
function foodRow(f) {
  return frow(
    'f:' + f.id,
    f.name,
    Math.round(f.kcal) + ' kcal / 100g · ' + servTxt(f) + (f.combo ? ' · 组合' : f.custom ? ' · 自定义' : '')
  );
}
function searchFoods(q) {
  var t = normName(q),
    list = allFoods();
  if (!t)
    return list.slice().sort(function (a, b) {
      return (b.custom ? 1 : 0) - (a.custom ? 1 : 0);
    });
  return list
    .map(function (f) {
      var sc = 0;
      [f.name].concat(f.aliases || []).forEach(function (k) {
        k = normName(k);
        if (!k) return;
        var s =
          k === t
            ? 100
            : k.indexOf(t) === 0
              ? 60
              : k.indexOf(t) >= 0
                ? 40
                : t.indexOf(k) >= 0 && k.length >= 2
                  ? 20
                  : 0;
        if (s > sc) sc = s;
      });
      return { f: f, s: sc + (f.custom && sc ? 5 : 0) };
    })
    .filter(function (x) {
      return x.s > 0;
    })
    .sort(function (a, b) {
      return b.s - a.s;
    })
    .map(function (x) {
      return x.f;
    });
}
function rDietAdd() {
  var m = dMeal();
  $('#faTabs').innerHTML = FA_TABS.map(function (t) {
    return '<button class="' + (t[0] === faTab ? 'on' : '') + '" data-fatab="' + t[0] + '">' + t[1] + '</button>';
  }).join('');
  $('#faList').hidden = faTab === 'quick' || faTab === 'custom';
  $('#faQuick').hidden = faTab !== 'quick';
  $('#faCustom').hidden = faTab !== 'custom';
  if (faTab === 'recent') {
    var rc = recentFoods();
    $('#faList').innerHTML = rc.length
      ? '<div class="card flist">' +
        rc
          .map(function (r) {
            return frow(
              'r:' + r.id,
              mealLabel(r),
              Math.round(r.kcal || 0) + ' kcal' + (r.src && SRC_LBL[r.src] ? ' · ' + SRC_LBL[r.src] : '')
            );
          })
          .join('') +
        '</div>'
      : '<div class="card mut">还没有记录。可在「搜索」中选择食物，或用「快速加」输入一行文字。</div>';
  } else if (faTab === 'search') {
    var res = searchFoods($('#faSearch').value);
    $('#faList').innerHTML = res.length
      ? '<div class="card flist">' + res.slice(0, 60).map(foodRow).join('') + '</div>'
      : '<div class="card mut">没有找到。可在「自定义」中新建，或用「快速加」只记热量。</div>';
  } else if (faTab === 'custom') {
    var cs = (S.customFoods || []).filter(function (f) {
      return f.custom;
    });
    $('#cfRows').innerHTML = cs.length
      ? '<div class="card flist">' + cs.map(foodRow).join('') + '</div>'
      : '<div class="card mut">还没有自定义食物或组合，在下方新建。</div>';
    rCustom();
  } else {
    if (!editMeal) {
      $('#mMeal').value = m;
    }
    photoUI();
  }
  $('#mDel').hidden = !editMeal;
}
$('#faSearch').addEventListener('input', function () {
  if (faTab !== 'search') {
    faTab = 'search';
  }
  rDietAdd();
});
function openAdd(meal, tab) {
  curMeal = meal || dMeal();
  addMeal = curMeal;
  SEC_LABEL.dietAdd = '添加到' + curMeal;
  if (tab) faTab = tab;
  $('#faSearch').value = '';
  mReset();
  var q = $('#faQuick');
  if ($('#mForm').parentNode !== q) q.appendChild($('#mForm'));
  $('#mFormTitle').textContent = '手动 / 照片估算';
  show('dietAdd', true);
}

/* ---------- 食物详情页：份量 + 单位、实时营养、添加到哪一餐；编辑 / 删除 / 移动餐次 ---------- */
var DF = null,
  dfBack = 'dietAdd';
function baseName(s) {
  return (
    String(s || '')
      .replace(/[（(].*?[）)]/g, '')
      .replace(/\s*(×\s*\d+(\.\d+)?|\d+(\.\d+)?\s*(g|克|份|[^\s\d]{1}))$/, '')
      .trim() || String(s || '')
  );
}
/** 由库食物 / 自定义食物生成详情模型 */
function dfFromFood(f) {
  var u = unitsOf(f),
    k = Object.keys(u)[0];
  return {
    name: f.name,
    per: per100(f),
    units: u,
    id: f.id,
    src: f.custom ? 'custom' : 'lib',
    source: f.source || '',
    qty: k ? 1 : 100,
    unit: k || 'g',
    meal: dMeal(),
    combo: f.combo || ''
  };
}
/** 由已有记录生成详情模型：有快照按快照；否则按"份"缩放 */
function dfFromRec(m, asNew) {
  /** @type {Object<string, any>} 详情模型 */
  var d;
  if (m.nutrimentsPer100g && m.g) {
    var lf = m.foodId && findFood(m.foodId),
      u = lf ? unitsOf(lf) : {};
    if (m.unit && m.unit !== 'g' && m.amount) u[m.unit] = m.g / m.amount;
    d = {
      name: m.name && m.name !== m.food ? m.name : baseName(m.food || m.name),
      per: m.nutrimentsPer100g,
      units: u,
      id: m.foodId,
      src: m.src || 'lib',
      source: (lf && lf.source) || '',
      qty: m.amount != null ? m.amount : m.g,
      unit: m.unit || 'g'
    };
  } else
    d = {
      name: mealLabel(m),
      per: { kcal: m.kcal || 0, p: m.p || 0, c: m.c || 0, f: m.f || 0, na: m.na, fib: m.fib },
      units: { '份': 100 },
      src: m.src || 'custom',
      qty: 1,
      unit: '份',
      plain: true,
      rec: m
    };
  d.meal = asNew ? dMeal() : mealGroup(m.meal);
  d.origMeal = m.meal;
  d.editId = asNew ? null : m.id;
  return d;
}
function dfGrams() {
  return DF.unit === 'g' ? DF.qty || 0 : (DF.qty || 0) * (DF.units[DF.unit] || 0);
}
function dfNutr() {
  var r = dfGrams() / 100,
    p = DF.per,
    o = { kcal: Math.round((p.kcal || 0) * r), p: r1((p.p || 0) * r), c: r1((p.c || 0) * r), f: r1((p.f || 0) * r) };
  o.na = p.na != null ? Math.round(p.na * r) : null;
  o.fib = p.fib != null ? r1(p.fib * r) : null;
  return o;
}
function amtLabel() {
  return DF.unit === 'g'
    ? Math.round(dfGrams()) + 'g'
    : DF.qty + DF.unit + (DF.plain ? '' : '（' + Math.round(dfGrams()) + 'g）');
}
function openFood(d, back) {
  DF = d;
  dfBack = back || 'dietAdd';
  SEC_LABEL.dietFood = d.editId ? '修改条目' : d.name;
  show('dietFood', true);
}
function rDietFood() {
  if (!DF) {
    show('diet', true);
    return;
  }
  var manual = DF.editId && DF.plain;
  $('#dfSheet').hidden = !!manual;
  if (manual) {
    var mf = $('#mForm');
    if (mf.parentNode !== $('#dfManual')) $('#dfManual').appendChild(mf);
    $('#dfInfo').innerHTML =
      '<b>' +
      esc(DF.name) +
      '</b><div class="mut" style="font-size:12px">该条目为手动 / 估算记录，直接修改数值；可改餐次或删除。</div>';
    dfDay();
    return;
  }
  if ($('#mForm').parentNode === $('#dfManual')) $('#faQuick').appendChild($('#mForm'));
  $('#dfQty').value = DF.qty;
  $('#dfUnit').innerHTML = ['g']
    .concat(Object.keys(DF.units))
    .filter(function (u, i, a) {
      return a.indexOf(u) === i && !(DF.plain && u === 'g');
    })
    .map(function (u) {
      return '<option' + (u === DF.unit ? ' selected' : '') + '>' + esc(u) + '</option>';
    })
    .join('');
  dfPresets();
  dfMeals();
  $('#dfAdd').textContent = DF.editId ? '保存修改' : '添加到' + DF.meal;
  $('#dfEditRow').hidden = !DF.editId;
  dfLive();
}
function dfPresets() {
  var ps = DF.unit === 'g' ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3];
  $('#dfPre').innerHTML = ps
    .map(function (v) {
      return (
        '<button class="chip' +
        (+DF.qty === v ? ' on' : '') +
        '" data-dfpre="' +
        v +
        '">' +
        v +
        (DF.unit === 'g' ? ' g' : ' ' + esc(DF.unit)) +
        '</button>'
      );
    })
    .join('');
}
function dfMeals() {
  $('#dfMeal').innerHTML = MEALS.map(function (m) {
    return '<button class="' + (m === DF.meal ? 'on' : '') + '" data-dfmeal="' + m + '">' + m + '</button>';
  }).join('');
}
function dfDay() {
  var t = dayTot(sel),
    g = S.goals.kcal,
    ex =
      DF && DF.editId
        ? (
            S.meals.find(function (x) {
              return x.id === DF.editId;
            }) || {}
          ).kcal || 0
        : 0,
    cur0 = t.k - ex,
    add = DF && !(DF.editId && DF.plain) ? dfNutr().kcal : ex,
    tot = cur0 + add;
  $('#dfDay').innerHTML =
    '<div class="hrow"><span>当日合计 <b>' +
    Math.round(tot) +
    '</b> / ' +
    g +
    ' kcal</span><span class="mut">本次 ' +
    (add >= 0 ? '+' : '') +
    Math.round(add) +
    '</span></div><div class="bar dbar"><i style="width:' +
    Math.min(100, g ? (cur0 / g) * 100 : 0) +
    '%"></i><i class="add" style="width:' +
    Math.max(0, Math.min(100 - (g ? (cur0 / g) * 100 : 0), g ? (add / g) * 100 : 0)) +
    '%"></i></div>';
}
function dfLive() {
  var n = dfNutr(),
    p = DF.per,
    row = function (l, v, u) {
      return '<tr><td>' + l + '</td><td>' + (v == null ? '—' : v + u) + '</td></tr>';
    };
  $('#dfInfo').innerHTML =
    '<div class="df-h"><div><b class="df-n">' +
    esc(DF.name) +
    '</b><div class="mut" style="font-size:12px">' +
    esc(amtLabel()) +
    (DF.src && SRC_LBL[DF.src] ? ' · ' + SRC_LBL[DF.src] : '') +
    (DF.combo ? ' · ' + esc(DF.combo) : '') +
    '</div></div><div class="df-k"><b>' +
    n.kcal +
    '</b><span>kcal</span></div></div>' +
    '<div class="df-m"><div><b>' +
    n.p +
    '</b><span>蛋白 g</span></div><div><b>' +
    n.c +
    '</b><span>碳水 g</span></div><div><b>' +
    n.f +
    '</b><span>脂肪 g</span></div></div>' +
    '<details class="more"><summary>营养明细</summary><table class="ntab">' +
    row('热量', n.kcal, ' kcal') +
    row('蛋白质', n.p, ' g') +
    row('碳水化合物', n.c, ' g') +
    row('脂肪', n.f, ' g') +
    row('膳食纤维', n.fib, ' g') +
    row('钠', n.na, ' mg') +
    '</table>' +
    '<div class="mut" style="font-size:12px">' +
    (DF.plain
      ? '按记录数值，1 份 = 原记录。'
      : '每 100g：' +
        Math.round(p.kcal) +
        ' kcal · 蛋白 ' +
        p.p +
        ' · 碳水 ' +
        p.c +
        ' · 脂肪 ' +
        p.f +
        (DF.source ? '。来源：' + esc(DF.source) : '')) +
    '</div></details>';
  dfDay();
}
$('#dfQty').addEventListener('input', function () {
  DF.qty = num(this.value) || 0;
  dfPresets();
  dfLive();
});
$('#dfUnit').addEventListener('change', function () {
  var g = dfGrams();
  DF.unit = this.value;
  DF.qty = DF.unit === 'g' ? Math.round(g) : 1;
  $('#dfQty').value = DF.qty;
  dfPresets();
  dfLive();
});
function dfRecord() {
  var n = dfNutr(),
    g = Math.round(dfGrams()),
    o = {
      meal: DF.meal,
      name: DF.plain ? DF.name : baseName(DF.name),
      kcal: n.kcal,
      p: n.p,
      c: n.c,
      f: n.f,
      na: n.na,
      fib: n.fib,
      src: DF.src
    };
  if (DF.plain) {
    var rm = DF.rec || {};
    o.name = DF.name + (DF.qty !== 1 ? ' ×' + DF.qty : '');
    if (rm.src === 'photo' && rm.lo && rm.hi) {
      o.lo = Math.round(rm.lo * DF.qty);
      o.hi = Math.round(rm.hi * DF.qty);
    }
    if (rm.kcalOnly) o.kcalOnly = true;
  } else {
    o.foodId = DF.id;
    o.amount = DF.unit === 'g' ? g : DF.qty;
    o.unit = DF.unit;
    o.g = g;
    o.nutrimentsPer100g = DF.per;
  }
  var m = mkMeal(o);
  if (!DF.plain) m.food = o.name + ' ' + amtLabel();
  if (DF.plain && o.meal === mealGroup(DF.origMeal || '')) m.meal = DF.origMeal || o.meal;
  return m;
}
$('#dfAdd').onclick = function () {
  if (!DF) return;
  if (!(dfGrams() > 0)) {
    toast('请填写数量');
    return;
  }
  var m = dfRecord();
  if (DF.editId) {
    var em = S.meals.find(function (x) {
      return x.id === DF.editId;
    });
    if (em) {
      m.id = em.id;
      m.date = em.date;
      if (DF.meal === mealGroup(em.meal)) m.meal = em.meal;
      S.meals[S.meals.indexOf(em)] = m;
    }
    toast('已修改');
  } else {
    S.meals.push(m);
    toast('已加入' + m.meal + '：' + mealLabel(m));
  }
  curMeal = m.meal;
  save();
  DF = null;
  show('diet', true);
};
$('#dfDel').onclick = function () {
  if (!DF || !DF.editId || !confirm('删除这条记录？')) return;
  S.meals = S.meals.filter(function (x) {
    return x.id !== DF.editId;
  });
  save();
  DF = null;
  toast('已删除');
  show('diet', true);
};
/** 打开日记条目：有快照进入份量编辑；否则在详情页里用手动表单编辑 */
function openEntry(id) {
  var m = S.meals.find(function (x) {
    return x.id === id;
  });
  if (!m) return;
  var d = dfFromRec(m, false);
  if (d.plain) {
    editMeal = m.id;
    fillForm(m);
    $('#mFormTitle').textContent = '修改条目';
  }
  openFood(d, 'diet');
}
function fillForm(m) {
  var mm = $('#mMeal');
  if (
    !Array.prototype.some.call(mm.options, function (o) {
      return o.value === m.meal;
    })
  ) {
    var op = document.createElement('option');
    op.textContent = m.meal;
    mm.appendChild(op);
  }
  mm.value = m.meal;
  $('#mFood').value = mealLabel(m);
  $('#mP').value = r1(m.p || 0);
  $('#mC').value = r1(m.c || 0);
  $('#mF').value = r1(m.f || 0);
  $('#mK').value = Math.round(m.kcal || 0);
  $('#mSrc').value = m.src === 'photo' ? 'photo' : 'custom';
  $('#mLo').value = m.lo != null ? m.lo : '';
  $('#mHi').value = m.hi != null ? m.hi : '';
  $('#mNa').value = m.na != null ? m.na : '';
  $('#mFib').value = m.fib != null ? m.fib : '';
  pickFood = null;
  $('#mG').value = '';
  $('#mAdd').textContent = '保存修改';
  $('#mCancel').hidden = false;
  $('#mDel').hidden = false;
  photoUI();
}
$('#mDel').onclick = function () {
  if (!editMeal || !confirm('删除这条记录？')) return;
  S.meals = S.meals.filter(function (x) {
    return x.id !== editMeal;
  });
  save();
  mReset();
  DF = null;
  toast('已删除');
  show('diet', true);
};
document.addEventListener('click', function (e) {
  var b =
    e.target.closest &&
    e.target.closest(
      '[data-addmeal],[data-entry],[data-fatab],[data-fopen],[data-fplus],[data-dfpre],[data-dfmeal],[data-go-cal]'
    );
  if (!b) return;
  var a;
  if ((a = b.getAttribute('data-addmeal'))) {
    openAdd(a, 'recent');
    return;
  }
  if ((a = b.getAttribute('data-entry'))) {
    openEntry(a);
    return;
  }
  if ((a = b.getAttribute('data-fatab'))) {
    faTab = a;
    rDietAdd();
    if (a === 'search') $('#faSearch').focus();
    return;
  }
  if (b.hasAttribute('data-go-cal')) {
    $('#calCard').open = true;
    $('#calCard').scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    return;
  }
  if ((a = b.getAttribute('data-fplus'))) {
    e.stopPropagation();
    var d = keyModel(a);
    if (!d) return;
    d.meal = dMeal();
    DF = d;
    var m = dfRecord();
    S.meals.push(m);
    save();
    DF = null;
    toast('已加入' + m.meal + '：' + mealLabel(m));
    render();
    return;
  }
  if ((a = b.getAttribute('data-fopen'))) {
    var d2 = keyModel(a);
    if (d2) openFood(d2, 'dietAdd');
    return;
  }
  if ((a = b.getAttribute('data-dfpre'))) {
    DF.qty = +a;
    $('#dfQty').value = DF.qty;
    dfPresets();
    dfLive();
    return;
  }
  if ((a = b.getAttribute('data-dfmeal'))) {
    DF.meal = a;
    dfMeals();
    if (!DF.editId) $('#dfAdd').textContent = '添加到' + a;
    return;
  }
});
function keyModel(k) {
  if (k.indexOf('f:') === 0) {
    var f = findFood(k.slice(2));
    return f ? dfFromFood(f) : null;
  }
  if (k.indexOf('r:') === 0) {
    var m = S.meals.find(function (x) {
      return x.id === k.slice(2);
    });
    return m ? dfFromRec(m, true) : null;
  }
  return null;
}
/* 食物库：选中食物后按克数（默认100g）换算营养素 */
var pickFood = null;
function applyFood() {
  if (!pickFood) return;
  var g = num($('#mG').value) || 0,
    o = fromFood(pickFood, g);
  $('#mFood').value = o.name + ' ' + o.g + 'g';
  $('#mP').value = o.p;
  $('#mC').value = o.c;
  $('#mF').value = o.f;
  $('#mK').value = o.kcal;
  $('#mNa').value = o.na != null ? o.na : '';
  $('#mFib').value = o.fib != null ? o.fib : '';
}
$('#mG').addEventListener('input', applyFood);
$('#mFood').addEventListener('input', function () {
  pickFood = null;
});
function photoUI() {
  var on = $('#mSrc').value === 'photo';
  Array.prototype.forEach.call(document.querySelectorAll('.photoOnly'), function (e) {
    e.hidden = !on;
  });
}
$('#mSrc').addEventListener('change', photoUI);
/** 照片估算：填区间后热量默认取中值 */
['#mLo', '#mHi'].forEach(function (s) {
  $(s).addEventListener('input', function () {
    var lo = num($('#mLo').value),
      hi = num($('#mHi').value);
    if (lo && hi && hi >= lo) $('#mK').value = Math.round((lo + hi) / 2);
  });
});
function gHint() {
  var k = (num($('#gP').value) || 0) * 4 + (num($('#gC').value) || 0) * 4 + (num($('#gF').value) || 0) * 9,
    s = 0;
  for (var i = 0; i < 4; i++) s += num($('#gS' + i).value) || 0;
  $('#gHint').textContent =
    '宏量折算 ≈ ' + Math.round(k) + ' kcal' + (s !== 100 ? ' · 分配合计 ' + s + '%（将按比例换算）' : '');
}
['#gP', '#gC', '#gF', '#gS0', '#gS1', '#gS2', '#gS3'].forEach(function (s) {
  $(s).addEventListener('input', gHint);
});
$('#gSave').onclick = function () {
  ['kcal', 'p', 'c', 'f'].forEach(function (k, i) {
    var v = num($(['#gK', '#gP', '#gC', '#gF'][i]).value);
    if (v != null && v > 0) S.goals[k] = v;
  });
  /** @type {Record<string, number>} */
  var sp = {},
    ok = true;
  MEALS.forEach(function (m, i) {
    var v = num($('#gS' + i).value);
    if (v == null || v < 0) ok = false;
    sp[m] = v;
  });
  if (
    ok &&
    MEALS.some(function (m) {
      return sp[m] > 0;
    })
  )
    S.goals.mealSplit = sp;
  save();
  toast('目标已保存');
  render();
};
var editMeal = null;
function mReset() {
  editMeal = null;
  pickFood = null;
  ['#mFood', '#mG', '#mP', '#mC', '#mF', '#mK', '#mLo', '#mHi', '#mNa', '#mFib'].forEach(function (s) {
    $(s).value = '';
  });
  $('#mSrc').value = 'custom';
  $('#mMeal').value = dMeal();
  $('#mAdd').textContent = '添加';
  $('#mCancel').hidden = true;
  $('#mDel').hidden = true;
  photoUI();
}
$('#mAdd').onclick = function () {
  var food = $('#mFood').value.trim(),
    p = num($('#mP').value) || 0,
    c = num($('#mC').value) || 0,
    f = num($('#mF').value) || 0,
    k = num($('#mK').value),
    src = $('#mSrc').value,
    lo = num($('#mLo').value),
    hi = num($('#mHi').value);
  if (!food) {
    toast('请填写食物');
    return;
  }
  if (k == null) k = p * 4 + c * 4 + f * 9;
  if (src === 'photo' && lo != null && hi != null && hi < lo) {
    toast('估算上限应不小于下限');
    return;
  }
  var o = {
    meal: $('#mMeal').value,
    name: food,
    kcal: k,
    p: p,
    c: c,
    f: f,
    src: src,
    na: num($('#mNa').value),
    fib: num($('#mFib').value)
  };
  if (src === 'photo') {
    o.lo = lo;
    o.hi = hi;
  }
  var g = num($('#mG').value);
  if (pickFood && g) {
    var ff = fromFood(pickFood, g);
    ['foodId', 'amount', 'unit', 'g', 'nutrimentsPer100g'].forEach(function (x) {
      o[x] = ff[x];
    });
    if (src !== 'photo') o.src = ff.src;
  }
  var em =
    editMeal &&
    S.meals.find(function (x) {
      return x.id === editMeal;
    });
  if (em) {
    var nm = mkMeal(o);
    nm.id = em.id;
    nm.date = em.date;
    if (!pickFood) {
      ['foodId', 'amount', 'unit', 'g', 'nutrimentsPer100g'].forEach(function (x) {
        if (em[x] != null && nm[x] == null && food === mealLabel(em)) nm[x] = em[x];
      });
      if (em.src && src === 'custom' && em.src !== 'photo') nm.src = em.src;
    }
    S.meals[S.meals.indexOf(em)] = nm;
  } else S.meals.push(mkMeal(o));
  pickFood = null;
  curMeal = o.meal;
  save();
  mReset();
  DF = null;
  toast(em ? '已修改' : '已加入' + o.meal);
  show('diet', true);
};
$('#mCancel').onclick = function () {
  mReset();
  DF = null;
  show('diet', true);
};
$('#mSaveFav').onclick = function () {
  var food = $('#mFood').value.trim();
  if (!food) {
    toast('请先填写食物与数值');
    return;
  }
  var p = num($('#mP').value) || 0,
    c = num($('#mC').value) || 0,
    f = num($('#mF').value) || 0,
    k = num($('#mK').value);
  if (k == null) k = p * 4 + c * 4 + f * 9;
  S.favFoods = S.favFoods.filter(function (x) {
    return x.food !== food;
  });
  S.favFoods.push({ food: food, kcal: k, p: p, c: c, f: f });
  save();
  toast('已存为常用（长按可删除）');
  render();
};

/* 饮食月历：按热量与目标的偏差着色；连续记录天数；体重趋势外推 */
var calMonth = null;
function streakDays() {
  var d = today(),
    n = 0;
  if (!dayMeals(d).length) d = addDays(d, -1);
  while (dayMeals(d).length && n < 3650) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function calLevel(d) {
  var ms = dayMeals(d);
  if (!ms.length) return '';
  var k = ms.reduce(function (s, m) {
      return s + (m.kcal || 0);
    }, 0),
    g = S.goals.kcal;
  if (!g) return 'ok';
  var r = k / g;
  return r < 0.9 ? 'lo' : r > 1.1 ? 'hi' : 'ok';
}
/** 近 42 天体重线性回归，按斜率外推到目标体重（仅为趋势估计） */
function weightETA() {
  var gw = S.goals.weight;
  if (gw == null) return { msg: '在「我的 › 其他目标」设置目标体重后，可按体重趋势估算达成日期。' };
  var t0 = today(),
    from = addDays(t0, -42),
    pts = S.body
      .filter(function (b) {
        return b.weight != null && b.date >= from && b.date <= t0;
      })
      .map(function (b) {
        return { x: diffDays(from, b.date), y: b.weight };
      });
  var xs = pts.map(function (p) {
    return p.x;
  });
  if (pts.length < 3 || Math.max.apply(null, xs) - Math.min.apply(null, xs) < 14)
    return { msg: '需要近 6 周内至少 3 次、跨度 ≥14 天的体重记录才能估算达成日期。' };
  var mx = avg(xs),
    my = avg(
      pts.map(function (p) {
        return p.y;
      })
    ),
    sxy = 0,
    sxx = 0;
  pts.forEach(function (p) {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) * (p.x - mx);
  });
  var b = sxx ? sxy / sxx : 0,
    xNow = diffDays(from, t0),
    wNow = my + b * (xNow - mx),
    diff = gw - wNow,
    wk = r1(b * 7);
  if (Math.abs(diff) < 0.3) return { msg: '当前趋势体重约 ' + r1(wNow) + ' kg，已接近目标 ' + gw + ' kg。' };
  if (Math.abs(b) < 0.005 || diff > 0 !== b > 0)
    return {
      msg: '近 6 周趋势（每周 ' + (wk > 0 ? '+' : '') + wk + ' kg）未朝目标 ' + gw + ' kg 方向变化，暂无法估算。'
    };
  var days = Math.round(diff / b);
  if (days > 1095) return { msg: '按当前趋势（每周 ' + (wk > 0 ? '+' : '') + wk + ' kg）需超过 3 年，建议复核目标。' };
  return {
    date: addDays(t0, days),
    msg:
      '按近 6 周趋势（每周 ' +
      (wk > 0 ? '+' : '') +
      wk +
      ' kg，趋势体重 ' +
      r1(wNow) +
      ' kg），预计 <b>' +
      addDays(t0, days) +
      '</b> 前后达到 ' +
      gw +
      ' kg（约 ' +
      days +
      ' 天）。仅为趋势外推，不构成医疗建议。'
  };
}
function rCal() {
  var st = streakDays();
  $('#calSum').textContent = st ? '连续记录 ' + st + ' 天' : '';
  var cm = calMonth || sel.slice(0, 7),
    y = +cm.slice(0, 4),
    mo = +cm.slice(5, 7),
    first = cm + '-01',
    dim = new Date(y, mo, 0).getDate(),
    lead = (parse(first).getDay() + 6) % 7,
    h = '';
  for (var i = 0; i < lead; i++) h += '<span></span>';
  for (var d = 1; d <= dim; d++) {
    var ds = cm + '-' + pad(d),
      lv = calLevel(ds);
    h +=
      '<button class="cd' +
      (lv ? ' ' + lv : '') +
      (ds === sel ? ' sel' : '') +
      (ds === today() ? ' td' : '') +
      '" data-calday="' +
      ds +
      '">' +
      d +
      '</button>';
  }
  var pm = fmt(new Date(y, mo - 2, 1)).slice(0, 7),
    nm = fmt(new Date(y, mo, 1)).slice(0, 7),
    e = weightETA();
  $('#calBox').innerHTML =
    '<div class="hrow" style="margin:6px 0"><button class="ghost sm" data-calm="' +
    pm +
    '" aria-label="上个月">' +
    IC('left') +
    '</button><b>' +
    y +
    ' 年 ' +
    mo +
    ' 月</b><button class="ghost sm" data-calm="' +
    nm +
    '" aria-label="下个月">' +
    IC('right') +
    '</button></div>' +
    '<div class="cal"><i>一</i><i>二</i><i>三</i><i>四</i><i>五</i><i>六</i><i>日</i>' +
    h +
    '</div>' +
    '<div class="mlg" style="margin-top:6px"><span><i class="cd ok"></i>达标 ±10%</span><span><i class="cd lo"></i>偏低</span><span><i class="cd hi"></i>偏高</span><span><i class="cd"></i>未记录</span></div>' +
    '<div class="mut" style="margin-top:8px;font-size:13px">连续记录 <b>' +
    st +
    '</b> 天 · ' +
    e.msg +
    '</div>';
}

function rTarget() {
  var c = tgtCfg(),
    r = calcTarget(c),
    opt = function (v, l, s) {
      return '<option value="' + v + '"' + (String(v) === String(s) ? ' selected' : '') + '>' + l + '</option>';
    },
    hasBf = latestBody('bf') != null && latestBody('weight') != null;
  var h =
    '<div class="grid2" style="margin-top:8px">' +
    '<div><label for="tcSex">性别</label><select id="tcSex">' +
    opt('', '请选择', c.sex) +
    opt('m', '男', c.sex) +
    opt('f', '女', c.sex) +
    '</select></div>' +
    '<div><label for="tcAge">年龄</label><input id="tcAge" type="number" value="' +
    (c.age != null ? c.age : '') +
    '"></div>' +
    '<div><label for="tcPal">日常活动</label><select id="tcPal">' +
    PAL.map(function (p) {
      return opt(p[0], p[1], c.pal);
    }).join('') +
    '</select></div>' +
    '<div><label for="tcMode">目标</label><select id="tcMode">' +
    Object.keys(GMODE)
      .map(function (k) {
        var g = GMODE[k];
        return opt(k, g[0] + (g[1] ? '（' + (g[1] > 0 ? '+' : '') + Math.round(g[1] * 100) + '%）' : ''), c.mode);
      })
      .join('') +
    '</select></div>' +
    '<div><label for="tcAdj">手动偏移 kcal</label><input id="tcAdj" type="number" step="50" value="' +
    c.adj +
    '"></div>' +
    '<div><label for="tcPkg">蛋白 g/kg 体重</label><input id="tcPkg" type="number" step="0.1" value="' +
    c.pkg +
    '"></div>' +
    '</div>' +
    (hasBf
      ? '<label class="ck-l" style="margin-top:6px"><input type="checkbox" id="tcKm"' +
        (c.km ? ' checked' : '') +
        '> 有体脂数据：用 Katch-McArdle（按瘦体重）</label>'
      : '');
  if (r.miss)
    h +=
      '<div class="alert info" style="margin-top:8px">还缺：' +
      esc(r.miss.join('、')) +
      '。补齐后显示推导过程（不会自动填写）。</div>';
  else
    h +=
      '<ol class="steps">' +
      '<li><span>基础代谢 BMR</span><b>' +
      Math.round(r.bmr) +
      ' kcal</b><em>' +
      esc(r.how) +
      '</em></li>' +
      '<li><span>× 活动系数 ' +
      c.pal +
      '</span><b>' +
      Math.round(r.tdee) +
      ' kcal</b><em>每日总消耗估计（TDEE）</em></li>' +
      '<li><span>' +
      r.gm[0] +
      (r.gm[1] ? ' ' + (r.gm[1] > 0 ? '+' : '') + Math.round(r.gm[1] * 100) + '%' : '') +
      '</span><b>' +
      Math.round(r.goal) +
      ' kcal</b><em>' +
      (r.gm[1] < 0 ? '热量缺口' : r.gm[1] > 0 ? '热量盈余' : '不设缺口') +
      ' ' +
      Math.round(r.goal - r.tdee) +
      ' kcal</em></li>' +
      '<li><span>手动偏移 ' +
      (c.adj >= 0 ? '+' : '') +
      c.adj +
      '</span><b>' +
      r.kcal +
      ' kcal</b><em>建议热量目标（取整到 10）</em></li>' +
      '<li><span>蛋白 ' +
      c.pkg +
      ' g/kg × ' +
      r.w +
      ' kg</span><b>' +
      r.p +
      ' g</b><em>脂肪按热量 ' +
      c.fatPct +
      '% ≈ ' +
      r.f +
      ' g，碳水为余量 ≈ ' +
      r.c +
      ' g</em></li></ol>' +
      '<div class="actions"><button id="tcApply">应用到饮食目标</button><span class="mut" style="font-size:12px">当前目标 ' +
      S.goals.kcal +
      ' kcal / 蛋白 ' +
      S.goals.p +
      ' g</span></div>';
  h +=
    '<details class="more"><summary>公式与文献</summary><div class="mut" style="font-size:12px;line-height:1.6">' +
    'Mifflin-St Jeor：男 10W + 6.25H − 5A + 5，女 10W + 6.25H − 5A − 161（W kg，H cm，A 岁）。Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241–247.<br>' +
    'Katch-McArdle：370 + 21.6 × 瘦体重（kg）。McArdle WD, Katch FI, Katch VL. Exercise Physiology: Nutrition, Energy, and Human Performance.<br>' +
    '活动系数（PAL）：FAO/WHO/UNU. Human energy requirements. FAO Food and Nutrition Technical Report Series 1, 2004（久坐/轻度 1.40–1.69，活跃 1.70–1.99，高 2.00–2.40）。<br>' +
    '蛋白质：Jäger R, et al. J Int Soc Sports Nutr. 2017;14:20（训练人群 1.4–2.0 g/kg/d）；Morton RW, et al. Br J Sports Med. 2018;52:376–384。<br>' +
    '均为人群平均估计，个体差异可达 ±10% 以上；请按 2–3 周体重趋势微调。不构成医疗或营养建议。</div></details>';
  var box = $('#tgtBox'),
    ae = document.activeElement && document.activeElement.id;
  box.innerHTML = h;
  if (ae && /^tc/.test(ae) && $('#' + ae)) $('#' + ae).focus();
}
function tcRead() {
  var c = tgtCfg();
  c.sex = $('#tcSex').value;
  c.age = num($('#tcAge').value);
  c.pal = num($('#tcPal').value) || 1.55;
  c.mode = $('#tcMode').value;
  c.adj = num($('#tcAdj').value) || 0;
  c.pkg = num($('#tcPkg').value) || 1.6;
  c.km = !!($('#tcKm') && $('#tcKm').checked);
  S.goals.calc = c;
  save();
}
$('#tgtBox').addEventListener('change', function (e) {
  if (/^tc/.test(e.target.id)) {
    tcRead();
    rTarget();
  }
});
$('#tgtBox').addEventListener('click', function (e) {
  if (e.target.id !== 'tcApply') return;
  var r = calcTarget(tgtCfg());
  if (r.miss) return;
  if (!confirm('将饮食目标设为 ' + r.kcal + ' kcal、蛋白 ' + r.p + ' g、碳水 ' + r.c + ' g、脂肪 ' + r.f + ' g？'))
    return;
  S.goals.kcal = r.kcal;
  S.goals.p = r.p;
  S.goals.c = r.c;
  S.goals.f = r.f;
  save();
  toast('已应用到饮食目标');
  render();
});

/* 自定义食物与组合（存于 customFoods，custom:true；组合带 combo 组成文本） */
var cfMode = 'food';
function rCustom() {
  var cs = (S.customFoods || []).filter(function (f) {
    return f.custom;
  });
  $('#cfCnt').textContent = cs.length ? cs.length + ' 项' : '';
  $('#cfmFood').classList.toggle('on', cfMode === 'food');
  $('#cfmCombo').classList.toggle('on', cfMode === 'combo');
  $('#cfFood').hidden = cfMode !== 'food';
  $('#cfCombo').hidden = cfMode !== 'combo';
  $('#cuList').innerHTML = cs
    .map(function (f) {
      var u = unitsOf(f),
        g = u['份'] || 100,
        r = g / 100;
      return (
        '<li><div><b>' +
        esc(f.name) +
        '</b> ' +
        (f.combo ? '<span class="tag">组合</span>' : '') +
        '<div class="mut">每份 ' +
        Math.round(f.kcal * r) +
        ' kcal · P' +
        r1(f.p * r) +
        ' C' +
        r1(f.c * r) +
        ' F' +
        r1(f.f * r) +
        (f.combo ? ' · ' + esc(f.combo) : ' · ' + g + ' g') +
        '</div></div><button class="del" aria-label="删除" data-delcu="' +
        esc(f.id) +
        '" aria-label="删除">' +
        IC('x') +
        '</button></li>'
      );
    })
    .join('');
}
function coPreview() {
  var r = parseQuick($('#coText').value),
    k = 0;
  r.items.forEach(function (i) {
    k += i.kcal;
  });
  $('#coPrev').innerHTML = $('#coText').value.trim()
    ? '合计 ' +
      Math.round(k) +
      ' kcal' +
      (r.miss.length ? ' <span style="color:var(--warn)">未识别：' + esc(r.miss.join('、')) + '</span>' : '')
    : '';
}
$('#coText').addEventListener('input', coPreview);
function saveCustom(f) {
  S.customFoods = (S.customFoods || []).filter(function (y) {
    return normName(y.name) !== normName(f.name);
  });
  S.customFoods.push(f);
  save();
}
$('#cuAdd').onclick = function () {
  /** @type {Food} */
  var f;
  if (cfMode === 'food') {
    var name = $('#cuName').value.trim(),
      g = num($('#cuG').value) || 100,
      k = num($('#cuK').value),
      p = num($('#cuP').value) || 0,
      c = num($('#cuC').value) || 0,
      ft = num($('#cuF').value) || 0,
      na = num($('#cuNa').value);
    if (!name) {
      toast('请填写名称');
      return;
    }
    if (k == null) k = p * 4 + c * 4 + ft * 9;
    if (!k) {
      toast('请填写热量或宏量');
      return;
    }
    var r = 100 / g;
    f = {
      id: 'cu-' + uid(),
      name: name,
      category: '自定义',
      kcal: r1(k * r),
      p: r1(p * r),
      c: r1(c * r),
      f: r1(ft * r),
      servings: [{ unit: '份', g: g }],
      source: '自定义',
      custom: true
    };
    if (na != null) f.na = r1(na * r);
    ['#cuName', '#cuG', '#cuK', '#cuP', '#cuC', '#cuF', '#cuNa'].forEach(function (s) {
      $(s).value = '';
    });
  } else {
    var nm = $('#coName').value.trim(),
      tx = $('#coText').value.trim(),
      q = parseQuick(tx);
    if (!nm || !q.items.length) {
      toast('请填写组合名称与组成');
      return;
    }
    if (q.miss.length) {
      toast('有未识别的项：' + q.miss.join('、'));
      return;
    }
    var T = { kcal: 0, p: 0, c: 0, f: 0, g: 0, na: null, fib: null };
    q.items.forEach(function (i) {
      T.kcal += i.kcal;
      T.p += i.p;
      T.c += i.c;
      T.f += i.f;
      T.g += i.g || 0;
      if (i.na != null) T.na = (T.na || 0) + i.na;
      if (i.fib != null) T.fib = (T.fib || 0) + i.fib;
    });
    var gg = T.g || 100,
      rr = 100 / gg;
    f = {
      id: 'co-' + uid(),
      name: nm,
      category: '组合',
      kcal: r1(T.kcal * rr),
      p: r1(T.p * rr),
      c: r1(T.c * rr),
      f: r1(T.f * rr),
      servings: [{ unit: '份', g: Math.round(gg) }],
      source: '自定义',
      custom: true,
      combo: tx
    };
    if (T.na != null) f.na = r1(T.na * rr);
    if (T.fib != null) f.fib = r1(T.fib * rr);
    $('#coName').value = '';
    $('#coText').value = '';
    $('#coPrev').textContent = '';
  }
  saveCustom(f);
  toast('已保存「' + f.name + '」，快速输入名称即可记录');
  render();
};
document.addEventListener('click', function (e) {
  var b =
    e.target.closest &&
    e.target.closest('[data-cfmode],[data-meal],[data-again],[data-calday],[data-calm],[data-delcu]');
  if (!b) return;
  var a;
  if ((a = b.getAttribute('data-cfmode'))) {
    cfMode = a;
    rCustom();
    return;
  }
  if ((a = b.getAttribute('data-meal'))) {
    curMeal = a;
    $('#mMeal').value = a;
    rDiet();
    return;
  }
  if ((a = b.getAttribute('data-again'))) {
    var m = S.meals.find(function (x) {
      return x.id === a;
    });
    if (!m) return;
    var o = cloneMeal(m);
    S.meals.push(o);
    save();
    toast('已记入' + o.meal + '：' + mealLabel(o));
    render();
    return;
  }
  if ((a = b.getAttribute('data-calday'))) {
    sel = a;
    $('#dSel').value = sel;
    render();
    return;
  }
  if ((a = b.getAttribute('data-calm'))) {
    calMonth = a;
    rCal();
    return;
  }
  if ((a = b.getAttribute('data-delcu'))) {
    if (!confirm('删除该自定义项？已记录的条目不受影响。')) return;
    S.customFoods = S.customFoods.filter(function (x) {
      return x.id !== a;
    });
    save();
    render();
  }
});
