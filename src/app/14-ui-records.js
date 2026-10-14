// SPDX-License-Identifier: MIT
/* 14-ui-records.js — 补剂、睡眠、身体指标、激素与恢复、伤病 */
function rSupp() {
  var dn = suppDone(sel);
  $('#sList').innerHTML = S.supps.length
    ? S.supps
        .map(function (s) {
          var v = dn[s.id];
          return (
            '<li><label class="chk" style="font-size:15px;color:var(--fg)"><input type="checkbox" data-sup="' +
            s.id +
            '"' +
            (v ? ' checked' : '') +
            '><span><b>' +
            esc(s.name) +
            '</b> ' +
            (s.dose ? '<span class="tag">' + esc(s.dose) + '</span>' : '<span class="tag">剂量未填</span>') +
            '<div class="mut">' +
            (s.time ? '计划：' + esc(s.time) : '') +
            (v && v.at ? ' · 已服 ' + esc(v.at) : '') +
            '</div></span></label><button class="ghost sm" data-edsup="' +
            s.id +
            '">编辑</button><button class="del" aria-label="删除" data-delsup="' +
            s.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('')
    : '<li class="mut">清单为空</li>';
  var n = S.supps.filter(function (x) {
    return dn[x.id];
  }).length;
  $('#sRate').textContent = n + '/' + S.supps.length;
  var h = '';
  for (var i = 6; i >= 0; i--) {
    var d = addDays(sel, -i),
      l = suppDone(d),
      c = S.supps.filter(function (x) {
        return l[x.id];
      }).length,
      pc = S.supps.length ? (c / S.supps.length) * 100 : 0;
    h +=
      '<div class="hrow" style="gap:8px;margin-bottom:4px"><span class="mut" style="width:44px">' +
      d.slice(5) +
      '</span><div class="bar" style="flex:1"><i style="width:' +
      pc +
      '%;background:var(--ok)"></i></div><span class="mut" style="width:36px;text-align:right">' +
      c +
      '/' +
      S.supps.length +
      '</span></div>';
  }
  $('#s7').innerHTML = h;
}
var editSup = null;
$('#sAdd').onclick = function () {
  var n = $('#sName').value.trim();
  if (!n) {
    toast('请填写名称');
    return;
  }
  if (editSup) {
    var s = S.supps.find(function (x) {
      return x.id === editSup;
    });
    if (s) {
      s.name = n;
      s.dose = $('#sDose').value.trim();
      s.time = $('#sTime').value.trim();
    }
    editSup = null;
    $('#sAdd').textContent = '添加';
  } else S.supps.push({ id: uid(), name: n, dose: $('#sDose').value.trim(), time: $('#sTime').value.trim() });
  if (!save(true)) return;
  ['#sName', '#sDose', '#sTime'].forEach(function (s) {
    $(s).value = '';
  });
  toast('已保存');
  render();
};

var slQ = null;
function rSleep() {
  var s = sleepOf(sel),
    g = S.goals,
    ls = s || lastSleepBefore(sel);
  $('#slBed').value = ls ? ls.bed : '';
  $('#slWake').value = ls ? ls.wake : '';
  $('#slNote').value = s ? s.note || '' : '';
  slQ = ls ? ls.q : null;
  $('#slReuse').style.display = !s && ls ? '' : 'none';
  qSeg();
  slDurTxt();
  chSleep();
  var l7 = [];
  for (var j = 0; j < 7; j++) {
    var y = sleepOf(addDays(sel, -j));
    if (y) l7.push(y);
  }
  $('#slAvg').textContent = l7.length
    ? '近7天均 ' +
      r1(
        avg(
          l7.map(function (x) {
            return x.dur;
          })
        )
      ) +
      ' h · 质量 ' +
      r1(
        avg(
          l7.map(function (x) {
            return x.q;
          })
        )
      ) +
      '/5 · 达标 ' +
      l7.filter(function (x) {
        return x.dur >= g.sleepH;
      }).length +
      '/' +
      l7.length
    : '';
  var list = S.sleep
    .slice()
    .sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    })
    .slice(0, 14);
  $('#slList').innerHTML = list.length
    ? '<ul class="list">' +
      list
        .map(function (x) {
          return (
            '<li><div>' +
            x.date.slice(5) +
            ' · <b>' +
            r1(x.dur) +
            'h</b> <span class="mut">' +
            esc(x.bed) +
            '→' +
            esc(x.wake) +
            ' · 质量' +
            (x.q || '-') +
            (x.note ? ' · ' + esc(x.note) : '') +
            '</span></div><button class="del" aria-label="删除" data-delsl="' +
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
function qSeg() {
  var h = '';
  for (var i = 1; i <= 5; i++)
    h += '<button data-q="' + i + '" class="' + (slQ === i ? 'on' : '') + '">' + i + '</button>';
  $('#slQ').innerHTML = h;
}
function slDurTxt() {
  var d = sleepDur($('#slBed').value, $('#slWake').value);
  $('#slDur').textContent = d ? '时长 ' + r1(d) + ' h' + (d < S.goals.sleepH ? '（低于目标）' : '（达标）') : '';
}
$('#slBed').addEventListener('input', slDurTxt);
$('#slWake').addEventListener('input', slDurTxt);
$('#slQ').addEventListener('click', function (e) {
  var b = e.target.closest('[data-q]');
  if (b) {
    slQ = +b.getAttribute('data-q');
    qSeg();
  }
});
$('#slSave').onclick = function () {
  var b = $('#slBed').value,
    w = $('#slWake').value,
    d = sleepDur(b, w);
  if (!d) {
    toast('请填写入睡与起床时间');
    return;
  }
  S.sleep = S.sleep.filter(function (x) {
    return x.date !== sel;
  });
  S.sleep.push({ id: uid(), date: sel, bed: b, wake: w, dur: d, q: slQ, note: $('#slNote').value.trim() });
  if (!save(true)) return;
  toast('已保存');
  render();
};

var bMetric = 'weight',
  BM = { weight: ['体重', 'kg'], bf: ['体脂', '%'], waist: ['腰围', 'cm'], rhr: ['静息心率', 'bpm'] };
function rBody() {
  var b = S.body.find(function (x) {
    return x.date === sel;
  });
  $('#bW').value = b && b.weight != null ? b.weight : '';
  $('#bBf').value = b && b.bf != null ? b.bf : '';
  $('#bWa').value = b && b.waist != null ? b.waist : '';
  $('#bHr').value = b && b.rhr != null ? b.rhr : '';
  var pts = S.body
    .filter(function (x) {
      return x[bMetric] != null;
    })
    .map(function (x) {
      return { d: x.date, y: x[bMetric] };
    })
    .sort(function (a, b) {
      return a.d < b.d ? -1 : 1;
    });
  var t = '';
  if (pts.length) {
    var l = pts[pts.length - 1];
    t = '最新 ' + l.y + ' ' + BM[bMetric][1];
    if (pts.length > 1) t += ' · 变化 ' + (l.y - pts[0].y >= 0 ? '+' : '') + r1(l.y - pts[0].y);
    if (bMetric === 'weight') t += bmiTxt(l.y);
    var lw = S.body
      .filter(function (x) {
        return x.weight != null && x.bf != null;
      })
      .sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      })[0];
    if (lw) t += ' · 估算瘦体重 ' + r1(lw.weight * (1 - lw.bf / 100)) + ' kg';
  }
  $('#bTxt').textContent = t;
  chBody();
  var list = S.body
    .slice()
    .sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    })
    .slice(0, 30);
  $('#bList').innerHTML = list.length
    ? '<table><tr><th>日期</th><th>体重</th><th>体脂</th><th>腰围</th><th>心率</th><th><span class="sr">操作</span></th></tr>' +
      list
        .map(function (x) {
          var f = function (v) {
            return v == null ? '-' : v;
          };
          return (
            '<tr><td>' +
            x.date.slice(5) +
            '</td><td>' +
            f(x.weight) +
            '</td><td>' +
            f(x.bf) +
            '</td><td>' +
            f(x.waist) +
            '</td><td>' +
            f(x.rhr) +
            '</td><td><button class="del" aria-label="删除" data-delb="' +
            x.id +
            '">' +
            IC('x') +
            '</button></td></tr>'
          );
        })
        .join('') +
      '</table>'
    : '<div class="mut">暂无记录</div>';
}
$('#bSave').onclick = function () {
  /** @type {BodyRec} */
  var o = {
    weight: num($('#bW').value),
    bf: num($('#bBf').value),
    waist: num($('#bWa').value),
    rhr: num($('#bHr').value)
  };
  if (o.weight == null && o.bf == null && o.waist == null && o.rhr == null) {
    toast('请至少填写一项');
    return;
  }
  S.body = S.body.filter(function (x) {
    return x.date !== sel;
  });
  o.id = uid();
  o.date = sel;
  S.body.push(o);
  if (!save(true)) return;
  toast('已保存');
  render();
};

/* 激素/恢复 */
var RV_SCALES = [
  ['stress', '压力', '1低-5高'],
  ['energy', '精力', '1差-5好'],
  ['soreness', '酸痛', '1无-5重'],
  ['mood', '情绪', '1差-5好'],
  ['appetite', '食欲', '1差-5好']
];
var rvTmp = {},
  rvMetric = 'energy',
  lbMetric = null;
var RVM = {
  rhr: ['静息心率', 'bpm'],
  hrv: ['HRV', 'ms'],
  stress: ['压力', ''],
  energy: ['精力', ''],
  soreness: ['酸痛', ''],
  mood: ['情绪', ''],
  appetite: ['食欲', '']
};
function rHormone() {
  $('#otAlert').innerHTML =
    otHtml(sel) ||
    '<div class="alert ok">' +
      IC('ok') +
      ' 近期未触发恢复预警（数据越完整越准确：建议每天记录晨起心率、HRV、睡眠与主观指标）。</div>';
  var r = recovOf(sel) || {};
  $('#rvHr').value = r.rhr != null ? r.rhr : '';
  $('#rvHrv').value = r.hrv != null ? r.hrv : '';
  rvTmp = {};
  RV_SCALES.forEach(function (s) {
    rvTmp[s[0]] = r[s[0]] || null;
  });
  rvScales();
  $('#rvSeg').innerHTML = Object.keys(RVM)
    .filter(function (k) {
      return k !== 'rhr' && k !== 'hrv';
    })
    .map(function (k) {
      return '<button data-rvm="' + k + '" class="' + (k === rvMetric ? 'on' : '') + '">' + RVM[k][0] + '</button>';
    })
    .join('');
  chRecovery();
  $('#labNames').innerHTML = LAB_PRESETS.map(function (p) {
    return '<option value="' + esc(p[0]) + '">';
  }).join('');
  $('#labTpl').innerHTML =
    '<span class="mut">常用指标（单位为常见单位，请按化验单修改）：</span>' +
    LAB_PRESETS.map(function (p, i) {
      return '<button class="chip" data-lab="' + i + '">' + esc(p[0]) + '</button>';
    }).join('');
  var markers = {};
  S.labs.forEach(function (l) {
    markers[l.name] = 1;
  });
  var mk = Object.keys(markers);
  if (!lbMetric || !markers[lbMetric]) lbMetric = mk[0] || null;
  $('#lbSeg').innerHTML = mk
    .map(function (k) {
      return '<button data-lbm="' + esc(k) + '" class="' + (k === lbMetric ? 'on' : '') + '">' + esc(k) + '</button>';
    })
    .join('');
  var arr = S.labs
    .filter(function (l) {
      return l.name === lbMetric;
    })
    .sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    });
  var last = arr[arr.length - 1];
  $('#lbTxt').textContent = last
    ? '单位 ' +
      (last.unit || '-') +
      (last.lo != null || last.hi != null
        ? ' · 参考 ' + (last.lo != null ? last.lo : '') + '~' + (last.hi != null ? last.hi : '') + '（绿色带）'
        : ' · 未填参考范围')
    : '暂无化验记录';
  CH.line($('#chLab'), {
    h: 170,
    series: [
      {
        name: lbMetric || '',
        color: 'var(--p)',
        pts: arr.map(function (l) {
          return { d: l.date, y: l.value };
        }),
        unit: last && last.unit ? ' ' + last.unit : ''
      }
    ],
    band: last ? { lo: last.lo, hi: last.hi } : null,
    emptyMsg: '暂无化验记录',
    emptyHint: '录入化验单数值后显示趋势与参考范围'
  });
  var all = S.labs.slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : a.name < b.name ? -1 : 1;
  });
  $('#lbList').innerHTML = all.length
    ? '<table><tr><th>日期</th><th>指标</th><th>数值</th><th>参考</th><th><span class="sr">操作</span></th></tr>' +
      all
        .map(function (l) {
          var cls = '',
            fl = '';
          if (l.hi != null && l.value > l.hi) {
            cls = 'hi';
            fl = ' ↑';
          } else if (l.lo != null && l.value < l.lo) {
            cls = 'lo';
            fl = ' ↓';
          } else if (l.lo != null || l.hi != null) cls = 'nm';
          return (
            '<tr><td>' +
            esc(l.date) +
            '</td><td>' +
            esc(l.name) +
            (l.note ? '<div class="mut">' + esc(l.note) + '</div>' : '') +
            '</td><td class="' +
            cls +
            '">' +
            l.value +
            fl +
            ' <span class="mut">' +
            esc(l.unit || '') +
            '</span></td><td class="mut">' +
            (l.lo != null ? l.lo : '') +
            '~' +
            (l.hi != null ? l.hi : '') +
            '</td><td><button class="del" aria-label="删除" data-dellab="' +
            l.id +
            '">' +
            IC('x') +
            '</button></td></tr>'
          );
        })
        .join('') +
      '</table><div class="mut">↑/↓ 仅表示超出你填写的参考范围，解读请咨询医生。</div>'
    : '';
}
function rvScales() {
  $('#rvScales').innerHTML = RV_SCALES.map(function (s) {
    var h = '<label style="margin-top:6px">' + s[1] + '（' + s[2] + '）</label><div class="seg">';
    for (var i = 1; i <= 5; i++)
      h +=
        '<button data-rv="' +
        s[0] +
        '" data-v="' +
        i +
        '" class="' +
        (rvTmp[s[0]] === i ? 'on' : '') +
        '">' +
        i +
        '</button>';
    return h + '</div>';
  }).join('');
}
$('#rvScales').addEventListener('click', function (e) {
  var b = e.target.closest('[data-rv]');
  if (b) {
    var k = b.getAttribute('data-rv'),
      v = +b.getAttribute('data-v');
    rvTmp[k] = rvTmp[k] === v ? null : v;
    rvScales();
  }
});
$('#rvSeg').addEventListener('click', function (e) {
  var b = e.target.closest('[data-rvm]');
  if (b) {
    rvMetric = b.getAttribute('data-rvm');
    render();
  }
});
$('#lbSeg').addEventListener('click', function (e) {
  var b = e.target.closest('[data-lbm]');
  if (b) {
    lbMetric = b.getAttribute('data-lbm');
    render();
  }
});
$('#rvSave').onclick = function () {
  var o = { id: uid(), date: sel, rhr: num($('#rvHr').value), hrv: num($('#rvHrv').value) };
  RV_SCALES.forEach(function (s) {
    o[s[0]] = rvTmp[s[0]] || null;
  });
  S.recov = S.recov.filter(function (x) {
    return x.date !== sel;
  });
  S.recov.push(o);
  if (!save(true)) return;
  toast('已保存');
  render();
};
$('#lbAdd').onclick = function () {
  var n = $('#lbName').value.trim(),
    v = num($('#lbVal').value),
    d = $('#lbDate').value;
  if (!n || v == null || !d) {
    toast('请填写日期、指标和数值');
    return;
  }
  S.labs.push({
    id: uid(),
    date: d,
    name: n,
    value: v,
    unit: $('#lbUnit').value.trim(),
    lo: num($('#lbLo').value),
    hi: num($('#lbHi').value),
    note: $('#lbNote').value.trim()
  });
  if (!save(true)) return;
  lbMetric = n;
  resetRecordDate('lbDate');
  $('#lbVal').value = '';
  $('#lbNote').value = '';
  toast('已添加');
  render();
};
$('#lbName').addEventListener('change', function () {
  var n = this.value.trim(),
    prev = S.labs
      .filter(function (l) {
        return l.name === n;
      })
      .sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      })[0];
  if (prev) {
    $('#lbUnit').value = prev.unit || '';
    $('#lbLo').value = prev.lo != null ? prev.lo : '';
    $('#lbHi').value = prev.hi != null ? prev.hi : '';
  } else {
    var p = LAB_PRESETS.find(function (x) {
      return x[0] === n;
    });
    if (p) $('#lbUnit').value = p[1];
  }
});

/* 伤病与限制 */
function wpOf(d) {
  return S.wristLog.find(function (x) {
    return x.date === d;
  });
}
function restrMatch(ex) {
  ex = (ex || '').replace(/\s/g, '');
  if (!ex) return null;
  return S.restricted.find(function (r) {
    var k = r.name.replace(/[（(].*$/, '').replace(/\s/g, '');
    return k && (ex.indexOf(k) >= 0 || (k.indexOf(ex) >= 0 && ex.length >= 2));
  });
}
function restrHint() {
  var m = restrMatch($('#wEx').value);
  $('#wRestr').innerHTML = m
    ? '<div class="alert warn" style="margin:8px 0 0">' +
      IC('bandage') +
      ' 「' +
      esc(m.name) +
      '」在受限动作清单中。替代：' +
      esc(m.alt || '—') +
      '</div>'
    : '';
}
function wristAlert(d) {
  var t = wpOf(d),
    l = [];
  for (var i = 0; i < 3; i++) {
    var x = wpOf(addDays(d, -i));
    if (x) l.push(x.pain);
  }
  var a = avg(l),
    b = [];
  for (var j = 3; j < 14; j++) {
    var y = wpOf(addDays(d, -j));
    if (y) b.push(y.pain);
  }
  var ba = avg(b);
  if (t && t.pain >= 5)
    return ['bad', '伤处疼痛 ' + t.pain + '/10：建议停止所有诱发动作，仅做无痛活动；持续或加重请就医。'];
  if (a != null && ba != null && a - ba >= 2)
    return ['warn', '近3天伤处疼痛均值较前期上升 ' + r1(a - ba) + ' 分，建议下调上肢负荷并与私教/康复师沟通。'];
  if (t && t.pain >= 3) return ['warn', '伤处疼痛 ' + t.pain + '/10：今日避开受限动作，优先替代方案。'];
  return null;
}
var wpTmp = { pain: null, trig: [] };
function rInjury() {
  var wa = wristAlert(sel);
  $('#injAlert').innerHTML = wa
    ? '<div class="alert ' + wa[0] + '">' + IC('bandage') + ' ' + esc(wa[1]) + '</div>'
    : '';
  document.querySelectorAll('.flagLbl').forEach(function (e) {
    e.textContent = flagLabel();
  });
  $('#injList').innerHTML = S.injuries.length
    ? ''
    : '<div class="mut">暂无伤病记录（可在下方添加，或在「设置」中加载示例配置）。</div>';
  if (S.injuries.length)
    $('#injList').innerHTML =
      '<ul class="list">' +
      S.injuries
        .map(function (x) {
          return (
            '<li><div><b>' +
            esc(x.name) +
            '</b> <span class="tag">' +
            esc(x.status || '') +
            '</span><div class="mut">' +
            esc(x.desc || '') +
            '</div></div><div class="row" style="gap:2px"><button class="ghost sm" data-injst="' +
            x.id +
            '">' +
            (x.status === '已恢复' ? '标记康复中' : '标记已恢复') +
            '</button><button class="del" aria-label="删除" data-delinj="' +
            x.id +
            '">' +
            IC('x') +
            '</button></div></li>'
          );
        })
        .join('') +
      '</ul>';
  var w = wpOf(sel);
  wpTmp = { pain: w ? w.pain : null, trig: w ? (w.trig || []).slice() : [] };
  $('#wpNote').value = w ? w.note || '' : '';
  $('#wpDate').textContent = sel === today() ? '' : sel;
  wpSegs();
  chPain();
  var dn = S.rehabLog[sel] || {};
  $('#rhList').innerHTML =
    S.rehab
      .map(function (r) {
        return (
          '<li><label class="chk" style="font-size:15px;color:var(--fg)"><input type="checkbox" data-rh="' +
          r.id +
          '"' +
          (dn[r.id] ? ' checked' : '') +
          '><span>' +
          esc(r.name) +
          '<div class="mut">' +
          esc(r.dose || '剂量遵康复师安排') +
          '</div></span></label><button class="del" aria-label="删除" data-delrh="' +
          r.id +
          '">' +
          IC('x') +
          '</button></li>'
        );
      })
      .join('') || '<li class="mut">清单为空</li>';
  $('#rhRate').textContent =
    S.rehab.filter(function (r) {
      return dn[r.id];
    }).length +
    '/' +
    S.rehab.length;
  var h7 = '<div class="mut">近7天</div><div class="row" style="gap:4px">';
  for (var k = 6; k >= 0; k--) {
    var dd = addDays(sel, -k),
      lg = S.rehabLog[dd] || {},
      c = S.rehab.filter(function (r) {
        return lg[r.id];
      }).length,
      full = S.rehab.length && c === S.rehab.length;
    h7 +=
      '<span class="tag" style="' +
      (full ? 'background:var(--ok);color:#fff' : c ? 'border-color:var(--ok)' : '') +
      '">' +
      dd.slice(8) +
      '日 ' +
      c +
      '/' +
      S.rehab.length +
      '</span>';
  }
  $('#rh7').innerHTML = h7 + '</div>';
  $('#rsList').innerHTML = S.restricted
    .map(function (r) {
      return (
        '<li><div><b>' +
        esc(r.name) +
        '</b><div class="mut">→ ' +
        esc(r.alt || '') +
        '</div></div><button class="del" aria-label="删除" data-delrs="' +
        r.id +
        '">' +
        IC('x') +
        '</button></li>'
      );
    })
    .join('');
  var wf = S.workouts
    .filter(function (x) {
      return x.wrist;
    })
    .sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    })
    .slice(0, 15);
  $('#wfList').innerHTML = wf.length
    ? '<ul class="list">' +
      wf
        .map(function (x) {
          var p = wpOf(x.date);
          return (
            '<li><div>' +
            x.date.slice(5) +
            ' · <b>' +
            esc(x.exercise) +
            '</b> ' +
            x.sets +
            '×' +
            x.reps +
            '@' +
            x.weight +
            'kg<div class="mut">当日疼痛 ' +
            (p ? p.pain + '/10' : '未记录') +
            (x.note ? ' · ' + esc(x.note) : '') +
            '</div></div></li>'
          );
        })
        .join('') +
      '</ul>'
    : '<div class="mut">暂无</div>';
}
function wpSegs() {
  var h = '';
  for (var i = 0; i <= 10; i++)
    h += '<button data-wp="' + i + '" class="' + (wpTmp.pain === i ? 'on' : '') + '">' + i + '</button>';
  $('#wpSeg').innerHTML = h;
  $('#wpTrig').innerHTML = S.restricted
    .map(function (r) {
      return r.name;
    })
    .concat(['日常活动', '其他'])
    .map(function (n) {
      return (
        '<button data-wt="' +
        esc(n) +
        '" class="' +
        (wpTmp.trig.indexOf(n) >= 0 ? 'on' : '') +
        '">' +
        esc(n) +
        '</button>'
      );
    })
    .join('');
  var p = wpTmp.pain;
  $('#wpHint').textContent =
    p == null
      ? ''
      : p <= 2
        ? '轻微：可在无痛范围训练'
        : p <= 4
          ? '中度：避开诱发动作，用替代方案'
          : '较重：停止诱发动作，持续请就医';
}
$('#wpSeg').addEventListener('click', function (e) {
  var b = e.target.closest('[data-wp]');
  if (b) {
    wpTmp.pain = +b.getAttribute('data-wp');
    wpSegs();
  }
});
$('#wpTrig').addEventListener('click', function (e) {
  var b = e.target.closest('[data-wt]');
  if (b) {
    var n = b.getAttribute('data-wt'),
      i = wpTmp.trig.indexOf(n);
    if (i >= 0) wpTmp.trig.splice(i, 1);
    else wpTmp.trig.push(n);
    wpSegs();
  }
});
$('#wpSave').onclick = function () {
  if (wpTmp.pain == null) {
    toast('请选择疼痛评分');
    return;
  }
  S.wristLog = S.wristLog.filter(function (x) {
    return x.date !== sel;
  });
  S.wristLog.push({ date: sel, pain: wpTmp.pain, trig: wpTmp.trig.slice(), note: $('#wpNote').value.trim() });
  if (!save(true)) return;
  toast('已保存');
  render();
};
$('#rhAdd').onclick = function () {
  var n = $('#rhName').value.trim();
  if (!n) {
    toast('请填写名称');
    return;
  }
  S.rehab.push({ id: uid(), name: n, dose: $('#rhDose').value.trim() });
  if (!save(true)) return;
  $('#rhName').value = '';
  $('#rhDose').value = '';
  render();
};
$('#rsAdd').onclick = function () {
  var n = $('#rsName').value.trim();
  if (!n) {
    toast('请填写动作');
    return;
  }
  S.restricted.push({ id: uid(), name: n, alt: $('#rsAlt').value.trim() });
  if (!save(true)) return;
  $('#rsName').value = '';
  $('#rsAlt').value = '';
  render();
};
$('#injAdd').onclick = function () {
  var n = $('#injName').value.trim();
  if (!n) {
    toast('请填写名称');
    return;
  }
  S.injuries.push({ id: uid(), name: n, desc: $('#injDesc').value.trim(), status: '康复中' });
  if (!save(true)) return;
  $('#injName').value = '';
  $('#injDesc').value = '';
  render();
};
