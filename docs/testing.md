# 测试说明

[中文](testing.md) | [English](testing.en.md)

| 层 | 命令 | 覆盖什么 | 在哪里跑 |
|---|---|---|---|
| 静态检查 | `npm run check` | 语法、emoji、占位符、食物库字段与来源、导入包 schema、skill 与文档一致 | 本地 / CI |
| 格式与 lint | `npm run lint` | Prettier 格式；ESLint 推荐规则与跨模块顶层重名 | 本地 / CI |
| 类型 | `npm run typecheck` | `tsc --checkJs`，依据 JSDoc 与 `types/*.d.ts` | 本地 / CI |
| 许可证 | `npm run licenses` | 开发依赖（含间接依赖）只允许宽松许可证 | 本地 / CI |
| 单元测试 | `npm test` | 00–09 纯逻辑模块：合计、准备度、进阶、1RM、BMR、疲劳、快速记录、CSV、导入合并与撤销、链接解码、存储预警、损坏保护、演示数据 | 本地 / CI |
| 覆盖率 | `npm run test:coverage` | 同上，并输出逐文件覆盖率；CI 要求纯逻辑模块行覆盖 ≥ 85% | 本地 / CI |
| 端到端 | `npm run test:e2e` | Chromium 与 WebKit（iPhone 13 尺寸）：所有页面无脚本错误、导航、快速记录、axe 0 违规（浅 / 深色）、减少动效、图表文字替代、演示模式不写存储、链接导入、损坏数据 | 本地 / CI |
| 端到端覆盖率 | `npm run test:e2e:coverage` | 在 Chromium 上收集应用脚本的 V8 覆盖率，按模块统计已执行的非空白字符比例；CI 要求 src/app 合计 ≥ 60% | 本地 / CI |
| 真机 | [device-test.md](device-test.md) | 主屏幕模式、安全区、读屏、真实存储与 Service Worker | **只能由有设备的人完成** |

## 端到端测试

```bash
npm ci
npx playwright install chromium webkit   # Linux 首次运行可加 --with-deps
npm run build
npm run test:e2e
```

`playwright.config.js` 会用 `scripts/serve.js` 在 127.0.0.1:8766 启动静态服务器。测试中禁用了 Service Worker（首次安装后的刷新会打断测试），离线缓存与更新提示要在真机清单里验证。

需要数据的测试只用演示模式（`#demo`，虚构数据、只在内存中）或测试内临时写入的少量虚构记录，每个测试都在全新的浏览器上下文中运行，结束即丢弃。

## 单元测试的加载方式

`tests/harness.js` 在 Node 的 vm 沙箱中按文件名顺序逐个执行 `src/app/0*.js`，用内存版 `localStorage` 和固定的「今天」（默认 2026-10-12）。可选参数：`storage`（初始存储）、`quota`（模拟上限）、`hash`（如 `#demo`）、`now`、`foods`（载入内置食物库）、`confirm`（`confirm()` 的返回值）。沙箱里的数组来自另一个 realm，用 `deepEqual` 比较前先展开（`[...arr]`）。

## 已知局限

- 模拟器里的 WebKit 不等于 iOS Safari，主屏幕模式和安全区只能在真机确认。
- axe 等自动化工具只能发现一部分无障碍问题，读屏体验仍需 VoiceOver / TalkBack 实测。
- 界面模块（10–90）没有单元测试，只由端到端测试覆盖（v2.11.0 时合计约 66%，按字符统计，与单元测试的行覆盖率口径不同）。训练、快速记录、导入模块的端到端覆盖仍低于 50%。
