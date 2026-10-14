# 贡献指南

[中文](CONTRIBUTING.md) | [English](CONTRIBUTING.en.md)

感谢你的贡献！本项目保持 **运行时零依赖、单文件、离线可用** 的原则。开发工具（ESLint、Prettier、TypeScript 类型检查、Playwright）只是 devDependencies，不会进入 `index.html`。

## 开发流程

1. Fork 并克隆仓库。
2. 修改 `src/`、`data/` 或 `examples/` 下的文件（**不要直接编辑根目录 `index.html`**，它是构建产物）。
3. 安装开发工具并运行检查：
   ```bash
   npm ci                 # 安装 devDependencies（版本已锁定）
   npm run build          # 生成 index.html 与 sw.js
   npm run check          # 语法、emoji、食物库、导入包 schema
   npm run lint           # ESLint + Prettier 格式检查（npm run format 自动格式化）
   npm run typecheck      # tsc --checkJs：用 JSDoc 与 types/*.d.ts 检查 src/
   npm test               # 单元测试（npm run test:coverage 查看覆盖率）
   npx playwright install chromium webkit   # 首次运行端到端测试前
   npm run test:e2e       # 端到端：所有页面无报错、axe 0 违规、导入、演示模式、损坏数据
   ```
   `npm run verify` 依次运行 build、check、lint、typecheck 与单元测试。CI 会额外检查提交的 `index.html` 与源码构建结果一致，并要求纯逻辑模块的行覆盖率不低于 90%。
4. 用手机尺寸（如 390px 宽）在浏览器中打开 `index.html`，浅色与深色主题下各检查一遍。
5. 有真机的话，按 [docs/device-test.md](docs/device-test.md) 跑一遍相关项目，并在 PR 中写明设备与结果。
6. 提交 PR，并在 `CHANGELOG.md` 的「未发布」下简述改动。PR 中需同时包含源码与重新构建后的 `index.html`。

## 代码约定

- 纯原生 JS（ES5 风格即可，兼容较旧的移动浏览器），不引入框架、CDN 或网络请求。
- 应用逻辑在 `src/app/` 下按模块拆分，构建时按文件名顺序合并进同一个 IIFE（共享作用域，无模块加载器）：`00-core`（状态与常量）、`01-store`（存储、容量预警、备份提醒）、`02-util`、`03-calc`（核心计算）、`04-import`（导入解析与合并）、`05-demo`（演示数据）、`06-crypto`（加密备份）只定义、不访问 DOM，由 `tests/` 单元测试覆盖；`09-init` 读取本机数据；`10-ui-*` 起为各页面界面，`90-boot` 为启动。模块之间不要改写彼此的函数：需要在渲染、切换页面或切换主题后执行的逻辑，用 `HOOKS.render / show / theme.push(fn)` 注册。
- 类型：数据结构定义在 `types/model.d.ts`，全局与 DOM 补充在 `types/globals.d.ts`；新增常量表或复杂结构时写 JSDoc（`/** @type {...} */`），保证 `npm run typecheck` 为 0 错误。新增文件请沿用 `NN-名称.js` 命名并在首行写一句说明。改动计算或导入逻辑时请同步补测试。
- 各模块内按板块分节（`/* ---------- 板块 ---------- */`），新增板块请保持：数据默认值写入 `defaults()` → 渲染函数 `rXxx()` → 在 `render()` 中注册 → 在 `GROUPS` / `SEC_LABEL` 中加入导航（`HUB` 中的分组首页不显示子标签，详情页自动显示返回按钮）。
- 交互保持简洁：底部导航不超过 4 个；新功能优先放进已有卡片或"更多"折叠区；表单只默认显示必填字段，其余放进 `<details class="more">`；文案尽量一句话。
- 新增数据字段必须在 `defaults()` 中给出默认值（旧数据加载时自动补齐），并更新 `docs/data-model.md`。
- 用户输入渲染到 HTML 前一律经过 `esc()`。
- 无障碍：只有图标的按钮必须写 `aria-label`；`<label>` 用 `for` 关联输入框（`90-boot.js` 中的 `a11y()` 会给紧邻的控件自动补上，但请优先写在源码里）；可点的卡片用 `data-go` / `data-sub`，会自动获得焦点与按钮语义；图表由 `charts.js` 自动生成文字摘要与数据表，请给图表上方写 `<h3>` 小标题作为图表名称；动画需在「减少动效」下关闭（全局样式已覆盖 CSS 动画与过渡）。提交前可以用 axe 等工具检查，目标是 0 项违规。
- 演示数据在 `05-demo.js`，只用虚构内容；新增数据类型时请同步补一些演示记录。
- 界面不使用 emoji。图标在 `src/icons.js` 中新增，保持 24×24、1.5px 描边、无填充、圆角端点、`currentColor`；HTML 中写 `<i data-ic="名称"></i>`，JS 中用 `IC('名称')`。
- 图表统一用 `src/charts.js`（`FitCharts.line / bars / stack / donut / hbars / heat`），颜色只用 CSS 变量，并提供空状态文案。
- 动作 → 肌群的关键词映射在 `EX_MUS`（越具体的关键词越靠前），肌群与恢复半衰期在 `MUS`；调整参数请同步 `docs/data-model.md`。
- 不得复制其他项目（尤其是 GPL/AGPL 项目）的代码、文案或素材；借鉴交互思路可以，需自行实现，并在 NOTICE 中说明。引入任何第三方 MIT 等宽松许可的数据时，须在 NOTICE 与 README 保留其版权声明。
- 涉及健康/医疗的文案应保持"记录与参考"定位，不给出诊断或处方式建议。

## 导入格式与 skill

- 导入包格式由 `docs/data-format.md`、`schema/freebody.schema.json` 与应用内的 `impRow()` 共同定义，三者必须一致。新增字段时请同时更新 schema、`examples/import/` 示例、中英文文档和 `skills/freebody-coach/`。
- `npm run check` 会用 schema 校验示例和文档中的 JSON 示例。
- skill 中不得包含任何个人信息，并保留安全边界（不做医疗诊断，伤病建议就医）。

## 文档语言

界面只有简体中文；文档为中英双语。修改 README、`docs/data-format`、`docs/food-database`、本文件或 skill 时，请同步更新对应的 `.en.md`（英文版可以意译，但内容需对应）。

## 食物库贡献

见 [docs/food-database.md](docs/food-database.md)。请注明数据来源，数值为每 100g 可食部。

## 隐私红线

- 禁止在仓库中提交任何真实个人记录（导出 JSON、截图中的真实数据等）。
- `examples/` 只能包含**配置与清单**，不得包含记录数据（体重、化验值、成绩等记录）。`examples/import/` 中的导入包示例必须是明显的通用示例数据。

## 行为准则

友善、尊重、就事论事。
