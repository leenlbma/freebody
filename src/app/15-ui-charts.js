// SPDX-License-Identifier: MIT
/* 15-ui-charts.js — 可视化（图表由 src/charts.js 绘制） */
/* ---------- 可视化（图表由 src/charts.js 绘制） ---------- */
/** 时间范围：每组图表独立，0=全部 */
var RANGE = {};
function rng(k) {
  return RANGE[k] != null ? RANGE[k] : 30;
}
/** 范围起始日期；全部时返回给定数据中的最早日期 */
function since(k, dates) {
  var n = rng(k);
  if (n) return addDays(sel, -(n - 1));
  dates = (dates || []).filter(Boolean).sort();
  return dates[0] || addDays(sel, -29);
}
function daysBetween(a, b) {
  var o = [],
    d = a;
  while (d <= b && o.length < 800) {
    o.push(d);
    d = addDays(d, 1);
  }
  return o;
}
/** 移动平均：按日期向前 n 天窗口 */
function movAvg(pts, n) {
  return pts.map(function (p) {
    var w = pts.filter(function (q) {
      var dd = diffDays(q.d, p.d);
      return dd >= 0 && dd < n;
    });
    return {
      d: p.d,
      y: r1(
        avg(
          w.map(function (q) {
            return q.y;
          })
        )
      )
    };
  });
}
function sortPts(a) {
  return a
    .filter(function (p) {
      return p.y != null;
    })
    .sort(function (x, y) {
      return x.d < y.d ? -1 : 1;
    });
}

function chTodayWeight() {
  var pts = sortPts(
    S.body.map(function (b) {
      return { d: b.date, y: b.weight };
    })
  ).filter(function (p) {
    return p.d <= sel && p.d >= addDays(sel, -29);
  });
  CH.line($('#chOvWt'), {
    series: [
      { name: '体重', color: 'var(--acc)', pts: pts, unit: ' kg', area: true },
      { name: '7日均线', color: 'var(--acc2)', pts: movAvg(pts, 7), dash: true, unit: ' kg' }
    ],
    refs: [{ y: S.goals.weight, name: '目标', color: 'var(--mut)' }],
    h: 80,
    emptyMsg: '还没有体重记录',
    emptyHint: '在「今天」或 身体 中记录'
  });
}

function chNutrition() {
  var g = S.goals,
    from = since(
      'nut',
      S.meals.map(function (m) {
        return m.date;
      })
    ),
    days = daysBetween(from, sel),
    cats = [],
    withMeals = [];
  days.forEach(function (d) {
    var t = dayTot(d),
      has = dayMeals(d).length > 0;
    if (has) withMeals.push({ d: d, t: t });
    cats.push({
      l: md(d),
      d: d,
      v: Math.round(t.k),
      has: has,
      color: !has ? 'var(--bd)' : t.k > g.kcal * 1.1 ? 'var(--acc2)' : t.k < g.kcal * 0.8 ? 'var(--c)' : 'var(--acc)',
      tip:
        d +
        '\n热量 ' +
        Math.round(t.k) +
        ' / ' +
        g.kcal +
        ' kcal' +
        (has ? '\n' + (t.k > g.kcal ? '超出 ' : '差 ') + Math.abs(Math.round(t.k - g.kcal)) : '\n无记录')
    });
  });
  CH.bars($('#chKcal'), {
    h: 170,
    cats: cats,
    goal: g.kcal,
    goalName: '目标',
    unit: ' kcal',
    emptyMsg: '暂无饮食记录',
    emptyHint: '记录餐次后显示每日热量对比',
    legend: [
      { name: '目标±10%内', color: 'var(--acc)' },
      { name: '超出', color: 'var(--acc2)' },
      { name: '明显不足', color: 'var(--c)' }
    ]
  });
  var n = withMeals.length,
    aP = n
      ? avg(
          withMeals.map(function (x) {
            return x.t.p;
          })
        )
      : 0,
    aC = n
      ? avg(
          withMeals.map(function (x) {
            return x.t.c;
          })
        )
      : 0,
    aF = n
      ? avg(
          withMeals.map(function (x) {
            return x.t.f;
          })
        )
      : 0;
  CH.donut($('#chMacro'), {
    parts: [
      {
        name: '蛋白质',
        v: aP * 4,
        color: 'var(--p)',
        tip: '蛋白质 日均 ' + r1(aP) + 'g · ' + Math.round(aP * 4) + ' kcal'
      },
      {
        name: '碳水',
        v: aC * 4,
        color: 'var(--c)',
        tip: '碳水 日均 ' + r1(aC) + 'g · ' + Math.round(aC * 4) + ' kcal'
      },
      { name: '脂肪', v: aF * 9, color: 'var(--f)', tip: '脂肪 日均 ' + r1(aF) + 'g · ' + Math.round(aF * 9) + ' kcal' }
    ],
    center: Math.round(aP * 4 + aC * 4 + aF * 9) + '',
    sub: 'kcal/日',
    emptyMsg: '暂无数据'
  });
  var hit = withMeals.filter(function (x) {
      return x.t.p >= g.p * 0.95;
    }).length,
    rate = n ? Math.round((hit / n) * 100) : null;
  $('#protRate').innerHTML = n
    ? '<div class="mut">蛋白质达标率（≥目标95%）</div><div class="kpi"><span class="big" style="color:' +
      (rate >= 80 ? 'var(--ok)' : rate >= 50 ? 'var(--warn)' : 'var(--bad)') +
      '">' +
      rate +
      '%</span><span class="mut">' +
      hit +
      '/' +
      n +
      ' 天</span></div><div class="bar" style="margin:6px 0"><i style="width:' +
      rate +
      '%;background:var(--p)"></i></div><div class="mut">日均蛋白 ' +
      r1(aP) +
      ' g / 目标 ' +
      g.p +
      ' g' +
      (S.body.length
        ? ' · 约 ' +
          r1(
            aP /
              (
                sortPts(
                  S.body.map(function (b) {
                    return { d: b.date, y: b.weight };
                  })
                ).pop() || { y: aP }
              ).y
          ) +
          ' g/kg'
        : '') +
      '</div>'
    : '';
  CH.bars($('#chMacroBar'), {
    h: 150,
    cats: days.map(function (d) {
      var t = dayTot(d);
      return {
        l: md(d),
        d: d,
        stack: [
          { name: '蛋白质', v: Math.round(t.p * 4), color: 'var(--p)' },
          { name: '碳水', v: Math.round(t.c * 4), color: 'var(--c)' },
          { name: '脂肪', v: Math.round(t.f * 9), color: 'var(--f)' }
        ]
      };
    }),
    unit: ' kcal',
    emptyMsg: '暂无饮食记录',
    legend: [
      { name: '蛋白质', color: 'var(--p)' },
      { name: '碳水', color: 'var(--c)' },
      { name: '脂肪', color: 'var(--f)' }
    ]
  });
}

var ormSel = null;
function chTrain() {
  var from = since(
      'train',
      S.workouts
        .map(function (w) {
          return w.date;
        })
        .concat(
          S.cardio.map(function (c) {
            return c.date;
          })
        )
    ),
    inR = function (x) {
      return x.date >= from && x.date <= sel;
    },
    ws = S.workouts.filter(inR);
  // 训练量：7天按日，其余按周
  if (rng('train') === 7) {
    $('#volTitle').textContent = '每日训练量 (kg)';
    CH.bars($('#chVol'), {
      h: 160,
      cats: daysBetween(from, sel).map(function (d) {
        var v = dayVol(d);
        return { l: md(d), d: d, v: Math.round(v), tip: d + '\n训练量 ' + Math.round(v) + ' kg' };
      }),
      unit: ' kg',
      emptyMsg: '这段时间没有力量训练',
      emptyHint: '记录组数×次数×重量后显示'
    });
  } else {
    $('#volTitle').textContent = '每周训练量 (kg)';
    var wk = [],
      w0 = weekStart(from);
    while (w0 <= sel && wk.length < 110) {
      (function (ws0) {
        var we = addDays(ws0, 6),
          list = S.workouts.filter(function (w) {
            return w.date >= ws0 && w.date <= we;
          }),
          dd = {};
        list.forEach(function (w) {
          dd[w.date] = 1;
        });
        var v = list.reduce(function (s, w) {
          return s + vol(w);
        }, 0);
        wk.push({
          l: md(ws0),
          d: ws0,
          v: Math.round(v),
          tip:
            ws0 +
            ' 周\n训练量 ' +
            Math.round(v) +
            ' kg\n训练 ' +
            Object.keys(dd).length +
            ' 天 · ' +
            list.reduce(function (s, w) {
              return s + (w.sets || 0);
            }, 0) +
            ' 组'
        });
      })(w0);
      w0 = addDays(w0, 7);
    }
    CH.bars($('#chVol'), {
      h: 160,
      cats: wk,
      unit: ' kg',
      emptyMsg: '这段时间没有力量训练',
      emptyHint: '记录组数×次数×重量后显示'
    });
  }
  // 肌群
  var mg = {};
  ws.forEach(function (w) {
    var mm = musclesOf(w.exercise),
      m = mm.p.length ? MUS[mm.p[0]][0] : '其他';
    mg[m] = mg[m] || { s: 0, v: 0 };
    mg[m].s += w.sets || 0;
    mg[m].v += vol(w);
  });
  CH.hbars($('#chMuscle'), {
    rows: Object.keys(mg)
      .sort(function (a, b) {
        return mg[b].s - mg[a].s;
      })
      .map(function (k) {
        return { l: k, v: mg[k].s, tip: k + '：' + mg[k].s + ' 组 · ' + Math.round(mg[k].v) + ' kg' };
      }),
    unit: ' 组',
    emptyMsg: '暂无肌群数据',
    emptyHint: '按动作名称自动归类到主要肌群'
  });
  // 1RM
  var cnt = {};
  S.workouts.forEach(function (w) {
    if (w.weight > 0 && w.reps) cnt[w.exercise] = (cnt[w.exercise] || 0) + 1;
  });
  var exs = Object.keys(cnt).sort(function (a, b) {
    return cnt[b] - cnt[a];
  });
  if (!ormSel || exs.indexOf(ormSel) < 0) ormSel = exs[0] || null;
  $('#ormEx').innerHTML = exs.length
    ? exs
        .map(function (e) {
          return '<option' + (e === ormSel ? ' selected' : '') + '>' + esc(e) + '</option>';
        })
        .join('')
    : '<option>无</option>';
  var by = {};
  S.workouts.forEach(function (w) {
    if (w.exercise !== ormSel) return;
    var e = epley(w);
    if (e && (!by[w.date] || e > by[w.date])) by[w.date] = e;
  });
  var op = Object.keys(by)
      .map(function (d) {
        return { d: d, y: r1(by[d]) };
      })
      .filter(function (p) {
        return p.d >= from && p.d <= sel;
      }),
    best = Object.keys(by).reduce(function (m, d) {
      return Math.max(m, by[d]);
    }, 0);
  CH.line($('#chOrm'), {
    h: 160,
    from: from,
    to: sel,
    series: [{ name: '估算1RM', color: 'var(--k)', pts: op, unit: ' kg', area: true }],
    refs: [{ y: best ? r1(best) : null, name: '最佳', color: 'var(--mut)' }],
    emptyMsg: '暂无可估算的动作',
    emptyHint: '记录带重量的组后，按 重量×(1+次数/30) 估算'
  });
  // 热力日历
  var n = rng('train'),
    weeks = n ? Math.min(52, Math.max(13, Math.ceil(n / 7))) : 52,
    val = {},
    tip = {},
    from2 = addDays(sel, -weeks * 7);
  daysBetween(from2, sel).forEach(function (d) {
    var l = S.workouts.filter(function (w) {
        return w.date === d;
      }),
      sets = l.reduce(function (s, w) {
        return s + (w.sets || 0);
      }, 0),
      cm = S.cardio
        .filter(function (c) {
          return c.date === d;
        })
        .reduce(function (s, c) {
          return s + (c.min || 0);
        }, 0),
      sm = S.swims
        .filter(function (c) {
          return c.date === d;
        })
        .reduce(function (s, c) {
          return s + (c.dist || 0);
        }, 0);
    var sc = sets + cm / 10 + sm / 250;
    if (!sc) return;
    val[d] = sc < 6 ? 1 : sc < 12 ? 2 : sc < 20 ? 3 : 4;
    tip[d] = [
      sets ? '力量 ' + sets + ' 组 · ' + Math.round(dayVol(d)) + ' kg' : '',
      cm ? '爬楼 ' + cm + ' 分' : '',
      sm ? '游泳 ' + sm + ' m' : ''
    ]
      .filter(Boolean)
      .join('\n');
  });
  CH.heat($('#chHeat'), { to: sel, weeks: weeks, val: val, tip: tip });
}
$('#ormEx').addEventListener('change', function () {
  ormSel = this.value;
  render();
});

function chPerf() {
  var from = since(
    'perf',
    pbEntries()
      .map(function (x) {
        return x.date;
      })
      .concat(
        S.run800.map(function (x) {
          return x.date;
        })
      )
  );
  var pe = pbEntries(),
    best = pe.reduce(function (b, x) {
      return b == null || x.sec < b ? x.sec : b;
    }, null);
  CH.line($('#chPb'), {
    h: 160,
    series: [
      {
        name: '100m 蛙泳',
        color: 'var(--c)',
        pts: pe
          .filter(function (x) {
            return x.date >= from;
          })
          .map(function (x) {
            return { d: x.date, y: x.sec };
          }),
        fmt: fmtT
      }
    ],
    refs: [{ y: best, name: 'PB', color: 'var(--mut)' }],
    emptyMsg: '暂无成绩',
    emptyHint: '记录计时测试或比赛成绩'
  });
  var rn = S.run800,
    rb = rn.reduce(function (b, x) {
      return b == null || x.sec < b ? x.sec : b;
    }, null);
  CH.line($('#chRun'), {
    h: 160,
    series: [
      {
        name: '800m',
        color: 'var(--acc2)',
        pts: rn
          .filter(function (x) {
            return x.date >= from;
          })
          .map(function (x) {
            return { d: x.date, y: x.sec };
          }),
        fmt: fmtT
      }
    ],
    refs: [
      { y: S.run800Hist, name: '历史最佳', color: 'var(--mut)' },
      { y: rb !== S.run800Hist ? rb : null, name: '当前最佳', color: 'var(--k)' }
    ],
    emptyMsg: '暂无成绩',
    emptyHint: '记录 800m 计时后显示与历史最佳的差距'
  });
}

/* 其他测试成绩（纵跳等，可自定义项目） */
var ptEv = null;
function ptFmt(ev, v) {
  return ev && ev.unit === 's' && v >= 60 ? fmtT(v) : r1(v) + (ev && ev.unit ? ' ' + ev.unit : '');
}
function rPerfTests() {
  var evs = S.perfEvents;
  if (
    !ptEv ||
    !evs.some(function (e) {
      return e.id === ptEv;
    })
  )
    ptEv = evs[0] ? evs[0].id : null;
  var ev = evs.find(function (e) {
    return e.id === ptEv;
  });
  $('#ptSeg').innerHTML = evs
    .map(function (e) {
      return (
        '<button data-ptev="' + e.id + '" class="' + (e.id === ptEv ? 'on' : '') + '">' + esc(e.name) + '</button>'
      );
    })
    .join('');
  $('#ptEv').innerHTML = evs
    .map(function (e) {
      return (
        '<option value="' +
        e.id +
        '"' +
        (e.id === ptEv ? ' selected' : '') +
        '>' +
        esc(e.name) +
        '（' +
        esc(e.unit || '') +
        (e.better === 'lower' ? '，越低越好' : '，越高越好') +
        '）</option>'
      );
    })
    .join('');
  if (!$('#ptD').value) $('#ptD').value = sel;
  var log = S.perfLog
      .filter(function (x) {
        return x.ev === ptEv;
      })
      .sort(function (a, b) {
        return a.date < b.date ? -1 : 1;
      }),
    lower = ev && ev.better === 'lower';
  var best = log.reduce(function (b, x) {
      return b == null || (lower ? x.value < b : x.value > b) ? x.value : b;
    }, null),
    from = since(
      'perf',
      log.map(function (x) {
        return x.date;
      })
    );
  $('#ptBox').innerHTML = ev
    ? '<div class="mut">' +
      (best != null ? '当前最佳 <b>' + ptFmt(ev, best) + '</b>' : '暂无成绩') +
      (ev.hist != null
        ? ' · 历史最佳 ' + ptFmt(ev, ev.hist) + (best != null ? '（差 ' + r1(Math.abs(best - ev.hist)) + '）' : '')
        : '') +
      '</div>'
    : '';
  CH.line($('#chTest'), {
    h: 150,
    series: [
      {
        name: ev ? ev.name : '',
        color: 'var(--acc)',
        pts: log
          .filter(function (x) {
            return x.date >= from;
          })
          .map(function (x) {
            return { d: x.date, y: x.value };
          }),
        fmt: function (v) {
          return ptFmt(ev, v);
        }
      }
    ],
    refs: [
      { y: best, name: '最佳', color: 'var(--k)' },
      { y: ev ? ev.hist : null, name: '历史最佳', color: 'var(--mut)' }
    ],
    emptyMsg: '暂无成绩',
    emptyHint: '选择项目并记录第一次测试'
  });
  $('#ptList').innerHTML = log.length
    ? '<ul class="list">' +
      log
        .slice()
        .reverse()
        .slice(0, 10)
        .map(function (x) {
          return (
            '<li><div>' +
            esc(x.date) +
            ' · <b>' +
            ptFmt(ev, x.value) +
            '</b>' +
            (x.value === best ? ' ' + IC('medal') : '') +
            (x.note ? '<div class="mut">' + esc(x.note) + '</div>' : '') +
            '</div><button class="del" aria-label="删除" data-delpt="' +
            x.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    : '';
}
$('#ptAdd').onclick = function () {
  var raw = $('#ptV').value.trim(),
    v = raw.indexOf(':') >= 0 ? parseT(raw) : num(raw),
    d = $('#ptD').value,
    ev = $('#ptEv').value;
  if (v == null || !d || !ev) {
    toast('请填写项目、成绩和日期');
    return;
  }
  S.perfLog.push({ id: uid(), date: d, ev: ev, value: v, note: $('#ptN').value.trim() });
  ptEv = ev;
  save();
  $('#ptV').value = '';
  $('#ptN').value = '';
  toast('已记录');
  render();
};
$('#peAdd').onclick = function () {
  var n = $('#peName').value.trim();
  if (!n) {
    toast('请填写项目名称');
    return;
  }
  var h = $('#peHist').value.trim(),
    hv = h ? (h.indexOf(':') >= 0 ? parseT(h) : num(h)) : null;
  var e = { id: uid(), name: n, unit: $('#peUnit').value.trim(), better: $('#peBetter').value, hist: hv };
  S.perfEvents.push(e);
  ptEv = e.id;
  save();
  ['#peName', '#peUnit', '#peHist'].forEach(function (s) {
    $(s).value = '';
  });
  toast('已添加项目');
  render();
};

function chSleep() {
  var g = S.goals,
    from = since(
      'sleep',
      S.sleep.map(function (x) {
        return x.date;
      })
    ),
    days = daysBetween(from, sel);
  CH.bars($('#chSleep'), {
    h: 170,
    cats: days.map(function (d) {
      var x = sleepOf(d);
      return {
        l: md(d),
        d: d,
        v: x ? r1(x.dur) : 0,
        color: x && x.dur >= g.sleepH ? 'var(--acc)' : 'var(--c)',
        tip:
          d + '\n' + (x ? '时长 ' + r1(x.dur) + ' h\n质量 ' + (x.q || '-') + '/5\n' + x.bed + ' → ' + x.wake : '无记录')
      };
    }),
    goal: g.sleepH,
    goalName: '目标',
    unit: ' h',
    overlay: {
      name: '质量',
      color: 'var(--acc2)',
      max: 5,
      step: 1,
      pts: days.map(function (d) {
        var x = sleepOf(d);
        return x && x.q ? x.q : null;
      })
    },
    legend: [
      { name: '达标', color: 'var(--acc)' },
      { name: '不足', color: 'var(--c)' },
      { name: '质量(右轴 1-5)', color: 'var(--acc2)' }
    ],
    emptyMsg: '暂无睡眠记录',
    emptyHint: '记录入睡与起床时间后显示'
  });
}

function chBody() {
  var from = since(
      'body',
      S.body.map(function (b) {
        return b.date;
      })
    ),
    inR = function (b) {
      return b.date >= from && b.date <= sel;
    },
    bs = S.body.filter(inR);
  var wp = sortPts(
      bs.map(function (b) {
        return { d: b.date, y: b.weight };
      })
    ),
    bf = sortPts(
      bs.map(function (b) {
        return { d: b.date, y: b.bf };
      })
    );
  CH.line($('#chBody'), {
    h: 190,
    series: [
      { name: '体重', color: 'var(--acc)', pts: wp, unit: ' kg' },
      { name: '7日均线', color: 'var(--acc2)', pts: movAvg(wp, 7), dash: true, unit: ' kg' },
      { name: '体脂(右轴)', color: 'var(--p)', pts: bf, axis: 'r', unit: ' %' }
    ],
    refs: [{ y: S.goals.weight, name: '目标', color: 'var(--mut)' }],
    legend: true,
    emptyMsg: '暂无体重/体脂记录',
    emptyHint: '建议每天晨起空腹称重'
  });
  var both = bs.filter(function (b) {
    return b.weight != null && b.bf != null;
  });
  CH.stack($('#chComp'), {
    h: 160,
    unit: ' kg',
    series: [
      {
        name: '瘦体重',
        color: 'var(--c)',
        pts: both.map(function (b) {
          return { d: b.date, y: r1(b.weight * (1 - b.bf / 100)) };
        })
      },
      {
        name: '脂肪量',
        color: 'var(--f)',
        pts: both.map(function (b) {
          return { d: b.date, y: r1((b.weight * b.bf) / 100) };
        })
      }
    ],
    emptyMsg: '需要同日的体重与体脂',
    emptyHint: '瘦体重 = 体重 × (1 − 体脂%)'
  });
  CH.line($('#chWaist'), {
    h: 140,
    series: [
      {
        name: '腰围',
        color: 'var(--k)',
        pts: sortPts(
          bs.map(function (b) {
            return { d: b.date, y: b.waist };
          })
        ),
        unit: ' cm',
        area: true
      }
    ],
    emptyMsg: '暂无腰围记录',
    emptyHint: '每周固定时间测量一次即可'
  });
}

function chRecovery() {
  var dates = S.recov
      .map(function (x) {
        return x.date;
      })
      .concat(
        S.sleep.map(function (x) {
          return x.date;
        })
      ),
    from = since('rec', dates),
    days = daysBetween(from, sel);
  var rd = readiness(sel);
  $('#readyNow').innerHTML = rd
    ? '<div class="score"><span class="big" style="color:' +
      (rd.score >= 70 ? 'var(--ok)' : rd.score >= 50 ? 'var(--warn)' : 'var(--bad)') +
      '">' +
      rd.score +
      '</span><div><b>' +
      (sel === today() ? '今日' : sel) +
      '准备度</b><div class="mut">' +
      (rd.score >= 70 ? '状态良好，可按计划训练' : rd.score >= 50 ? '一般，可适当降低强度' : '偏低，建议减量或休息') +
      ' · 依据：' +
      rd.parts
        .map(function (p) {
          return p.n;
        })
        .join('、') +
      '</div></div></div>'
    : '<div class="mut" style="margin-bottom:6px">准备度需要当天至少 2 项数据（睡眠、晨起心率、HRV、主观指标）。</div>';
  CH.line($('#chReady'), {
    h: 150,
    series: [
      {
        name: '准备度',
        color: 'var(--acc)',
        pts: days.map(function (d) {
          var x = readiness(d);
          return { d: d, y: x ? x.score : null };
        }),
        area: true
      }
    ],
    yl: { min: 0, max: 100 },
    refs: [{ y: 70, name: '良好', color: 'var(--mut)' }],
    emptyMsg: '暂无准备度数据',
    emptyHint: '连续记录睡眠与晨起指标后自动计算'
  });
  var rhrOf = function (x) {
    var rr = recovOf(x);
    if (rr && rr.rhr != null) return rr.rhr;
    var b = S.body.find(function (y) {
      return y.date === x;
    });
    return b ? b.rhr : null;
  };
  CH.line($('#chHrv'), {
    h: 170,
    series: [
      {
        name: '静息心率',
        color: 'var(--bad)',
        pts: days.map(function (d) {
          return { d: d, y: rhrOf(d) };
        }),
        unit: ' bpm'
      },
      {
        name: 'HRV(右轴)',
        color: 'var(--acc)',
        pts: days.map(function (d) {
          var x = recovOf(d);
          return { d: d, y: x ? x.hrv : null };
        }),
        axis: 'r',
        unit: ' ms'
      }
    ],
    legend: true,
    emptyMsg: '暂无心率/HRV记录',
    emptyHint: '每天晨起同一时间、同一设备测量'
  });
  CH.line($('#chRv'), {
    h: 140,
    series: [
      {
        name: RVM[rvMetric][0],
        color: 'var(--k)',
        pts: days.map(function (d) {
          var x = recovOf(d);
          return { d: d, y: x ? x[rvMetric] : null };
        }),
        unit: RVM[rvMetric][1] ? ' ' + RVM[rvMetric][1] : ''
      }
    ],
    yl: ['rhr', 'hrv'].indexOf(rvMetric) < 0 ? { min: 1, max: 5 } : null,
    emptyMsg: '暂无该指标记录'
  });
}

function chPain() {
  var from = since(
      'pain',
      S.wristLog.map(function (x) {
        return x.date;
      })
    ),
    flags = {};
  S.workouts.forEach(function (x) {
    if (x.wrist) flags[x.date] = 1;
  });
  var pts = S.wristLog
    .filter(function (x) {
      return x.date >= from && x.date <= sel;
    })
    .map(function (x) {
      return { d: x.date, y: x.pain };
    });
  var fl = Object.keys(flags)
    .filter(function (d) {
      return d >= from && d <= sel;
    })
    .map(function (d) {
      var p = wpOf(d);
      return { d: d, y: p ? p.pain : 0 };
    });
  CH.line($('#chWp'), {
    h: 160,
    series: [
      { name: '疼痛', color: 'var(--acc2)', pts: pts, unit: '/10', area: true },
      { name: flagLabel(), color: 'var(--bad)', pts: fl, noline: true, unit: '/10' }
    ],
    yl: { min: 0, max: 10 },
    refs: [{ y: 3, name: '调整线', color: 'var(--mut)' }],
    emptyMsg: '暂无疼痛记录',
    emptyHint: '每天记录 0-10 分（0 分也请记录）'
  });
  var l7 = S.wristLog.filter(function (x) {
    return x.date <= sel && x.date > addDays(sel, -7);
  });
  $('#wpAvg').textContent = l7.length
    ? '近7天均 ' +
      r1(
        avg(
          l7.map(function (x) {
            return x.pain;
          })
        )
      ) +
      '/10'
    : '';
}
