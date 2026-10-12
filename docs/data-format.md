# FreeBody 数据格式

[中文](data-format.md) | [English](data-format.en.md)

FreeBody 是一个「AI 健身教练的仪表盘」：你和自己的 AI 讨论训练和饮食，AI 生成数据，FreeBody 负责存储和可视化。本文档定义 AI（或任何工具）向 FreeBody 写入数据所用的**增量导入包**格式，以及两种导入方式。

- 机器可读的定义：[`schema/freebody.schema.json`](../schema/freebody.schema.json)（JSON Schema 2020-12）
- 示例文件：[`examples/import/`](../examples/import/)
- 完整备份文件（「导出 JSON」）的结构见 [data-model.md](data-model.md)。备份用于整体恢复，与导入包不同。
- 生成导入包的 AI 指南：[`skills/freebody-coach/SKILL.md`](../skills/freebody-coach/SKILL.md)

所有解析和合并都在用户的浏览器中完成，不经过任何服务器。

## 导入包

```jsonc
{
  "freebody": "import",          // 固定值，必填
  "version": 1,                  // 格式版本，必填
  "source": "AI 教练",           // 可选，生成方名称，显示在预览里（≤60 字）
  "created": "2026-10-12T21:30:00+08:00", // 可选，ISO 8601
  "note": "可选说明",            // 可选（≤200 字）
  "entries": [ /* 1–2000 条，见下文 */ ]
}
```

每个条目都有三个公共字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `type` | 是 | `meal` 饮食 / `workout` 训练 / `supplement` 补剂 / `sleep` 睡眠 / `body` 身体指标 / `note` 心得 |
| `id` | 是 | 稳定的唯一标识：字母或数字开头，可含 `.` `_` `:` `-`，最长 64 位。同一份数据再次导入时用它去重合并 |
| `date` | 是 | 本地日期 `YYYY-MM-DD` |

条目不允许出现表格以外的字段（schema 中 `additionalProperties: false`），这样拼错的字段名会在校验时被发现。

**id 建议**：`<来源>-<日期>-<内容>`，例如 `coach-20261012-lunch-rice`、`coach-20261012-squat`。AI 修正同一条数据时沿用原 id，FreeBody 会把它识别为「更新」，不会重复记录。

### meal：饮食（每样食物一条）

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 食物名（≤80 字）。填写 `g` 时显示为「名称 200g」 |
| `kcal` | 是 | 本条合计热量 |
| `meal` | 否 | `早餐` `午餐` `晚餐` `加餐`，也接受 `breakfast` `lunch` `dinner` `snack`。缺省时按 `time` 推断 |
| `time` | 否 | `HH:MM`；`meal` 和 `time` 至少给一个 |
| `g` | 否 | **实际吃下**的克数（已扣除剩余） |
| `p` `c` `f` | 否 | 蛋白质、碳水、脂肪（g），本条合计；缺省记 0 |
| `fib` `na` | 否 | 膳食纤维 g、钠 mg |
| `estimated` | 否 | `true` 表示估算值（照片或文字描述估算），界面标「估算」 |
| `lo` `hi` | 否 | 热量估算区间 |
| `note` | 否 | 备注（≤200 字），如「原约 560g，剩约 25%」 |

吃前、吃后两张照片对比时，`g` = 原克重 × (1 − 剩余比例)，`kcal` 与宏量按同一比例折算。

### workout：训练（每个动作一条，含若干组）

| 字段 | 必填 | 说明 |
|---|---|---|
| `exercise` | 是 | 动作名，如「杠铃深蹲」。用于肌群归类、进阶计算 |
| `sets` | 是 | 1–50 组：`{ "reps": 5, "weight": 60, "rir": 2, "note": "" }` |
| `sets[].reps` | 是 | 次数（整数） |
| `sets[].weight` | 否 | 重量 kg；自重填 0 或省略 |
| `sets[].rir` | 否 | 余力次数 RIR 0–10（RPE = 10 − RIR） |
| `flag` | 否 | `true` 表示伤处不适 |
| `note` | 否 | 备注 |

导入后每组存为一条训练记录，进入肌群热图、训练统计和自动进阶计算。

### supplement：补剂打卡

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | 按名称（不区分大小写）匹配补剂清单；清单里没有时自动新增 |
| `dose` | 否 | 剂量，仅在新增补剂项时使用 |
| `time` | 否 | 打卡时间 `HH:MM` |

### sleep：睡眠（记在起床当天）

| 字段 | 必填 | 说明 |
|---|---|---|
| `bed` `wake` | 是 | 入睡、起床时间 `HH:MM`，时长自动计算（可跨午夜） |
| `q` | 否 | 主观质量 1–5 |
| `note` | 否 | 备注 |

### body：身体指标（至少填一项）

| 字段 | 说明 |
|---|---|
| `weight` | 体重 kg（20–400） |
| `bf` | 体脂 %（2–75） |
| `waist` | 腰围 cm（30–250） |
| `rhr` | 静息心率 bpm（整数） |

### note：心得

| 字段 | 必填 | 说明 |
|---|---|---|
| `text` | 是 | 正文（≤2000 字） |
| `title` | 否 | 标题（≤60 字） |
| `tags` | 否 | 最多 10 个标签，每个 ≤20 字 |

心得显示在「数据 › 更多 › 心得」，导入时会记录 `source`。

## 去重与合并

导入前，FreeBody 会逐条和本机数据比对，并在预览中标出结果：

| 状态 | 条件 | 写入时 |
|---|---|---|
| 新增 | 本机没有同 id 的记录 | 新建 |
| 更新 | 本机有同 id 的记录，内容不同 | 用导入包中的内容替换（训练按动作整体替换所有组） |
| 合并 | 睡眠、身体指标：本机同一天已有记录（id 不同） | 把导入包中给出的字段写入当天记录，未给出的字段保留 |
| 已存在 | 同 id 且内容相同；或补剂当天已打卡 | 跳过 |
| 无效 | 字段缺失、格式或范围不对、类型不支持、包内 id 重复 | 跳过，并显示原因 |

因此同一个导入包可以重复导入，不会产生重复记录。确认导入后可以在完成页「撤销导入」。

## 导入方式

### 1. 粘贴导入

「我的 › 数据备份 › 粘贴导入」，粘贴 JSON 后点「预览」，确认后写入。也可以直接粘贴导入链接，或带 \`\`\`json 代码块标记的内容。上限 2 MB、2000 条。

### 2. 链接导入

```
https://leenlbma.github.io/freebody/#import=<载荷>
```

- 载荷是导入包 UTF-8 JSON 的 **base64url**（RFC 4648 §5，可省略 `=` 填充）。
- 加 `z.` 前缀表示载荷先经过 **deflate-raw**（RFC 1951，无 zlib 头）压缩，通常能缩短 50–70%。浏览器需支持 `DecompressionStream`（Safari 16.4+、Chrome 80+、Firefox 113+）。
- 数据放在 `#` 之后，浏览器不会把它发送给服务器（包括 GitHub Pages）。
- 打开后先显示同样的预览，确认或取消后，地址栏中的 `#import=…` 会被清除。
- **长度**：聊天软件常会截断长链接。建议链接不超过约 1800 字符，更长时请改用粘贴导入。链接载荷超过 60000 字符时，FreeBody 会直接提示改用粘贴；链接被截断时也会提示。

生成链接（Python 标准库）：[`skills/freebody-coach/scripts/make_link.py`](../skills/freebody-coach/scripts/make_link.py)

```bash
python3 skills/freebody-coach/scripts/make_link.py pack.json
```

浏览器或 Node 18+ 中：

```js
async function freebodyLink(pack, base = 'https://leenlbma.github.io/freebody/') {
  const raw = new TextEncoder().encode(JSON.stringify(pack));
  const z = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(z))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base + '#import=z.' + b64;
}
```

## 完整示例

```json
{
  "freebody": "import",
  "version": 1,
  "source": "示例 AI 教练",
  "created": "2026-10-12T21:30:00+08:00",
  "entries": [
    { "type": "meal", "id": "ex-20261012-lunch-noodle", "date": "2026-10-12", "meal": "午餐", "name": "牛肉面", "g": 420, "kcal": 483, "p": 27, "c": 63, "f": 13, "estimated": true, "lo": 420, "hi": 560, "note": "原约 560g，剩约 25%" },
    { "type": "workout", "id": "ex-20261012-squat", "date": "2026-10-12", "exercise": "杠铃深蹲", "sets": [ { "reps": 5, "weight": 60, "rir": 3 }, { "reps": 5, "weight": 60, "rir": 2 } ] },
    { "type": "supplement", "id": "ex-20261012-creatine", "date": "2026-10-12", "name": "肌酸", "dose": "5g", "time": "08:30" },
    { "type": "sleep", "id": "ex-20261012-sleep", "date": "2026-10-12", "bed": "23:30", "wake": "07:10", "q": 4 },
    { "type": "body", "id": "ex-20261012-body", "date": "2026-10-12", "weight": 70.2 },
    { "type": "note", "id": "ex-20261012-note", "date": "2026-10-12", "text": "第三组速度略慢，下次保持重量。", "tags": ["训练"] }
  ]
}
```

## 校验

`npm run check` 会用 schema 校验 `examples/import/` 中的全部示例，以及本文档和 skill 中的 JSON 示例，并确认若干反例会被拒绝。第三方工具可以用任意 JSON Schema 2020-12 校验器校验导入包。应用内的校验与 schema 一致，另外还会检查包内 id 是否重复。

## 版本与兼容

- `version` 目前为 1。之后新增可选字段时版本号不变；不兼容的变化才升级版本号。旧版 FreeBody 遇到更高版本时会提示更新。
- 导入写入的记录带 `imp` 字段（即导入包中的 id）。饮食记录带 `src: "import"` 和 `est`（是否估算），完整备份中原样保留。
