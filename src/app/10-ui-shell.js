/* 10-ui-shell.js — 界面外壳：主题、导航、日期栏、渲染调度 */
/* ---------- 主题 ---------- */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', S.theme || 'auto');
  runHooks('theme');
}
$('#themeBtn').onclick = function () {
  var o = ['auto', 'light', 'dark'];
  S.theme = o[(o.indexOf(S.theme) + 1) % 3];
  save();
  applyTheme();
  toast('主题：' + { auto: '跟随系统', light: '浅色', dark: '深色' }[S.theme]);
  drawCharts();
  rPrefs();
};

/* ---------- 导航 ---------- */
$('#nav').innerHTML =
  '<div class="nav-brand" aria-hidden="true">' +
  $('#appTitle')
    .innerHTML.replace(/id="whd"/, 'id="whd2"')
    .replace(/url\(#whd\)/, 'url(#whd2)') +
  '</div>' +
  GROUPS.map(function (g) {
    return '<button data-go="' + g[0] + '">' + IC(ICONS[g[0]]) + g[1] + '</button>';
  }).join('');
function groupOf(sec) {
  for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][2].indexOf(sec) >= 0) return GROUPS[i];
  return GROUPS[0];
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-go]');
  if (b) show(b.getAttribute('data-go'));
  var sb = e.target.closest('[data-sub]');
  if (sb) show(sb.getAttribute('data-sub'), true);
});
function show(id, direct) {
  var toMus = id === 'muscle';
  if (toMus) {
    id = 'train';
    direct = true;
  } // 肌群热图位于 训练 › 力量 顶部
  var grp =
    !direct &&
    GROUPS.find(function (g) {
      return g[0] === id;
    });
  if (grp) id = HUB[grp[0]] || lastSub[grp[0]] || grp[2][0];
  if (!document.getElementById(id)) id = 'overview';
  grp = groupOf(id);
  lastSub[grp[0]] = id;
  var hub = HUB[grp[0]];
  var par = id === 'dietAdd' ? 'diet' : id === 'dietAI' ? 'dietAdd' : id === 'dietFood' ? dfBack : null;
  $('#subnav').innerHTML = hub
    ? id === hub
      ? ''
      : '<button data-sub="' +
        (par || hub) +
        '" class="back">' +
        IC('left') +
        (par ? SEC_LABEL[par] : grp[1]) +
        '</button><span class="sn-t">' +
        SEC_LABEL[id] +
        '</span>'
    : grp[2].length > 1
      ? grp[2]
          .map(function (s) {
            return '<button data-sub="' + s + '" class="' + (s === id ? 'on' : '') + '">' + SEC_LABEL[s] + '</button>';
          })
          .join('')
      : '';
  cur = id;
  document.querySelectorAll('section').forEach(function (s) {
    s.classList.toggle('on', s.id === id);
  });
  document.querySelectorAll('nav button').forEach(function (b) {
    b.classList.toggle('on', b.getAttribute('data-go') === grp[0]);
  });
  window.scrollTo(0, 0);
  render();
  if (toMus && $('#musWrap')) $('#musWrap').scrollIntoView({ block: 'start' });
  runHooks('show');
}

/* ---------- 日期 ---------- */
$('#dSel').value = sel;
$('#dSel').onchange = function () {
  if (this.value) {
    sel = this.value;
    render();
  }
};
$('#dPrev').onclick = function () {
  sel = addDays(sel, -1);
  $('#dSel').value = sel;
  render();
};
$('#dNext').onclick = function () {
  sel = addDays(sel, 1);
  $('#dSel').value = sel;
  render();
};
$('#dToday').onclick = function () {
  sel = today();
  $('#dSel').value = sel;
  render();
};
function todayBtn() {
  var b = $('#dToday');
  if (b) b.classList.toggle('is-today', sel === today());
}

/* ---------- 图表 ---------- */
function ring(val, goal, color, label, unit) {
  var pc = goal ? Math.min(val / goal, 1) : 0,
    r = 34,
    C = 2 * Math.PI * r,
    over = goal && val > goal * 1.05;
  return (
    '<div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="' +
    r +
    '" fill="none" style="stroke:var(--in)" stroke-width="8"/><circle cx="42" cy="42" r="' +
    r +
    '" fill="none" style="stroke:' +
    (over ? 'var(--bad)' : color) +
    ';transition:stroke-dasharray .6s" stroke-width="8" stroke-linecap="round" stroke-dasharray="' +
    C * pc +
    ' ' +
    C +
    '" transform="rotate(-90 42 42)"/><text x="42" y="47" text-anchor="middle" font-size="15" font-weight="700" style="fill:var(--fg)">' +
    Math.round(pc * 100) +
    '%</text></svg><b>' +
    label +
    '</b>' +
    Math.round(val) +
    '/' +
    goal +
    unit +
    '</div>'
  );
}

function otHtml(d) {
  var s = otSignals(d);
  if (!s.length) return '';
  var lvl = s.length >= 3 ? 'bad' : s.length === 2 ? 'warn' : 'info';
  var head =
    s.length >= 2 ? IC('alert') + ' 恢复不足/过度训练预警（' + s.length + ' 项信号）' : IC('info') + ' 恢复提示';
  return (
    '<div class="alert ' +
    lvl +
    '"><b>' +
    head +
    '</b><ul style="margin:4px 0 4px 18px;padding:0">' +
    s
      .map(function (x) {
        return '<li>' + esc(x) + '</li>';
      })
      .join('') +
    '</ul>' +
    (s.length >= 2
      ? '建议：今天降低训练量/强度或安排休息，优先睡眠与饮食；持续数天或伴随不适请咨询医生，并与私教沟通。'
      : '持续关注即可。') +
    '<div class="mut">基于近3天与前2周基线对比的简单规则，仅供参考，不构成医疗建议。</div></div>'
  );
}

/* ---------- 渲染 ---------- */
function render() {
  document.querySelectorAll('[data-rng]').forEach(function (el) {
    var k = el.getAttribute('data-rng'),
      v = rng(k);
    el.innerHTML = [
      [7, '7天'],
      [30, '30天'],
      [90, '90天'],
      [0, '全部']
    ]
      .map(function (o) {
        return (
          '<button data-rngk="' +
          k +
          '" data-rngv="' +
          o[0] +
          '" class="' +
          (o[0] === v ? 'on' : '') +
          '">' +
          o[1] +
          '</button>'
        );
      })
      .join('');
  });
  if (cur === 'overview') rOverview();
  else if (cur === 'diet') rDiet();
  else if (cur === 'dietAdd') rDietAdd();
  else if (cur === 'dietFood') rDietFood();
  else if (cur === 'dietAI') rDietAI();
  else if (cur === 'nutri') chNutrition();
  else if (cur === 'data') rData();
  else if (cur === 'train' || cur === 'cardio' || cur === 'perf' || cur === 'tstats') rTrain();
  else if (cur === 'muscle') rMuscle();
  else if (cur === 'supp') rSupp();
  else if (cur === 'sleep') rSleep();
  else if (cur === 'selftest') rSelftest();
  else if (cur === 'body') rBody();
  else if (cur === 'hormone') rHormone();
  else if (cur === 'settings') {
    rSettings();
    rAiCard();
  } else if (cur === 'injury') rInjury();
  else if (cur === 'impPack') rImp();
  else if (cur === 'notes') rNotes();
  runHooks('render');
}
function drawCharts() {
  render();
}
