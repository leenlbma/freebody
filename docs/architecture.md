# 架构说明

[中文](architecture.md) | [English](architecture.en.md)

FreeBody 是一个离线单文件网页应用。本文说明代码如何组织、数据如何流动，以及修改时要守住的几条边界。数据字段见 [data-model.md](data-model.md)，测试见 [testing.md](testing.md)。

## 构建产物

`scripts/build.js` 只用 Node 内置模块，把源码合成两个文件：

| 产物 | 内容 |
|---|---|
| `index.html` | `src/index.template.html`，内联 `styles.css`、`icons.js`、`charts.js`、食物库、示例配置与教练提示词（`window.FIT_DATA`），以及 `src/app/*.js` 合并成的一个 IIFE |
| `sw.js` | `src/sw.template.js`，版本号为 `package.json` 版本加内容哈希，预缓存应用外壳 |

构建结果是确定的：同样的源码得到逐字节相同的产物，CI 会检查提交的 `index.html` 与重新构建的结果一致。

## 模块

`src/app/` 下的文件按文件名顺序拼进同一个函数作用域，没有模块加载器。顶层名字在所有模块间共享，ESLint 配置会收集各模块的顶层声明，发现重名即报错。存储、校验与依据解释模块用私有 IIFE 隔离内部函数；lint 还禁止界面忽略 `save()` 返回值或直接写入主数据键。

| 层 | 文件 | 职责 | 是否访问 DOM |
|---|---|---|---|
| 定义 | `00-core` | 常量、导航分组、食物库入口、`HOOKS` | 否 |
| | `01-store` | `defaults()`、读写 localStorage、容量预警、备份提醒、损坏保护 | 否 |
| | `02-util` | 日期、格式化、转义、`$()`、`toast()` | 仅 `$` / `toast` |
| | `03-calc` | 合计、准备度、过度训练信号、进阶、1RM、BMR、肌群疲劳、快速记录解析 | 否 |
| | `03-evidence` | 营养来源类别、准备度依据与实际权重解释（私有 IIFE） | 否 |
| | `04-import` | 导入包校验与合并、撤销、链接解码、CSV | 否 |
| | `05-demo` | 确定性的虚构演示数据 | 否 |
| | `06-crypto` | 加密备份：PBKDF2 派生密钥 + AES-GCM（Web Crypto） | 否 |
| | `07-vault` | IndexedDB 恢复历史、完整性检查、限额与异步写入队列（私有 IIFE） | 否 |
| | `08-state` | 完整状态结构校验，显式传入默认值，不依赖全局 `S`（私有 IIFE） | 否 |
| 初始化 | `09-init` | 读取本机数据（演示模式则生成演示数据），得到全局状态 `S` | 否 |
| 界面 | `10-ui-shell` | 导航 `show()`、页面渲染分发 `render()`、主题 | 是 |
| | `11`–`21` | 各页面：今天、饮食、训练、记录、图表、训练引导、快速记录、设置、拍照识别、导入预览、帮助与自检 | 是 |
| | `22`–`23` | 恢复点管理、教练提示词与剪贴板兜底 | 是 |
| 启动 | `90-boot` | 无障碍补全、键盘、尺寸适配、PWA 与更新提示，注册钩子 | 是 |

00–09 只依赖 `localStorage`、`location` 等少量浏览器对象，单元测试在 Node 的 vm 沙箱中逐文件加载它们。

## 数据流

```
localStorage freeBody_v1 ──load()──▶ S（内存中的全部数据）
                                       │
  用户操作 / 导入包 / 拍照识别 ──修改──▶ S ──save()──▶ localStorage
                                       │
                               render() ──▶ 当前页面 DOM ──HOOKS.render──▶ 无障碍、日期控件、网格补位
```

- **单一状态**：所有记录都在 `S` 中；界面每次从 `S` 重新渲染当前页，不在 DOM 里保存状态。
- **保存**：`save()` 先校验后序列化 `S`。界面使用 `save(true)`：失败时回滚到上次成功状态，保留表单与 `STORE.draft` 供导出，因此重试不会重复添加。导入模块维护自己的操作前快照。数据损坏或处于演示模式时不写入。
- **写入保护**：支持 Web Locks 时，一个同源 FreeBody 窗口持有编辑锁，其余窗口只读；关闭编辑窗口后重新载入即可接续。每次保存、恢复备份或清空前还会比较读入时的存储原文；其他窗口已修改记录时拒绝覆盖，保留本页内容供导出。没有 Web Locks 的旧浏览器使用这项冲突检查，但无法保证两个窗口完全同时写入时的互斥，请固定在一个窗口记录。
- **恢复与导入**：完整备份先经 `stateNormalize()` 校验并补齐旧字段，再替换存储与内存状态；校验或写入失败保留原记录。AI 导入与 CSV 写入失败会回滚本次修改；AI 导入重新生成预览，保留原导入包供重试。
- **本机恢复点**：成功保存通过 `HOOKS.saved` 异步记录上次状态与当日状态，限制 8 份 / 总量 20 MB；读取时先验证 SHA-256，再校验结构。历史不包含 `aiConfig`，不可用时主记录仍可保存。`HOOKS.reset` 清理历史后才清空主记录与旧键。它仍属于同源浏览器数据，不能代替外部备份。
- **辅助状态**：`freeBody_meta_v1` 存提醒与备份时间，不进入备份。`freeBody_ai_v1` 存拍照识别配置（含 key），导出备份时附带服务商与模型，key 默认不导出（用户勾选后才包含）。
- **网络**：唯一的网络请求是用户自己配置并主动触发的拍照识别。其余功能完全离线。

## 钩子

需要在渲染、切换页面或切换主题之后执行的逻辑，用 `HOOKS.render / show / theme / saved / reset.push(fn)` 注册，不要改写其他模块的函数。目前注册的钩子：

| 钩子 | 回调（按顺序） |
|---|---|
| `render` | `storeUIState`、`a11y`、`dtWrap`、`todayBtn`、`layFill` |
| `show` | 读屏播报「已打开 …」 |
| `theme` | `syncThemeColor` |
| `saved` | 通过显式 payload 记录恢复点（主记录保存后） |
| `reset` | 串行历史队列清理完成后允许主记录清空 |

## 类型

`tsc --checkJs` 检查 `src/`：数据结构在 `types/model.d.ts`，全局对象与 DOM 补充在 `types/globals.d.ts`。目前不是 strict 模式，DOM 元素多按表单控件处理（`$()` 返回 `FBEl`）。

## 修改时的边界

- 新字段必须在 `defaults()` 给默认值，旧数据加载时自动补齐，并更新 `data-model.md`。
- 导入包格式由 `data-format.md`、`schema/freebody.schema.json` 和 `impRow()` 共同定义，三者要一起改。
- 用户输入写进 HTML 前一律经过 `esc()`。
- 不引入运行时依赖、CDN 或任何新的网络请求。
