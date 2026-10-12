# 复制给你的 AI · Copy this to your AI

[中文](#中文) | [English](#english)

所有规则（饮食估算、训练记录、导入包格式、导入链接、进阶建议、安全边界）都写在 [SKILL.md](SKILL.md) / [SKILL.en.md](SKILL.en.md) 里。下面的提示词只负责让 AI 读取并遵守 skill。

All the rules (meal estimation, training logs, the import pack format, import links, progression advice and safety boundaries) live in [SKILL.md](SKILL.md) / [SKILL.en.md](SKILL.en.md). The prompt below only asks the AI to read the skill and follow it.

本文件与 README 中的提示词保持一致，`npm run check` 会校验。 / This file is kept identical to the prompts in the READMEs, and `npm run check` enforces it.

## 中文

把下面的提示词复制给你常用的 AI（ChatGPT、Claude、Gemini、Grok、通义等）：

<!-- freebody-prompt:zh -->
```text
请你担任我的 FreeBody 健身教练：帮我估算饮食、记录训练、给出进阶和恢复建议，并生成可以导入 FreeBody 的数据。
开始前请读取这份 skill，之后严格按照它执行：https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.md
（raw 地址：https://raw.githubusercontent.com/leenlbma/freebody/main/skills/freebody-coach/SKILL.md）
如果你打不开链接，请直接告诉我，我会把 SKILL.md 的全文粘贴给你。
```
<!-- /freebody-prompt -->

不能联网的 AI，可以直接复制 [SKILL.md](https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.md) 全文给它。

## English

Paste the prompt below into any AI you use (ChatGPT, Claude, Gemini, Grok, Qwen and others):

<!-- freebody-prompt:en -->
```text
Please act as my FreeBody fitness coach: estimate my meals, log my training, suggest progression and recovery, and produce data I can import into FreeBody.
Before we start, read this skill and follow it strictly from then on: https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.en.md
(raw: https://raw.githubusercontent.com/leenlbma/freebody/main/skills/freebody-coach/SKILL.en.md)
If you can't open the link, tell me and I'll paste the full text of SKILL.en.md for you.
```
<!-- /freebody-prompt -->

If your AI can't browse the web, paste the full text of [SKILL.en.md](https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.en.md) into it instead.

---

导入方式：打开 AI 给的链接，或在 FreeBody「我的 › 数据备份 › 粘贴导入」里粘贴 JSON，核对预览后确认。数据只在本机处理。不构成医疗建议。

To import, open the link the AI gives you, or paste the JSON under 我的 › 数据备份 › 粘贴导入 (Me › Backup › Paste import), check the preview and confirm. Data is processed only on your device. Not medical advice.
