'use strict';
/**
 * 单元测试工具：把 src/app 中不依赖 DOM 的模块（00–09：常量、存储、工具、计算、导入、演示数据、初始化）
 * 在 Node 的 vm 沙箱里按构建顺序拼接执行，返回其中的函数与状态。
 * 浏览器对象（localStorage、document 等）用最小桩代替；每次 load() 都是全新的独立环境。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'src', 'app');
const CORE = fs
  .readdirSync(APP)
  .filter((n) => /^0\d-.*\.js$/.test(n))
  .sort();

function memStorage(init, quota) {
  const m = new Map(Object.entries(init || {}));
  const size = () => {
    let n = 0;
    for (const [k, v] of m) n += k.length + v.length;
    return n;
  };
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      v = String(v);
      if (quota && size() - (m.has(k) ? k.length + m.get(k).length : 0) + k.length + v.length > quota) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        e.code = 22;
        throw e;
      }
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
    clear: () => m.clear(),
    _map: m
  };
}

const EXPORTS = [
  'S',
  'sel',
  'META',
  'STORE',
  'LS_QUOTA',
  'KEY',
  'METAKEY',
  'MUS',
  'IMP',
  'defaults',
  'load',
  'save',
  'uid',
  'dayTot',
  'dayMeals',
  'otSignals',
  'readiness',
  'recWeek',
  'nextTarget',
  'exHistory',
  'defInc',
  'epley',
  'calcTarget',
  'tgtCfg',
  'muscleState',
  'musclesOf',
  'sleepDur',
  'mealOfHour',
  'impPlan',
  'impRow',
  'impApply',
  'impCount',
  'impStrip',
  'impB64',
  'impDecode',
  'quotaLevel',
  'quotaPct',
  'lsUsage',
  'isQuotaErr',
  'backupDue',
  'hasUserData',
  'firstDataDate',
  'addDays',
  'diffDays',
  'today',
  'demoData',
  'parseQuick',
  'matchFood',
  'normName',
  'importCSV',
  'parseCSV',
  'normDate',
  'normTime',
  'parseT',
  'fmtT',
  'weekInfo',
  'weekStart',
  'dayVol',
  'recAdvice',
  'esc',
  'num',
  'r1',
  'fromFood',
  'unitsOf',
  'per100',
  'impLinkPart',
  'FOOD_DB',
  'DEMO',
  'META'
];

/**
 * @param {object} [opt]
 * @param {object} [opt.storage] 初始 localStorage 内容
 * @param {number} [opt.quota]   模拟的 localStorage 上限（字符数）
 * @param {string} [opt.hash]    模拟 location.hash（如 '#demo'）
 * @param {string} [opt.now]     固定「今天」，YYYY-MM-DD（默认 2026-10-12），时间为当天 12:00
 * @param {boolean} [opt.foods]  载入 data/foods.json 作为内置食物库
 * @param {boolean} [opt.confirm] confirm() 的返回值（默认 true）
 */
function load(opt) {
  opt = opt || {};
  const ls = memStorage(opt.storage, opt.quota);
  const calls = { toast: [], alert: [], render: 0 };
  const now = opt.now || '2026-10-12';
  const [Y, M, D] = now.split('-').map(Number);
  const fixed = new Date(Y, M - 1, D, 12, 0, 0).getTime();
  class FDate extends Date {
    constructor(...a) {
      if (a.length) super(...a);
      else super(fixed);
    }
    static now() {
      return fixed;
    }
  }
  const el = () => ({
    textContent: '',
    innerHTML: '',
    value: '',
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    style: {},
    setAttribute() {},
    addEventListener() {}
  });
  const sandbox = {
    window: {},
    localStorage: ls,
    navigator: { userAgent: 'node' },
    location: { hash: opt.hash || '', pathname: '/', search: '' },
    history: { replaceState() {} },
    document: { querySelector: el, querySelectorAll: () => [], documentElement: el(), addEventListener() {} },
    console,
    Date: FDate,
    Math,
    JSON,
    TextDecoder,
    Uint8Array,
    Response,
    Blob,
    atob,
    DecompressionStream: global.DecompressionStream,
    Promise,
    setTimeout,
    clearTimeout,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    confirm: () => opt.confirm !== false,
    __calls: calls
  };
  if (opt.foods) {
    sandbox.FIT_DATA = {
      foods: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'foods.json'), 'utf8')),
      examples: []
    };
  }
  sandbox.window = sandbox;
  // UI 层函数在测试中不存在，用桩记录调用
  const stubs =
    'function toast(m){__calls.toast.push(m);}function storeAlert(k){__calls.alert.push(k);}function rImp(){}function render(){__calls.render++;}function show(){}var cur="overview";var DT_WD=["周日","周一","周二","周三","周四","周五","周六"];\n';
  const tail =
    '\nwindow.__out={' +
    EXPORTS.map((k) => `get ${k}(){return typeof ${k}==='undefined'?undefined:${k};}`).join(',') +
    ',set S(v){S=v;},set sel(v){sel=v;},set META(v){META=v;}};';
  vm.createContext(sandbox);
  // 每个模块单独以真实文件名执行，覆盖率与报错行号都能对应到源文件。
  // 浏览器里各模块拼在同一个函数作用域内；这里各脚本共享上下文的全局作用域，效果相同。
  vm.runInContext('"use strict";' + stubs, sandbox, { filename: 'harness-stubs.js' });
  for (const n of CORE) {
    const file = path.join(APP, n);
    vm.runInContext('"use strict";' + fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  }
  vm.runInContext('"use strict";' + tail, sandbox, { filename: 'harness-exports.js' });
  const api = sandbox.window.__out;
  api.storage = ls;
  api.calls = calls;
  return api;
}

module.exports = { load, memStorage };
