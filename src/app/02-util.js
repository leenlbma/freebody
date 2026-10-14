// SPDX-License-Identifier: MIT
/* 02-util.js — 工具函数：转义、数字、日期、提示 */
/**
 * 按选择器取第一个元素。界面代码中多为表单控件，类型按表单控件处理（含 value / checked / files 等）。
 * @param {string} s CSS 选择器
 * @returns {FBEl}
 */
var $ = function (s) {
  return /** @type {any} */ (document.querySelector(s));
};
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function num(v) {
  var n = parseFloat(v);
  return isFinite(n) ? n : null;
}
function r1(n) {
  return Math.round(n * 10) / 10;
}
function pad(n) {
  return (n < 10 ? '0' : '') + n;
}
function fmt(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function parse(s) {
  var a = s.split('-');
  return new Date(+a[0], +a[1] - 1, +a[2]);
}
function addDays(s, n) {
  var d = parse(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}
function today() {
  return fmt(new Date());
}
function weekStart(s) {
  var d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return fmt(d);
}
function diffDays(a, b) {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);
}
var TOAST_T = 0;
function toast(m) {
  var t = $('#toast');
  t.textContent = m;
  t.classList.add('on');
  clearTimeout(TOAST_T);
  TOAST_T = setTimeout(function () {
    t.classList.remove('on');
  }, 2200);
}
function css(v) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
}
/** 根据设置中的身高计算 BMI 文本；未设置身高则不显示 */
function bmiTxt(w) {
  var hh = S.profile && S.profile.height;
  return hh ? ' · BMI ' + r1(w / (hh / 100) / (hh / 100)) : '';
}
function flagLabel() {
  return (S.profile && S.profile.injuryFlagLabel) || '伤处不适';
}
function allFoods() {
  return (FOOD_DB.foods || []).concat(S.customFoods || []);
}
function md(s) {
  return +s.slice(5, 7) + '/' + +s.slice(8, 10);
}
function avg(a) {
  a = a.filter(function (x) {
    return x != null && !isNaN(x);
  });
  return a.length
    ? a.reduce(function (s, x) {
        return s + x;
      }, 0) / a.length
    : null;
}
var sel = today();
var cur = 'overview';
