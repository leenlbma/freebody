// 端到端测试共用：页面列表、打开子页、收集报错
const SECTIONS = [
  'overview',
  'diet',
  'dietAdd',
  'dietAI',
  'train',
  'cardio',
  'perf',
  'muscle',
  'data',
  'body',
  'nutri',
  'tstats',
  'sleep',
  'hormone',
  'injury',
  'supp',
  'notes',
  'settings',
  'impPack',
  'selftest'
];

/** 应用的函数都在闭包里；用一个临时的 data-sub 按钮走真实的点击路径打开子页 */
async function openSection(page, id) {
  await page.evaluate((s) => {
    const b = document.createElement('button');
    b.setAttribute('data-sub', s);
    b.hidden = true;
    document.body.appendChild(b);
    b.click();
    b.remove();
  }, id);
  // 肌群热图位于训练页顶部
  await page.locator(`section#${id === 'muscle' ? 'train' : id}.on`).waitFor();
}

/** 记录页面异常与 console.error，测试结束时断言为空 */
function watchErrors(page) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text());
  });
  return errs;
}

module.exports = { SECTIONS, openSection, watchErrors };
