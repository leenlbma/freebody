// SPDX-License-Identifier: MIT
// Node 中的事务桩；模拟提交、回滚与延迟回调，浏览器测试另验证真实 IndexedDB。
function indexedDB() {
  const data = { rows: new Map(), failWrite: false, failRead: false, failOpen: false, blocked: false };
  const db = {
    createObjectStore() {},
    close() {},
    transaction(name, mode) {
      const working = new Map([...data.rows].map(([key, row]) => [key, { ...row }]));
      const tx = { error: null };
      let pending = 0,
        ended = false;
      const request = (fn, write = false) => {
        const req = {};
        pending++;
        setImmediate(() => {
          if (ended) return;
          try {
            if ((write && data.failWrite) || (!write && data.failRead)) throw new Error('simulated storage failure');
            req.result = fn();
            req.onsuccess?.();
          } catch (error) {
            ended = true;
            tx.error = error;
            req.error = error;
            req.onerror?.();
            tx.onabort?.();
            return;
          }
          pending--;
          if (!pending)
            setImmediate(() => {
              if (ended || pending) return;
              ended = true;
              if (mode === 'readwrite') data.rows = working;
              tx.oncomplete?.();
            });
        });
        return req;
      };
      tx.objectStore = () => ({
        getAll: () => request(() => [...working.values()].sort((a, b) => a.id.localeCompare(b.id))),
        put: (row) => request(() => working.set(row.id, { ...row }), true),
        delete: (key) => request(() => working.delete(key), true),
        clear: () => request(() => working.clear(), true)
      });
      return tx;
    }
  };
  return {
    data,
    open() {
      const req = { result: db };
      setImmediate(() => {
        if (data.blocked) {
          req.onblocked?.();
          return;
        }
        if (data.failOpen) {
          req.error = new Error('open failed');
          req.onerror?.();
          return;
        }
        req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }
  };
}
module.exports = { indexedDB };
