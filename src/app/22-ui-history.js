// SPDX-License-Identifier: MIT
/* 22-ui-history.js — 本机恢复点列表、完整性检查、恢复与导出 */
var historyRender = 0;
function rHistory() {
  var generation = ++historyRender,
    box = $('#historyList');
  $('#historyOn').checked = META.historyEnabled !== false;
  $('#historyOn').disabled = DEMO;
  $('#historyClear').disabled = DEMO;
  if (DEMO) {
    box.textContent = '演示模式不读取或写入恢复点。';
    return;
  }
  box.textContent = '正在读取本机恢复点…';
  VAULT.list().then(
    function (rows) {
      if (generation !== historyRender) return;
      var warning = VAULT.error()
        ? '<p class="alert warn">最近一次恢复点操作失败：' + esc(VAULT.error()) + '。请导出主记录留底。</p>'
        : '';
      box.innerHTML =
        warning +
        (rows.length
          ? '<ul class="list">' +
            rows
              .map(function (row) {
                return (
                  '<li><div><b>' +
                  esc(row.label) +
                  '</b><div class="mut">' +
                  esc(new Date(row.at).toLocaleString()) +
                  ' · ' +
                  fmtKB(row.bytes / 2) +
                  '</div></div><div class="actions"><button class="ghost sm" data-history-export="' +
                  esc(row.id) +
                  '">导出</button><button class="sm" data-history-restore="' +
                  esc(row.id) +
                  '">恢复</button></div></li>'
                );
              })
              .join('') +
            '</ul>'
          : '<p class="mut">还没有恢复点。记录保存成功后会自动生成。</p>');
      storeUIState();
    },
    function (e) {
      if (generation === historyRender) box.textContent = '恢复点不可用：' + e.message;
    }
  );
}
$('#historyCard').addEventListener('toggle', function () {
  if (this.open) rHistory();
});
$('#historyRefresh').onclick = rHistory;
$('#historyOn').onchange = function () {
  if (DEMO || !storeCanWrite(true)) {
    rHistory();
    return;
  }
  META.historyEnabled = $('#historyOn').checked;
  metaSave();
  if ($('#historyOn').checked && STORE.bad == null && STORE.err !== 'conflict') vaultCapture(null, JSON.stringify(S));
  rHistory();
};
$('#historyClear').onclick = function () {
  if (DEMO) return;
  if (!storeCanWrite(true) || !confirm('清空全部恢复点？当前记录会保留，清空后无法撤回。')) return;
  VAULT.clear().then(
    function () {
      toast('恢复点已清空，当前记录保留');
      rHistory();
    },
    function (e) {
      toast(e.message);
    }
  );
};
document.addEventListener('click', function (e) {
  var button = e.target.closest && e.target.closest('[data-history-export],[data-history-restore]');
  if (!button || DEMO) return;
  var restore = button.hasAttribute('data-history-restore'),
    id = button.getAttribute(restore ? 'data-history-restore' : 'data-history-export');
  if (restore && !storeCanWrite(true)) return;
  VAULT.read(id)
    .then(function (json) {
      var state = stateNormalize(JSON.parse(json), true);
      if (restore) {
        bkRestore(state);
        rHistory();
      } else {
        download('freebody-recovery-' + today() + '.json', JSON.stringify(state, null, 2), 'application/json');
        toast('恢复点已校验并导出');
      }
    })
    .catch(function (error) {
      toast(error.message);
    });
});
