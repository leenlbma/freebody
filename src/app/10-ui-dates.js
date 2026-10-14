// SPDX-License-Identifier: MIT
/* 10-ui-dates.js — 共用的紧凑日期入口与日期选择面板 */
var dateDialog = /** @type {HTMLDialogElement} */ (document.getElementById('dateDialog'));
var dateTarget = null;
var dateOpener = null;
function datePageVisible() {
  return ['settings', 'impPack', 'selftest', 'notes'].indexOf(cur) < 0;
}
function dateText(value, relative) {
  if (!value) return '选择日期';
  if (relative && value === today()) return '今天';
  if (relative && value === addDays(today(), -1)) return '昨天';
  var d = parse(value);
  return (
    (d.getFullYear() === new Date().getFullYear() ? '' : d.getFullYear() + '年') +
    (d.getMonth() + 1) +
    '月' +
    d.getDate() +
    '日'
  );
}
function syncRecordDates() {
  document.querySelectorAll('input[data-date-follow]').forEach(function (el) {
    if (!el.hasAttribute('data-date-override')) el.value = sel;
  });
}
function resetRecordDate(id) {
  var el = $('#' + id);
  el.removeAttribute('data-date-override');
  el.value = sel;
}
function setSelectedDate(value, redraw) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || fmt(parse(value)) !== value) return;
  // 再选当前日期相当于关闭面板，不重绘并清空尚未提交的表单。
  if (value === sel) return;
  sel = value;
  syncRecordDates();
  if (redraw !== false) render();
}
function dateShell() {
  var visible = datePageVisible(),
    isToday = sel === today();
  $('#dTrigger').hidden = !visible;
  $('#dTriggerText').textContent = dateText(sel, true);
  $('#dTrigger').setAttribute('aria-label', dateText(sel, true) + '，页面日期：' + dateText(sel, false) + '，选择日期');
  $('#dateContext').hidden = !visible || isToday;
  $('#dateContextText').textContent =
    (['data', 'nutri', 'tstats'].indexOf(cur) >= 0 ? '统计截至：' : '页面日期：') + dateText(sel, false);
  if (!dateDialog.open) $('#dSel').value = sel;
}
function syncDateField(el) {
  var button = $('#' + el.id + 'Trigger');
  if (!button) return;
  var custom = el.hasAttribute('data-date-override');
  button.querySelector('.date-value').textContent =
    (el.hasAttribute('data-date-follow') ? (custom ? '本条日期：' : '记录日期：') : '') + dateText(el.value, !custom);
  button.setAttribute(
    'aria-label',
    button.querySelector('.date-value').textContent +
      '，' +
      (el.getAttribute('aria-label') || '日期') +
      '：' +
      dateText(el.value, false) +
      '，更改日期'
  );
  button.classList.toggle('date-custom', custom);
}
function wrapDateField(el) {
  if (!el.parentNode.classList.contains('date-field')) {
    var w = document.createElement('span'),
      button = document.createElement('button');
    var label = document.querySelector('label[for="' + el.id + '"]');
    w.className = 'date-field';
    el.parentNode.insertBefore(w, el);
    button.type = 'button';
    button.id = el.id + 'Trigger';
    button.className = 'ghost date-trigger';
    button.setAttribute('data-date-for', el.id);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', 'dateDialog');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = IC('calendar') + '<span class="date-value"></span>' + IC('down');
    if (label) {
      if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', label.textContent.trim());
      label.setAttribute('for', button.id);
    }
    el.hidden = true;
    w.appendChild(el);
    w.appendChild(button);
    dtWatch(el);
  }
  syncDateField(el);
}
function openDatePicker(target, opener) {
  if (dateDialog.open) return;
  dateTarget = target;
  dateOpener = opener;
  $('#dateTitle').textContent = target ? target.getAttribute('aria-label') || '选择日期' : '选择页面日期';
  $('#dateScope').textContent = target
    ? target.hasAttribute('data-date-follow')
      ? '仅用于这条记录，不改变页面日期。'
      : '设置恢复训练的起始日期。'
    : '页面记录与统计会跟随所选日期。';
  $('#dateFollow').hidden = !target || !target.hasAttribute('data-date-follow');
  $('#dateFollow').textContent = '跟随页面日期 · ' + dateText(sel, true);
  $('#dateClear').hidden = !target || target.hasAttribute('data-date-follow');
  $('#dSel').value = target ? target.value || sel : sel;
  $('#dateApply').textContent = target ? '使用此日期' : '查看这一天';
  opener.setAttribute('aria-expanded', 'true');
  dateDialog.showModal();
  document.body.classList.add('date-open');
}
function applyPickedDate(value, follow) {
  if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || fmt(parse(value)) !== value)) return;
  var target = dateTarget;
  dateDialog.close();
  if (target) {
    if (target.hasAttribute('data-date-follow')) {
      if (follow) target.removeAttribute('data-date-override');
      else target.setAttribute('data-date-override', '');
    }
    target.value = value;
    dtSync(target);
  } else if (value) setSelectedDate(value);
}
$('#dTrigger').onclick = function () {
  openDatePicker(null, this);
};
$('#dToday').onclick = function () {
  setSelectedDate(today());
  $('#dTrigger').focus({ preventScroll: true });
};
$('#dateClose').onclick = function () {
  dateDialog.close();
};
$('#dateApply').onclick = function () {
  if ($('#dSel').reportValidity()) applyPickedDate($('#dSel').value);
};
$('#dateFollow').onclick = function () {
  applyPickedDate(sel, true);
};
$('#dateClear').onclick = function () {
  applyPickedDate('');
};
$('#dPrev').onclick = function () {
  $('#dSel').value = addDays($('#dSel').value || sel, -1);
};
$('#dNext').onclick = function () {
  $('#dSel').value = addDays($('#dSel').value || sel, 1);
};
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-date-for], [data-date-quick]');
  if (!b) return;
  if (b.hasAttribute('data-date-for')) openDatePicker($('#' + b.getAttribute('data-date-for')), b);
  else applyPickedDate(addDays(today(), +b.getAttribute('data-date-quick')));
});
dateDialog.addEventListener('click', function (e) {
  if (e.target !== dateDialog) return;
  var r = dateDialog.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dateDialog.close();
});
dateDialog.addEventListener('keydown', function (e) {
  // 面板内的方向键和 Esc 交给日期输入与原生 dialog，不触发应用切页快捷键。
  e.stopPropagation();
  if (e.key === 'Enter' && e.target.id === 'dSel') {
    e.preventDefault();
    $('#dateApply').click();
  }
});
dateDialog.addEventListener('close', function () {
  document.body.classList.remove('date-open');
  if (dateOpener && dateOpener.isConnected) {
    dateOpener.setAttribute('aria-expanded', 'false');
    dateOpener.focus({ preventScroll: true });
  }
  dateTarget = null;
  $('#dSel').value = sel;
});
