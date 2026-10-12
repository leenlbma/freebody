'use strict';
// 快速记录解析、食物匹配、CSV 导入与基础工具函数
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const names = (r) => [...r.items].map((i) => i.name); // 沙箱数组跨 realm，先转成本地数组

test('快速记录：名称 + 克重 / 份数 / 个数，按内置食物库估算', () => {
  const a = load({ foods: true });
  const r = a.parseQuick('鸡胸肉200g 米饭1碗 鸡蛋2个');
  assert.deepEqual(names(r), ['鸡胸肉 200g', '米饭 200g', '鸡蛋 100g']);
  assert.deepEqual([...r.miss], []);
  assert.equal(r.items[0].foodId, 'chicken-breast-cooked');
  assert.equal(r.items[0].kcal, 330); // 165 kcal/100g × 2
  assert.equal(r.items[2].amount, 2);
  assert.equal(r.items[2].unit, '个');
});

test('快速记录：空格、中文数量、数量在前、毫升都能识别', () => {
  const a = load({ foods: true });
  for (const [t, want] of [
    ['苹果 150 克', ['苹果 150g']],
    ['鸡蛋 2 个', ['鸡蛋 100g']],
    ['两个鸡蛋', ['鸡蛋 100g']],
    ['150g 米饭', ['米饭 150g']],
    ['2个 鸡蛋，牛奶 250ml', ['鸡蛋 100g', '牛奶 250g']]
  ]) {
    const r = a.parseQuick(t);
    assert.deepEqual(names(r), want, t);
    assert.deepEqual([...r.miss], [], t);
  }
});

test('快速记录：只写热量时按热量记录，未知食物列入未识别', () => {
  const a = load({ foods: true });
  for (const t of ['外卖 650', '外卖650kcal', '300 kcal 外卖']) {
    const r = a.parseQuick(t);
    assert.equal(r.items.length, 1, t);
    assert.equal(r.items[0].kcalOnly, true, t);
    assert.equal(r.items[0].name, '外卖', t);
  }
  const u = a.parseQuick('不存在的食物xyz 100g');
  assert.equal(u.items.length, 0);
  assert.equal(u.miss.length, 1);
  assert.equal(a.parseQuick('').items.length, 0);
});

test('快速记录：自定义食物优先于内置库，名称可含 +', () => {
  const a = load({ foods: true });
  a.S.customFoods = [
    { id: 'c1', name: '鸡蛋+番茄', custom: true, kcal: 90, p: 6, c: 4, f: 6, servings: [{ unit: '份', g: 200 }] }
  ];
  const r = a.parseQuick('鸡蛋+番茄 1份');
  assert.equal(r.items.length, 1);
  assert.match(r.items[0].name, /^鸡蛋\+番茄/);
});

test('食物匹配：别名、全角与空格', () => {
  const a = load({ foods: true });
  assert.equal(a.matchFood('鸡蛋').id, 'egg-whole');
  assert.equal(a.matchFood(' 鸡蛋 ').id, 'egg-whole');
  assert.equal(a.matchFood('完全不存在的名字'), null);
});

test('CSV：身体指标与饮食按表头识别，无效行跳过', () => {
  const a = load();
  assert.equal(a.importCSV('date,weight,bf\n2026-10-01,70.2,18\nbad,1,1\n'), '身体指标：导入 1 行，跳过 1 行无效');
  assert.equal(a.S.body.length, 1);
  assert.equal(a.S.body[0].date, '2026-10-01');
  assert.equal(a.S.body[0].weight, 70.2);
  assert.equal(a.importCSV('日期,食物,蛋白质,碳水,脂肪\n2026/10/2,米饭,10,50,2\n'), '饮食：导入 1 行');
  const m = a.S.meals[0];
  assert.equal(m.date, '2026-10-02');
  assert.equal(m.kcal, 10 * 4 + 50 * 4 + 2 * 9); // 缺热量时由宏量推算
  assert.throws(() => a.importCSV('date\n'), /至少需要表头/);
  assert.throws(() => a.importCSV('foo,bar\n1,2\n'), /无法识别类型/);
});

test('CSV：用户取消确认时不写入', () => {
  const a = load({ confirm: false });
  assert.equal(a.importCSV('date,weight\n2026-10-01,70\n'), null);
  assert.equal(a.S.body.length, 0);
});

test('CSV 解析：引号内逗号；日期与时间规范化', () => {
  const a = load();
  assert.deepEqual(JSON.parse(JSON.stringify(a.parseCSV('a,b\n"x,1",2\n'))), [
    ['a', 'b'],
    ['x,1', '2']
  ]);
  assert.equal(a.normDate('2026/10/1'), '2026-10-01');
  assert.equal(a.normDate('2026-1-2'), '2026-01-02');
  assert.equal(a.normDate('bad'), null);
  assert.equal(a.normTime('23:30'), '23:30');
});

test('工具函数：转义、数字、时长与周起始', () => {
  const a = load();
  assert.equal(a.esc('<a&"b">'), '&lt;a&amp;&quot;b&quot;&gt;');
  assert.equal(a.num('1.5'), 1.5);
  assert.equal(a.num(''), null);
  assert.equal(a.r1(1.26), 1.3);
  assert.equal(a.parseT('1:30'), 90);
  assert.equal(a.fmtT(90), '1:30');
  assert.equal(a.weekStart('2026-10-14'), '2026-10-12'); // 周一为一周开始
});
