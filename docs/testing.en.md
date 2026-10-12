# Testing

[中文](testing.md) | [English](testing.en.md)

| Layer | Command | What it covers | Where it runs |
|---|---|---|---|
| Static checks | `npm run check` | Syntax, emoji, placeholders, food library fields and sources, import-pack schema, skill and docs in sync | Local / CI |
| Format and lint | `npm run lint` | Prettier formatting; ESLint recommended rules plus duplicate top-level names across modules | Local / CI |
| Types | `npm run typecheck` | `tsc --checkJs`, driven by JSDoc and `types/*.d.ts` | Local / CI |
| Licences | `npm run licenses` | Dev dependencies, including transitive ones, must use permissive licences | Local / CI |
| Unit tests | `npm test` | The logic modules 00–09: totals, readiness, progression, 1RM, BMR, fatigue, quick entry, CSV, import merge and undo, link decoding, storage warnings, corrupt-data protection, demo data | Local / CI |
| Coverage | `npm run test:coverage` | As above, with per-file coverage; CI requires at least 85% line coverage of the logic modules | Local / CI |
| End to end | `npm run test:e2e` | Chromium and WebKit at iPhone 13 size: every page without script errors, navigation, quick entry, axe 0 violations (light / dark), reduced motion, chart text alternatives, demo mode never writes storage, link import, corrupt data | Local / CI |
| Real devices | [device-test.en.md](device-test.en.md) | Home-screen mode, safe areas, screen readers, real storage and the service worker | **Only someone with the device can do this** |

## End-to-end tests

```bash
npm ci
npx playwright install chromium webkit   # add --with-deps on a fresh Linux machine
npm run build
npm run test:e2e
```

`playwright.config.js` starts a static server with `scripts/serve.js` on 127.0.0.1:8766. Service workers are blocked during tests, because the reload after the first install would interrupt them. Offline caching and the update prompt are covered by the device checklist instead.

**Test data.** Tests that need data use demo mode only (`#demo`: fictional data, in memory) or a few fictional records written inside the test. Each test runs in a fresh browser context that is thrown away afterwards.

## How the unit tests load the code

`tests/harness.js` runs `src/app/0*.js` file by file, in file-name order, inside a Node vm sandbox with an in-memory `localStorage` and a fixed "today" (2026-10-12 by default). Options:

- `storage`: initial storage contents;
- `quota`: a simulated storage limit;
- `hash`: the URL hash, such as `#demo`;
- `now`: the date to use as "today";
- `foods`: load the built-in food library;
- `confirm`: the value `confirm()` returns.

Arrays from the sandbox belong to another realm, so spread them (`[...arr]`) before `deepEqual`.

## Known limits

- **WebKit is not iOS Safari:** emulated WebKit differs from iOS Safari, so home-screen mode and safe areas can only be confirmed on a real device.
- **Automated a11y checks are partial:** axe and similar tools catch only some accessibility problems. The screen-reader experience still needs VoiceOver / TalkBack testing.
- **UI modules lack unit coverage:** the UI modules (10–90) have no unit coverage figure and are covered only by the end-to-end tests.
