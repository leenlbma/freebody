// SPDX-License-Identifier: MIT
/* 21-ui-help.js — 显示与辅助（主题、动效）、演示模式入口、设备自检 */
/* ---------- 显示与辅助 ---------- */
var PREF_THEME = [
    ['auto', '跟随系统'],
    ['light', '浅色'],
    ['dark', '深色']
  ],
  PREF_MOTION = [
    ['auto', '跟随系统'],
    ['reduce', '减少动效']
  ];
function applyMotion() {
  document.documentElement.setAttribute('data-motion', S.motion === 'reduce' ? 'reduce' : 'auto');
}
/** 是否应减少动效：用户设置优先，其次系统设置 */
function reduceMotion() {
  return S.motion === 'reduce' || !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function prefSeg(list, val, key) {
  return list
    .map(function (o) {
      return (
        '<button data-pref="' +
        key +
        '" data-v="' +
        o[0] +
        '" class="' +
        (o[0] === val ? 'on' : '') +
        '" aria-pressed="' +
        (o[0] === val) +
        '">' +
        o[1] +
        '</button>'
      );
    })
    .join('');
}
function rPrefs() {
  var t = $('#prTheme'),
    m = $('#prMotion');
  if (t) t.innerHTML = prefSeg(PREF_THEME, S.theme || 'auto', 'theme');
  if (m) m.innerHTML = prefSeg(PREF_MOTION, S.motion || 'auto', 'motion');
}
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-pref]');
  if (!b) return;
  var k = b.getAttribute('data-pref'),
    v = b.getAttribute('data-v');
  if (k === 'theme') {
    S.theme = v;
    applyTheme();
    drawCharts();
  } else {
    S.motion = v;
    applyMotion();
  }
  if (!save(true)) return;
  rPrefs();
  toast((k === 'theme' ? '主题：' : '动效：') + b.textContent);
});

/* ---------- 演示模式 ---------- */
function enterDemo() {
  location.hash = 'demo';
  location.reload();
}
function exitDemo() {
  try {
    history.replaceState(null, '', location.pathname + location.search);
  } catch (e) {
    location.hash = '';
  }
  location.reload();
}
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('#helloDemo')) enterDemo();
});
$('#demoBtn').onclick = function () {
  if (DEMO) {
    exitDemo();
    return;
  }
  enterDemo();
};

/* ---------- 设备自检 ---------- */
/**
 * 逐项检测浏览器能力，返回 [{k 名称, s 'ok'|'warn'|'bad'|'info', v 结果, tip 说明}]。
 * 只读取能力与尺寸信息，不读取任何记录内容。
 */
function selfChecks(done) {
  var R = [],
    de = document.documentElement,
    ua = navigator.userAgent || '';
  var add = function (k, s, v, tip) {
    R.push({ k: k, s: s, v: v, tip: tip || '' });
  };
  var sa = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  add(
    '运行方式',
    sa ? 'ok' : 'info',
    sa ? '主屏幕 / 独立窗口' : '浏览器标签页',
    de.classList.contains('ios') ? 'iOS 上主屏幕应用与 Safari 的数据彼此独立' : ''
  );
  add(
    '屏幕与视口',
    'info',
    screen.width +
      '×' +
      screen.height +
      ' · 视口 ' +
      innerWidth +
      '×' +
      innerHeight +
      ' · 像素比 ' +
      (window.devicePixelRatio || 1)
  );
  var pr = document.createElement('div');
  pr.style.cssText =
    'position:fixed;left:0;top:0;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(pr);
  var cs = getComputedStyle(pr),
    ins = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(function (x) {
      return Math.round(parseFloat(x) || 0);
    });
  pr.style.padding = '0';
  pr.style.height = '100vh';
  var largeHeight = Math.round(pr.getBoundingClientRect().height);
  pr.style.height = '100dvh';
  var dynamicHeight = Math.round(pr.getBoundingClientRect().height);
  pr.remove();
  add('视口单位 vh / dvh', 'info', largeHeight + ' / ' + dynamicHeight + ' px');
  add(
    '安全区（上 右 下 左）',
    'info',
    ins.join(' / ') + ' px',
    sa && de.classList.contains('ios') && !ins[0] ? '顶部安全区为 0：可能由系统状态栏占用；不能据此判断没有黑边' : ''
  );
  var nav = $('#nav'),
    nb = nav ? Math.round(nav.getBoundingClientRect().bottom) : 0,
    vv = window.visualViewport,
    shell = sa && de.classList.contains('ios') && getComputedStyle(document.body).display === 'grid',
    vh = shell
      ? Math.round(document.body.getBoundingClientRect().bottom)
      : de.classList.contains('browser-viewport') && vv
        ? Math.round(vv.offsetTop + vv.height)
        : innerHeight;
  if (vv)
    add(
      '可见视口',
      'info',
      Math.round(vv.width) +
        '×' +
        Math.round(vv.height) +
        ' · 顶部偏移 ' +
        Math.round(vv.offsetTop) +
        ' · 缩放 ' +
        vv.scale
    );
  if (nav && innerWidth < 600 && (shell || getComputedStyle(nav).position === 'fixed'))
    add(
      '底部导航布局',
      Math.abs(nb - vh) <= 1 ? (sa ? 'info' : 'ok') : 'bad',
      '导航底边 ' + nb + ' px，' + (shell ? '应用底边 ' : '视口底边 ') + vh + ' px',
      '此项只检查页面内坐标，不能确认系统绘制的黑边。若仍有留白，请附截图、iOS 版本与本报告'
    );
  if (sa && de.classList.contains('ios'))
    add(
      '主屏幕安装配置',
      'info',
      '旧图标可能保留旧配置',
      '先更新并完全关闭应用后重开。若仍有黑边，先导出 JSON 并确认文件可用，再重新添加图标；需要时导入备份'
    );
  add(
    'dvh 视口单位',
    CSS.supports && CSS.supports('height', '100dvh') ? 'ok' : 'warn',
    CSS.supports && CSS.supports('height', '100dvh') ? '支持' : '不支持',
    '不支持时使用 -webkit-fill-available'
  );
  var ls = false;
  try {
    localStorage.setItem('freeBody_probe', '1');
    ls = localStorage.getItem('freeBody_probe') === '1';
    localStorage.removeItem('freeBody_probe');
  } catch (e) {}
  add('本机存储 localStorage', ls ? 'ok' : 'bad', ls ? '可读写' : '不可用', '无痕模式或禁用存储时无法保存记录');
  add(
    'Service Worker（离线）',
    navigator.serviceWorker ? (navigator.serviceWorker.controller ? 'ok' : 'warn') : 'bad',
    navigator.serviceWorker
      ? navigator.serviceWorker.controller
        ? '已接管，可离线'
        : '已支持，刷新一次后接管'
      : '不支持',
    location.protocol === 'file:' ? 'file:// 下不可用' : ''
  );
  add(
    '链接导入解压（DecompressionStream）',
    window.DecompressionStream ? 'ok' : 'warn',
    window.DecompressionStream ? '支持' : '不支持',
    '不支持时，压缩链接（z.）无法导入，可改用「粘贴导入」'
  );
  add('Web Crypto', window.crypto && crypto.subtle ? 'ok' : 'warn', window.crypto && crypto.subtle ? '支持' : '不支持');
  add(
    '剪贴板写入',
    navigator.clipboard && navigator.clipboard.writeText ? 'ok' : 'warn',
    navigator.clipboard && navigator.clipboard.writeText ? '支持' : '不支持',
    '不支持时请手动复制'
  );
  var di = document.createElement('input');
  di.setAttribute('type', 'date');
  add('日期选择器', di.type === 'date' ? 'ok' : 'warn', di.type === 'date' ? '支持' : '不支持');
  var mq = function (q) {
    return !!(window.matchMedia && matchMedia(q).matches);
  };
  add(
    '系统偏好',
    'info',
    [
      mq('(prefers-color-scheme: dark)') ? '深色' : '浅色',
      mq('(prefers-reduced-motion: reduce)') ? '减弱动效' : '正常动效',
      mq('(pointer: coarse)') ? '触屏' : '鼠标'
    ].join(' · ')
  );
  add('浏览器', 'info', ua.replace(/\s+/g, ' ').slice(0, 160));
  var st = navigator.storage,
    jobs = [];
  if (st && st.persisted)
    jobs.push(
      st
        .persisted()
        .then(function (p) {
          add(
            '持久存储',
            p ? 'ok' : 'warn',
            p ? '已开启' : '未开启',
            '未开启时，空间紧张或长期未使用，浏览器可能清除数据'
          );
        })
        .catch(function () {})
    );
  else add('持久存储', 'warn', '浏览器不支持', '请定期导出备份');
  if (st && st.estimate)
    jobs.push(
      st
        .estimate()
        .then(function (e) {
          add('站点可用空间', 'info', fmtKB(e.usage || 0) + ' / ' + fmtKB(e.quota || 0));
        })
        .catch(function () {})
    );
  if (window.DecompressionStream)
    jobs.push(
      impDecode('z.' + SELF_Z)
        .then(function (t) {
          var ok = false;
          try {
            var o = JSON.parse(t);
            ok = o.freebody === 'import' && o.version === 1;
          } catch (e) {}
          add('导入链接解码自测', ok ? 'ok' : 'bad', ok ? '通过' : '失败');
        })
        .catch(function () {
          add('导入链接解码自测', 'bad', '失败');
        })
    );
  Promise.all(jobs).then(function () {
    done(R);
  });
}
/** 自测用的压缩导入链接内容：{"freebody":"import","version":1,"entries":[]}（deflate-raw + base64url） */
var SELF_Z = 'q1ZKK0pNTcpPqVSyUsrMLcgvKlHSUSpLLSrOzM9TsjLUUUrNKynKTC1WsoqOrQUA';
var STF_LAST = [];
function rSelftest() {
  var L = $('#stfList');
  if (!L) return;
  L.innerHTML = '<li class="mut">检测中…</li>';
  selfChecks(function (R) {
    STF_LAST = R;
    var n = { ok: 0, warn: 0, bad: 0 };
    R.forEach(function (r) {
      if (n[r.s] != null) n[r.s]++;
    });
    $('#stfSum').innerHTML =
      (n.bad ? '<span class="st-v bad">' + n.bad + ' 项异常</span>' : '<span class="st-v ok">未发现异常</span>') +
      '<span class="mut">通过 ' +
      n.ok +
      ' · 提醒 ' +
      n.warn +
      '</span>';
    var ic = { ok: 'ok', warn: 'alert', bad: 'alert', info: 'info' },
      lb = { ok: '通过', warn: '提醒', bad: '异常', info: '信息' };
    L.innerHTML = R.map(function (r) {
      return (
        '<li class="stf-it is-' +
        r.s +
        '">' +
        IC(ic[r.s]) +
        '<div><b>' +
        esc(r.k) +
        '</b><span class="sr">' +
        lb[r.s] +
        '：</span><span class="stf-v">' +
        esc(r.v) +
        '</span>' +
        (r.tip && r.s !== 'ok' ? '<span class="mut">' + esc(r.tip) + '</span>' : '') +
        '</div></li>'
      );
    }).join('');
  });
}
function selfReport() {
  return (
    'FreeBody 设备自检 ' +
    'v' +
    FB_VERSION +
    ' · ' +
    new Date().toISOString().slice(0, 16).replace('T', ' ') +
    '\n' +
    STF_LAST.map(function (r) {
      return '- [' + { ok: '通过', warn: '提醒', bad: '异常', info: '信息' }[r.s] + '] ' + r.k + '：' + r.v;
    }).join('\n')
  );
}
$('#stfRun').onclick = rSelftest;
(function () {
  var a = $('#aboutLine');
  if (a) a.textContent = 'FreeBody v' + FB_VERSION + ' · 数据只存本机 · 不构成医疗建议';
})();
$('#stfCopy').onclick = function () {
  var t = selfReport();
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(t).then(
      function () {
        toast('已复制报告');
      },
      function () {
        prompt('复制以下内容', t);
      }
    );
  else prompt('复制以下内容', t);
};
