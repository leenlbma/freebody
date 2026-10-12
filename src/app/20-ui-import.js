/* 20-ui-import.js — 导入预览页与心得 */
function rImp() {
  var h = '',
    b = $('#impBox');
  if (!b) return;
  SEC_LABEL.impPack = IMP.phase === 'preview' ? '导入预览' : IMP.phase === 'done' ? '导入完成' : '粘贴导入';
  var snt = document.querySelector('#subnav .sn-t');
  if (snt && cur === 'impPack') snt.textContent = SEC_LABEL.impPack;
  if (IMP.phase === 'paste') {
    h +=
      '<div class="card"><h2>粘贴导入</h2><p class="mut">粘贴 AI 教练生成的 FreeBody 导入包（JSON），或包含 <code>#import=</code> 的导入链接。内容只在本机解析，不经过任何服务器；确认前不会写入。</p>' +
      '<textarea id="ipText" rows="8" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="导入内容" placeholder=\'{"freebody":"import","version":1,"entries":[ … ]}\'>' +
      esc(IMP.text) +
      '</textarea>' +
      (IMP.err
        ? '<div class="alert bad imp-err" role="alert">' + IC('alert') + '<div>' + esc(IMP.err) + '</div></div>'
        : '') +
      '<div class="actions"><button id="ipGo">' +
      IC('search') +
      '预览</button>' +
      (navigator.clipboard && navigator.clipboard.readText
        ? '<button class="ghost" id="ipClip">' + IC('paste') + '从剪贴板粘贴</button>'
        : '') +
      '</div>' +
      '<p class="mut imp-foot">格式见仓库 docs/data-format.md。也可以让 AI 给出导入链接，在本机浏览器打开即可。</p></div>';
  } else if (IMP.phase === 'preview') {
    var c = impCount(),
      pk = IMP.pack || {},
      n = c['new'] + c.update + c.merge,
      byD = {};
    IMP.rows.forEach(function (r) {
      var k = r.date && IMP_D.test(r.date) ? r.date : '?';
      (byD[k] = byD[k] || []).push(r);
    });
    h +=
      '<div class="card imp-sum"><div class="hrow"><h2>导入预览</h2><span class="mut">' +
      IMP.rows.length +
      ' 条</span></div>' +
      (pk.source || pk.created
        ? '<p class="mut imp-src">' +
          IC('link') +
          '<span>' +
          (pk.source ? '来自 ' + esc(String(pk.source).slice(0, 60)) : '') +
          (pk.source && pk.created ? ' · ' : '') +
          (pk.created ? esc(String(pk.created).slice(0, 16).replace('T', ' ')) : '') +
          '</span></p>'
        : '') +
      '<div class="imp-stats">' +
      [
        ['new', '新增', c['new']],
        ['update', '合并', c.update + c.merge],
        ['same', '已存在', c.same],
        ['bad', '无效', c.bad]
      ]
        .map(function (x) {
          return (
            '<div class="imp-st st-' +
            x[0] +
            (x[2] ? '' : ' zero') +
            '"><b>' +
            x[2] +
            '</b><span>' +
            x[1] +
            '</span></div>'
          );
        })
        .join('') +
      '</div>' +
      (c.same ? '<p class="mut imp-note">已存在且内容相同的条目会跳过。</p>' : '') +
      (c.bad ? '<p class="imp-note bad-t">无效条目不会写入，原因见下方。</p>' : '') +
      '</div>';
    Object.keys(byD)
      .sort()
      .reverse()
      .forEach(function (d) {
        h +=
          '<div class="card imp-day"><h3>' +
          (d === '?' ? '日期无效' : impWd(d)) +
          '</h3><ul class="imp-list">' +
          byD[d]
            .map(function (r) {
              var ty = IMP_TYPES[r.type],
                st = IMP_ST[r.status];
              return (
                '<li class="imp-it is-' +
                r.status +
                '"><span class="imp-ic" aria-hidden="true">' +
                IC(ty ? ty[1] : 'alert') +
                '</span><div class="imp-tx"><b>' +
                esc(r.title) +
                '</b>' +
                (r.detail || r.tags.length
                  ? '<div class="mut">' +
                    r.tags
                      .map(function (t) {
                        return '<span class="tag est">' + esc(t) + '</span>';
                      })
                      .join('') +
                    esc(r.detail || '') +
                    '</div>'
                  : '') +
                (r.reason ? '<div class="bad-t">' + esc(r.reason) + '</div>' : '') +
                '</div>' +
                '<div class="imp-tg"><span class="tag st-' +
                r.status +
                '">' +
                st[0] +
                '</span></div></li>'
              );
            })
            .join('') +
          '</ul></div>';
      });
    h +=
      '<div class="imp-bar"><button id="ipOk"' +
      (n ? '' : ' disabled') +
      '>' +
      IC('check') +
      (n ? '确认导入 ' + n + ' 条' : '没有可导入的条目') +
      '</button><button class="ghost" id="ipNo">取消</button></div>';
  } else {
    var r = IMP.res || { n: 0, dates: [] },
      last = r.dates[r.dates.length - 1];
    h +=
      '<div class="card imp-done"><div class="imp-ok">' +
      IC('check') +
      '</div><h2>已导入 ' +
      r.n +
      ' 条</h2><p class="mut">可以在对应页面查看、修改或删除。' +
      (r.dates.length ? '日期 ' + md(r.dates[0]) + (r.dates[0] !== last ? '–' + md(last) : '') + '。' : '') +
      '</p>' +
      '<div class="actions"><button id="ipView">查看 ' +
      (last === today() ? '今天' : md(last || today())) +
      '</button><button class="ghost" id="ipUndo">撤销导入</button><button class="ghost" id="ipDone">完成</button></div></div>';
  }
  b.innerHTML = h;
}
document.addEventListener('click', function (e) {
  var t = e.target.closest && e.target.closest('#ipGo,#ipClip,#ipOk,#ipNo,#ipView,#ipUndo,#ipDone,#pasteImp');
  if (!t) return;
  var id = t.id;
  if (id === 'pasteImp') {
    impReset();
    show('impPack', true);
    setTimeout(function () {
      var x = $('#ipText');
      if (x) x.focus();
    }, 50);
  } else if (id === 'ipGo') {
    IMP.text = $('#ipText').value;
    if (!IMP.text.trim()) {
      IMP.err = '请先粘贴导入包内容。';
      rImp();
      return;
    }
    impLoad(IMP.text, false);
  } else if (id === 'ipClip') {
    navigator.clipboard.readText().then(
      function (x) {
        IMP.text = x || '';
        rImp();
        if (IMP.text.trim()) impLoad(IMP.text, false);
      },
      function () {
        toast('无法读取剪贴板，请手动粘贴');
      }
    );
  } else if (id === 'ipOk') impApply();
  else if (id === 'ipNo') {
    impClearHash();
    var v = IMP.viaLink;
    impReset();
    if (v) show('overview');
    else rImp();
  } else if (id === 'ipUndo') {
    if (IMP.undo && confirm('撤销这次导入？导入后的其他修改也会一并撤回。')) {
      S = JSON.parse(IMP.undo);
      IMP.undo = null;
      save();
      toast('已撤销');
      impReset();
      show('settings');
    }
  } else if (id === 'ipView') {
    var r = IMP.res;
    sel = r && r.dates.length ? r.dates[r.dates.length - 1] : today();
    $('#dSel').value = sel;
    impReset();
    show('overview');
  } else if (id === 'ipDone') {
    impReset();
    show('settings');
  }
});
document.addEventListener('input', function (e) {
  if (e.target && e.target.id === 'ipText') IMP.text = e.target.value;
});
function impFromHash() {
  var m = /^#import=(.+)$/.exec(location.hash || '');
  if (!m) return;
  IMP.text = '';
  impLoad(m[1], true);
}
window.addEventListener('hashchange', impFromHash);
/* 心得 */
function rNotes() {
  var L = S.notes.slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  $('#ntDate').textContent = impWd(sel);
  $('#ntList').innerHTML = L.length
    ? L.map(function (n) {
        return (
          '<li class="nt-it"><div class="nt-h"><b>' +
          esc(n.title || md(n.date)) +
          '</b><span class="mut">' +
          md(n.date) +
          (n.from ? ' · ' + esc(n.from) : '') +
          '</span><button class="ghost sm nt-del" data-delnote="' +
          esc(n.id) +
          '" aria-label="删除这条心得">' +
          IC('trash') +
          '</button></div><p>' +
          esc(n.text).replace(/\n/g, '<br>') +
          '</p>' +
          (n.tags && n.tags.length
            ? '<div class="nt-tags">' +
              n.tags
                .map(function (t) {
                  return '<span class="tag">' + esc(t) + '</span>';
                })
                .join('') +
              '</div>'
            : '') +
          '</li>'
        );
      }).join('')
    : '<li class="empty mut">还没有心得。可以在这里记下训练或饮食的体会，也可以让 AI 教练整理后导入。</li>';
}
$('#ntSave').onclick = function () {
  var t = $('#ntText').value.trim();
  if (!t) {
    toast('请先写点内容');
    return;
  }
  S.notes.push({ id: uid(), date: sel, title: '', text: t.slice(0, 2000), tags: [] });
  $('#ntText').value = '';
  save();
  toast('已保存');
  render();
};
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-delnote]');
  if (!b) return;
  if (!confirm('删除这条心得？')) return;
  var a = b.getAttribute('data-delnote');
  S.notes = S.notes.filter(function (x) {
    return x.id !== a;
  });
  save();
  render();
});
