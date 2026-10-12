/* FreeBody service worker（由 scripts/build.js 生成 sw.js，请勿直接编辑 sw.js）
 * 策略：缓存优先；安装时预缓存应用外壳；新版本安装后等待页面确认（"有新版本，点此刷新"）再接管。 */
'use strict';
var VERSION = '2.3.2-b87e88ba72';
var CACHE = 'freebody-' + VERSION;
var ASSETS = ["./","./index.html","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-192.png","./icons/icon-maskable-512.png","./icons/apple-touch-icon.png"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('freebody-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var nav = req.mode === 'navigate';
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(nav ? './index.html' : req, { ignoreSearch: nav }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
        return res;
      }).catch(function () { return nav ? c.match('./index.html') : Response.error(); });
    });
  }));
});
