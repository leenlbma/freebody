# 测试说明

[中文](testing.md) | [English](testing.en.md)

| 层 | 命令 | 覆盖什么 | 在哪里跑 |
|---|---|---|---|
| 静态检查 | `npm run check` | 语法、emoji、占位符、食物库字段与来源、导入包 schema、skill 与文档一致 | 本地 / CI |
| 格式与 lint | `npm run lint` | Prettier 格式；ESLint 推荐规则、跨模块顶层重名、保存返回值检查与主存储写入边界 | 本地 / CI |
| 类型 | `npm run typecheck` | `tsc --checkJs`，依据 JSDoc 与 `types/*.d.ts` | 本地 / CI |
| 许可证 | `npm run licenses` | 开发依赖（含间接依赖）只允许宽松许可证 | 本地 / CI |
| 单元测试 | `npm test` | 00–09 纯逻辑模块：合计、准备度、进阶、1RM、BMR、疲劳、快速记录、CSV、导入合并与撤销、链接解码、存储预警、损坏保护、演示数据、状态校验、恢复点校验与限额、失败回滚与重试 | 本地 / CI |
| 覆盖率 | `npm run test:coverage` | 同上，并输出逐文件覆盖率；CI 要求纯逻辑模块行覆盖 ≥ 90% | 本地 / CI |
| 端到端 | `npm run test:e2e` | Chromium 与 WebKit（iPhone 13 尺寸）：所有页面无脚本错误、导航、快速记录、axe 0 违规（浅 / 深色）、减少动效、图表文字替代、演示模式不写存储、链接导入、损坏数据、恢复历史、训练重启与撤销、保存失败重试、真实离线缓存与更新 | 本地 / CI |
| 端到端覆盖率 | `npm run test:e2e:coverage` | 在 Chromium 上收集应用脚本的 V8 覆盖率，按模块统计已执行的非空白字符比例；CI 要求 src/app 合计 ≥ 65% | 本地 / CI |
| 真机 | [device-test.md](device-test.md) | 主屏幕模式、安全区、读屏、真实存储与 Service Worker | **只能由有设备的人完成** |

## 端到端测试

```bash
npm ci
npx playwright install chromium webkit   # Linux 首次运行可加 --with-deps
npm run build
npm run test:e2e
```

`playwright.config.js` 会用 `scripts/serve.js` 在 127.0.0.1:8766 启动静态服务器。普通界面测试禁用 Service Worker 以防首次安装刷新干扰；`pwa.spec.js` 在独立服务器上启用真实 Service Worker，验证离线重启及确认更新后保留记录。主屏幕安装与安全区仍需真机测试。

需要数据的测试只用演示模式（`#demo`，虚构数据、只在内存中）或测试内临时写入的少量虚构记录，每个测试都在全新的浏览器上下文中运行，结束即丢弃。

## 单元测试的加载方式

`tests/harness.js` 在 Node 的 vm 沙箱中按文件名顺序逐个执行 `src/app/0*.js`，用内存版 `localStorage` 和固定的「今天」（默认 2026-10-12）。可选参数：`storage`（初始存储）、`quota`（模拟上限）、`hash`（如 `#demo`）、`now`、`foods`（载入内置食物库）、`confirm`（`confirm()` 的返回值）、`indexedDB`（事务与故障模拟）、`locks`（多窗口写锁模拟）。沙箱里的数组来自另一个 realm，用 `deepEqual` 比较前先展开（`[...arr]`）。

2026-10-14 本地验证：9 个核心测试文件、71 项单元测试全部通过，核心逻辑行覆盖率为 91.91%；Chromium 项目通过本机 Chrome 通道执行，40 项全部通过，应用脚本字符覆盖率约 70.0%。新增自定义食物与组合食谱保存失败的回归测试，验证输入保留、成功重试、无重复记录及重载后的持久化。覆盖率汇总包含页面重载前后的同源脚本执行区间。

本轮未运行 WebKit 与 iOS 真机验证；完整双引擎测试矩阵为 80 项，其中 WebKit 的 2 项原有 axe 扫描明确跳过。

## 已知局限

- 模拟器里的 WebKit 不等于 iOS Safari，主屏幕模式和安全区只能在真机确认。
- axe 等自动化工具只能发现一部分无障碍问题，读屏体验仍需 VoiceOver / TalkBack 实测。
- 界面模块（10–90）由端到端操作覆盖，字符覆盖率与核心逻辑的行覆盖率不同，不代表所有组合都已验证。拍照接口测试使用假响应，不能证明真实服务商的 CORS、响应格式或限流策略。
- 原有 axe 全页面扫描只在 Chromium 执行，WebKit 对应 2 项明确跳过，其余交互与 PWA 测试在两个引擎执行。
