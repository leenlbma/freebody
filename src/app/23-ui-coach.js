// SPDX-License-Identifier: MIT
/* 23-ui-coach.js — 教练提示词：应用内复制、拒绝剪贴板时保留手动路径 */
var COACH_PROMPT = (window.FIT_DATA && window.FIT_DATA.coachPrompt) || '';
$('#coachPrompt').value = COACH_PROMPT;
function manualCoachCopy() {
  show('settings');
  $('#coachText').open = true;
  $('#coachPrompt').focus();
  $('#coachPrompt').select();
  toast('提示词已选中，可复制后发给你的 AI');
}
document.addEventListener('click', function (e) {
  var button = e.target.closest && e.target.closest('[data-coach]');
  if (!button) return;
  if (button.getAttribute('data-coach') === 'import') {
    impReset();
    show('impPack', true);
    $('#ipText').focus();
    return;
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    manualCoachCopy();
    return;
  }
  navigator.clipboard.writeText(COACH_PROMPT).then(function () {
    toast('已复制，发给你的 AI；完成后回来粘贴记录');
  }, manualCoachCopy);
});
