# Architecture

[中文](architecture.md) | [English](architecture.en.md)

FreeBody is an offline, single-file web app. This page explains how the code is organised, how data flows, and which boundaries to keep when you change it. Fields are listed in [data-model.md](data-model.md) (Chinese); tests are described in [testing.en.md](testing.en.md).

## Build output

`scripts/build.js` uses only Node's built-in modules and produces two files:

| Output | Contents |
|---|---|
| `index.html` | `src/index.template.html` with `styles.css`, `icons.js`, `charts.js`, the food library, sample profile and coach prompt (`window.FIT_DATA`) inlined, plus `src/app/*.js` merged into one IIFE |
| `sw.js` | `src/sw.template.js`; the version is the `package.json` version plus a content hash, and it precaches the app shell |

The build is deterministic: the same sources give byte-identical output. CI checks that the committed `index.html` matches a fresh build.

## Modules

The files in `src/app/` are concatenated in file-name order into one function scope, with no module loader. Top-level names are shared by every module. The ESLint config collects each module's top-level declarations and reports duplicates. Storage, validation and evidence modules keep internal functions in private IIFEs. Lint also rejects ignored `save()` results and UI writes directly to the primary storage key.

| Layer | File | Responsibility | Touches the DOM |
|---|---|---|---|
| Definitions | `00-core` | Constants, navigation groups, food library entry point, `HOOKS` | No |
| | `01-store` | `defaults()`, localStorage reads and writes, quota warnings, backup reminders, corrupt-data protection | No |
| | `02-util` | Dates, formatting, escaping, `$()`, `toast()` | Only `$` / `toast` |
| | `03-calc` | Totals, readiness, overtraining signals, progression, 1RM, BMR, muscle fatigue, quick-entry parsing | No |
| | `03-evidence` | Food source categories and readiness evidence with actual weights (private IIFE) | No |
| | `04-import` | Import-pack validation and merge, undo, link decoding, CSV | No |
| | `05-demo` | Deterministic fictional demo data | No |
| | `06-crypto` | Encrypted backups: PBKDF2 key derivation + AES-GCM (Web Crypto) | No |
| | `07-vault` | IndexedDB recovery history, digest validation, limits and serial write queue (private IIFE) | No |
| | `08-state` | Full-state validation with explicit defaults and no dependency on global `S` (private IIFE) | No |
| Initialisation | `09-init` | Reads stored data (or builds demo data in demo mode) into the global state `S` | No |
| UI | `10-ui-dates` | Page date, per-record overrides, compact controls and shared native dialog | Yes |
| | `10-ui-shell` | Navigation `show()`, page render dispatch `render()`, theme | Yes |
| | `11`–`21` | Pages: today, diet, training, records, charts, guided session, quick entry, settings, photo recognition, import preview, help and self-check | Yes |
| | `22`–`23` | Recovery-point management, coach prompt and clipboard fallback | Yes |
| Startup | `90-boot` | Accessibility fixes, keyboard, layout, PWA and update prompt; registers hooks | Yes |

Modules 00–09 use only a few browser objects such as `localStorage` and `location`. The unit tests load them file by file in a Node vm sandbox.

## Data flow

```
localStorage freeBody_v1 ──load()──▶ S (all data, in memory)
                                       │
  user actions / import packs / photo recognition ──change──▶ S ──save()──▶ localStorage
                                       │
                               render() ──▶ current page DOM ──HOOKS.render──▶ accessibility, date inputs, grid fill
```

- **Record state:** saved records live in `S`. The UI re-renders the current page from `S`; unsaved form fields and date overrides stay in the current page.
- **Date scope:** `sel` is the page date, changed through `setSelectedDate()`. Fields with `data-date-follow` default to `sel`; choosing a date adds `data-date-override` for that record only. Successful saves call `resetRecordDate()` to resume following the page. The recovery start date is independent of `sel`. Cancelling the date dialog changes neither dates nor form contents.
- **Saving:** `save()` validates and serialises `S`. UI calls use `save(true)`: failure rolls back to the last accepted state, preserving form inputs and `STORE.draft` for export, so retries cannot append duplicates. Import modules keep their own before-operation snapshots. Nothing is written when stored data is corrupt or in demo mode.
- **Write protection:** where Web Locks is available, one FreeBody window holds the editing lock and other windows are read-only. Close the editing window and reload to continue elsewhere. Saves, backup restores and resets also compare the current stored text with the text read by this window; changed data is never overwritten, and this window's content remains available for export. Older browsers use this conflict check without an exclusive lock, so fully simultaneous writes cannot be guaranteed safe; use one window for recording.
- **Restore and import:** full backups pass through `stateNormalize()` for validation and legacy defaults before replacing storage or memory. Validation or write failures preserve the previous records. Failed AI and CSV imports roll back their changes; AI imports rebuild the preview and retain the input for retry.
- **Local recovery points:** `HOOKS.saved` asynchronously captures the previous and daily state after successful saves, up to 8 snapshots / 20 MB. Reads verify SHA-256 and then the state structure. History omits `aiConfig`; primary saves work even if history is unavailable. `HOOKS.reset` clears history before primary and legacy data. Same-origin browser history cannot replace external backups.
- **Side state:** `freeBody_meta_v1` holds reminder and backup timestamps and never goes into backups. `freeBody_ai_v1` holds the photo-recognition settings, including the key. Backups carry the provider and model, and include the key only if the user ticks the option.
- **Network:** the only network request is photo recognition, which the user configures and triggers. Everything else works offline.

## Hooks

Code that has to run after a render, a page switch or a theme change registers with `HOOKS.render / show / theme / saved / reset.push(fn)`. Do not overwrite another module's functions. Registered hooks today:

| Hook | Callbacks (in order) |
|---|---|
| `render` | `storeUIState`, `a11y`, `dtWrap`, `dateShell`, `layFill` |
| `show` | Screen-reader announcement "已打开 …" (opened …) |
| `theme` | `syncThemeColor` |
| `saved` | Explicit payload captures recovery points after the primary save |
| `reset` | Wait for the serial history queue to clear before clearing primary data |

## Types

`tsc --checkJs` checks `src/`. Data structures are in `types/model.d.ts`, and globals and DOM additions in `types/globals.d.ts`. It is not in strict mode yet, and DOM elements are mostly treated as form controls (`$()` returns `FBEl`).

## Boundaries when you change things

- **New fields:** give every new field a default in `defaults()` so older data is filled in on load, and update `data-model.md`.
- **Import format:** the import-pack format is defined jointly by `data-format.md`, `schema/freebody.schema.json` and `impRow()`. Change all three together.
- **Escaping:** user input always goes through `esc()` before it is written into HTML.
- **Dependencies:** add no runtime dependencies, CDNs or new network requests.
