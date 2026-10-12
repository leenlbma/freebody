// SPDX-License-Identifier: MIT
/* 18-ui-settings.js — 设置与备份 */
function download(name, content, mime) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
$('#csvTpl').innerHTML =
  '<span class="mut">下载模板：</span>' +
  CSV_TYPES.map(function (t, i) {
    return '<button class="chip" data-csvtpl="' + i + '">' + t[1] + '</button>';
  }).join('');
$('#csvBtn').onclick = function () {
  $('#csvFile').click();
};
$('#csvFile').onchange = function () {
  var f = this.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var m = importCSV(String(rd.result));
      if (m) {
        toast(m);
        render();
      }
    } catch (e) {
      toast('导入失败：' + e.message);
    }
  };
  rd.readAsText(f);
  this.value = '';
};

/* ---------- 设置：个人配置 / 示例配置 / 自定义食物库 ---------- */
function rSettings() {
  rStore();
  rPrefs();
  var pf = S.profile;
  $('#pfName').value = pf.name || '';
  $('#pfH').value = pf.height || '';
  $('#pfFlag').value = pf.injuryFlagLabel || '';
  $('#exList2').innerHTML = EXAMPLE_PROFILES.length
    ? EXAMPLE_PROFILES.map(function (e, i) {
        return (
          '<li><div><b>' +
          esc(e.title) +
          '</b><div class="mut">' +
          esc(e._comment || '') +
          '</div></div><button class="ghost sm" data-applyex="' +
          i +
          '">加载</button></li>'
        );
      }).join('')
    : '<li class="mut">无内置示例</li>';
  $('#cfInfo').textContent =
    '内置 ' + (FOOD_DB.foods || []).length + ' 项 · 自定义 ' + (S.customFoods || []).length + ' 项';
  var g = S.goals;
  $('#gSl').value = g.sleepH;
  $('#gTd').value = g.trainDays;
  $('#gSt').value = g.stairMin;
  $('#gWt').value = g.weight != null ? g.weight : '';
}
$('#pfSave').onclick = function () {
  S.profile.name = $('#pfName').value.trim();
  S.profile.height = num($('#pfH').value);
  S.profile.injuryFlagLabel = $('#pfFlag').value.trim() || '伤处不适';
  save();
  applyTitle();
  toast('已保存');
};
function applyTitle() {
  var n = S.profile.name;
  document.title = (n ? n + ' · ' : '') + 'FreeBody';
}
/** 应用示例配置：合并个人配置与清单（追加，不删除已有数据，不写入任何记录） */
function applyExample(e) {
  if (!confirm('加载「' + e.title + '」？将合并其配置与清单（伤病、受限动作、康复动作等），不会删除已有记录。')) return;
  if (e.profile) for (var k in e.profile) S.profile[k] = e.profile[k];
  if (e.run800Hist != null && S.run800Hist == null) S.run800Hist = e.run800Hist;
  /** @type {Array<[string, string[]]>} */ ([
    ['injuries', ['name', 'desc', 'status']],
    ['rehab', ['name', 'dose']],
    ['restricted', ['name', 'alt']]
  ]).forEach(function (spec) {
    (e[spec[0]] || []).forEach(function (it) {
      if (
        S[spec[0]].some(function (x) {
          return x.name === it.name;
        })
      )
        return;
      var o = { id: uid() };
      spec[1].forEach(function (f) {
        o[f] = it[f] || '';
      });
      S[spec[0]].push(o);
    });
  });
  save();
  applyTitle();
  toast('示例配置已加载');
  render();
}
$('#cfBtn').onclick = function () {
  $('#cfFile').click();
};
/** 导入自定义食物库：格式同 data/foods.json（{foods:[...]}）或直接为数组 */
$('#cfFile').onchange = function () {
  var f = this.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var d = JSON.parse(String(rd.result)),
        arr = Array.isArray(d) ? d : d.foods;
      if (!Array.isArray(arr)) throw new Error('缺少 foods 数组');
      var ok = arr.filter(function (x) {
        return (
          x &&
          x.name &&
          [x.kcal, x.p, x.c, x.f].every(function (v) {
            return typeof v === 'number' && v >= 0;
          })
        );
      });
      ok.forEach(function (x) {
        S.customFoods = S.customFoods.filter(function (y) {
          return y.name !== x.name;
        });
        S.customFoods.push({
          id: x.id || uid(),
          name: x.name,
          category: x.category || '自定义',
          kcal: x.kcal,
          p: x.p,
          c: x.c,
          f: x.f,
          aliases: Array.isArray(x.aliases) ? x.aliases : undefined,
          units: x.units && typeof x.units === 'object' ? x.units : undefined,
          servings: Array.isArray(x.servings) ? x.servings : undefined,
          na: typeof x.na === 'number' ? x.na : undefined,
          fib: typeof x.fib === 'number' ? x.fib : undefined,
          source: x.source || '自定义导入',
          custom: true
        });
      });
      save();
      toast(
        '导入 ' + ok.length + ' 项' + (arr.length - ok.length ? '，跳过 ' + (arr.length - ok.length) + ' 项无效' : '')
      );
      render();
    } catch (e) {
      toast('导入失败：' + e.message);
    }
  };
  rd.readAsText(f);
  this.value = '';
};
$('#cfClear').onclick = function () {
  if (confirm('清空自定义食物？')) {
    S.customFoods = [];
    save();
    render();
  }
};
$('#g2Save').onclick = function () {
  var a = num($('#gSl').value),
    b = num($('#gTd').value),
    c = num($('#gSt').value);
  if (a) S.goals.sleepH = a;
  if (b) S.goals.trainDays = b;
  if (c) S.goals.stairMin = c;
  S.goals.weight = num($('#gWt').value);
  save();
  toast('已保存');
};
$('#impBtn').onclick = function () {
  $('#imp').click();
};
$('#exFile').onchange = function () {
  var f = this.files[0],
    inp = this;
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var d = JSON.parse(String(rd.result));
      if (!d || typeof d !== 'object' || Array.isArray(d) || d.meals)
        throw new Error('不是配置文件（完整备份请用「数据备份」导入）');
      if (!d.title) d.title = f.name;
      applyExample(d);
    } catch (err) {
      toast('读取失败：' + err.message);
    }
    inp.value = '';
  };
  rd.readAsText(f);
};
$('#exFileBtn').onclick = function () {
  $('#exFile').click();
};
$('#imp').onchange = function () {
  var f = this.files[0];
  if (!f) return;
  var rd = new FileReader();
  rd.onload = function () {
    var d;
    try {
      d = JSON.parse(String(rd.result));
    } catch (e) {
      toast('导入失败：' + e.message);
      return;
    }
    if (!bkIsEnc(d)) {
      bkRestore(d);
      return;
    }
    var pw = $('#bkPw').value;
    if (!pw) {
      $('.bk-enc').open = true;
      $('#bkPw').focus();
      toast('这是加密备份：请在「加密备份」中填写密码后再导入');
      return;
    }
    bkDecrypt(d, pw).then(
      function (t) {
        bkRestore(JSON.parse(t));
      },
      function (e) {
        toast('导入失败：' + e.message);
      }
    );
  };
  rd.readAsText(f);
  this.value = '';
};
/** 用完整备份覆盖当前数据（确认后） */
function bkRestore(d) {
  if (DEMO) {
    toast('演示模式中不能导入备份，请先退出演示');
    return;
  }
  try {
    if (!d || typeof d !== 'object' || !Array.isArray(d.meals) || !d.goals) throw new Error('格式不符');
    if (!confirm('导入将覆盖当前全部数据，确定？')) return;
    if (d.aiConfig) aiImport(d.aiConfig);
    delete d.aiConfig;
    localStorage.setItem(KEY, JSON.stringify(d));
    S = load();
    rStoreBanner();
    applyTheme();
    applyTitle();
    toast('导入成功');
    render();
  } catch (e) {
    toast('导入失败：' + e.message);
  }
}
$('#wipe').onclick = function () {
  if (DEMO) {
    exitDemo();
    return;
  }
  if (confirm('确定清空全部数据（含本机保存的 API Key）？建议先导出备份。') && confirm('再次确认：不可恢复')) {
    localStorage.removeItem(KEY);
    localStorage.removeItem(AIKEY);
    localStorage.removeItem(METAKEY);
    META = {};
    STORE.used = 0;
    STORE.banner = null;
    rStoreBanner();
    AIC = aiLoad();
    S = load();
    save();
    rStoreBanner();
    toast('已清空');
    render();
  }
};

/* ---------- 存储安全（v2.6）：提示条、导出、持久存储、状态 ---------- */
/** 导出完整备份（JSON）；记录 lastBackup，关闭备份提醒 */
/** 导出备份；「加密备份」中填了密码时导出加密文件 */
function doExport() {
  var out = {};
  for (var k in S) out[k] = S[k];
  out.aiConfig = aiExport();
  var json = JSON.stringify(out, null, 2),
    pw = $('#bkPw') ? $('#bkPw').value : '';
  if (!pw) {
    download('freebody-' + today() + '.json', json, 'application/json');
    bkDone(false);
    return;
  }
  if (!bkCan()) {
    toast('当前浏览器环境不支持加密，未导出。可清空密码导出普通 JSON');
    return;
  }
  toast('正在加密…');
  bkEncrypt(json, pw).then(
    function (enc) {
      download('freebody-' + today() + '.enc.json', JSON.stringify(enc), 'application/json');
      bkDone(true);
    },
    function (e) {
      toast('加密失败：' + e.message);
    }
  );
}
function bkDone(enc) {
  META.lastBackup = today();
  delete META.snooze;
  metaSave();
  if (STORE.banner === 'backup') STORE.banner = null;
  rStoreBanner();
  rStore();
  toast((enc ? '已导出加密备份' : '已导出') + (AIC.incKey && AIC.key ? '（含 API Key，请妥善保管）' : ''));
}
$('#exp').onclick = doExport;
var ST_MSG = {
  demo: [
    'info',
    '演示模式：数据不会保存',
    '这些是虚构的示例记录，只在当前页面中，不会写入本机存储。退出后回到你自己的数据。'
  ],
  corrupt: [
    'bad',
    '本机数据无法读取，已暂停保存',
    '保存的数据可能已损坏。为避免覆盖，新的修改不会写入。请先导出原文留底，再导入备份文件，或清空重来。'
  ],
  quota: [
    'bad',
    '存储空间已满，最近的修改没有保存',
    '请立即导出备份。数据仍在当前页面中，导出后再清理旧记录或换用其他浏览器。'
  ],
  90: ['bad', '本机存储已用约 90%', '空间快满了，写满后新的记录将无法保存。请先导出备份。'],
  70: ['warn', '本机存储已用约 70%', '建议导出一次备份，并留意存储用量。'],
  backup: ['warn', '超过 30 天没有备份', '数据只存在本机，清除浏览器数据或换设备时会丢失。建议现在导出一份备份。']
};
/** 横幅优先级：数据损坏 > 存储写满 > 其他提醒 */
var ST_RANK = { corrupt: 3, quota: 2 };
function storeAlert(kind) {
  var k = String(kind);
  if ((ST_RANK[STORE.banner] || 0) > (ST_RANK[k] || 0)) return;
  STORE.banner = k;
  rStoreBanner();
  if (k === 'corrupt' || k === 'quota' || k === '90') toast(ST_MSG[k][1]); // 每次保存失败都提示
}
function backupTitle() {
  var ref = META.lastBackup || META.firstUse,
    n = ref ? diffDays(ref, today()) : BACKUP_DAYS;
  return META.lastBackup ? '已经 ' + n + ' 天没有备份' : '已记录 ' + n + ' 天，还没有备份过';
}
function rStoreBanner() {
  var b = $('#stBanner');
  if (!b) return;
  var k = STORE.banner,
    m = k && ST_MSG[k];
  if (!m) {
    b.innerHTML = '';
    return;
  }
  if (k === 'corrupt' && STORE.bad == null) {
    STORE.banner = null;
    b.innerHTML = '';
    return;
  }
  if (k === 'backup') m = [m[0], backupTitle(), m[2]];
  b.innerHTML =
    '<div class="alert ' +
    m[0] +
    ' st-banner" role="' +
    (m[0] === 'bad' ? 'alert' : 'status') +
    '">' +
    IC(m[0] === 'bad' ? 'alert' : 'info') +
    '<div class="st-b-tx"><b>' +
    m[1] +
    '</b><span>' +
    m[2] +
    '</span></div><div class="st-b-act">' +
    (k === 'demo'
      ? '<button class="sm" data-st="exitdemo">退出演示</button>'
      : k === 'corrupt'
        ? '<button class="sm" data-st="rawexp">' +
          IC('download') +
          '导出原文</button><button class="ghost sm" data-st="restore">导入备份</button>' +
          '<button class="ghost sm" data-st="reset">清空重来</button>'
        : '<button class="sm" data-st="export">' + IC('download') + '立即导出</button>') +
    (k === 'quota' || k === 'demo' || k === 'corrupt'
      ? ''
      : '<button class="ghost sm" data-st="later">' + (k === 'backup' ? '7 天后提醒' : '知道了') + '</button>') +
    '</div></div>';
  if (window.FitIcons) FitIcons.hydrate();
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-st]');
  if (!b) return;
  var a = b.getAttribute('data-st');
  if (a === 'exitdemo') {
    exitDemo();
    return;
  }
  if (a === 'rawexp') {
    download('freebody-raw-' + today() + '.txt', String(STORE.bad || ''), 'text/plain');
    return;
  }
  if (a === 'restore') {
    $('#imp').click();
    return;
  }
  if (a === 'reset') {
    if (!confirm('清空后无法恢复。确定已经导出原始数据，要清空并重新开始？')) return;
    localStorage.removeItem(KEY);
    S = load();
    save();
    rStoreBanner();
    toast('已清空，可以重新开始记录');
    render();
    return;
  }
  if (a === 'export') doExport();
  else if (a === 'later') {
    if (STORE.banner === 'backup') {
      META.snooze = addDays(today(), 7);
      metaSave();
    }
    STORE.banner = null;
    rStoreBanner();
  } else if (a === 'persist') storePersist(true);
});
/** 申请持久存储：ask=false 为启动时自动申请（Firefox 会弹权限框，改为手动）；结果显示在数据备份卡片 */
function storePersist(ask) {
  var ns = navigator.storage;
  if (!ns || !ns.persist || !ns.persisted) {
    STORE.persist = 'na';
    rStore();
    return;
  }
  ns.persisted()
    .then(function (p) {
      if (p) {
        STORE.persist = 'on';
        rStore();
        return;
      }
      if (!ask && /Firefox\//.test(navigator.userAgent)) {
        STORE.persist = 'off';
        rStore();
        return;
      }
      return ns.persist().then(function (g) {
        STORE.persist = g ? 'on' : 'off';
        rStore();
        if (ask) toast(g ? '已开启持久存储' : '浏览器未授予持久存储，请定期导出备份');
      });
    })
    .catch(function () {
      STORE.persist = 'na';
      rStore();
    });
}
function fmtKB(n) {
  var b = n * 2;
  return b >= 1048576 ? r1(b / 1048576) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
}
function rStore() {
  var box = $('#stStatus');
  if (!box) return;
  if (!STORE.used) {
    STORE.used = lsUsage(JSON.stringify(S));
    STORE.pct = quotaPct(STORE.used);
  }
  var pc = STORE.pct,
    lvl = pc >= 90 ? 'bad' : pc >= 70 ? 'warn' : 'ok',
    d = today(),
    lb = META.lastBackup,
    ago = lb ? diffDays(lb, d) : null,
    due = backupDue(META, d, hasUserData(S));
  var ps = {
    on: ['ok', '已开启', '浏览器不会在空间紧张时自动清除本应用的数据'],
    off: ['warn', '未开启', '空间紧张或长期未使用时，浏览器可能清除数据'],
    na: ['mut', '浏览器不支持', '请定期导出备份']
  }[STORE.persist] || ['mut', '检查中…', ''];
  var ios = document.documentElement.classList.contains('ios'),
    sa = document.documentElement.classList.contains('standalone');
  var h =
    '<div class="st-row"><span class="st-k">' +
    IC('database') +
    '存储用量</span><span class="st-v">' +
    fmtKB(STORE.used) +
    ' · 约 ' +
    pc +
    '%</span></div><div class="st-meter ' +
    lvl +
    '" role="progressbar" aria-label="存储用量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
    pc +
    '"><i style="width:' +
    Math.max(2, pc) +
    '%"></i></div>' +
    '<div class="st-row"><span class="st-k">' +
    IC('lock') +
    '持久存储</span><span class="st-v ' +
    ps[0] +
    '">' +
    (STORE.persist === 'off' ? '<button class="ghost sm st-ask" data-st="persist">申请开启</button>' : '') +
    ps[1] +
    '</span></div>' +
    (ps[2] ? '<p class="st-note">' + ps[2] + '</p>' : '') +
    '<div class="st-row"><span class="st-k">' +
    IC('download') +
    '上次备份</span><span class="st-v ' +
    (due ? 'warn' : lb ? '' : 'mut') +
    '">' +
    (lb ? lb + '（' + (ago ? ago + ' 天前' : '今天') + '）' : '还没有导出过') +
    '</span></div>' +
    (due ? '<p class="st-note">已超过 30 天，建议现在导出。</p>' : '');
  if (ios)
    h +=
      '<p class="st-note">' +
      (sa
        ? '主屏幕应用与 Safari 的数据彼此独立。'
        : '在 Safari 中长期不打开，系统可能清除本站数据；添加到主屏幕后更稳定，但主屏幕应用与 Safari 的数据彼此独立，迁移前请先导出再导入。') +
      '</p>';
  box.innerHTML = h;
  if (window.FitIcons) FitIcons.hydrate();
}
