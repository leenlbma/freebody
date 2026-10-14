// SPDX-License-Identifier: MIT
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');
const { indexedDB } = require('./idb');

test('恢复点：往返校验、不包含模型配置、同一毫秒下仍保留最新 8 份', async () => {
  const idb = indexedDB(),
    a = load({ indexedDB: idb });
  for (let i = 0; i < 12; i++)
    await a.VAULT.put(
      JSON.stringify({ v: 1, meals: [], goals: {}, aiConfig: { key: 'fake-secret' }, index: i }),
      's' + i,
      '测试'
    );
  const rows = await a.VAULT.list();
  assert.equal(rows.length, 8);
  assert.equal(rows[0].id, 's11');
  const json = await a.VAULT.read('s11');
  assert.ok(!json.includes('fake-secret'));
  assert.equal(JSON.parse(json).index, 11);
  await assert.rejects(a.VAULT.read('s0'), /不存在/);
  await a.VAULT.put(JSON.stringify({ v: 1, meals: [], goals: {}, index: 99 }), 's11', '更新');
  assert.equal((await a.VAULT.list()).length, 8);
  assert.equal(JSON.parse(await a.VAULT.read('s11')).index, 99);
  idb.data.rows.get('s11').json = '{"index":100}';
  await assert.rejects(a.VAULT.read('s11'), /完整性校验失败/);
  await a.VAULT.clear();
  assert.equal((await a.VAULT.list()).length, 0);
});

test('恢复点写入与读取失败不会覆盖已有恢复点，后续仍可继续使用', async () => {
  const idb = indexedDB(),
    a = load({ indexedDB: idb });
  await a.VAULT.put('{"v":1}', 'ok', '保留');
  idb.data.failWrite = true;
  await assert.rejects(a.VAULT.put('{"v":1}', 'bad', '失败'), /storage failure/);
  await assert.rejects(a.VAULT.clear(), /storage failure/);
  assert.match(a.VAULT.error(), /storage failure/);
  idb.data.failWrite = false;
  assert.equal((await a.VAULT.list()).length, 1);
  idb.data.failRead = true;
  await assert.rejects(a.VAULT.list(), /storage failure/);
  idb.data.failRead = false;
  assert.equal(await a.VAULT.read('ok'), '{"v":1}');
  await a.VAULT.put('{"v":1}', 'after', '恢复');
  assert.equal(a.VAULT.error(), null);
  assert.equal((await a.VAULT.list()).length, 2);
});

test('不可用、被阻塞和开启失败给出明确失败；开启失败可重试', async () => {
  const missing = load();
  assert.equal(missing.VAULT.available, false);
  await assert.rejects(missing.VAULT.list(), /不支持/);
  assert.equal(await missing.VAULT.clear(), true);
  const idb = indexedDB();
  idb.data.failOpen = true;
  const a = load({ indexedDB: idb });
  await assert.rejects(a.VAULT.list(), /open failed/);
  idb.data.failOpen = false;
  await a.VAULT.put('{"v":1}', 'ok', '测试');
  assert.equal((await a.VAULT.list()).length, 1);
  const blocked = indexedDB();
  blocked.data.blocked = true;
  await assert.rejects(load({ indexedDB: blocked }).VAULT.list(), /关闭其他窗口/);
  let denied = true;
  const throwing = load({
    indexedDB: {
      open: (...args) => {
        if (denied) throw new Error('access denied');
        return idb.open(...args);
      }
    }
  });
  await assert.rejects(throwing.VAULT.list(), /access denied/);
  denied = false;
  assert.equal((await throwing.VAULT.list()).length, 1);
});

test('保存钩子保留上次状态，清空删除旧键与恢复点；演示模式不触碰真实历史', async () => {
  const idb = indexedDB(),
    a = load({ indexedDB: idb });
  a.S.notes.push({ id: 'n', date: '2026-10-12', text: '第一条' });
  assert.ok(a.save());
  await a.VAULT.list();
  a.S.notes[0].text = '修改';
  assert.ok(a.save());
  await a.VAULT.list();
  assert.equal(JSON.parse(await a.VAULT.read('previous')).notes[0].text, '第一条');
  a.storage.setItem('fitTracker_v1', JSON.stringify(a.S));
  assert.equal(await a.storeReset(), true);
  assert.equal((await a.VAULT.list()).length, 0);
  assert.equal(a.storage.getItem('fitTracker_v1'), null);
  assert.equal(JSON.parse(a.storage.getItem(a.KEY)).notes.length, 0);
  await a.VAULT.put('{"v":1}', 'preserve', '保留');
  const demo = load({ hash: '#demo', indexedDB: idb });
  demo.save();
  assert.equal(await demo.storeReset(), false);
  assert.equal((await a.VAULT.list()).length, 1);
});

test('清理恢复点失败保留主记录；新修改不通过结构校验时不能替换旧数据', async () => {
  const idb = indexedDB(),
    a = load({ indexedDB: idb });
  a.S.notes.push({ id: 'n', date: '2026-10-12', text: '保留' });
  assert.ok(a.save());
  await a.VAULT.list();
  const before = a.storage.getItem(a.KEY);
  idb.data.failWrite = true;
  assert.equal(await a.storeReset(), false);
  assert.equal(a.storage.getItem(a.KEY), before);
  assert.equal(a.STORE.resetting, false);
  idb.data.failWrite = false;
  a.S.notes[0].tags = [1];
  assert.equal(a.save(), false);
  assert.equal(a.STORE.err, 'invalid');
  assert.equal(a.storage.getItem(a.KEY), before);
  delete a.S.notes[0].tags;
  assert.ok(a.save());
});
