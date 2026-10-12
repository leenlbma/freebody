// SPDX-License-Identifier: MIT
'use strict';
// 加密备份：往返、错误密码、篡改、格式校验、不含明文
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const text = JSON.stringify({ v: 1, meals: [{ id: 'm1', date: '2026-10-12', name: '虚构测试餐', kcal: 500 }] });

test('加密备份：同一密码可还原，结果不含明文', async () => {
  const a = load();
  assert.equal(a.bkCan(), true);
  const enc = await a.bkEncrypt(text, '正确的密码 123');
  assert.equal(a.bkIsEnc(enc), true);
  assert.equal(enc.iter, 310000);
  const s = JSON.stringify(enc);
  assert.ok(!s.includes('虚构测试餐') && !s.includes('meals'), '密文中不应出现明文');
  assert.equal(await a.bkDecrypt(enc, '正确的密码 123'), text);
});

test('加密备份：每次的盐与 IV 都不同', async () => {
  const a = load();
  const x = await a.bkEncrypt(text, 'pw'),
    y = await a.bkEncrypt(text, 'pw');
  assert.notEqual(x.salt, y.salt);
  assert.notEqual(x.iv, y.iv);
  assert.notEqual(x.data, y.data);
});

test('加密备份：错误密码与篡改都会被拒绝', async () => {
  const a = load();
  const enc = await a.bkEncrypt(text, 'pw');
  await assert.rejects(a.bkDecrypt(enc, 'wrong'), /密码不正确/);
  const raw = Buffer.from(enc.data, 'base64');
  raw[0] ^= 1;
  await assert.rejects(a.bkDecrypt({ ...enc, data: raw.toString('base64') }, 'pw'), /密码不正确/);
  await assert.rejects(a.bkDecrypt({ ...enc, iter: 10 }, 'pw'), /加密参数无效/);
  await assert.rejects(a.bkDecrypt({ ...enc, alg: 'XOR' }, 'pw'), /不支持/);
  assert.equal(a.bkIsEnc({ v: 1, meals: [] }), false);
});
