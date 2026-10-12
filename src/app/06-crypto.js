// SPDX-License-Identifier: MIT
/* 06-crypto.js — 加密备份（可选）：PBKDF2-SHA256 派生密钥 + AES-GCM，全部在本机用 Web Crypto 完成 */
/* ---------- 加密备份 ---------- */
var BK_ITER = 310000; // OWASP 2023 对 PBKDF2-HMAC-SHA256 的建议下限
/** 当前环境能否加密（需要安全上下文：https、localhost 或本地文件） */
function bkCan() {
  return !!(typeof crypto !== 'undefined' && crypto.subtle && crypto.getRandomValues);
}
/** @param {Uint8Array} u */
function bkB64(u) {
  var s = '';
  for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
/** @param {string} s @returns {Uint8Array<ArrayBuffer>} */
function bkUnB64(s) {
  var b = atob(s),
    u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
/** @param {string} pw @param {Uint8Array<ArrayBuffer>} salt @param {number} iter */
function bkKey(pw, salt, iter) {
  return crypto.subtle
    .importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey'])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    });
}
/** 是否为加密备份文件 */
function bkIsEnc(d) {
  return !!(d && typeof d === 'object' && d.freebody === 'backup-enc');
}
/**
 * 加密一段文本（备份 JSON）。返回可直接 JSON.stringify 的对象，不含明文或密码。
 * @param {string} text @param {string} pw
 * @returns {Promise<Object<string, any>>}
 */
function bkEncrypt(text, pw) {
  var salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  return bkKey(pw, salt, BK_ITER)
    .then(function (k) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(text));
    })
    .then(function (buf) {
      return {
        freebody: 'backup-enc',
        v: 1,
        kdf: 'PBKDF2-SHA256',
        iter: BK_ITER,
        salt: bkB64(salt),
        iv: bkB64(iv),
        alg: 'AES-GCM-256',
        data: bkB64(new Uint8Array(buf))
      };
    });
}
/**
 * 解密。密码错误或文件被改动时 reject，错误信息可直接展示。
 * @param {Object<string, any>} d @param {string} pw
 * @returns {Promise<string>}
 */
function bkDecrypt(d, pw) {
  if (!bkIsEnc(d) || d.v !== 1 || d.kdf !== 'PBKDF2-SHA256' || d.alg !== 'AES-GCM-256')
    return Promise.reject(new Error('不支持的加密备份格式'));
  var iter = +d.iter;
  if (!(iter >= 100000 && iter <= 10000000)) return Promise.reject(new Error('加密参数无效'));
  return bkKey(pw, bkUnB64(d.salt), iter)
    .then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bkUnB64(d.iv) }, k, bkUnB64(d.data));
    })
    .then(
      function (buf) {
        return new TextDecoder().decode(buf);
      },
      function () {
        throw new Error('密码不正确，或文件已损坏');
      }
    );
}
