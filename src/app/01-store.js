/* 01-store.js — 存储：默认数据、读写 localStorage、存储安全（v2.6） */
function defaults() {
  return {
    v: 1,
    profile: { name: '', height: null, injuryFlagLabel: '伤处不适', swimNote: '', run800HistLabel: '' },
    goals: {
      kcal: 2200,
      p: 140,
      c: 260,
      f: 65,
      sleepH: 7,
      trainDays: 4,
      stairMin: 120,
      weight: null,
      mealSplit: { '早餐': 25, '午餐': 35, '晚餐': 30, '加餐': 10 }
    },
    meals: [],
    favFoods: [],
    workouts: [],
    cardio: [],
    recoveryStart: '',
    supps: [
      { id: uid(), name: '肌酸', dose: '5g', time: '每天固定时间' },
      { id: uid(), name: '乳清蛋白', dose: '', time: '练后/补足蛋白' },
      { id: uid(), name: '维生素D', dose: '', time: '随餐' },
      { id: uid(), name: '鱼油 Omega-3', dose: '', time: '随餐' },
      { id: uid(), name: '镁', dose: '', time: '睡前' }
    ],
    swims: [],
    pb100br: [],
    run800: [],
    run800Hist: null,
    perfEvents: [{ id: 'vj', name: '纵跳', unit: 'cm', better: 'higher', hist: null }],
    perfLog: [],
    // 伤病：默认空，可在设置中加载示例配置
    plans: [],
    sessions: [],
    active: null,
    exRules: {},
    injuries: [],
    wristLog: [],
    rehabLog: {},
    rehab: [],
    restricted: [],
    customFoods: [],
    suppLog: {},
    sleep: [],
    body: [],
    recov: [],
    labs: [],
    notes: [],
    theme: 'auto',
    motion: 'auto'
  };
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
/** @type {State} */
var S;
/** 地址带 #demo 时进入演示模式（见 05-demo.js）：数据只在内存中，不读写本机存储，退出或关闭页面后消失 */
var DEMO = /^#demo(&|$)/.test(location.hash || '');
function load() {
  var d = defaults(),
    raw = null;
  STORE.bad = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw == null) {
      for (var li = 0; li < LEGACY_KEYS.length; li++) {
        raw = localStorage.getItem(LEGACY_KEYS[li]);
        if (raw != null) {
          localStorage.setItem(KEY, raw);
          break;
        }
      }
    }
    var r = JSON.parse(raw || 'null');
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      for (var k in d) {
        if (r[k] === undefined) r[k] = d[k];
      }
      if (!r.goals || typeof r.goals !== 'object') r.goals = d.goals;
      if (!r.profile || typeof r.profile !== 'object') r.profile = d.profile;
      for (var g in d.goals) {
        if (r.goals[g] === undefined) r.goals[g] = d.goals[g];
      }
      for (var pk in d.profile) {
        if (r.profile[pk] === undefined) r.profile[pk] = d.profile[pk];
      }
      return r;
    }
    if (raw != null && raw !== 'null') STORE.bad = raw; // 能解析但不是对象，同样视为损坏
  } catch (e) {
    if (raw != null) STORE.bad = raw;
  }
  return d;
}
/* ---------- 存储安全（v2.6）：用量预警 / 写满兜底 / 备份提醒 / 持久存储 ---------- */
/** 辅助状态单独存放（不进入备份）：firstUse、lastBackup、已提示的用量阈值、备份提醒的推迟日期 */
var METAKEY = 'freeBody_meta_v1';
/** localStorage 上限按约 5 MB（UTF-16，每字符 2 字节）保守估算，单位：字符。各浏览器实际上限不同，仅用于提前预警 */
var LS_QUOTA = 2621440,
  QUOTA_STEPS = [70, 90],
  BACKUP_DAYS = 30;
/** bad：本机数据无法解析时保存原文，期间 save() 不写入，避免用默认值覆盖用户数据 */
var STORE = { err: null, used: 0, pct: 0, persist: null, banner: null, bad: null };
function metaLoad() {
  var m = null;
  try {
    m = JSON.parse(localStorage.getItem(METAKEY) || 'null');
  } catch (e) {}
  return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
}
var META = DEMO ? {} : metaLoad();
function metaSave() {
  if (DEMO) return;
  try {
    localStorage.setItem(METAKEY, JSON.stringify(META));
  } catch (e) {}
}
/** 写满判断：各浏览器的名称 / 错误码不同 */
function isQuotaErr(e) {
  return (
    !!e &&
    (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014)
  );
}
/** 估算本应用在 localStorage 中占用的字符数（键 + 值）；json 为即将写入的主数据 */
function lsUsage(json) {
  var n = KEY.length + (json == null ? 0 : json.length);
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k === KEY) continue;
      n += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch (e) {}
  return n;
}
function quotaPct(used, quota) {
  return Math.min(100, Math.round((used / (quota || LS_QUOTA)) * 100));
}
/** 应提示的用量阈值（90 / 70），没有则 0。每个阈值只提示一次（记在 warned），回落到阈值 5 个百分点以下后重新计入 */
function quotaLevel(pct, warned) {
  var w = warned || {};
  QUOTA_STEPS.forEach(function (t) {
    if (pct < t - 5) delete w[t];
  });
  for (var i = QUOTA_STEPS.length - 1; i >= 0; i--) {
    var t = QUOTA_STEPS[i];
    if (pct >= t) {
      if (w[t]) return 0;
      for (var j = 0; j <= i; j++) w[QUOTA_STEPS[j]] = 1;
      return t;
    }
  }
  return 0;
}
/** 是否该提醒备份：有数据，且距上次备份（从未备份时按首次使用日）满 30 天，且不在推迟期内 */
function backupDue(meta, day, hasData) {
  if (!hasData) return false;
  var ref = meta.lastBackup || meta.firstUse;
  if (!ref) return false;
  if (meta.snooze && meta.snooze > day) return false;
  return diffDays(ref, day) >= BACKUP_DAYS;
}
/** 最早的记录日期（用于从未备份时的提醒起点） */
function firstDataDate(s) {
  var m = null;
  ['meals', 'workouts', 'cardio', 'sleep', 'body', 'recov', 'labs', 'notes', 'wristLog'].forEach(function (k) {
    (s[k] || []).forEach(function (x) {
      if (x && typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) && (!m || x.date < m)) m = x.date;
    });
  });
  return m;
}
function hasUserData(s) {
  return (
    ['meals', 'workouts', 'cardio', 'sleep', 'body', 'recov', 'labs', 'notes', 'sessions', 'wristLog'].some(
      function (k) {
        return s[k] && s[k].length;
      }
    ) || Object.keys(s.suppLog || {}).length > 0
  );
}
/** 保存：写满时保留内存中的数据并给出导出出口；成功后更新用量并按阈值预警 */
function save() {
  if (DEMO) return true;
  if (STORE.bad != null) {
    storeAlert('corrupt');
    return false;
  }
  var json = JSON.stringify(S);
  try {
    localStorage.setItem(KEY, json);
  } catch (e) {
    if (isQuotaErr(e)) {
      STORE.err = 'quota';
      storeAlert('quota');
    } else toast('保存失败：' + e.message);
    return false;
  }
  if (STORE.err) {
    STORE.err = null;
    if (STORE.banner === 'quota') {
      STORE.banner = null;
      if (typeof rStoreBanner === 'function') rStoreBanner();
    }
  }
  STORE.used = lsUsage(json);
  STORE.pct = quotaPct(STORE.used);
  var w = META.warned || (META.warned = {}),
    before = JSON.stringify(w),
    lv = quotaLevel(STORE.pct, w),
    dirty = JSON.stringify(w) !== before;
  if (!META.firstUse) {
    META.firstUse = firstDataDate(S) || today();
    dirty = true;
  }
  if (dirty) metaSave();
  if (lv) storeAlert(lv);
  return true;
}
