// SPDX-License-Identifier: MIT
/* 19-ui-ai.js — 拍照识别（v2.4） */
/* ---------- 拍照识别（v2.4）：模型 API 配置 / 照片压缩 / 识别 / 确认后记录 ----------
 * 配置单独存于 localStorage「freeBody_ai_v1」，不进入主数据 S；导出时默认去掉 key。
 * 所有服务商均走 OpenAI 兼容的 POST {baseUrl}/chat/completions，图片以 data URL 内联发送。
 * 照片只在内存中压缩和发送，不写入本地存储。提示词与解析逻辑为本项目自行编写。 */
var AIKEY = 'freeBody_ai_v1';
/** @type {Array<[string, string, string, string, string[], string]>} id、名称、接口地址、默认模型、可选模型、说明 */
var AI_PROV = [
  [
    'zhipu',
    '智谱 GLM',
    'https://open.bigmodel.cn/api/paas/v4',
    'glm-4.6v-flash',
    ['glm-4.6v-flash', 'glm-4v-flash', 'glm-4.6v'],
    '在智谱开放平台（open.bigmodel.cn）创建 API Key。注意：glm-4v-flash 只接受图片链接、不支持本机照片（Base64），且仅 1 张图，建议用 glm-4.6v-flash。'
  ],
  [
    'qwen',
    '通义千问 Qwen',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'qwen-vl-plus',
    ['qwen-vl-plus', 'qwen-vl-max'],
    '在阿里云百炼（DashScope）控制台创建 API Key，使用 OpenAI 兼容模式。'
  ],
  [
    'gemini',
    'Google Gemini',
    'https://generativelanguage.googleapis.com/v1beta/openai',
    'gemini-flash-latest',
    ['gemini-flash-latest', 'gemini-3.5-flash-lite'],
    '在 Google AI Studio 创建 API Key，使用 OpenAI 兼容接口。部分网络环境无法直接访问。'
  ],
  [
    'custom',
    '自定义（OpenAI 兼容）',
    '',
    '',
    [],
    '填写兼容 OpenAI Chat Completions 的接口地址（不含 /chat/completions）和支持图片输入的模型名。该服务需允许浏览器跨域访问（CORS）。'
  ]
];
function aiProv(id) {
  return (
    AI_PROV.find(function (p) {
      return p[0] === id;
    }) || AI_PROV[0]
  );
}
function aiLoad() {
  var c = null;
  try {
    c = JSON.parse(localStorage.getItem(AIKEY) || 'null');
  } catch (e) {}
  if (!c || typeof c !== 'object') c = {};
  var p = aiProv(c.prov);
  return {
    prov: p[0],
    base: typeof c.base === 'string' ? c.base : p[2],
    model: typeof c.model === 'string' ? c.model : p[3],
    key: typeof c.key === 'string' ? c.key : '',
    incKey: !!c.incKey
  };
}
var AIC = aiLoad();
function aiSave() {
  try {
    localStorage.setItem(AIKEY, JSON.stringify(AIC));
  } catch (e) {
    toast('保存失败：' + e.message);
  }
}
function aiReady() {
  return !!(AIC.key && AIC.base && AIC.model);
}
function aiProvName() {
  return aiProv(AIC.prov)[1];
}
/** 导出用：默认不含 key */
function aiExport() {
  var o = { prov: AIC.prov, base: AIC.base, model: AIC.model };
  if (AIC.incKey && AIC.key) {
    o.key = AIC.key;
    o.incKey = true;
  }
  return o;
}
/** 导入备份：恢复服务商与模型；备份中没有 key 时保留本机已有 key */
function aiImport(c) {
  if (!c || typeof c !== 'object') return;
  var p = aiProv(c.prov);
  AIC.prov = p[0];
  if (typeof c.base === 'string') AIC.base = c.base;
  if (typeof c.model === 'string') AIC.model = c.model;
  if (typeof c.key === 'string' && c.key) AIC.key = c.key;
  AIC.incKey = !!c.incKey;
  aiSave();
}
function aiWeakModel() {
  return /^glm-4v-flash$/i.test(AIC.model || '');
}

/* 设置卡片 */
$('#aiProv').innerHTML = AI_PROV.map(function (p) {
  return '<option value="' + p[0] + '">' + esc(p[1]) + '</option>';
}).join('');
function aiForm() {
  var p = aiProv($('#aiProv').value);
  $('#aiModels').innerHTML = p[4]
    .map(function (m) {
      return '<option value="' + esc(m) + '">';
    })
    .join('');
  $('#aiHelp').textContent = p[5];
  $('#aiBase').readOnly = false;
}
function rAiCard() {
  $('#aiProv').value = AIC.prov;
  aiForm();
  $('#aiBase').value = AIC.base;
  $('#aiModel').value = AIC.model;
  $('#aiKey').value = AIC.key;
  $('#aiIncKey').checked = AIC.incKey;
  $('#aiSum').textContent = aiReady() ? aiProvName() + ' · ' + AIC.model : '未配置';
  $('#aiClear').disabled = !AIC.key;
}
$('#aiProv').addEventListener('change', function () {
  var p = aiProv(this.value);
  $('#aiBase').value = p[2];
  $('#aiModel').value = p[3];
  aiForm();
  $('#aiTestOut').innerHTML = '';
});
$('#aiEye').onclick = function () {
  var k = $('#aiKey'),
    show = k.type === 'password';
  k.type = show ? 'text' : 'password';
  this.textContent = show ? '隐藏' : '显示';
};
function aiFromForm() {
  var base = $('#aiBase')
    .value.trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '');
  if (base && !/^https?:\/\//i.test(base)) {
    toast('接口地址需以 https:// 开头');
    return false;
  }
  AIC.prov = $('#aiProv').value;
  AIC.base = base;
  AIC.model = $('#aiModel').value.trim();
  AIC.key = $('#aiKey').value.trim();
  AIC.incKey = $('#aiIncKey').checked;
  return true;
}
$('#aiSave').onclick = function () {
  if (!aiFromForm()) return;
  aiSave();
  rAiCard();
  toast(aiReady() ? '已保存（仅本机）' : '已保存，尚缺 ' + (!AIC.key ? 'API Key' : !AIC.base ? '接口地址' : '模型'));
};
$('#aiClear').onclick = function () {
  if (!confirm('清除本机保存的 API Key？')) return;
  AIC.key = '';
  aiSave();
  rAiCard();
  $('#aiTestOut').innerHTML = '';
  toast('已清除 Key');
};
$('#aiTest').onclick = function () {
  if (!aiFromForm()) return;
  var out = $('#aiTestOut'),
    btn = this;
  if (!aiReady()) {
    out.innerHTML = '<div class="alert warn">请先填写接口地址、模型和 API Key。</div>';
    return;
  }
  btn.disabled = true;
  out.innerHTML = '<div class="mut ai-wait">正在连接 ' + esc(aiProvName()) + '…</div>';
  var t0 = Date.now();
  aiCall([{ role: 'user', content: '连接测试，请只回复：OK' }], { max: 16, timeout: 20000 })
    .then(function () {
      aiSave();
      rAiCard();
      out.innerHTML =
        '<div class="alert ok">' +
        IC('ok') +
        '连接成功 · ' +
        esc(AIC.model) +
        ' · ' +
        (Date.now() - t0) +
        ' ms。配置已保存。' +
        (aiWeakModel() ? '<br>该模型不支持本机照片，拍照识别请改用 glm-4.6v-flash。' : '') +
        '</div>';
    })
    .catch(function (e) {
      var m = aiErr(e);
      out.innerHTML = '<div class="alert bad"><b>' + esc(m.t) + '</b><div>' + esc(m.d) + '</div></div>';
    })
    .then(function () {
      btn.disabled = false;
    });
};

/* 网络请求 */
function aiCall(messages, opt) {
  opt = opt || {};
  if (navigator.onLine === false) return Promise.reject({ kind: 'offline' });
  var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null,
    timedOut = false,
    tm = setTimeout(function () {
      timedOut = true;
      if (ctrl) ctrl.abort();
    }, opt.timeout || 60000);
  if (opt.onCtrl) opt.onCtrl(ctrl);
  var body = { model: AIC.model, messages: messages, temperature: 0.2, max_tokens: opt.max || 1500 };
  return fetch(AIC.base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AIC.key },
    body: JSON.stringify(body),
    signal: ctrl ? ctrl.signal : undefined
  })
    .then(
      function (r) {
        return r.text().then(function (tx) {
          var j = null;
          try {
            j = JSON.parse(tx);
          } catch (e) {}
          if (!r.ok) {
            var em = (j && ((j.error && (j.error.message || j.error.code)) || j.message || j.msg)) || tx;
            throw { kind: 'http', status: r.status, msg: String(em || '').slice(0, 160) };
          }
          var c = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          if (Array.isArray(c))
            c = c
              .map(function (x) {
                return typeof x === 'string' ? x : (x && x.text) || '';
              })
              .join('');
          if (typeof c !== 'string') throw { kind: 'parse', msg: '响应中没有 choices[0].message.content' };
          return c;
        });
      },
      function (e) {
        if (e && e.name === 'AbortError') throw { kind: timedOut ? 'timeout' : 'cancel' };
        throw { kind: 'network', msg: (e && e.message) || '' };
      }
    )
    .then(
      function (c) {
        clearTimeout(tm);
        return c;
      },
      function (e) {
        clearTimeout(tm);
        throw e;
      }
    );
}
/** 错误分类：标题 + 说明（均为纯文本） */
function aiErr(e) {
  e = e || {};
  var k = e.kind,
    s = e.status,
    srv = e.msg ? '（服务商返回：' + e.msg + '）' : '';
  if (k === 'offline') return { t: '当前没有网络', d: '拍照识别需要联网。可以先用手动或快速输入记录，联网后再试。' };
  if (k === 'timeout') return { t: '请求超时', d: '服务商长时间没有响应。可稍后重试，或改用手动记录。' };
  if (k === 'cancel') return { t: '已取消', d: '' };
  if (k === 'network')
    return {
      t: '无法连接到服务商',
      d: '可能是网络不通、接口地址填写有误，或该服务不允许浏览器直接访问（跨域 CORS 被拦截）。预设服务商均支持浏览器访问；自定义服务需开启 CORS。也可以改用手动记录。'
    };
  if (k === 'parse') return { t: '识别结果无法解析', d: '模型没有按约定格式返回。可点「重试」，或换一个模型。' + srv };
  if (k === 'nokey')
    return { t: '还没有配置模型 API', d: '请在「我的 › 拍照识别 · 模型 API」中选择服务商并填写 API Key。' };
  if (s === 401 || s === 403)
    return { t: 'API Key 无效或没有权限', d: '请检查 Key 是否正确、是否已开通该模型。' + srv };
  if (s === 404) return { t: '接口地址或模型名不存在', d: '请检查 baseUrl（不含 /chat/completions）和模型名。' + srv };
  if (s === 429) return { t: '请求过于频繁或额度不足', d: '请稍后再试，或检查账户余额与免费额度。' + srv };
  if (s === 400 || s === 413 || s === 422)
    return { t: '请求被服务商拒绝', d: '可能是该模型不支持图片或本机照片（Base64）、图片过大或参数不受支持。' + srv };
  if (s >= 500) return { t: '服务商暂时不可用（' + s + '）', d: '请稍后重试。' + srv };
  return { t: '识别失败', d: (s ? 'HTTP ' + s + ' ' : '') + (e.msg || e.message || '') };
}

/* 提示词（本项目自写）：只要求固定 JSON；营养数值优先用本地食物库，模型数值仅作兜底 */
var AI_SYS =
  '你是饮食记录助手，只根据照片估计食物的种类和重量，不提供营养或医疗建议。\n' +
  '只输出一个 JSON 对象，不要输出 Markdown 代码块或任何其他文字。格式：\n' +
  '{"items":[{"name":"食物中文名","grams":数字,"leftRatio":数字,"per100g":{"kcal":数字,"p":数字,"c":数字,"f":数字},"confidence":数字}],"note":"一句话说明"}\n' +
  '规则：\n' +
  '1. name 使用常见的中文菜名或食材名，例如「米饭」「番茄炒蛋」「清炒西兰花」，不加形容词或品牌；同一道菜合并为一项，米饭、汤、饮料等分别列出。\n' +
  '2. grams 为该食物在第一张照片中可食部分的熟重（克，整数），参考碗盘、餐具、手或包装的大小估计。\n' +
  '3. leftRatio 为吃完后剩下的比例，0 到 1。只有一张照片时填 0；有两张照片时，第一张是吃前、第二张是吃后，按第二张中剩下的量估计：吃光填 0，没动填 1。\n' +
  '4. per100g 为每 100 克可食部分的估计值：kcal 为千卡，p 蛋白质、c 碳水化合物、f 脂肪，单位为克，保留一位小数。\n' +
  '5. confidence 为你对名称和重量判断的把握，0 到 1。\n' +
  '6. 饮料按 1 毫升约等于 1 克。看不清或不是食物的物品不要列出；照片里没有食物时 items 为空数组，并在 note 中说明。';
function aiUserMsg(imgs) {
  var two = imgs.length > 1,
    /** @type {Array<Object<string, any>>} */
    c = [
      {
        type: 'text',
        text: two
          ? '下面两张照片：第一张是吃前，第二张是吃后。请列出吃前的每样食物，并估计每样剩下的比例。'
          : '下面是一餐的照片，请列出其中的每样食物。'
      }
    ];
  imgs.forEach(function (u) {
    c.push({ type: 'image_url', image_url: { url: u } });
  });
  return { role: 'user', content: c };
}
function aiNum(v, lo, hi, d) {
  var n = parseFloat(v);
  if (isNaN(n)) return d;
  return Math.min(hi, Math.max(lo, n));
}
/** 解析模型输出：容忍代码块包裹与前后多余文字 */
function aiParse(txt) {
  var s = String(txt || '')
      .replace(/```(?:json)?/gi, '')
      .trim(),
    a = s.indexOf('{'),
    b = s.lastIndexOf('}'),
    j = null;
  if (a >= 0 && b > a) {
    try {
      j = JSON.parse(s.slice(a, b + 1));
    } catch (e) {}
  }
  if (!j) {
    var x = s.indexOf('['),
      y = s.lastIndexOf(']');
    if (x >= 0 && y > x) {
      try {
        j = { items: JSON.parse(s.slice(x, y + 1)) };
      } catch (e) {}
    }
  }
  if (!j || !Array.isArray(j.items)) throw { kind: 'parse', msg: s.slice(0, 80) };
  var items = j.items
    .filter(function (it) {
      return it && typeof it.name === 'string' && it.name.trim();
    })
    .slice(0, 20)
    .map(function (it) {
      var p = it.per100g || {};
      return {
        name: it.name.trim().slice(0, 30),
        g: Math.round(aiNum(it.grams, 0, 3000, 100)),
        left: aiNum(it.leftRatio, 0, 1, 0),
        est: {
          kcal: aiNum(p.kcal, 0, 900, 0),
          p: aiNum(p.p, 0, 100, 0),
          c: aiNum(p.c, 0, 100, 0),
          f: aiNum(p.f, 0, 100, 0)
        },
        conf: aiNum(it.confidence, 0, 1, null)
      };
    });
  return { items: items, note: typeof j.note === 'string' ? j.note.slice(0, 120) : '' };
}

/* 识别页状态：照片只保存在内存（压缩后的 data URL） */
var AI = {
  mode: 1,
  photos: [],
  slot: 0,
  phase: 'pick',
  items: [],
  meal: null,
  mealWhy: '',
  note: '',
  err: null,
  ctrl: null
};
function aiMatch(name) {
  var t = normName(name);
  if (!t) return null;
  var f = matchFood(name);
  if (!f) return null;
  var best = 0;
  [f.name].concat(f.aliases || []).forEach(function (k) {
    k = normName(k);
    if (k === t) best = 1;
    else if (t.indexOf(k) >= 0 || k.indexOf(t) >= 0)
      best = Math.max(best, Math.min(k.length, t.length) / Math.max(k.length, t.length));
  });
  return best >= 0.6 ? f : null;
}
function aiItem(o) {
  o.lib = aiMatch(o.name);
  o.useLib = !!o.lib;
  return o;
}
function aiPer(it) {
  return it.useLib && it.lib ? per100(it.lib) : it.est;
}
function aiEaten(it) {
  return Math.max(0, Math.round((it.g || 0) * (1 - (it.left || 0))));
}
function aiNut(it) {
  var p = aiPer(it),
    r = aiEaten(it) / 100;
  return { kcal: Math.round((p.kcal || 0) * r), p: r1((p.p || 0) * r), c: r1((p.c || 0) * r), f: r1((p.f || 0) * r) };
}
function openAI() {
  if (AI.phase !== 'busy') {
    AI.phase = 'pick';
    AI.err = null;
  }
  show('dietAI', true);
}
$('#faPhoto').onclick = openAI;
$('#dPhoto').onclick = function () {
  curMeal = null;
  openAI();
};
/** 压缩为最长边 1280px 的 JPEG */
function aiCompress(file) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file),
      im = new Image();
    im.onload = function () {
      var s = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)),
        w = Math.max(1, Math.round(im.naturalWidth * s)),
        h = Math.max(1, Math.round(im.naturalHeight * s)),
        cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      var cx = cv.getContext('2d');
      cx.fillStyle = '#fff';
      cx.fillRect(0, 0, w, h);
      cx.drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(url);
      res(cv.toDataURL('image/jpeg', 0.8));
    };
    im.onerror = function () {
      URL.revokeObjectURL(url);
      rej(new Error('无法读取该图片'));
    };
    im.src = url;
  });
}
function aiPick(inp) {
  var f = inp.files && inp.files[0];
  inp.value = '';
  if (!f) return;
  var slot = AI.slot;
  aiCompress(f)
    .then(function (u) {
      AI.photos[slot] = { url: u, time: f.lastModified || Date.now() };
      AI.err = null;
      if (AI.mode === 1 && aiReady()) aiGo();
      else rDietAI();
    })
    .catch(function (e) {
      toast(e.message);
    });
}
$('#aiCam').onchange = function () {
  aiPick(this);
};
$('#aiLib').onchange = function () {
  aiPick(this);
};
function aiSlot(i) {
  var ph = AI.photos[i],
    lb = AI.mode === 2 ? (i ? '吃后' : '吃前') : '照片';
  return (
    '<div class="ai-slot' +
    (ph ? ' has' : '') +
    '"><div class="ai-sl">' +
    lb +
    '</div>' +
    (ph
      ? '<img src="' +
        ph.url +
        '" alt="' +
        lb +
        '"><button class="ghost sm ai-x" data-ai="rm" data-v="' +
        i +
        '" aria-label="移除' +
        lb +
        '">' +
        IC('x') +
        '</button>'
      : '<div class="ai-pk"><button class="ghost" data-ai="cam" data-v="' +
        i +
        '">' +
        IC('camera') +
        '拍照</button><button class="ghost" data-ai="lib" data-v="' +
        i +
        '">' +
        IC('image') +
        '相册</button></div>') +
    '</div>'
  );
}
function aiErrBox() {
  if (!AI.err) return '';
  var m = aiErr(AI.err);
  return (
    '<div class="alert bad ai-err"><b>' +
    (AI.err.kind === 'offline' || AI.err.kind === 'network' ? IC('wifiOff') : IC('alert')) +
    esc(m.t) +
    '</b><div>' +
    esc(m.d) +
    '</div>' +
    '<div class="actions">' +
    (AI.err.kind !== 'nokey' ? '<button class="sm" data-ai="go">重试</button>' : '') +
    '<button class="ghost sm" data-ai="manual">手动记录</button><button class="ghost sm" data-ai="cfg">' +
    (AI.err.kind === 'nokey' ? '去配置' : '检查设置') +
    '</button></div></div>'
  );
}
function rDietAI() {
  var box = $('#aiBox'),
    h = '';
  if (AI.phase === 'confirm') {
    rAiConfirm();
    return;
  }
  var need = AI.mode,
    have = AI.photos.slice(0, need).filter(Boolean).length,
    busy = AI.phase === 'busy';
  h +=
    '<div class="card ai-pick"><div class="tabs4 tabs2" id="aiMode"><button class="' +
    (AI.mode === 1 ? 'on' : '') +
    '" data-ai="mode" data-v="1">单张</button><button class="' +
    (AI.mode === 2 ? 'on' : '') +
    '" data-ai="mode" data-v="2">吃前 + 吃后</button></div>' +
    '<div class="ai-slots n' +
    need +
    '">' +
    aiSlot(0) +
    (need === 2 ? aiSlot(1) : '') +
    '</div>' +
    '<p class="mut ai-tip">' +
    (need === 2
      ? '两张照片尽量同一角度。识别按吃前估重量，按吃后估剩余比例。'
      : '俯拍、光线充足、整份入镜，识别更准。') +
    '</p>' +
    (busy
      ? '<div class="ai-busy"><span class="spin" aria-hidden="true"></span><span>正在识别，通常需要 5–20 秒…</span><button class="ghost sm" data-ai="cancel">取消</button></div>'
      : '<div class="actions"><button data-ai="go"' +
        (have < need ? ' disabled' : '') +
        '>开始识别</button><button class="ghost" data-ai="manual">改用手动记录</button></div>') +
    '</div>';
  h += aiErrBox();
  h +=
    '<div class="mut ai-priv-s">' +
    IC('lock') +
    '<span>' +
    (aiReady()
      ? '照片将发送给 ' + esc(aiProvName()) + '（' + esc(AIC.model) + '）识别，FreeBody 不保存照片。'
      : '尚未配置模型 API，请先在「我的」中设置。') +
    (aiReady() && aiWeakModel() ? ' 当前模型不支持本机照片，建议改用 glm-4.6v-flash。' : '') +
    '</span> <button class="linkb" data-ai="cfg">设置</button></div>';
  box.innerHTML = h;
}
function aiGo() {
  var need = AI.mode,
    imgs = AI.photos.slice(0, need).filter(Boolean);
  if (imgs.length < need) {
    toast(need === 2 ? '请选择吃前和吃后两张照片' : '请先选择照片');
    return;
  }
  if (!aiReady()) {
    AI.err = { kind: 'nokey' };
    rDietAI();
    return;
  }
  AI.phase = 'busy';
  AI.err = null;
  rDietAI();
  aiCall(
    [
      { role: 'system', content: AI_SYS },
      aiUserMsg(
        imgs.map(function (p) {
          return p.url;
        })
      )
    ],
    {
      onCtrl: function (c) {
        AI.ctrl = c;
      }
    }
  )
    .then(aiParse)
    .then(function (r) {
      var t = new Date(imgs[0].time || Date.now()),
        fromPhoto = Math.abs(Date.now() - t.getTime()) > 5 * 60000;
      AI.meal = mealOfHour(t.getHours());
      AI.mealWhy = (fromPhoto ? '按拍摄时间 ' : '按当前时间 ') + pad(t.getHours()) + ':' + pad(t.getMinutes());
      AI.items = r.items.map(function (it) {
        if (AI.mode === 1) it.left = 0;
        return aiItem(it);
      });
      AI.note = r.note;
      AI.phase = 'confirm';
      AI.ctrl = null;
      if (cur === 'dietAI') rDietAI();
    })
    .catch(function (e) {
      AI.ctrl = null;
      AI.phase = 'pick';
      AI.err = e && e.kind === 'cancel' ? null : e && e.kind ? e : { kind: 'other', message: e && e.message };
      if (cur === 'dietAI') rDietAI();
    });
}
function aiConf(c) {
  return c == null ? '' : c >= 0.75 ? '把握高' : c >= 0.45 ? '把握中' : '把握低';
}
function aiRow(it, i) {
  var n = aiNut(it),
    src = it.useLib && it.lib;
  return (
    '<div class="ai-it" data-i="' +
    i +
    '"><div class="ai-r1"><input class="ai-n" data-aif="name" value="' +
    esc(it.name) +
    '" aria-label="名称"><button class="ghost sm ai-del" data-ai="del" data-v="' +
    i +
    '" aria-label="删除">' +
    IC('trash') +
    '</button></div>' +
    '<div class="ai-r2"><div><label>克重 g</label><input type="number" inputmode="numeric" data-aif="g" value="' +
    it.g +
    '"></div>' +
    '<div><label>剩余 %</label><input type="number" inputmode="numeric" min="0" max="100" data-aif="left" value="' +
    Math.round((it.left || 0) * 100) +
    '"></div>' +
    '<div class="ai-k"><b>' +
    n.kcal +
    '</b> kcal<span class="mut">实吃 ' +
    aiEaten(it) +
    ' g</span></div></div>' +
    '<div class="ai-r3">' +
    (src
      ? '<button class="tag lib" data-ai="src" data-v="' +
        i +
        '" title="点按改用模型估算值">库 · ' +
        esc(it.lib.name) +
        '</button>'
      : '<button class="tag est" data-ai="src" data-v="' +
        i +
        '"' +
        (it.lib ? ' title="点按改用食物库数值"' : ' disabled') +
        '>估算' +
        (it.lib ? ' · 可改用库值' : '') +
        '</button>') +
    '<span class="mut">蛋白 ' +
    n.p +
    ' · 碳水 ' +
    n.c +
    ' · 脂肪 ' +
    n.f +
    (it.conf != null ? ' · ' + aiConf(it.conf) : '') +
    '</span></div></div>'
  );
}
function aiTotals() {
  var t = { k: 0, p: 0, c: 0, f: 0 };
  AI.items.forEach(function (it) {
    var n = aiNut(it);
    t.k += n.kcal;
    t.p += n.p;
    t.c += n.c;
    t.f += n.f;
  });
  return t;
}
function aiTotTxt() {
  var t = aiTotals();
  return (
    '<b>' + Math.round(t.k) + '</b> kcal · 蛋白 ' + r1(t.p) + ' g · 碳水 ' + r1(t.c) + ' g · 脂肪 ' + r1(t.f) + ' g'
  );
}
function rAiConfirm() {
  var h =
    '<div class="card ai-head"><div class="ai-thumbs">' +
    AI.photos
      .slice(0, AI.mode)
      .filter(Boolean)
      .map(function (p, i) {
        return '<img src="' + p.url + '" alt="' + (AI.mode === 2 ? (i ? '吃后' : '吃前') : '照片') + '">';
      })
      .join('') +
    '</div>' +
    '<div class="ai-hm"><label>记录到 ' +
    md(sel) +
    '</label><div class="tabs4" id="aiMeal">' +
    MEALS.map(function (m) {
      return '<button class="' + (m === AI.meal ? 'on' : '') + '" data-ai="meal" data-v="' + m + '">' + m + '</button>';
    }).join('') +
    '</div><div class="mut ai-why">' +
    esc(AI.mealWhy) +
    ' 自动判断，可修改</div></div></div>';
  h += AI.items.length
    ? '<div class="card ai-list">' + AI.items.map(aiRow).join('') + '</div>'
    : '<div class="card mut">没有识别到食物' +
      (AI.note ? '：' + esc(AI.note) : '') +
      '。可添加一项，或改用手动记录。</div>';
  h +=
    '<div class="card ai-sum"><div class="ai-tot" id="aiTot">' +
    aiTotTxt() +
    '</div><div class="mut ai-fn">实吃 = 克重 ×（1 − 剩余比例）。标「库」的按内置食物库每 100g 数值计算，标「估算」的为模型估算值，均仅供参考，不构成营养或医疗建议。' +
    (AI.note && AI.items.length ? '<br>模型说明：' + esc(AI.note) : '') +
    '</div>' +
    '<div class="actions"><button class="ghost" data-ai="add">' +
    IC('plus') +
    '添加一项</button><button class="ghost" data-ai="again">' +
    IC('repeat') +
    '重新识别</button></div>' +
    '<div class="actions"><button data-ai="rec" id="aiRec"' +
    (AI.items.length ? '' : ' disabled') +
    '>记录 ' +
    AI.items.length +
    ' 项到' +
    AI.meal +
    '</button></div></div>';
  $('#aiBox').innerHTML = h;
}
/** 局部刷新一行（保留输入焦点） */
function aiRefreshRow(i) {
  var row = document.querySelector('.ai-it[data-i="' + i + '"]'),
    it = AI.items[i];
  if (!row || !it) return;
  var n = aiNut(it);
  row.querySelector('.ai-k').innerHTML =
    '<b>' + n.kcal + '</b> kcal<span class="mut">实吃 ' + aiEaten(it) + ' g</span>';
  var tmp = document.createElement('div');
  tmp.innerHTML = aiRow(it, i);
  row.querySelector('.ai-r3').innerHTML = tmp.querySelector('.ai-r3').innerHTML;
  $('#aiTot').innerHTML = aiTotTxt();
}
$('#aiBox').addEventListener('input', function (e) {
  var f = e.target.getAttribute('data-aif');
  if (!f) return;
  var row = e.target.closest('.ai-it'),
    i = +row.getAttribute('data-i'),
    it = AI.items[i];
  if (!it) return;
  if (f === 'name') {
    it.name = e.target.value;
    var lib = aiMatch(it.name);
    if (lib !== it.lib) {
      it.lib = lib;
      it.useLib = !!lib;
    }
  } else if (f === 'g') it.g = Math.max(0, Math.round(num(e.target.value) || 0));
  else if (f === 'left') it.left = Math.min(100, Math.max(0, num(e.target.value) || 0)) / 100;
  aiRefreshRow(i);
});
function aiRecord() {
  var list = AI.items.filter(function (it) {
    return it.name.trim() && aiEaten(it) > 0;
  });
  if (!list.length) {
    toast('没有可记录的条目（克重为 0 或全部剩下）');
    return;
  }
  var meal = AI.meal;
  list.forEach(function (it) {
    var g = aiEaten(it),
      /** @type {Partial<Meal>} 先算营养，再补 id / 日期 / 餐次 */
      o;
    if (it.useLib && it.lib) {
      o = fromFood(it.lib, g, g, 'g');
      o.name = o.name + ' ' + g + 'g';
    } else {
      var p = it.est,
        r = g / 100;
      o = {
        name: it.name.trim() + ' ' + g + 'g',
        kcal: p.kcal * r,
        p: p.p * r,
        c: p.c * r,
        f: p.f * r,
        g: g,
        amount: g,
        unit: 'g',
        nutrimentsPer100g: { kcal: p.kcal, p: p.p, c: p.c, f: p.f },
        src: 'ai'
      };
    }
    o.via = 'ai';
    o.meal = meal;
    S.meals.push(mkMeal(o));
  });
  save();
  toast('已记入' + meal + ' ' + list.length + ' 项');
  AI = {
    mode: AI.mode,
    photos: [],
    slot: 0,
    phase: 'pick',
    items: [],
    meal: null,
    mealWhy: '',
    note: '',
    err: null,
    ctrl: null
  };
  curMeal = meal;
  show('diet', true);
}
$('#aiBox').addEventListener('click', function (e) {
  var b = e.target.closest('[data-ai]');
  if (!b || b.disabled) return;
  var a = b.getAttribute('data-ai'),
    v = b.getAttribute('data-v');
  if (a === 'mode') {
    AI.mode = +v;
    AI.err = null;
    rDietAI();
  } else if (a === 'cam' || a === 'lib') {
    AI.slot = +v;
    $(a === 'cam' ? '#aiCam' : '#aiLib').click();
  } else if (a === 'rm') {
    AI.photos[+v] = null;
    rDietAI();
  } else if (a === 'go') aiGo();
  else if (a === 'cancel') {
    if (AI.ctrl) AI.ctrl.abort();
  } else if (a === 'manual') {
    openAdd(AI.meal || curMeal || dMeal(), 'quick');
  } else if (a === 'cfg') {
    show('settings');
    var c = $('#aiCard');
    c.open = true;
    setTimeout(function () {
      c.scrollIntoView({ block: 'start' });
    }, 30);
  } else if (a === 'meal') {
    AI.meal = v;
    Array.prototype.forEach.call(document.querySelectorAll('#aiMeal button'), function (x) {
      x.classList.toggle('on', x.getAttribute('data-v') === v);
    });
    $('#aiRec').textContent = '记录 ' + AI.items.length + ' 项到' + v;
  } else if (a === 'del') {
    AI.items.splice(+v, 1);
    rAiConfirm();
  } else if (a === 'add') {
    AI.items.push(aiItem({ name: '', g: 100, left: 0, est: { kcal: 0, p: 0, c: 0, f: 0 }, conf: null }));
    rAiConfirm();
    var ns = document.querySelectorAll('.ai-n');
    if (ns.length) ns[ns.length - 1].focus();
  } else if (a === 'src') {
    var it = AI.items[+v];
    if (it && it.lib) {
      it.useLib = !it.useLib;
      aiRefreshRow(+v);
    }
  } else if (a === 'again') {
    AI.phase = 'pick';
    AI.items = [];
    rDietAI();
  } else if (a === 'rec') aiRecord();
});
