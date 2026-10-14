// SPDX-License-Identifier: MIT
/* 00-core.js — 常量、导航配置、预设 */
/** localStorage 键名；LEGACY_KEYS 用于从旧版本自动迁移 */
var KEY = 'freeBody_v1',
  LEGACY_KEYS = ['fitTracker_v1']; // 首次启动时自动从旧键名复制数据（旧键保留，不删除）
/** @type {{ foods: Food[], [k: string]: any }} 构建时注入的数据（见 scripts/build.js）；直接运行源码时为空 */
var FOOD_DB = (window.FIT_DATA && window.FIT_DATA.foods) || { foods: [] };
var EXAMPLE_PROFILES = (window.FIT_DATA && window.FIT_DATA.examples) || [];
/** 底部导航 4 个分组；HUB 分组的首页不显示子标签，详情页显示返回按钮 */
var ICONS = { today: 'home', train: 'train', data: 'chart', me: 'user' };
/** @type {Array<[string, string, string[]]>} 分组 id、名称、包含的页面 */
var GROUPS = [
  ['today', '今天', ['overview', 'diet', 'dietAdd', 'dietAI', 'dietFood']],
  ['train', '训练', ['train', 'cardio', 'perf']],
  ['data', '数据', ['data', 'body', 'nutri', 'tstats', 'sleep', 'hormone', 'injury', 'supp', 'notes']],
  ['me', '我的', ['settings', 'impPack', 'selftest']]
];
var HUB = { today: 'overview', data: 'data', me: 'settings' };
var SEC_LABEL = {
  overview: '今天',
  diet: '饮食',
  dietAdd: '添加食物',
  dietFood: '食物',
  dietAI: '拍照识别',
  train: '力量',
  cardio: '有氧',
  perf: '表现',
  data: '数据',
  body: '身体',
  nutri: '营养',
  tstats: '训练统计',
  muscle: '肌群恢复',
  sleep: '睡眠',
  supp: '补剂',
  hormone: '恢复/化验',
  injury: '伤病',
  settings: '我的',
  impPack: '粘贴导入',
  selftest: '设备自检',
  notes: '心得'
};
var lastSub = {};
/** 内联 SVG 图标（见 src/icons.js） */
function IC(n) {
  return window.FitIcons ? FitIcons.svg(n) : '';
}
var CH = window.FitCharts;
/** @type {Array<string[]>} */
var LAB_PRESETS = [
  ['皮质醇', 'µg/dL'],
  ['总睾酮', 'ng/dL'],
  ['游离睾酮', 'pg/mL'],
  ['TSH', 'mIU/L'],
  ['FT3', 'pmol/L'],
  ['FT4', 'pmol/L'],
  ['T3', 'nmol/L'],
  ['T4', 'nmol/L'],
  ['空腹胰岛素', 'µIU/mL'],
  ['空腹血糖', 'mmol/L'],
  ['IGF-1', 'ng/mL'],
  ['25(OH)维生素D', 'ng/mL'],
  ['SHBG', 'nmol/L'],
  ['肌酸激酶CK', 'U/L']
];
var EX_PRESETS = [
  '杠铃卧推',
  '哑铃卧推',
  '杠铃深蹲',
  '罗马尼亚硬拉',
  '硬拉',
  '高位下拉',
  '坐姿划船',
  '引体向上',
  '站姿推举',
  '腿举',
  '腿弯举',
  '侧平举',
  '二头弯举',
  '绳索下压',
  '平板支撑'
];
/* ---------- 钩子 ---------- */
/** 渲染、切换页面、切换主题之后要做的事（如可访问性补全、日期控件包装），由各模块注册，避免改写函数本身 */
var HOOKS = { render: [], show: [], theme: [], saved: [], reset: [] };
/** @param {'render' | 'show' | 'theme' | 'saved'} k */
function runHooks(k, payload) {
  HOOKS[k].forEach(function (f) {
    f(payload);
  });
}
