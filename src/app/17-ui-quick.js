// SPDX-License-Identifier: MIT
/* 17-ui-quick.js — 快速输入与一键操作 */
function qPreview(inp, box) {
  var v = $(inp).value.trim();
  if (!v) {
    if (inp === '#qText') $(box).textContent = '';
    else $(box).textContent = '';
    return;
  }
  var r = parseQuick(v),
    k = 0,
    p = 0;
  r.items.forEach(function (i) {
    k += i.kcal;
    p += i.p;
  });
  $(box).innerHTML =
    (r.items.length
      ? '估算 ' +
        Math.round(k) +
        ' kcal · 蛋白 ' +
        r1(p) +
        'g（' +
        r.items
          .map(function (i) {
            return esc(i.name) + (i.kcalOnly ? ' 仅热量' : '');
          })
          .join('、') +
        '）'
      : '') + (r.miss.length ? ' <span style="color:var(--warn)">未识别：' + esc(r.miss.join('、')) + '</span>' : '');
}
function quickAdd(inp, box) {
  var r = parseQuick($(inp).value);
  if (!r.items.length) {
    toast(r.miss.length ? '未识别：' + r.miss.join('、') : '请输入内容');
    return;
  }
  var meal = /^diet/.test(cur) ? dMeal() : mealByHour();
  r.items.forEach(function (i) {
    i.meal = meal;
    S.meals.push(mkMeal(i));
  });
  if (!save(true)) return;
  $(inp).value = '';
  $(box).textContent = '';
  toast('已记入' + meal + ' ' + r.items.length + ' 项' + (r.miss.length ? '，未识别 ' + r.miss.length + ' 项' : ''));
  curMeal = meal;
  if (cur === 'dietAdd') show('diet', true);
  else render();
}
['#qText2'].forEach(function (id) {
  var box = '#qPrev2';
  $(id).addEventListener('input', function () {
    qPreview(id, box);
  });
  $(id).addEventListener('keydown', function (e) {
    if (e.key === 'Enter') quickAdd(id, box);
  });
});
$('#qAdd2').onclick = function () {
  quickAdd('#qText2', '#qPrev2');
};
/** 一键：补剂全部打卡 */
function suppAll() {
  var L = S.suppLog[sel] || (S.suppLog[sel] = {}),
    n = new Date(),
    at = pad(n.getHours()) + ':' + pad(n.getMinutes());
  S.supps.forEach(function (s) {
    if (!L[s.id]) L[s.id] = { at: at };
  });
  if (!save(true)) return;
  toast('补剂已全部打卡');
  render();
}
/** 一键：重复昨天饮食 */
function repeatDiet() {
  var y = addDays(sel, -1),
    src = dayMeals(y);
  if (!src.length) {
    toast('昨天没有饮食记录');
    return;
  }
  if (dayMeals(sel).length && !confirm('当日已有记录，仍追加昨天的 ' + src.length + ' 条？')) return;
  src.forEach(function (m) {
    var o = JSON.parse(JSON.stringify(m));
    o.id = uid();
    o.date = sel;
    S.meals.push(o);
  });
  if (!save(true)) return;
  toast('已复制昨天 ' + src.length + ' 条');
  render();
}
/** 一键：重复上次训练（复制最近一次训练日的所有动作） */
function repeatTrain() {
  var ds = S.workouts
    .filter(function (w) {
      return w.date < sel;
    })
    .map(function (w) {
      return w.date;
    })
    .sort();
  if (!ds.length) {
    toast('没有更早的训练记录');
    return;
  }
  var d = ds[ds.length - 1],
    src = S.workouts.filter(function (w) {
      return w.date === d;
    });
  if (
    S.workouts.some(function (w) {
      return w.date === sel;
    }) &&
    !confirm('当日已有训练，仍追加 ' + d + ' 的 ' + src.length + ' 项？')
  )
    return;
  src.forEach(function (w) {
    S.workouts.push({
      id: uid(),
      date: sel,
      exercise: w.exercise,
      sets: w.sets,
      reps: w.reps,
      weight: w.weight,
      rpe: null,
      note: '',
      wrist: false
    });
  });
  if (!save(true)) return;
  toast('已复制 ' + d.slice(5) + ' 的 ' + src.length + ' 项（RPE 待填）');
  render();
}
/** 睡眠：最近一次记录（早于给定日期） */
function lastSleepBefore(d) {
  return (
    S.sleep
      .filter(function (x) {
        return x.date < d;
      })
      .sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      })[0] || null
  );
}
function reuseSleep() {
  var l = lastSleepBefore(sel);
  if (!l) {
    toast('没有可沿用的睡眠记录');
    return;
  }
  S.sleep = S.sleep.filter(function (x) {
    return x.date !== sel;
  });
  S.sleep.push({ id: uid(), date: sel, bed: l.bed, wake: l.wake, dur: l.dur, q: l.q, note: '沿用上次' });
  if (!save(true)) return;
  toast('已沿用 ' + l.bed + '→' + l.wake);
  render();
}
/** 训练：自动带出上次组数/次数/重量，并给出加重建议 */
function lastSet(ex) {
  return (
    S.workouts
      .filter(function (w) {
        return w.exercise === ex && w.date <= sel;
      })
      .sort(function (a, b) {
        return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
      })[0] || null
  );
}
function autoFill() {
  var ex = $('#wEx').value.trim(),
    p = ex && lastSet(ex);
  if (!p) {
    $('#wSug').innerHTML = '';
    return;
  }
  if (!$('#wS').value) $('#wS').value = p.sets;
  if (!$('#wR').value) $('#wR').value = p.reps;
  if (!$('#wW').value) $('#wW').value = p.weight;
  var nt = nextTarget(ex);
  if (!nt) {
    $('#wSug').innerHTML = '';
    return;
  }
  $('#wSug').innerHTML =
    '<div class="sug"><span>' +
    IC('bulb') +
    ' 下次 ' +
    nt.w +
    'kg × ' +
    nt.reps +
    '：' +
    esc(nt.why) +
    '</span>' +
    (nt.w !== p.weight || nt.reps !== p.reps
      ? '<button class="sm" id="wUseSug" data-w="' + nt.w + '" data-r="' + nt.reps + '">采用</button>'
      : '') +
    '</div>';
}
$('#wEx').addEventListener('change', autoFill);
$('#dRepeat').onclick = repeatDiet;
$('#wRepeat').onclick = repeatTrain;
$('#sAll').onclick = suppAll;
$('#slReuse').onclick = reuseSleep;
