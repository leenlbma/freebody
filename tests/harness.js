'use strict';
/**
 * 单元测试工具：把 src/app 中不依赖 DOM 的模块（00–04：常量、存储、工具、计算、导入）
 * 在 Node 的 vm 沙箱里按构建顺序拼接执行，返回其中的函数与状态。
 * 浏览器对象（localStorage、document 等）用最小桩代替；每次 load() 都是全新的独立环境。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'src', 'app');
const CORE = fs.readdirSync(APP).filter((n) => /^0\d-.*\.js$/.test(n)).sort();

function memStorage(init, quota) {
  const m = new Map(Object.entries(init || {}));
  const size = () => { let n = 0; for (const [k, v] of m) n += k.length + v.length; return n; };
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      v = String(v);
      if (quota && size() - (m.has(k) ? k.length + m.get(k).length : 0) + k.length + v.length > quota) {
        const e = new Error('quota'); e.name = 'QuotaExceededError'; e.code = 22; throw e;
      }
      m.set(k, v);
    },
    removeItem: (k) => { m.delete(k); },
    clear: () => m.clear(),
    _map: m,
  };
}

const EXPORTS = ['S', 'sel', 'META', 'STORE', 'LS_QUOTA', 'KEY', 'METAKEY', 'MUS', 'IMP', 'defaults', 'load', 'save', 'uid',
  'dayTot', 'dayMeals', 'otSignals', 'readiness', 'recWeek', 'nextTarget', 'exHistory', 'defInc', 'epley', 'calcTarget', 'tgtCfg',
  'muscleState', 'musclesOf', 'sleepDur', 'mealOfHour', 'impPlan', 'impRow', 'impApply', 'impCount', 'impStrip', 'impB64', 'impDecode',
  'quotaLevel', 'quotaPct', 'lsUsage', 'isQuotaErr', 'backupDue', 'hasUserData', 'firstDataDate', 'addDays', 'diffDays', 'today', 'demoData', 'DEMO', 'META'];

/**
 * @param {object} [opt]
 * @param {object} [opt.storage] 初始 localStorage 内容
 * @param {number} [opt.quota]   模拟的 localStorage 上限（字符数）
 * @param {string} [opt.hash]    模拟 location.hash（如 '#demo'）
 * @param {string} [opt.now]     固定「今天」，YYYY-MM-DD（默认 2026-10-12），时间为当天 12:00
 */
function load(opt) {
  opt = opt || {};
  const ls = memStorage(opt.storage, opt.quota);
  const calls = { toast: [], alert: [], render: 0 };
  const now = opt.now || '2026-10-12';
  const [Y, M, D] = now.split('-').map(Number);
  const fixed = new Date(Y, M - 1, D, 12, 0, 0).getTime();
  class FDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(fixed); }
    static now() { return fixed; }
  }
  const el = () => ({ textContent: '', innerHTML: '', value: '', classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, style: {}, setAttribute() {}, addEventListener() {} });
  const sandbox = {
    window: {}, localStorage: ls, navigator: { userAgent: 'node' }, location: { hash: opt.hash || '', pathname: '/', search: '' },
    history: { replaceState() {} }, document: { querySelector: el, querySelectorAll: () => [], documentElement: el(), addEventListener() {} },
    console, Date: FDate, Math, JSON, TextDecoder, Uint8Array, Response, Blob, atob, DecompressionStream: global.DecompressionStream, Promise,
    setTimeout, clearTimeout, getComputedStyle: () => ({ getPropertyValue: () => '' }),
    __calls: calls,
  };
  sandbox.window = sandbox;
  // UI 层函数在测试中不存在，用桩记录调用
  const stubs = 'function toast(m){__calls.toast.push(m);}function storeAlert(k){__calls.alert.push(k);}function rImp(){}function render(){__calls.render++;}function show(){}var cur="overview";var DT_WD=["周日","周一","周二","周三","周四","周五","周六"];\n';
  const src = CORE.map((n) => fs.readFileSync(path.join(APP, n), 'utf8')).join('');
  const tail = '\nwindow.__out={' + EXPORTS.map((k) => `get ${k}(){return typeof ${k}==='undefined'?undefined:${k};}`).join(',') +
    ',set S(v){S=v;},set sel(v){sel=v;},set META(v){META=v;}};';
  vm.createContext(sandbox);
  vm.runInContext('(function(){"use strict";' + stubs + src + tail + '})();', sandbox, { filename: 'src/app/00-04.js' });
  const api = sandbox.window.__out;
  api.storage = ls;
  api.calls = calls;
  return api;
}

module.exports = { load, memStorage };
