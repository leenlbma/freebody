// SPDX-License-Identifier: MIT
/* 11-ui-today.js — 今天页与数据页 */
/* ---------- 今天（一屏：准备度 / 推荐训练 / 营养剩余 / 打卡） ---------- */
function activeInjury() {
  return S.injuries.some(function (x) {
    return x.status !== '已恢复';
  });
}
function rOverview() {
  var g = S.goals,
    t = dayTot(sel),
    rd = readiness(sel),
    ot = otSignals(sel),
    wk = recWeek(sel);
  $('#ovAlerts').innerHTML =
    !S.hideHello && !S.meals.length && !S.workouts.length && !S.body.length && !S.sleep.length
      ? '<div class="hello-bar">' +
        IC('hello') +
        '<span>欢迎使用 FreeBody。数据只存在本机，可在「我的」中导出备份。<button class="linkb" id="helloDemo">先看看演示数据</button></span><button class="ghost hello-x" id="helloX" aria-label="关闭欢迎提示">' +
        IC('x') +
        '</button></div>'
      : '';
  var lv = rd ? (rd.score >= 70 ? 'ok' : rd.score >= 50 ? 'warn' : 'bad') : '',
    sent = rd
      ? rd.score >= 70
        ? '状态不错，按计划练'
        : rd.score >= 50
          ? '状态一般，控制强度'
          : '恢复偏弱，以休息为主'
      : '记录睡眠后显示准备度';
  if (ot.length >= 2) {
    lv = 'bad';
    sent = '恢复不足信号 ' + ot.length + ' 项，建议减量';
  }
  var sub = [];
  if (wk && wk <= 6) sub.push('恢复期第' + wk + '周');
  if (ot.length) sub.push(ot[0]);
  else if (rd) sub.push('准备度');
  $('#ovReady').innerHTML =
    '<div class="ready"><div class="score ' +
    lv +
    '">' +
    (rd ? rd.score : '—') +
    '</div><div><b>' +
    esc(sent) +
    '</b><div class="mut">' +
    esc(sub.join(' · ')) +
    '</div></div>' +
    IC('right') +
    '</div>';
  var a = S.active,
    ws = S.workouts.filter(function (w) {
      return w.date === sel;
    }),
    rc = recommend(),
    th;
  if (a) {
    var tot = 0,
      dn = 0;
    a.items.forEach(function (x) {
      tot += x.sets.length;
      dn += x.sets.filter(function (s) {
        return s.done;
      }).length;
    });
    th =
      '<div class="mut">训练进行中</div><h2 class="rec-t">' +
      esc(a.name) +
      '</h2><div class="mut">已完成 ' +
      dn +
      ' / ' +
      tot +
      ' 组</div><button class="btn-big" data-ss="rec">' +
      IC('play') +
      '继续训练</button>';
  } else if (ws.length) {
    var n = ws.reduce(function (s, w) {
      return s + (w.sets || 1);
    }, 0);
    th =
      '<div class="mut">今日训练</div><h2 class="rec-t">已完成 ' +
      n +
      ' 组</h2><div class="mut">' +
      (dayVol(sel) > 0 ? '训练量 ' + Math.round(dayVol(sel)) + ' kg' : '自重训练') +
      '</div><button class="ghost btn-big" data-sub="train">查看</button>';
  } else
    th =
      '<div class="mut">今日推荐</div><h2 class="rec-t">' +
      esc(rc.title) +
      '</h2><div class="mut">' +
      esc(rc.why) +
      '</div><button class="btn-big' +
      (rc.rest ? ' ghost' : '') +
      '" data-ss="rec">' +
      IC('play') +
      (rc.rest ? '仍要训练' : '开始训练') +
      '</button>';
  var wi0 = weekInfo(sel),
    td = Math.max(1, S.goals.trainDays || 4),
    dots = '';
  for (var di = 0; di < Math.min(td, 7); di++) dots += '<i class="' + (di < wi0.days ? 'on' : '') + '"></i>';
  th +=
    '<div class="wk-prog" data-sub="tstats" role="button" tabindex="0" aria-label="本周 ' +
    wi0.days +
    ' / ' +
    td +
    ' 天，查看训练统计"><span class="mut">本周</span><span class="wk-dots" aria-hidden="true">' +
    dots +
    '</span><span class="mut">' +
    wi0.days +
    ' / ' +
    td +
    ' 天</span></div>';
  $('#ovTrain').innerHTML = th;
  var left = Math.round(g.kcal - t.k),
    pl = Math.max(0, Math.round(g.p - t.p)),
    nm = dayMeals(sel).length;
  $('#ovNut').innerHTML =
    '<div class="hrow"><span class="mut">营养剩余</span><span class="mut">' +
    (nm ? nm + ' 条记录' : '未记录') +
    IC('right') +
    '</span></div><div class="nut1"><div><b class="xl">' +
    left +
    '</b> <span class="mut">kcal</span></div><div><b class="xl">' +
    pl +
    '</b> <span class="mut">g 蛋白</span></div></div><div class="bar"><i style="width:' +
    Math.min(100, g.kcal ? (t.k / g.kcal) * 100 : 0) +
    '%;background:' +
    (left < 0 ? 'var(--bad)' : 'var(--k)') +
    '"></i></div>' +
    '<div class="nut-wide">' +
    kcalRing(t.k, g.kcal) +
    '<div class="mbars">' +
    /** @type {Array<[string, number, number, string]>} */ ([
      ['蛋白质', t.p, g.p, 'var(--p)'],
      ['碳水', t.c, g.c, 'var(--c)'],
      ['脂肪', t.f, g.f, 'var(--f)']
    ])
      .map(function (m) {
        var pc = m[2] ? Math.min((m[1] / m[2]) * 100, 100) : 0;
        return (
          '<div class="mbar"><div class="hrow"><span>' +
          m[0] +
          '</span><span class="mut">' +
          Math.round(m[1]) +
          ' / ' +
          m[2] +
          ' g</span></div><div class="bar"><i style="width:' +
          pc +
          '%;background:' +
          m[3] +
          '"></i></div></div>'
        );
      })
      .join('') +
    '</div></div>';
  var tile = function (done, ic, label, go, val, act) {
    return (
      '<div class="ck-t' +
      (done ? ' done' : '') +
      '"><div class="ck-h" data-go="' +
      go +
      '">' +
      IC(ic) +
      '<span>' +
      label +
      '</span></div><div class="ck-v">' +
      val +
      '</div>' +
      (act || '') +
      '</div>'
    );
  };
  var dsp = suppDone(sel),
    ns = S.supps.filter(function (x) {
      return dsp[x.id];
    }).length,
    c = '';
  if (S.supps.length)
    c += tile(
      ns === S.supps.length,
      'check',
      '补剂',
      'supp',
      ns + ' / ' + S.supps.length,
      ns < S.supps.length
        ? '<button class="sm" id="ovSuppAll">全部打卡</button>'
        : '<span class="ck-ok">' + IC('ok') + '</span>'
    );
  var s = sleepOf(sel),
    ls = lastSleepBefore(sel);
  c += tile(
    !!s,
    'moon',
    '睡眠',
    'sleep',
    s ? r1(s.dur) + ' h' : '未记录',
    s
      ? '<span class="ck-ok">' + IC('ok') + '</span>'
      : ls
        ? '<button class="sm" id="ovSlReuse">确认 ' + r1(ls.dur) + ' h</button>'
        : '<button class="ghost sm" data-go="sleep">记录</button>'
  );
  var b = S.body.find(function (x) {
    return x.date === sel && x.weight != null;
  });
  c += tile(
    !!b,
    'chart',
    '体重',
    'body',
    b ? b.weight + ' kg' : '未记录',
    '<input id="ovWt" type="number" inputmode="decimal" step="0.1" placeholder="' +
      (b ? '修改' : 'kg') +
      '" enterkeyhint="done">'
  );
  if (activeInjury()) {
    var wp = wpOf(sel);
    c +=
      '<div class="ck-t wide' +
      (wp ? ' done' : '') +
      '"><div class="ck-h" data-go="injury">' +
      IC('bandage') +
      '<span>伤处疼痛</span><b id="ovPainV" class="ck-pv">' +
      (wp ? wp.pain : '—') +
      '</b><span class="mut">/10</span></div><input type="range" id="ovPain" min="0" max="10" step="1" value="' +
      (wp ? wp.pain : 0) +
      '"></div>';
  }
  $('#ovChecks').innerHTML = c;
  rOvTrend();
}
/** 平板 / 桌面首页趋势：近 7 天热量与睡眠（手机端隐藏，不渲染） */
function rOvTrend() {
  var box = $('#ovTrend');
  if (!box) return;
  if (!(window.matchMedia && matchMedia('(min-width:600px)').matches)) {
    box.innerHTML = '';
    return;
  }
  var g = S.goals,
    d7 = [],
    i;
  for (i = 6; i >= 0; i--) d7.push(addDays(sel, -i));
  box.innerHTML =
    '<div class="hrow"><h2>近 7 天</h2><button class="ghost sm" data-sub="data">数据' +
    IC('right') +
    '</button></div><div class="tr2"><div><div class="mut">热量 kcal</div><div class="chart" id="chOvK"></div></div><div><div class="mut">睡眠 h</div><div class="chart" id="chOvS"></div></div></div>';
  CH.bars($('#chOvK'), {
    h: 110,
    cats: d7.map(function (d) {
      var k = Math.round(dayTot(d).k);
      return { l: md(d), d: d, v: k, color: 'var(--k)', tip: d + '\n' + k + ' kcal' };
    }),
    goal: g.kcal,
    goalName: '目标',
    unit: ' kcal',
    emptyMsg: '暂无饮食记录'
  });
  CH.bars($('#chOvS'), {
    h: 110,
    cats: d7.map(function (d) {
      var x = sleepOf(d);
      return {
        l: md(d),
        d: d,
        v: x ? r1(x.dur) : 0,
        color: x && x.dur >= g.sleepH ? 'var(--acc)' : 'var(--c)',
        tip: d + '\n' + (x ? r1(x.dur) + ' h' : '无记录')
      };
    }),
    goal: g.sleepH,
    goalName: '目标',
    unit: ' h',
    emptyMsg: '暂无睡眠记录'
  });
}
document.addEventListener('input', function (e) {
  if (e.target.id === 'ovPain') $('#ovPainV').textContent = e.target.value;
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'ovPain') {
    var v = +t.value,
      o = wpOf(sel) || { date: sel, trig: [], note: '' };
    S.wristLog = S.wristLog.filter(function (x) {
      return x.date !== sel;
    });
    o.pain = v;
    S.wristLog.push(o);
    save();
    toast('疼痛 ' + v + '/10 已记录');
    render();
  } else if (t.id === 'ovWt') {
    var w = num(t.value);
    if (w == null || w <= 0) return;
    var o2 = S.body.find(function (x) {
      return x.date === sel;
    });
    if (o2) o2.weight = w;
    else S.body.push({ id: uid(), date: sel, weight: w });
    save();
    toast('体重已记录');
    render();
  }
});

/* ---------- 数据（核心卡片，点开看细分） ---------- */
function rData() {
  var g = S.goals,
    h = '',
    d7 = [],
    d14 = [],
    i;
  for (i = 6; i >= 0; i--) d7.push(addDays(sel, -i));
  for (i = 13; i >= 0; i--) d14.push(addDays(sel, -i));
  var card = function (go, t, main, extra) {
    return (
      '<div class="card tap" data-go="' +
      go +
      '"><div class="hrow"><h2>' +
      t +
      '</h2>' +
      IC('right') +
      '</div><div class="dmain">' +
      main +
      '</div>' +
      (extra || '') +
      '</div>'
    );
  };
  var wp = S.body
      .filter(function (b) {
        return b.weight != null && b.date <= sel;
      })
      .sort(function (a, b) {
        return a.date < b.date ? -1 : 1;
      }),
    lw = wp[wp.length - 1],
    w30 = wp.filter(function (x) {
      return x.date >= addDays(sel, -29);
    }),
    dl = w30.length > 1 ? r1(lw.weight - w30[0].weight) : null;
  h += card(
    'body',
    '身体',
    lw
      ? '<b class="xl">' +
          lw.weight +
          '</b> kg' +
          bmiTxt(lw.weight) +
          (dl != null ? ' <span class="mut">· 30天 ' + (dl >= 0 ? '+' : '') + dl + '</span>' : '')
      : '<span class="mut">暂无体重</span>',
    '<div class="chart" id="chOvWt"></div>'
  );
  var lg = d7.filter(function (d) {
      return dayMeals(d).length;
    }),
    ak = avg(
      lg.map(function (d) {
        return dayTot(d).k;
      })
    ),
    pOk = lg.filter(function (d) {
      return dayTot(d).p >= g.p * 0.9;
    }).length;
  h += card(
    'nutri',
    '营养',
    lg.length
      ? '日均 <b class="xl">' +
          Math.round(ak) +
          '</b> / ' +
          g.kcal +
          ' kcal <span class="mut">· 蛋白达标 ' +
          pOk +
          '/' +
          lg.length +
          ' 天</span>'
      : '<span class="mut">近 7 天无记录</span>',
    '<div class="chart" id="chDNut"></div>'
  );
  var wi = weekInfo(sel),
    st = muscleState(),
    cn = {};
  Object.keys(st).forEach(function (k) {
    cn[st[k].status] = (cn[st[k].status] || 0) + 1;
  });
  h += card(
    'tstats',
    '训练',
    '本周 <b class="xl">' +
      wi.days +
      '</b> / ' +
      g.trainDays +
      ' 天' +
      (wi.vol > 0 ? ' <span class="mut">· ' + Math.round(wi.vol) + ' kg</span>' : ''),
    '<div class="chart" id="chDTr"></div><div class="mini" data-go="muscle">' +
      IC('body') +
      '<span>肌群 已恢复 ' +
      ((cn.recovered || 0) + (cn.stale || 0)) +
      ' · 恢复中 ' +
      ((cn.recovering || 0) + (cn.fatigued || 0)) +
      '</span>' +
      IC('right') +
      '</div>'
  );
  var rd = readiness(sel),
    sl = avg(
      d7.map(function (d) {
        var s = sleepOf(d);
        return s ? s.dur : null;
      })
    );
  h += card(
    'hormone',
    '恢复',
    '准备度 <b class="xl">' +
      (rd ? rd.score : '—') +
      '</b>' +
      (sl != null ? ' <span class="mut">· 睡眠均 ' + r1(sl) + ' h</span>' : ''),
    '<div class="chart" id="chDRd"></div>'
  );
  $('#dataBox').innerHTML = h;
  chTodayWeight();
  CH.bars($('#chDTr'), {
    h: 80,
    cats: d7.map(function (d) {
      var n = S.workouts
        .filter(function (w) {
          return w.date === d;
        })
        .reduce(function (a, w) {
          return a + (w.sets || 1);
        }, 0);
      return { l: md(d), d: d, v: n, has: n > 0, color: 'var(--acc)' };
    }),
    unit: ' 组',
    emptyMsg: '近 7 天没有力量训练',
    emptyHint: '在「训练」中开始今日推荐'
  });
  CH.bars($('#chDNut'), {
    h: 80,
    cats: d7.map(function (d) {
      return { l: md(d), d: d, v: Math.round(dayTot(d).k), color: 'var(--k)' };
    }),
    goal: g.kcal,
    unit: ' kcal',
    emptyMsg: '暂无饮食记录'
  });
  CH.line($('#chDRd'), {
    h: 80,
    series: [
      {
        name: '准备度',
        color: 'var(--acc)',
        pts: d14.map(function (d) {
          var x = readiness(d);
          return { d: d, y: x ? x.score : null };
        }),
        area: true
      }
    ],
    yl: { min: 0, max: 100 },
    emptyMsg: '暂无准备度',
    emptyHint: '记录睡眠与晨起指标后计算'
  });
  $('#dataMore').innerHTML = [
    ['sleep', '睡眠'],
    ['notes', '心得'],
    ['hormone', '恢复/化验'],
    ['muscle', '肌群'],
    ['injury', '伤病'],
    ['supp', '补剂'],
    ['perf', '运动表现'],
    ['tstats', '训练统计'],
    ['nutri', '营养分析']
  ]
    .map(function (x) {
      return '<button class="chip" data-go="' + x[0] + '">' + x[1] + '</button>';
    })
    .join('');
}
