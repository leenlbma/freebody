# Testing

[中文](testing.md) | [English](testing.en.md)

| Layer | Command | What it covers | Where it runs |
|---|---|---|---|
| Static checks | `npm run check` | Syntax, emoji, placeholders, food library fields and sources, import-pack schema, skill and docs in sync | Local / CI |
| Format and lint | `npm run lint` | Prettier formatting; ESLint recommended rules plus duplicate top-level names across modules, checked save results and primary-storage write boundaries | Local / CI |
| Types | `npm run typecheck` | `tsc --checkJs`, driven by JSDoc and `types/*.d.ts` | Local / CI |
| Licences | `npm run licenses` | Dev dependencies, including transitive ones, must use permissive licences | Local / CI |
| Unit tests | `npm test` | The logic modules 00–09: totals, readiness, progression, 1RM, BMR, fatigue, quick entry, CSV, import merge and undo, link decoding, storage warnings, corrupt-data protection, demo data, state validation, snapshot integrity and limits, failure rollback and retry | Local / CI |
| Coverage | `npm run test:coverage` | As above, with per-file coverage; CI requires at least 90% line coverage of the logic modules | Local / CI |
| End to end | `npm run test:e2e` | Chromium and WebKit at iPhone 13 size: every page without script errors, navigation, quick entry, axe 0 violations (light / dark), reduced motion, chart text alternatives, demo mode never writes storage, link import, corrupt data, recovery history, training resume and undo, failed-save retry, real offline caching and updates | Local / CI |
| End-to-end coverage | `npm run test:e2e:coverage` | Collects V8 coverage of the app script in Chromium and reports, per module, the share of non-whitespace characters executed; CI requires at least 65% for src/app overall | Local / CI |
| Real devices | [device-test.en.md](device-test.en.md) | Home-screen mode, safe areas, screen readers, real storage and the service worker | **Only someone with the device can do this** |

## End-to-end tests

```bash
npm ci
npx playwright install chromium webkit   # add --with-deps on a fresh Linux machine
npm run build
npm run test:e2e
```

`playwright.config.js` starts a static server with `scripts/serve.js` on 127.0.0.1:8766. Ordinary UI tests block service workers to avoid first-install reloads. `pwa.spec.js` enables a real service worker on an isolated server and verifies offline reloads and confirmed updates preserving records. Home-screen installation and safe areas still need real devices.

**Test data.** Tests that need data use demo mode only (`#demo`: fictional data, in memory) or a few fictional records written inside the test. Each test runs in a fresh browser context that is thrown away afterwards.

## How the unit tests load the code

`tests/harness.js` runs `src/app/0*.js` file by file, in file-name order, inside a Node vm sandbox with an in-memory `localStorage` and a fixed "today" (2026-10-12 by default). Options:

- `storage`: initial storage contents;
- `quota`: a simulated storage limit;
- `hash`: the URL hash, such as `#demo`;
- `now`: the date to use as "today";
- `foods`: load the built-in food library;
- `confirm`: the value `confirm()` returns;
- `indexedDB`: transactional storage and failure simulation;
- `locks`: multi-window editing lock simulation.

Arrays from the sandbox belong to another realm, so spread them (`[...arr]`) before `deepEqual`.

Local validation on 2026-10-14: all 71 unit tests across 9 core test files passed, with 91.91% core line coverage. The Chromium project ran through the locally installed Chrome channel: all 40 cases passed, with about 70.0% app-script character coverage. New custom-food and recipe regression tests verify that failed saves retain inputs, retries persist exactly one record, and the saved record survives a reload. Coverage aggregation includes executions before and after page reloads.

WebKit and real iOS devices were not tested in this run. The full two-engine matrix contains 80 cases, including 2 existing axe scans explicitly skipped on WebKit.

## Known limits

- **WebKit is not iOS Safari:** emulated WebKit differs from iOS Safari, so home-screen mode and safe areas can only be confirmed on a real device.
- **Automated a11y checks are partial:** axe and similar tools catch only some accessibility problems. The screen-reader experience still needs VoiceOver / TalkBack testing.
- **UI coverage is separate:** modules 10–90 are covered by browser interactions. Character coverage differs from core line coverage and cannot prove every combination. Photo endpoints use mocked responses, which do not verify real providers' CORS, response formats or rate limits.
- The existing full-page axe scan runs only on Chromium; its 2 WebKit cases are explicitly skipped. All other interaction and PWA cases run on both engines.
