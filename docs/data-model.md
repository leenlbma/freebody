# 数据结构

AI 或其他工具向 FreeBody 写入数据请使用增量导入包，见 [data-format.md](data-format.md)。

全部数据以一个 JSON 对象保存在 `localStorage['freeBody_v1']`（v2.0 起；首次启动时若存在旧键 `fitTracker_v1` 会自动复制过来，旧键保留，结构不变），导出文件即该对象原样。日期统一为本地日期字符串 `YYYY-MM-DD`；`id` 为随机短字符串。加载时会用 `defaults()` 为缺失字段补默认值，因此新增字段向后兼容。


另有两个独立的键，不在导出备份中（除非在「拍照识别」中勾选包含 Key）：`freeBody_ai_v1` 保存拍照识别的服务商与 Key；`freeBody_meta_v1`（v2.6 起）保存存储安全相关的状态，不含任何记录内容：

```jsonc
{
  "lastBackup": "2026-10-12",   // 最近一次「导出 JSON」的日期
  "firstUse": "2026-09-01",     // 最早记录日期（从未备份时，备份提醒从这里起算）
  "snooze": "2026-10-19",       // 备份提醒推迟到此日期（点「7 天后提醒」）
  "warned": { "70": 1 }         // 容量预警已提示的档位（70 / 90 各提示一次，用量回落 5% 以下后重置）
}
```

容量按 localStorage 约 5 MB（约 262 万个 UTF-16 字符）保守估算；写入抛出 QuotaExceededError 时不覆盖已有数据，并提示导出。

```jsonc
{
  "v": 1,
  "theme": "auto",                       // auto | light | dark
  "profile": {
    "name": "", "height": null,          // 身高 cm，用于 BMI
    "injuryFlagLabel": "伤处不适",        // 训练记录中的伤处标记名称
    "swimNote": "", "run800HistLabel": ""
  },
  "goals": { "kcal": 2200, "p": 140, "c": 260, "f": 65, "sleepH": 7, "trainDays": 4, "stairMin": 120, "weight": null,
             "mealSplit": { "早餐": 25, "午餐": 35, "晚餐": 30, "加餐": 10 },   // 每餐热量分配 %，合计不为 100 时按比例换算
             "calc": { "sex": "m|f", "age", "pal": 1.55, "mode": "cut|keep|bulk", "adj": 0, "pkg": 1.6, "fatPct": 25, "km": false } }, // 「目标怎么来的」参数，可缺省

  // 饮食
  "meals":    [{ "id", "date", "meal": "早餐|午餐|晚餐|加餐",   // 旧版"练前/练后"等保留原值，统计时计入加餐
                 "food", "name",                                 // 显示名（两者相同，food 保持向后兼容）
                 "kcal", "p", "c", "f", "na", "fib",             // 本条合计；na 钠 mg、fib 膳食纤维 g 可缺省
                 "foodId", "amount", "unit", "g",                // 食物 id、输入的数量与单位（如 1 碗）、折算克数，可缺省
                 "nutrimentsPer100g": { "kcal", "p", "c", "f", "na", "fib" }, // 记录时的营养快照，可缺省
                 "src": "lib|quick|photo|ai|import|custom",      // 内置库 / 快速输入 / 教练照片估算 / 拍照识别 / 导入包 / 自定义；旧记录可缺省
                 "est": true,                                    // 导入包中标为估算（src=import）
                 "imp": "<导入包 id>",                            // 由导入包写入的记录（各类记录通用，用于重复导入时去重合并）
                 "lo", "hi",                                     // 照片估算区间 kcal（src=photo）
                 "kcalOnly": true }],                            // 只填了热量（如 "外卖 650"）
  "favFoods": [{ "food", "kcal", "p", "c", "f" }],
  "customFoods": [{ "id", "name", "category", "kcal", "p", "c", "f", "na", "fib", "servings": [{ "unit": "份", "g" }], "source", "custom": true, "combo": "组成文本" }],   // 每100g；combo 表示组合/食谱

  // 训练
  "recoveryStart": "",                   // 恢复期起始日
  "workouts": [{ "id", "date", "exercise", "sets", "reps", "weight", "rpe", "rir", "note", "wrist": false,
                  "target": { "reps", "weight" }, "session": "<sessionId>" }],
                  // wrist=伤处不适标记；rir=余力次数(0–5)，与 rpe 互通：rpe = 10 − rir
                  // 引导模式每组一条（sets=1），并带 target（本组目标）与 session；手动记录无 target/session
  "plans":    [{ "id", "name", "items": [{ "ex", "sets", "lo", "hi", "rule" }] }],   // 训练计划；lo=目标次数（双重进阶为下限），hi=上限
  "exRules":  { "<动作名>": { "rule": "linear|double|hold", "lo", "hi", "inc" } },   // 每个动作的进阶规则；inc 留空按默认步长
  "active":   null | { "id", "date", "name", "planId", "start", "cur", "restEnd", "restTotal",
                "items": [{ "ex", "rule", "why", "kind", "rest", "wrist",
                  "sets": [{ "tw", "tr", "w", "r", "rir", "done", "miss", "eid" }] }] },  // 进行中的训练（持久化，可继续）
  "sessions": [{ "id", "date", "name", "start", "end", "sets", "volume", "prs": [], "items": [{ "ex", "sets", "miss", "next", "why" }] }], // 完成总结
  "cardio":   [{ "id", "date", "min", "floors", "hr" }],                  // 爬楼
  "swims":    [{ "id", "date", "stroke", "dist", "sec", "swolf", "note" }], // sec=用时秒
  "pb100br":  [{ "id", "date", "sec", "type", "note" }],                 // 100m 蛙泳成绩
  "run800":   [{ "id", "date", "sec", "type", "note" }],
  "run800Hist": null,                    // 800m 历史最佳（秒）
  "perfEvents": [{ "id", "name", "unit", "better": "higher|lower", "hist": null }], // 自定义测试项目，默认含纵跳
  "perfLog":    [{ "id", "date", "ev": "<perfEventId>", "value", "note" }],          // 时间类成绩存秒

  // 补剂
  "supps":   [{ "id", "name", "dose", "time" }],
  "suppLog": { "YYYY-MM-DD": { "<suppId>": { "at": "HH:MM" } } },

  // 睡眠（记在起床当天）
  "sleep": [{ "id", "date", "bed": "HH:MM", "wake": "HH:MM", "dur", "q": 1-5, "note" }],

  // 身体指标
  "body": [{ "id", "date", "weight", "bf", "waist", "rhr" }],

  // 心得（v2.5）
  "notes": [{ "id", "date", "title", "text", "tags": [], "from": "导入包 source", "imp" }],

  // 激素/恢复
  "recov": [{ "id", "date", "rhr", "hrv", "stress", "energy", "soreness", "mood", "appetite" }], // 主观项 1-5
  "labs":  [{ "id", "date", "name", "value", "unit", "lo", "hi", "note" }],                   // lo/hi=参考范围

  // 伤病与限制
  "injuries":   [{ "id", "name", "desc", "status": "康复中|已恢复" }],
  "wristLog":   [{ "date", "pain": 0-10, "trig": ["触发动作"], "note" }],   // 伤处每日疼痛（历史字段名）
  "rehab":      [{ "id", "name", "dose" }],
  "rehabLog":   { "YYYY-MM-DD": { "<rehabId>": 1 } },
  "restricted": [{ "id", "name", "alt" }]
}
```

## 计算规则（摘要）

- **准备度分数**（0–100，仅供参考）：睡眠时长 20%（4h→0，目标→满分）、睡眠质量 10%、静息心率相对前 14 天基线 20%、HRV 相对基线 20%、主观（精力/情绪/酸痛/压力）30%；缺失项按剩余权重归一，至少 2 项才计算。≥70 良好，50–69 一般，<50 偏低。
- **估算 1RM**（Epley）= 重量 × (1 + 次数/30)；每个动作每天取最大值。
- **肌群归类**：按动作名称关键词匹配（`EX_MUS`，按顺序匹配，越具体越靠前），得到主要/次要肌群；训练分析的肌群分布按第一个主要肌群统计组数，未匹配归"其他"。
- **训练频率热力**：当日 力量组数 + 爬楼分钟/10 + 游泳米数/250，分 0–4 级。

- **自动进阶**（`nextTarget`，训练引导与手动记录的自动带出共用）：以该动作最近一次训练日（早于所选日期）为依据，当日最大重量为"上次重量"。按顺序判断：
  1. 恢复期第 1–2 周 → 保持重量与次数，留 3–4 次余力；
  2. 上次任一组标记伤处不适 → 保持；
  3. 自重动作（重量 0）→ 每组 +1 次；
  4. 减载（规则非"保持"时）：连续 2 次未完成，或同一重量连续 3 次总次数没有增加（且未达到加重条件）→ 重量 ×0.9（按 2.5kg 或 0.5kg 取整），次数回到目标/下限；
  5. 保持：维持重量与次数；
  6. 双重进阶（lo–hi，默认 8–12）：每组都达到 hi → 加重，次数回到 lo；否则保持重量，目标次数 = min(hi, 最少一组次数 + 1)；
  7. 线性：每组都达到目标次数 → 加重；未做满 → 不加重。
  - "完成"判定：每组次数 ≥ 本组目标（引导模式的 target.reps；无目标时线性用首组次数，双重进阶用 lo）。
  - 默认加重步长：主要肌群含下肢/下背时，≥60kg +5kg，否则 +2.5kg；其他动作 ≥20kg +2.5kg，否则 +1kg；可在 `exRules[动作].inc` 自定义。
  - 每条目标附一句白话理由（如"上次 3 组都做满 5 次，加 2.5kg。"）。

- **肌群疲劳/恢复模型**（`muscleState`，仅为训练安排参考）：
  - 有效组：RIR ≤4（即 RPE ≥6）计入；未记录 RIR/RPE 视为有效。主要肌群每组计 1，次要肌群计 0.5。
  - 衰减：剩余疲劳 = Σ 有效组 × 0.5^(经过小时 / 半衰期)；训练时间按当日 18:00 估算，"现在"为当前时间（查看历史日期时取该日 23:59）。
  - 恢复半衰期（小时）：胸 36、背 36、肩 30、二头 24、三头 24、前臂 20、核心 20、下背 54、臀 48、股四头 48、腘绳 48、小腿 30（下肢与下背慢于上肢）。
  - 状态：从未训练 → 未训练；剩余疲劳 ≥4 → 恢复中（疲劳高）；≥1.5 → 恢复中（预计恢复时间 = 半衰期 × log2(疲劳/1.5)）；否则距上次有效训练 >7 天 → 太久没练；其余 → 已恢复。
  - 热图两种模式：恢复状态（按状态着色）、近 7 天组数（颜色深浅随近 7 天有效组数增加）。
  - 今日推荐：准备度 <50 → 休息或轻松有氧；否则在 推（胸/肩/三头）、拉（背/二头/前臂）、腿（股四头/腘绳/臀/小腿）、核心与下背 中，选前两个主要肌群均为 已恢复/太久没练/未训练、且距上次训练最久的部位；都不满足时建议有氧或休息；有未恢复伤病时提示避开受限动作。若某个计划中半数以上动作命中推荐肌群，可一键开始。
  - 人体图为自绘简化 SVG（见 NOTICE），不代表精确解剖结构。

- **训练量** = 组数 × 次数 × 重量；周从周一开始。
- **恢复期**：第 1–2 周 RPE≤7（留 3–4 次），第 3–4 周 RPE 7–8，第 5–6 周 RPE≈8。
- **过度训练预警**：近 3 天均值对比前 4–17 天基线；信号包括静息心率 ↑≥5 bpm、HRV ↓≥10%、睡眠 <6.5 h、睡眠质量 ≤2.5、压力/酸痛 ≥4、精力/情绪/食欲 ≤2。1 项提示、2 项黄色、≥3 项红色。
- **伤处疼痛提示**：当日 ≥5 红色；当日 ≥3 或近 3 天均值较前期上升 ≥2 为黄色。

## 示例配置格式（examples/*.json）

```jsonc
{ "id", "title", "_comment",
  "profile": { ...部分 profile 字段 },
  "run800Hist": null,                    // 可选，秒；仅在当前为空时写入
  "injuries": [{ "name", "desc", "status" }],
  "rehab": [{ "name", "dose" }],
  "restricted": [{ "name", "alt" }] }
```
加载时只合并配置与清单（按名称去重），不写入任何记录。内置示例来自 `examples/`；同格式的本地文件（如仓库外的个人配置）可在「我的 › 示例配置 › 从文件加载配置」中加载。

## 饮食目标推导（「目标怎么来的」）

- BMR：Mifflin-St Jeor（男 10W + 6.25H − 5A + 5；女 10W + 6.25H − 5A − 161）。有体重与体脂记录且勾选时用 Katch-McArdle：370 + 21.6 × 瘦体重，瘦体重 = 体重 × (1 − 体脂%)。W 取最近一次体重，H 取个人配置身高。
- TDEE = BMR × 活动系数（1.4 / 1.55 / 1.75 / 2.0，参考 FAO/WHO/UNU 2004 的 PAL 区间）。
- 目标热量 = TDEE × (1 + 缺口)，减脂 −15%、维持 0、增肌 +10%；再加手动偏移，取整到 10 kcal。
- 蛋白 = g/kg × 体重（默认 1.6）；脂肪 = 热量 × 25% ÷ 9；碳水 = 剩余热量 ÷ 4。
- 文献：Mifflin MD, St Jeor ST, et al. Am J Clin Nutr. 1990;51(2):241–247；McArdle WD, Katch FI, Katch VL. Exercise Physiology；FAO/WHO/UNU. Human energy requirements, 2004；Jäger R, et al. J Int Soc Sports Nutr. 2017;14:20；Morton RW, et al. Br J Sports Med. 2018;52:376–384。
- 饮食月历：当日热量 / 目标 在 0.9–1.1 为达标，<0.9 偏低，>1.1 偏高。连续记录 = 从今天（今天未记录则从昨天）向前连续有饮食记录的天数。
- 目标体重预计日期：近 42 天体重做最小二乘线性回归（至少 3 次、跨度 ≥14 天），以回归值为当前趋势体重，按斜率外推；趋势背离目标或超过 3 年时不给日期。
