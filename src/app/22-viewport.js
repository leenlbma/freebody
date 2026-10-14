// SPDX-License-Identifier: MIT
/* 22-viewport.js — iOS 浏览器工具栏变化时，底栏跟随可见视口 */
(function () {
  var root = document.documentElement,
    viewport = window.visualViewport,
    nav = $('#nav');
  if (!root.classList.contains('ios') || root.classList.contains('standalone') || !viewport || !nav) return;
  var frame = 0;
  function sync() {
    frame = 0;
    // 缩放时交还浏览器处理，避免放大后的导航追着视口移动、挡住内容。
    var enabled = Math.abs(viewport.scale - 1) < 0.01 && viewport.height > 0;
    root.classList.toggle('browser-viewport', enabled);
    if (!enabled) return;
    // 不依赖 fixed 的 bottom 锚点：Safari 收起工具栏后可能仍沿用旧的底边。
    root.style.setProperty('--nav-viewport-bottom', viewport.offsetTop + viewport.height + 'px');
    root.style.setProperty('--nav-height', nav.offsetHeight + 'px');
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(sync);
  }
  viewport.addEventListener('resize', schedule);
  viewport.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', schedule);
  // 安全区、字体与导航内容变化后重新测量，避免写死底栏高度。
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(nav);
  sync();
})();
