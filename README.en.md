<p align="right"><a href="README.md">中文</a> | <b>English</b></p>

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/logo-reverse.svg"><img src="assets/logo.svg" alt="FreeBody" width="260"></picture></p>

<p align="center">A dashboard for your AI fitness coach. You talk training and food through with your AI; FreeBody stores it and shows you what it means. Your data never leaves your device.</p>

<p align="center">
<img src="https://img.shields.io/badge/version-2.12.3-2148b8" alt="version 2.12.3">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-63666c" alt="MIT"></a>
<img src="https://img.shields.io/badge/PWA-offline-a9492a" alt="PWA">
</p>

<p align="center"><a href="https://leenlbma.github.io/freebody/"><b>Try it online →</b></a> &nbsp;·&nbsp; <a href="#copy-this-to-your-ai">Copy this to your AI</a> &nbsp;·&nbsp; <a href="#quick-start">Quick start</a> &nbsp;·&nbsp; <a href="#using-freebody-with-an-ai-coach">Using it with an AI</a> &nbsp;·&nbsp; <a href="README.md">中文</a></p>

<br>

## Copy this to your AI

Paste the prompt below into any AI you use (ChatGPT, Claude, Gemini, Grok, Qwen and others). It will act as your coach under the [FreeBody skill](skills/freebody-coach/SKILL.en.md), estimating meals, logging training and giving you data or a link to import. See [Using FreeBody with an AI coach](#using-freebody-with-an-ai-coach) for details.

<!-- freebody-prompt:en -->
```text
Please act as my FreeBody fitness coach: estimate my meals, log my training, suggest progression and recovery, and produce data I can import into FreeBody.
Before we start, read this skill and follow it strictly from then on: https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.en.md
(raw: https://raw.githubusercontent.com/leenlbma/freebody/main/skills/freebody-coach/SKILL.en.md)
If you can't open the link, tell me and I'll paste the full text of SKILL.en.md for you.
```
<!-- /freebody-prompt -->

If your AI can't browse the web, paste the full text of [SKILL.en.md](https://github.com/leenlbma/freebody/blob/main/skills/freebody-coach/SKILL.en.md) into it instead.

<sub>The same prompt lives in [skills/freebody-coach/PROMPT.md](skills/freebody-coach/PROMPT.md). Anything the AI gives you is previewed on your device and written only after you confirm. Not medical advice.</sub>

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/hero-phones-dark.png"><img src="docs/screenshots/hero-phones-light.png" alt="Phone: Today, Training, Diet" width="760"></picture></p>

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/desktop-1280-dark.png"><img src="docs/screenshots/desktop-1280-light.png" alt="Desktop, 1280 px" width="560"></picture>&nbsp;&nbsp;<picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/tablet-768-dark.png"><img src="docs/screenshots/tablet-768-light.png" alt="Tablet, 768 px" width="236"></picture></p>

<p align="center"><sub>Screenshots show the current release. They use generic sample data injected for the capture and then discarded; no personal data is involved.</sub></p>

<br>

FreeBody is a web app you can open and use right away. It is a single `index.html`, with no account, no back end and no third-party dependencies. It tracks strength training, cardio, sleep, body weight and nutrition, and turns them into two daily decisions: what to train today and how much you have left to eat.

You can log everything by hand. You can also use FreeBody as the **dashboard for your AI coach**: chat about training or share meal photos in the AI you already use, and the AI writes an import pack or import link in the [published data format](docs/data-format.en.md). FreeBody previews it on your device, de-duplicates and merges it, and then shows it in heatmaps and charts.

> **Interface language:** the app's interface is in Simplified Chinese. This English README and the English docs describe the same product.

> FreeBody is for personal logging and spotting trends. **It is not medical advice.** Talk to a doctor or qualified professional about lab results, injuries or supplements.

The first-use card and 我的 › 搭配 AI (Me › Use with AI) can copy the same coach prompt and open the import preview. If clipboard access fails, select the prompt and copy it manually.

## Today and readiness

A single screen answers "what's the plan today?". The readiness score (0–100, with a one-line summary) combines sleep, subjective recovery, resting heart rate and HRV. The day's suggestion picks push, pull, legs or full body from muscle recovery, and you start it with one tap. Remaining nutrition, supplement check-ins, sleep confirmation and body weight sit on the same screen, and checking in takes a single tap. The recovery page explains the contributing measurements and their normalised weights, marking sparse evidence as limited.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-today-dark.png"><img src="docs/screenshots/f-today-light.png" alt="Today and readiness" width="620"></picture></p>

## Set-by-set training with automatic progression

During a session you see only the current set: its target weight and reps, plus two buttons, Done and Adjust. Finishing a set starts the rest timer. Next time's targets are calculated for you:

- load goes up only when every set was completed;
- repeated misses or a plateau trigger a deload suggestion;
- load is held during a return-to-training phase or when pain is flagged.

Training statistics cover weekly volume, sets per muscle group and estimated 1RM.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-train-dark.png"><img src="docs/screenshots/f-train-light.png" alt="Training session and training statistics" width="620"></picture></p>

## Muscle heatmap

Front and back body maps are shaded by recovery state: recovered, recovering, fatigued, not trained for a while, never trained. You can switch the map to sets over the last seven days. Tap a muscle for details, or use the readable per-muscle list beside the map. The body outline is a simplified SVG drawn for this project.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-muscle-dark.png"><img src="docs/screenshots/f-muscle-light.png" alt="Muscle recovery heatmap and 7-day sets" width="620"></picture></p>

## Diet and photo recognition

The diary shows remaining energy and the three macros at a glance, with one "+" per meal. The built-in library holds 322 common Chinese dishes and ingredients. You can also log recent favourites, custom foods and combinations, or type a whole meal in one line.

Photo recognition is optional and arrived in v2.4.

- **Photos:** take one photo, or one before and one after the meal.
- **What the model returns:** in a fixed format, each item's name, weight, leftover fraction and estimated nutrition.
- **Intake:** grams eaten = weight × (1 − leftover fraction).
- **Nutrition values:** taken from the local food library where there is a match. Otherwise the model's estimate is used and labelled as an estimate.
- **Review:** on the confirmation screen you can rename an item, change its weight or meal, or delete it. Nothing is logged until you confirm.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-diet-dark.png"><img src="docs/screenshots/f-diet-light.png" alt="Food diary and photo recognition review" width="620"></picture></p>

## Local recovery points

Successful record or configuration saves retain the previous state and a daily recovery point, up to 8 snapshots and 20 MB total. Under 我的 › 数据备份 › 本机恢复点 (Me › Backup › Local recovery points), turn automatic retention off, inspect history, export a verified copy, confirm a restore or clear history. Snapshots omit model settings and API keys. Demo mode cannot read or change real history.

Snapshots share the same device and browser as primary records, so clearing site data removes both. Keep exporting external backups. Clearing all data also removes recovery history and legacy storage keys.

Food details distinguish named USDA references, recipe estimates, analogous approximations and user values. Named references link to USDA search for checking; they do not claim individually verified exact values.

## Charts

Four cards (body, nutrition, training, recovery) open into detailed views:

- weight and body fat on twin axes, with a 7-day moving average;
- energy against target, and how often you hit your protein target;
- the readiness trend and lab results over time.

Every chart is dependency-free inline SVG. Tap any point to read its value, and switch between 7 days, 30 days, 90 days and all time.

**Accessibility.** Every chart has a text summary (latest value and change over the range) and an expandable data table that screen readers can read row by row. Icon buttons have names, form labels are tied to their inputs, there is a skip link, and page changes are announced. Motion follows the system Reduce Motion setting and can also be turned off under 我的 › 显示与辅助 (Me › Display).

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-data-dark.png"><img src="docs/screenshots/f-data-light.png" alt="Data overview and body trends" width="620"></picture></p>

<br>

## Quick start

**Open it online.** Visit <https://leenlbma.github.io/freebody/>. After the first visit it works offline.

**Try the demo.** Open <https://leenlbma.github.io/freebody/#demo>, or use 我的 › 帮助与自检 › 试用演示数据 (Me › Help › Try demo data), to load four weeks of fictional records. Demo data lives only in the current page and never writes over your own; tap 退出演示 (Exit demo) to go back.

**Device self-check.** 我的 › 帮助与自检 › 设备自检 (Me › Help › Device self-check) tests offline support, storage, link import, safe areas and more in this browser. The report contains no records and can be pasted into an issue. For manual device testing, see [docs/device-test.en.md](docs/device-test.en.md).

**Add it to your home screen.** FreeBody is a progressive web app (PWA). Open it once over https, from the link above or your own server, and you can install it like a native app and use it offline. Primary records stay in localStorage and local recovery points in same-origin IndexedDB either way.

- **iPhone / iPad (Safari):** open the site, tap Share, choose Add to Home Screen, then Add. It then launches in its own window without the address bar.
  - **Note: once added to the home screen, its data is stored separately from Safari.** The home-screen app starts empty and cannot see what you recorded in Safari. If you have already logged data in Safari, first export it there under 我的 › 数据备份 (Me › Backup) with 导出 JSON (Export JSON), then use 导入 JSON (Import JSON) in the same place in the home-screen app. After that, keep recording in one place.
  - If the home-screen app has a bottom gap, update to v2.12.2, fully close it, then reopen. This version restores standard installation metadata and changes the portrait layout. Old icons may retain their installed status-bar configuration. If the gap remains, **export JSON from the old app and verify the backup file first**, then re-add from Safari and import the backup if needed. The final iOS 27 rendering still needs a real device; see the [device checklist](docs/device-test.en.md).
- **Android (Chrome / Edge):** open the site, then choose Install app or Add to Home screen from the menu. Some browsers also offer it in a banner.
- **Desktop (Chrome / Edge):** use the install icon at the right of the address bar, or the menu entry for installing the page as an app. It then runs in its own window and can be pinned to the taskbar or Dock.

**Updates.** When a new version is published, a "有新版本，点此刷新" (new version, tap to refresh) bar appears at the bottom. Tap it to switch, or ignore it to keep the current version.

**Build locally.** You need Node.js 18 or later. The app has no runtime dependencies, the build uses only Node's built-in modules, and the development checks are devDependencies.

```bash
git clone https://github.com/leenlbma/freebody.git && cd freebody
npm run build    # writes index.html and sw.js at the repository root (no npm ci needed)
npm run check    # syntax, emoji, placeholders, food library and import-pack schema
npm test         # unit tests (node:test)
npm ci && npm run lint && npm run typecheck && npm run test:e2e   # when contributing code
```

You can also download `index.html` and open it directly. Over `file://` there is no offline cache and no update prompt, but everything else works.

<details>
<summary>Layouts and keyboard shortcuts</summary>

- **Phone (< 600 px):** bottom navigation, single-column cards.
- **Tablet, portrait (600–1024 px):** 8-column grid with a 16 px gutter and paired cards of equal height. Phones in landscape switch to a left-hand icon rail.
- **Desktop (> 1024 px) and tablet, landscape:** sidebar navigation, a 12-column grid, content up to 1200 px wide, 24 px margins and gutters. The Today page shows the main card, the nutrition ring, check-ins and a 7-day trend.
- **Buttons:** three styles (primary, secondary, destructive) in two heights (44 px and 36 px). Form buttons span the full width, and grouped buttons share it equally.
- **Dates:** the compact header control opens Today, Yesterday and a date picker. Other days show a date notice and a return-to-today action. Performance and lab forms can override the date for one record beside the save button; successful saves resume following the page date. The recovery start date remains independent.
- **Accessibility:** respects system text size and safe areas (notch, home indicator) and shows visible keyboard focus.
- **Shortcuts** (outside text fields):

  | Key | Action |
  |---|---|
  | `1`–`4` | switch tabs |
  | `←` `→` | previous / next day |
  | `T` | back to today |
  | `/` | search foods |
  | `Esc` | go back |
  | `Enter` / Space | activate the focused card |

</details>

<details>
<summary>Deploy your own GitHub Pages copy</summary>

The repository includes `.github/workflows/pages.yml`. Every push to `main` builds and publishes `index.html`, `sw.js`, `manifest.webmanifest` and `icons/`. To enable it on a fork:

1. Make the repository public. Private repositories need a paid plan and the repository variable `ENABLE_PAGES=true`.
2. Under Settings → Pages → Build and deployment, set Source to **GitHub Actions**. Alternatively, run `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`.
3. Run "Deploy to GitHub Pages" once from Actions, or push any commit, then visit `https://<owner>.github.io/<repo>/`.

</details>

## Privacy

- **Data stays on your device.** Primary records live in localStorage under `freeBody_v1`; automatic recovery points live in same-origin IndexedDB (`freebody-history`). Nothing is uploaded. Data from the old `fitTracker_v1` key is migrated automatically, and old backups import as they are.
- **Your API key stays on your device.** The photo-recognition key is stored locally and separately, under `freeBody_ai_v1`. Backups leave it out **by default**; you can opt in, but we don't recommend it. You can also untick "在本机记住 API Key" (remember the key on this device): the key then lives only in the open page's memory, and you enter it again after a reload.
- **Imports are processed locally.** Both paste import and link import (`#import=`) are parsed in the browser. Browsers never send anything after `#` to a server, and nothing is written until you confirm.
- **Photo recognition goes online only after you enter a model key.** Without a key, FreeBody makes no network requests: taking or choosing a photo stays on the device, and the recognition screen points you to manual logging. With a key, a request is sent only when you tap recognise or test the connection. The compressed photo (or the test request) then goes straight from your browser to the provider you chose, never through a FreeBody server, under that provider's privacy policy. FreeBody does not keep the photo.
- Apart from that, loading the page and updating the offline cache (service worker) only contact the address FreeBody is served from, and carry none of your data.
- **Storage safety.** Clearing browser data or switching devices loses your records. At startup FreeBody asks for persistent storage (`navigator.storage.persist()`). It warns once when local storage reaches about 70% and once at 90%. If a save fails because storage is full, it tells you straight away and offers an export. It also reminds you 30 days after your last backup (you can snooze for 7 days). All of this is shown under 我的 › 数据备份 (Me › Backup). Reminder state and the last backup date are kept in `freeBody_meta_v1`, which holds none of your records.
- **Back up regularly.** Backups contain personal health information: keep them safe and never commit them to a repository.
- **Encrypt backups you share.** To put a backup in cloud storage or send it to someone, enter a password under "数据备份 › 加密备份" (encrypted backup) before exporting. The key is derived with PBKDF2-SHA256 (310,000 iterations) and the data is encrypted with AES-GCM, all on your device. The password is never stored and cannot be recovered.

## Photo recognition setup

Under 我的 › 拍照识别 · 模型 API (Me › Photo recognition · Model API), pick a provider, paste your API key and tap 测试连接 (Test connection). Every provider is called through an OpenAI-compatible `chat/completions` endpoint.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-aicfg-dark.png"><img src="docs/screenshots/f-aicfg-light.png" alt="Photo recognition · model API settings" width="300"></picture></p>

| Provider | Base URL | Suggested model | Where to get a key |
|---|---|---|---|
| Zhipu GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4.6v-flash` | Zhipu open platform, open.bigmodel.cn |
| Qwen (Alibaba Cloud) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-vl-plus` / `qwen-vl-max` | Alibaba Cloud Model Studio, bailian.console.aliyun.com |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-flash-latest` | Google AI Studio, aistudio.google.com |
| Custom | any OpenAI-compatible endpoint | a model that accepts images | — |

- **Zhipu:** `glm-4v-flash` accepts only image URLs, not local photos (Base64), and only one image per request. That is why `glm-4.6v-flash` is the default.
- **Gemini** is unreachable on some networks.
- **Custom endpoints** must allow cross-origin requests from the browser (CORS).
- **Errors:** being offline, CORS failures, invalid keys and rate limits each get a clear message, with a one-tap switch to manual logging.
- **Check the weights:** recognition results are estimates, so check the weights before confirming.

## Using FreeBody with an AI coach

FreeBody has no built-in chat. Keep using the AI you like; FreeBody's job is to store the results well and show them clearly.

1. **Give your AI the skill.** [`skills/freebody-coach`](skills/freebody-coach/SKILL.en.md) is a generic Agent Skill: a `SKILL.md` with `name` and `description` in its frontmatter, tied to no particular platform. It teaches the AI to:
   - estimate meals from text, a single photo, or before-and-after photos;
   - log training;
   - give progression and recovery advice using FreeBody's own rules;
   - output import packs that match the schema.

   Tools that support skills can load the directory as is. Elsewhere, paste the contents of `SKILL.md` (Chinese) or `SKILL.en.md` (English) into the system prompt or project instructions. The quickest route is the [prompt](#copy-this-to-your-ai) at the top of this page.
2. **Talk to it.** For example: "I had a bowl of beef noodle soup for lunch and left about a quarter, log it for me", or "squats today, 60 kg 5×5, RIR 1 on the last two sets". The AI lists its estimates and asks you to confirm.
3. **Import the result.**
   - **Link:** the AI gives you `https://leenlbma.github.io/freebody/#import=…`. Open it in the browser where you use FreeBody.
   - **Paste:** copy the AI's JSON and paste it under 我的 › 数据备份 › 粘贴导入 (Me › Backup › Paste import).
4. **Review and confirm.** FreeBody marks every entry as new, merged, already there or invalid, and writes nothing until you confirm. Importing the same data twice never creates duplicates, and you can undo an import.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/screenshots/f-import-dark.png"><img src="docs/screenshots/f-import-light.png" alt="Paste import and import preview" width="620"></picture></p>

- **What a pack can hold:**
  - meals: meal slot, food, grams, energy, protein, carbohydrate, fat, and whether the values are estimated;
  - workouts: exercise, sets, reps, load, RIR;
  - supplements, sleep, body weight and other body metrics, and journal notes.
- **References:** the format is in [docs/data-format.en.md](docs/data-format.en.md) and the JSON Schema in [schema/freebody.schema.json](schema/freebody.schema.json). Samples are in [examples/import/](examples/import/).
- **Making a link:** run `python3 skills/freebody-coach/scripts/make_link.py pack.json` (Python standard library only). Chat apps tend to truncate links beyond roughly 1800 characters, so paste longer packs instead.
- **Safety boundaries:** the skill makes no medical diagnoses, refers injuries and worrying symptoms to a professional, and keeps personal identifiers out of import packs.

## Data sources and disclaimer

- **Library size:** the built-in food library, `data/foods.json`, holds 322 entries. Names, ids and categories are this project's own.
- **Ingredients and basic foods:** nutrient values follow public reference data, primarily [USDA FoodData Central](https://fdc.nal.usda.gov/) (CC0), rounded for use.
- **Cooked dishes:** calculated per 100 g from recipes written for this project, using raw ingredient weights and a cooked-weight yield.
- **Sources:** every entry has a `ref` field naming its source or recipe.
- **No copied tables:** the project does not copy the China Food Composition Tables or any other third-party dataset wholesale. See [docs/food-database.en.md](docs/food-database.en.md) for how the library is built.
- **Estimates only:** nutrition varies widely with variety, cooking and portion size, so library values and photo-recognition results are estimates. Readiness, progression suggestions and derived targets are guidance only and **are not medical, nutritional or rehabilitation advice**.

## Roadmap

- More regional dishes and common takeaway items in the food library; contributions that follow the `ref` convention are welcome
- Linking photo-recognition results to saved combinations, to cut down on repeat confirmations
- A "recent summary" export for your AI, so coaching advice can draw on full trends
- Import and sharing of training-plan templates, without personal data

## Contributing

Issues and pull requests are welcome, especially food library entries and [device test reports](https://github.com/leenlbma/freebody/issues/new?template=device_report.yml). Newcomers can start with a [good first issue](https://github.com/leenlbma/freebody/labels/good%20first%20issue); questions go to [Discussions](https://github.com/leenlbma/freebody/discussions). Taking part means agreeing to the [code of conduct](CODE_OF_CONDUCT.md); report security problems privately as described in [SECURITY.md](SECURITY.md). Food data must include `source` and `ref` and use only redistributable values (self-compiled or CC0). Never submit real personal data. If you change the import format or the skill, update the schema, the samples and both language versions of the docs together; `npm run check` verifies that they agree. See [CONTRIBUTING.en.md](CONTRIBUTING.en.md) and [docs/food-database.en.md](docs/food-database.en.md).

<details>
<summary>Project layout</summary>

```
freebody/
├── index.html                 # build output: the single-file app, ready to open
├── sw.js                      # build output: service worker (version tracks the build)
├── manifest.webmanifest       # PWA manifest
├── icons/                     # PWA / apple-touch icons (generated by scripts/make-icons.py)
├── assets/                    # wordmark, favicon and archived logo options
├── src/
│   ├── index.template.html    # page structure with /*__STYLES__*/-style placeholders
│   ├── styles.css             # styles; light and dark themes via CSS variables
│   ├── icons.js               # inline SVG line icons
│   ├── charts.js              # dependency-free SVG charts
│   ├── app/                   # application modules, concatenated in file-name order into one IIFE at build time
│   │   ├── 00-core.js … 08-state.js   # state, storage, utilities, core calculations, import merge, demo data, encrypted backups, recovery points and state validation (no DOM; unit-tested)
│   │   ├── 09-init.js                  # reads stored data (keeps the raw text and pauses saving if it is corrupt)
│   │   └── 10-ui-*.js … 90-boot.js     # page UI and startup
│   └── sw.template.js         # service worker template
├── data/foods.json            # food library (322 entries, each with a ref)
├── examples/                  # generic sample profile and sample import packs (import/); no real data
├── schema/                    # import-pack JSON Schema (freebody.schema.json)
├── skills/freebody-coach/     # generic Agent Skill for producing packs and links (with PROMPT.md, make_link.py)
├── scripts/build.js           # inlining build + sw.js generation
├── scripts/check.js           # syntax, emoji, food library and import-pack schema checks
├── tests/                     # node:test unit tests (calculations, quick entry, CSV, import merge, storage and corrupt data)
│   └── e2e/                   # Playwright end-to-end tests (Chromium + WebKit: smoke, axe, import, demo, corrupt data)
├── types/                     # type declarations for tsc --checkJs (model.d.ts data model, globals.d.ts)
├── eslint.config.js · .prettierrc.json · tsconfig.json · playwright.config.js   # dev tool config
├── scripts/serve.js           # local static server (for the end-to-end tests)
├── scripts/gen-foods.js       # food library generator (ingredient values + recipes → foods.json)
├── docs/                      # architecture, testing, data format, data model, food library, CSV import, device test checklist, screenshots
├── .github/                   # CI, Pages deployment, issue / PR templates (including device test reports)
├── CODE_OF_CONDUCT.md · SECURITY.md
├── LICENSE                    # MIT
└── NOTICE                     # third-party notices
```

Code organisation is described in [docs/architecture.en.md](docs/architecture.en.md) and the tests in [docs/testing.en.md](docs/testing.en.md). The full data model is documented in [docs/data-model.md](docs/data-model.md) (Chinese), and every release is listed in [CHANGELOG.md](CHANGELOG.md).

</details>

## Licence and acknowledgements

[MIT](LICENSE). Third-party notices are in [NOTICE](NOTICE).

- **Interaction ideas:** the guided training flow and muscle-recovery visualisation were inspired by openGym (AGPL-3.0), and the food-logging flow by OpenNutriTracker (GPL-3.0). No code, copy, images or data from either project are used.
- **Wordmark:** the wordmark and B icon are outlined and customised from Archivo glyphs (SIL OFL 1.1).
- **Food values:** ingredient values draw on USDA FoodData Central (CC0).
- **Photo recognition:** the prompts and code are original to this project.
