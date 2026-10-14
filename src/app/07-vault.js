// SPDX-License-Identifier: MIT
/* 07-vault.js — 本机恢复点：IndexedDB + SHA-256，封装存储细节，不访问 DOM */
var VAULT = (function () {
  var dbPromise = null,
    queue = Promise.resolve(),
    failure = null,
    LIMIT = 8,
    MAX = 20971520;
  function open() {
    if (!window.indexedDB) return Promise.reject(new Error('当前浏览器不支持本机恢复点'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open('freebody-history', 1),
        abandoned = false;
      req.onupgradeneeded = function () {
        req.result.createObjectStore('snapshots', { keyPath: 'id' });
      };
      req.onsuccess = function () {
        var db = req.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = function () {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = function () {
        abandoned = true;
        reject(req.error || new Error('恢复点无法打开'));
      };
      req.onblocked = function () {
        abandoned = true;
        reject(new Error('请关闭其他窗口后重试'));
      };
    }).catch(function (error) {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }
  function hash(json) {
    if (!window.crypto || !crypto.subtle) return Promise.reject(new Error('当前环境不支持恢复点完整性校验'));
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(json)).then(function (buffer) {
      return Array.prototype.map
        .call(new Uint8Array(buffer), function (n) {
          return ('0' + n.toString(16)).slice(-2);
        })
        .join('');
    });
  }
  function serial(fn) {
    var job = queue.then(fn, fn).then(
      function (result) {
        failure = null;
        return result;
      },
      function (error) {
        failure = error.message;
        throw error;
      }
    );
    queue = job.catch(function () {});
    return job;
  }
  function put(json, id, label) {
    return serial(function () {
      var snapshot = JSON.parse(json);
      delete snapshot.aiConfig;
      json = JSON.stringify(snapshot);
      if (json.length * 2 > MAX) throw new Error('恢复点超过 20 MB，未保存');
      return hash(json).then(function (digest) {
        return open().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction('snapshots', 'readwrite'),
              store = tx.objectStore('snapshots');
            var all = store.getAll();
            all.onsuccess = function () {
              var stamp = all.result.reduce(function (max, row) {
                return typeof row.at === 'number' && isFinite(row.at) ? Math.max(max, row.at + 1) : max;
              }, Date.now());
              var current = { id: id, at: stamp, label: label, json: json, sha: digest };
              store.put(current);
              var rows = all.result
                  .filter(function (row) {
                    return row.id !== id;
                  })
                  .concat([current])
                  .sort(function (a, b) {
                    return b.at - a.at;
                  }),
                bytes = 0;
              rows.forEach(function (row, i) {
                bytes += (typeof row.json === 'string' ? row.json.length : MAX) * 2;
                if (i >= LIMIT || bytes > MAX) store.delete(row.id);
              });
            };
            tx.oncomplete = function () {
              resolve(true);
            };
            tx.onerror = tx.onabort = function () {
              reject(tx.error || new Error('恢复点没有保存'));
            };
          });
        });
      });
    });
  }
  function all() {
    return queue
      .then(function () {
        return open();
      })
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var req = db.transaction('snapshots', 'readonly').objectStore('snapshots').getAll();
          req.onsuccess = function () {
            resolve(
              req.result.sort(function (a, b) {
                return b.at - a.at;
              })
            );
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      });
  }
  var api = {
    available: !!(window.indexedDB && window.crypto && crypto.subtle),
    error: function () {
      return failure;
    },
    put: put,
    list: function () {
      return all().then(function (rows) {
        return rows.map(function (row) {
          return { id: row.id, at: row.at, label: row.label, bytes: row.json.length * 2 };
        });
      });
    },
    read: function (id) {
      return all().then(function (rows) {
        var row = rows.find(function (r) {
          return r.id === id;
        });
        if (!row) throw new Error('恢复点不存在');
        return hash(row.json).then(function (digest) {
          if (digest !== row.sha) throw new Error('恢复点完整性校验失败，未修改当前数据');
          return row.json;
        });
      });
    },
    clear: function () {
      return serial(function () {
        if (!window.indexedDB) return true;
        return open().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction('snapshots', 'readwrite');
            tx.objectStore('snapshots').clear();
            tx.oncomplete = function () {
              resolve(true);
            };
            tx.onerror = tx.onabort = function () {
              reject(tx.error || new Error('恢复点清理失败'));
            };
          });
        });
      });
    }
  };
  HOOKS.saved.push(function (change) {
    if (!change.enabled || !change.hasData || !api.available) return;
    if (change.before) {
      try {
        stateNormalize(JSON.parse(change.before), true);
        api.put(change.before, 'previous', '上一次保存前').catch(function () {});
      } catch (e) {}
    }
    api.put(change.json, 'daily-' + change.day, '每日恢复点').catch(function () {});
  });
  HOOKS.reset.push(api.clear);
  return api;
})();
