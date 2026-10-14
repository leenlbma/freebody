// SPDX-License-Identifier: MIT
/* 13-ui-train.js — 训练：力量 / 有氧 / 表现表单 */
function rTrain() {
  rSession();
  if (cur === 'train' && !(S.active || showSummary || editPlan)) rMuscle();
  var g = S.goals,
    ra = recAdvice(recWeek(sel));
  $('#recBanner').innerHTML = ra ? '<div class="alert ' + ra[0] + '">' + IC('cycle') + ' ' + esc(ra[1]) + '</div>' : '';
  $('#rStart').value = S.recoveryStart || '';
  var wi = weekInfo(sel);
  $('#weekSum').innerHTML =
    '<div class="mut">' +
    wi.ws +
    ' ~ ' +
    wi.we +
    '</div><div class="grid2" style="margin-top:6px"><div>力量训练 <b>' +
    wi.days +
    '/' +
    g.trainDays +
    '</b> 天<div class="bar"><i style="width:' +
    Math.min((wi.days / g.trainDays) * 100, 100) +
    '%"></i></div></div><div>爬楼 <b>' +
    wi.stair +
    '/' +
    g.stairMin +
    '</b> 分（' +
    wi.stairDays +
    '天）<div class="bar"><i style="width:' +
    Math.min((wi.stair / g.stairMin) * 100, 100) +
    '%;background:var(--ok)"></i></div></div></div><div style="margin-top:6px">本周总训练量 <b>' +
    Math.round(wi.vol) +
    '</b> kg · 游泳 <b>' +
    wi.swimN +
    '</b> 次 / <b>' +
    wi.swimM +
    '</b> m</div>';
  var sw = S.swims.filter(function (c) {
    return c.date === sel;
  });
  $('#swList').innerHTML = sw.length
    ? '<ul class="list">' +
      sw
        .map(function (c) {
          return (
            '<li><div>' +
            esc(c.stroke) +
            ' ' +
            c.dist +
            'm · ' +
            fmtT(c.sec) +
            '<div class="mut">配速 ' +
            (c.sec && c.dist ? fmtT((c.sec / c.dist) * 100) + '/100m' : '-') +
            (c.swolf ? ' · SWOLF ' + c.swolf : '') +
            (c.note ? ' · ' + esc(c.note) : '') +
            '</div></div><button class="del" aria-label="删除" data-delsw="' +
            c.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    : '';
  $('#rnHist').value = S.run800Hist ? fmtT(S.run800Hist) : '';
  var rn = S.run800.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : 1;
    }),
    hb = S.run800Hist,
    rb = rn.reduce(function (b, x) {
      return !b || x.sec < b.sec ? x : b;
    }, null),
    gap = function (t) {
      if (!hb) return '';
      var d = r1(t - hb);
      return d <= 0
        ? '<span style="color:var(--ok)">已追平/超越历史最佳 ' + d + 's</span>'
        : '距历史最佳 +' + d + 's（' + r1((d / hb) * 100) + '%）';
    };
  $('#rnBox').innerHTML =
    (hb
      ? '<div class="mut">历史最佳 <b>' +
        fmtT(hb) +
        '</b>' +
        (S.profile.run800HistLabel ? '（' + esc(S.profile.run800HistLabel) + '）' : '') +
        '</div>'
      : '<div class="mut">未设置历史最佳（可选）</div>') +
    (rb
      ? '<div class="big">当前最佳 ' +
        fmtT(rb.sec) +
        '</div><div class="mut">' +
        esc(rb.date) +
        ' · ' +
        gap(rb.sec) +
        (rn.length > 1 ? ' · 最近一次 ' + fmtT(rn[rn.length - 1].sec) + '，' + gap(rn[rn.length - 1].sec) : '') +
        '</div>'
      : '<div class="mut">暂无当前成绩。</div>');
  $('#rnList').innerHTML = rn.length
    ? '<ul class="list">' +
      rn
        .slice()
        .reverse()
        .map(function (x) {
          return (
            '<li><div>' +
            esc(x.date) +
            ' · <b>' +
            fmtT(x.sec) +
            '</b>' +
            (rb && x.id === rb.id ? ' ' + IC('medal') : '') +
            ' <span class="tag">' +
            esc(x.type) +
            '</span><div class="mut">' +
            gap(x.sec) +
            (x.note ? ' · ' + esc(x.note) : '') +
            '</div></div><button class="del" aria-label="删除" data-delrn="' +
            x.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    : '';
  var pe = pbEntries(),
    best = pe.reduce(function (b, x) {
      return !b || x.sec < b.sec ? x : b;
    }, null);
  $('#pbBox').innerHTML = best
    ? '<div class="big" style="color:var(--ok)">PB ' +
      fmtT(best.sec) +
      '</div><div class="mut">' +
      esc(best.date) +
      ' · ' +
      esc(best.type) +
      (pe.length > 1
        ? ' · 最近一次 ' + fmtT(pe[pe.length - 1].sec) + '（距PB +' + r1(pe[pe.length - 1].sec - best.sec) + 's）'
        : '') +
      '</div>'
    : '<div class="mut">暂无成绩，录入第一次计时作为基线。</div>';
  $('#pbList').innerHTML = pe.length
    ? '<ul class="list">' +
      pe
        .slice()
        .reverse()
        .map(function (x) {
          return (
            '<li><div>' +
            esc(x.date) +
            ' · <b>' +
            fmtT(x.sec) +
            '</b>' +
            (best && x.id === best.id ? ' ' + IC('medal') : '') +
            ' <span class="tag">' +
            esc(x.type) +
            '</span>' +
            (x.note ? '<div class="mut">' + esc(x.note) + '</div>' : '') +
            '</div>' +
            (x.src === 'pb'
              ? '<button class="del" aria-label="删除" data-delpb="' + x.id + '">' + IC('x') + '</button>'
              : '') +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    : '';
  var names = {};
  S.workouts.forEach(function (w) {
    names[w.exercise] = 1;
  });
  EX_PRESETS.forEach(function (e) {
    names[e] = 1;
  });
  $('#exList').innerHTML = Object.keys(names)
    .map(function (n) {
      return '<option value="' + esc(n) + '">';
    })
    .join('');
  $('#exTpl').innerHTML =
    '<span class="mut">示例动作：</span>' +
    EX_PRESETS.slice(0, 8)
      .map(function (e) {
        return '<button class="chip" data-ex="' + esc(e) + '">' + esc(e) + '</button>';
      })
      .join('');
  var ws = S.workouts.filter(function (w) {
    return w.date === sel;
  });
  $('#wVolTxt').textContent = dayVol(sel) > 0 ? Math.round(dayVol(sel)) + ' kg' : '';
  $('#wTodayCard').style.display = ws.length ? '' : 'none';
  $('#wList').innerHTML = ws.length
    ? '<ul class="list">' +
      ws
        .map(function (w) {
          return (
            '<li><div><b>' +
            esc(w.exercise) +
            '</b> ' +
            w.sets +
            '×' +
            w.reps +
            (w.weight > 0 ? ' @ ' + w.weight + 'kg' : ' · 自重') +
            (w.rpe
              ? ' <span class="tag">RPE ' + w.rpe + (rirOf(w) != null ? ' · RIR ' + rirOf(w) : '') + '</span>'
              : '') +
            (w.wrist
              ? ' <span class="tag" style="color:var(--bad)">' + IC('bandage') + esc(flagLabel()) + '</span>'
              : '') +
            '<div class="mut">' +
            [vol(w) > 0 ? '训练量 ' + Math.round(vol(w)) + ' kg' : '', w.note ? esc(w.note) : '']
              .filter(Boolean)
              .join(' · ') +
            '</div></div><button class="del" aria-label="删除" data-delw="' +
            w.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    : '<div class="mut">暂无记录</div>';
  var cs = S.cardio.filter(function (c) {
    return c.date === sel;
  });
  $('#cList').innerHTML = cs.length
    ? '<ul class="list">' +
      cs
        .map(function (c) {
          return (
            '<li><div>爬楼 ' +
            c.min +
            ' 分' +
            (c.floors ? ' · ' + c.floors + ' 层' : '') +
            (c.hr ? ' · 心率 ' + c.hr : '') +
            '</div><button class="del" aria-label="删除" data-delc="' +
            c.id +
            '">' +
            IC('x') +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    : '';
  if (cur === 'tstats') chTrain();
  chPerf();
  rPerfTests();
  $('#swimNote').textContent = S.profile.swimNote || '';
  document.querySelectorAll('.flagLbl').forEach(function (e) {
    e.textContent = flagLabel();
  });
  lastHint();
  restrHint();
}
function lastHint() {
  var ex = $('#wEx').value.trim();
  if (!ex) {
    $('#wLast').textContent = '';
    return;
  }
  var p = S.workouts
    .filter(function (w) {
      return w.exercise === ex && w.date <= sel;
    })
    .sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    })[0];
  $('#wLast').textContent = p
    ? '上次 ' + p.date.slice(5) + '：' + p.sets + '×' + p.reps + '@' + p.weight + 'kg' + (p.rpe ? ' RPE' + p.rpe : '')
    : '';
}
$('#wEx').addEventListener('input', function () {
  lastHint();
  restrHint();
  if (lastSet($('#wEx').value.trim())) autoFill();
  else $('#wSug').innerHTML = '';
});
(function () {
  var h = '<option value="">—</option>';
  for (var r = 5; r <= 10; r += 0.5) h += '<option>' + r + '</option>';
  $('#wRpe').innerHTML = h;
})();
$('#rSave').onclick = function () {
  S.recoveryStart = $('#rStart').value;
  if (!save(true)) return;
  toast('已保存');
  render();
};
$('#wRpe').addEventListener('change', function () {
  var v = num(this.value);
  $('#wRir').value = v == null ? '' : String(Math.max(0, Math.min(5, Math.round(10 - v))));
});
$('#wRir').addEventListener('change', function () {
  var v = num(this.value);
  $('#wRpe').value = v == null ? '' : String(10 - v);
});
$('#wAdd').onclick = function () {
  var ex = $('#wEx').value.trim(),
    s = num($('#wS').value),
    r = num($('#wR').value),
    w = num($('#wW').value),
    rpe = num($('#wRpe').value),
    rir = num($('#wRir').value);
  if (rpe == null && rir != null) rpe = 10 - rir;
  if (rir == null && rpe != null) rir = Math.max(0, 10 - rpe);
  if (!ex || !s || !r) {
    toast('请填写动作、组数、次数');
    return;
  }
  S.workouts.push({
    id: uid(),
    date: sel,
    exercise: ex,
    sets: s,
    reps: r,
    weight: w || 0,
    rpe: rpe,
    rir: rir,
    note: $('#wNote').value.trim(),
    wrist: $('#wWrist').checked
  });
  if (!save(true)) return;
  $('#wRir').value = '';
  $('#wWrist').checked = false;
  var wk = recWeek(sel);
  if (wk && wk <= 2 && rpe && rpe > 7) toast('恢复期前2周建议 RPE≤7（留3-4次余力）');
  else toast('已添加');
  $('#wNote').value = '';
  $('#wSug').innerHTML = '';
  render();
};
function swPace() {
  var d = num($('#swD').value),
    t = parseT($('#swT').value);
  $('#swPace').textContent = d && t ? '配速 ' + fmtT((t / d) * 100) + '/100m' : '';
}
$('#swD').addEventListener('input', swPace);
$('#swT').addEventListener('input', swPace);
$('#swAdd').onclick = function () {
  var d = num($('#swD').value),
    t = parseT($('#swT').value);
  if (!d) {
    toast('请填写距离');
    return;
  }
  if ($('#swT').value && !t) {
    toast('用时格式如 25:00 或 1:35.20');
    return;
  }
  S.swims.push({
    id: uid(),
    date: sel,
    stroke: $('#swSt').value,
    dist: d,
    sec: t,
    swolf: num($('#swSw').value),
    note: $('#swN').value.trim()
  });
  if (!save(true)) return;
  ['#swD', '#swT', '#swSw', '#swN'].forEach(function (s) {
    $(s).value = '';
  });
  swPace();
  toast(d === 100 && $('#swSt').value === '蛙泳' && t ? '已添加，并计入100m蛙泳成绩' : '已添加');
  render();
};
$('#pbAdd').onclick = function () {
  var t = parseT($('#pbT').value),
    d = $('#pbD').value;
  if (!t || !d) {
    toast('请填写成绩（如 1:30.50）与日期');
    return;
  }
  var prev = pbEntries().reduce(function (b, x) {
    return b == null || x.sec < b ? x.sec : b;
  }, null);
  S.pb100br.push({ id: uid(), date: d, sec: t, type: $('#pbTy').value, note: $('#pbN').value.trim() });
  if (!save(true)) return;
  resetRecordDate('pbD');
  $('#pbT').value = '';
  $('#pbN').value = '';
  toast(prev == null || t < prev ? '新的个人最好成绩！' : '已记录');
  render();
};
$('#rnHistSave').onclick = function () {
  var v = $('#rnHist').value.trim(),
    t = parseT(v);
  if (v && !t) {
    toast('格式如 2:30');
    return;
  }
  S.run800Hist = t;
  if (!save(true)) return;
  toast('已保存');
  render();
};
$('#rnAdd').onclick = function () {
  var t = parseT($('#rnT').value),
    d = $('#rnD').value;
  if (!t || !d) {
    toast('请填写成绩（如 2:45.3）与日期');
    return;
  }
  S.run800.push({ id: uid(), date: d, sec: t, type: $('#rnTy').value, note: $('#rnN').value.trim() });
  if (!save(true)) return;
  resetRecordDate('rnD');
  $('#rnT').value = '';
  $('#rnN').value = '';
  toast(
    S.run800Hist && t <= S.run800Hist
      ? '追平/超越历史最佳！'
      : '已记录，距历史最佳 +' + r1(t - (S.run800Hist || t)) + 's'
  );
  render();
};
$('#cAdd').onclick = function () {
  var m = num($('#cMin').value);
  if (!m) {
    toast('请填写时长');
    return;
  }
  S.cardio.push({ id: uid(), date: sel, min: m, floors: num($('#cFl').value), hr: num($('#cHr').value) });
  if (!save(true)) return;
  ['#cMin', '#cFl', '#cHr'].forEach(function (s) {
    $(s).value = '';
  });
  toast('已添加');
  render();
};
