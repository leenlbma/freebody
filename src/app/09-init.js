// SPDX-License-Identifier: MIT
/* ---------- 初始化状态 ----------
 * 00–05 只定义常量与函数，这里才真正读取本机数据（演示模式则生成虚构数据）。
 * 放在纯逻辑模块之后、界面模块之前，界面代码可以直接使用 S。 */
S = DEMO ? demoData(today()) : load();
(S.customFoods || []).forEach(function (f) {
  f.custom = true;
}); // 自定义食物均优先匹配
