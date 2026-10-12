# FreeBody data format

[中文](data-format.md) | [English](data-format.en.md)

FreeBody is a dashboard for your AI fitness coach. You talk training and nutrition through with the AI of your choice, the AI produces structured data, and FreeBody stores and visualises it. This document specifies the **incremental import pack**: the format that an AI, or any other tool, uses to write data into FreeBody. It also covers the two ways to deliver a pack.

- Machine-readable definition: [`schema/freebody.schema.json`](../schema/freebody.schema.json) (JSON Schema 2020-12)
- Sample files: [`examples/import/`](../examples/import/)
- The full backup file ("Export JSON") is a different thing, meant for restoring everything at once. Its structure is described in [data-model.md](data-model.md) (Chinese).
- Guidance for AI agents that generate packs: [`skills/freebody-coach/SKILL.en.md`](../skills/freebody-coach/SKILL.en.md)

Parsing and merging happen entirely in the user's browser. Nothing is sent to a server.

## The import pack

```jsonc
{
  "freebody": "import",          // required, fixed value
  "version": 1,                  // required, format version
  "source": "AI coach",          // optional, producer name shown in the preview (≤ 60 chars)
  "created": "2026-10-12T21:30:00+08:00", // optional, ISO 8601
  "note": "optional remark",     // optional (≤ 200 chars)
  "entries": [ /* 1–2000 entries, see below */ ]
}
```

Every entry carries three common fields:

| Field | Required | Meaning |
|---|---|---|
| `type` | yes | `meal`, `workout`, `supplement`, `sleep`, `body` or `note` |
| `id` | yes | A stable unique identifier. It starts with a letter or digit, may contain `.` `_` `:` `-`, and is at most 64 characters. Re-imports use it to de-duplicate. |
| `date` | yes | Local date, `YYYY-MM-DD` |

Fields not listed below are rejected (`additionalProperties: false`), so validation catches misspelt keys.

**Choosing ids.** A pattern such as `<source>-<date>-<item>` works well, for example `coach-20261012-lunch-rice` or `coach-20261012-squat`. When the AI corrects an entry, it should keep the original id. FreeBody then treats the entry as an update instead of logging it twice.

### meal: one food item per entry

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Food name (≤ 80 chars). If `g` is given, it is shown as "name 200g". |
| `kcal` | yes | Total energy for this item |
| `meal` | no | `早餐` `午餐` `晚餐` `加餐`, or `breakfast` `lunch` `dinner` `snack`. Inferred from `time` when omitted. |
| `time` | no | `HH:MM`. Provide at least one of `meal` and `time`. |
| `g` | no | Grams **actually eaten**, with leftovers already deducted |
| `p` `c` `f` | no | Protein, carbohydrate and fat in grams, totals for this item. Default 0. |
| `fib` `na` | no | Fibre (g) and sodium (mg) |
| `estimated` | no | `true` for estimates made from a photo or a description. The UI shows an "estimate" tag. |
| `lo` `hi` | no | Energy estimate range |
| `note` | no | Free text (≤ 200 chars), e.g. "about 560 g served, roughly 25 % left" |

For a before-and-after photo pair, use `g` = served grams × (1 − leftover fraction). Scale `kcal` and the macros by the same factor.

### workout: one exercise per entry, with its sets

| Field | Required | Meaning |
|---|---|---|
| `exercise` | yes | Exercise name, e.g. "Barbell squat". Used for muscle mapping and progression. |
| `sets` | yes | 1–50 sets, each `{ "reps": 5, "weight": 60, "rir": 2, "note": "" }` |
| `sets[].reps` | yes | Repetitions (integer) |
| `sets[].weight` | no | Load in kg. Use 0 or omit it for bodyweight. |
| `sets[].rir` | no | Reps in reserve, 0–10 (RPE = 10 − RIR) |
| `flag` | no | `true` marks pain or an injury concern |
| `note` | no | Free text |

Each set becomes one training record. The records feed the muscle heatmap, training statistics and automatic progression.

### supplement: check-in

| Field | Required | Meaning |
|---|---|---|
| `name` | yes | Matched against the supplement list by name (case-insensitive). Added to the list if missing. |
| `dose` | no | Dose. Only used when a new supplement is added to the list. |
| `time` | no | Check-in time, `HH:MM` |

### sleep: dated on the day you wake up

| Field | Required | Meaning |
|---|---|---|
| `bed` `wake` | yes | Bedtime and wake time, `HH:MM`. Duration is computed and may cross midnight. |
| `q` | no | Subjective quality, 1–5 |
| `note` | no | Free text |

### body: at least one metric

| Field | Meaning |
|---|---|
| `weight` | Body weight in kg (20–400) |
| `bf` | Body fat in % (2–75) |
| `waist` | Waist in cm (30–250) |
| `rhr` | Resting heart rate in bpm (integer) |

### note: journal entry

| Field | Required | Meaning |
|---|---|---|
| `text` | yes | Body text (≤ 2000 chars) |
| `title` | no | Title (≤ 60 chars) |
| `tags` | no | Up to 10 tags, each ≤ 20 chars |

Notes appear under Data › More › Notes (心得). The pack's `source` is stored with each note.

## De-duplication and merging

Before anything is written, FreeBody compares every entry with local data and labels it in the preview:

| Status | When | On confirm |
|---|---|---|
| New | No local record with this id | Created |
| Updated | A local record has this id but different content | Replaced. A workout replaces all of that exercise's sets. |
| Merged | Sleep or body only: a record already exists for that day under another id | The fields in the pack are written into that day's record. Other fields are kept. |
| Already there | Same id and same content, or the supplement is already checked in that day | Skipped |
| Invalid | Missing field, bad format or range, unsupported type, or an id repeated within the pack | Skipped, with the reason shown |

You can import the same pack any number of times without creating duplicates. After confirming, the completion screen also offers **Undo import**.

## Delivering a pack

### 1. Paste

Go to 我的 › 数据备份 › 粘贴导入 (Me › Backup › Paste import), paste the JSON and tap 预览 (Preview), then confirm. You can also paste an import link, or text wrapped in a json code fence. Limits are 2 MB and 2000 entries.

### 2. Link

```
https://leenlbma.github.io/freebody/#import=<payload>
```

- **Payload:** the **base64url** encoding (RFC 4648 §5) of the pack's UTF-8 JSON. The `=` padding may be dropped.
- **Compression:** a `z.` prefix means the JSON was compressed with **deflate-raw** (RFC 1951, no zlib header) before encoding. This usually saves 50–70 %. It requires `DecompressionStream` (Safari 16.4+, Chrome 80+, Firefox 113+).
- **Privacy:** the payload lives after `#`, so browsers never send it to the server, GitHub Pages included.
- **Preview:** opening the link shows the same preview. After you confirm or cancel, `#import=…` is removed from the address bar.
- **Length:** chat apps often truncate long URLs. Keep links under about 1800 characters and switch to paste beyond that. FreeBody refuses payloads over 60 000 characters, and it says so when a link looks truncated.

To generate a link, use [`skills/freebody-coach/scripts/make_link.py`](../skills/freebody-coach/scripts/make_link.py). It needs only the Python standard library.

```bash
python3 skills/freebody-coach/scripts/make_link.py pack.json
```

In a browser or Node 18+:

```js
async function freebodyLink(pack, base = 'https://leenlbma.github.io/freebody/') {
  const raw = new TextEncoder().encode(JSON.stringify(pack));
  const z = await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(z))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return base + '#import=z.' + b64;
}
```

## Complete example

```json
{
  "freebody": "import",
  "version": 1,
  "source": "Sample AI coach",
  "created": "2026-10-12T21:30:00+08:00",
  "entries": [
    { "type": "meal", "id": "ex-20261012-lunch-noodle", "date": "2026-10-12", "meal": "lunch", "name": "Beef noodle soup", "g": 420, "kcal": 483, "p": 27, "c": 63, "f": 13, "estimated": true, "lo": 420, "hi": 560, "note": "about 560 g served, roughly 25 % left" },
    { "type": "workout", "id": "ex-20261012-squat", "date": "2026-10-12", "exercise": "Barbell squat", "sets": [ { "reps": 5, "weight": 60, "rir": 3 }, { "reps": 5, "weight": 60, "rir": 2 } ] },
    { "type": "supplement", "id": "ex-20261012-creatine", "date": "2026-10-12", "name": "Creatine", "dose": "5 g", "time": "08:30" },
    { "type": "sleep", "id": "ex-20261012-sleep", "date": "2026-10-12", "bed": "23:30", "wake": "07:10", "q": 4 },
    { "type": "body", "id": "ex-20261012-body", "date": "2026-10-12", "weight": 70.2 },
    { "type": "note", "id": "ex-20261012-note", "date": "2026-10-12", "text": "Last set slowed down; keep the load next time.", "tags": ["training"] }
  ]
}
```

Exercise names drive the muscle mapping, which currently matches Chinese keywords. For accurate heatmaps, prefer Chinese exercise names such as 杠铃深蹲 (barbell squat).

## Validation

`npm run check` does three things:

- validates every sample in `examples/import/` against the schema;
- validates every JSON example in this document and in the skill;
- confirms that a set of known-bad packs is rejected.

Third-party tools can use any JSON Schema 2020-12 validator. The app enforces the same rules and also rejects ids repeated within a pack.

## Versioning

- `version` is currently 1. Adding optional fields does not change it; only breaking changes do. Older FreeBody builds ask the user to update when they meet a newer version.
- Every record written by an import carries an `imp` field holding the pack id.
- Meal records also carry `src: "import"` and `est` (whether the values are estimates).
- Full backups keep all of these fields as they are.
