# Device test checklist

[中文](device-test.md)

All automated tests run in emulated browsers on Linux (Chromium and WebKit). **They do not replace real devices.** Home-screen layout on iOS, storage isolation and screen readers can only be checked on real hardware. The checklist takes about 15 minutes. Please file the result as a [device test report](https://github.com/leenlbma/freebody/issues/new?template=device_report.yml), even if everything passes.

**Do not test with your real records.** Use Me › Help › Try demo data (我的 › 帮助与自检 › 试用演示数据). Demo data lives only in the current page and never touches your own data. For save-and-reload checks, use a browser or home-screen icon with no data in it.

## 0. Self-check

1. Open <https://leenlbma.github.io/freebody/> and go to Me › Help › Device self-check (设备自检).
2. Tap Copy report (复制报告) and paste it into the report. It contains browser capabilities and screen size only, no records.
3. Note any item marked as a failure (异常) and carry on.

## 1. Layout (once in a browser tab, once as a home-screen app)

| # | Check | Pass when |
|---|---|---|
| 1.1 | Bottom navigation | Sits on the bottom edge with no gap or black strip; on phones with a home indicator, buttons sit above it |
| 1.2 | Header | Logo and theme button are not covered by the status bar, notch or Dynamic Island |
| 1.3 | Date bar | Its edges line up with the cards below |
| 1.4 | Scroll to the end | The last card scrolls fully above the navigation |
| 1.5 | Landscape | Navigation moves to the left; nothing is hidden by the notch |
| 1.6 | Import preview | The confirm bar sits above the navigation and does not hide the last item |
| 1.7 | Dark mode | The page follows the system; all text stays readable |
| 1.8 | Largest text size | Button labels are not cut off or overlapping |
| 1.9 | Safari toolbar | Scroll to collapse and expand the toolbar; navigation follows the visible page bottom without an extra gap |
| 1.10 | Keyboard and resume | Dismiss the keyboard after entering a weight, then background and resume the page; navigation returns to the bottom and all four tabs work |

> If the iOS home-screen app shows an empty strip at the bottom, delete the icon, add it again from Safari and check once more. Note the difference in your report.

## 2. Recording and saving (use an empty environment, not real data)

| # | Action | Pass when |
|---|---|---|
| 2.1 | Tick all supplements on Today, close and reopen | Ticks are still there |
| 2.2 | Diet › Add food, search 米饭 (rice), add to lunch | Today's calories change |
| 2.3 | Train › Start, log one set, finish | The workout appears; the rest timer works |
| 2.4 | Data › Sleep, enter bed and wake times, save | Readiness appears on Today |
| 2.5 | Send to background for 10 minutes, return | Data and current page are intact |

## 3. Import link

1. On the phone, open this test link. It holds one fictional snack, 香蕉（设备测试） (banana, device test), dated 2026-10-12, uncompressed, so DecompressionStream is not needed:
   [Open the test import link](https://leenlbma.github.io/freebody/#import=eyJmcmVlYm9keSI6ImltcG9ydCIsInZlcnNpb24iOjEsInNvdXJjZSI6Iuecn-acuua1i-ivlea4heWNlSIsImVudHJpZXMiOlt7InR5cGUiOiJtZWFsIiwiaWQiOiJkZXZ0ZXN0LWJhbmFuYSIsImRhdGUiOiIyMDI2LTEwLTEyIiwibWVhbCI6IuWKoOmkkCIsIm5hbWUiOiLpppnolYnvvIjorr7lpIfmtYvor5XvvIkiLCJnIjoxMjAsImtjYWwiOjEwNywicCI6MS4zLCJjIjoyNywiZiI6MC40LCJlc3RpbWF0ZWQiOmZhbHNlfV19)
   You can also ask an AI to make a compressed link (starting with `z.`) with the skill and test that too.
2. Pass when: the preview shows new / merged / existing counts; confirming adds the data; Undo restores the previous state; `#import=` disappears from the address bar.
3. Open the same link from a messaging or notes app and note which browser it opens in.

## 4. Offline

1. Open once online and wait a few seconds.
2. Turn on airplane mode, close the app completely and reopen it.
3. Pass when: the page loads and recording works; the self-check shows the service worker as active (已接管).

## 5. Backup and storage

| # | Action | Pass when |
|---|---|---|
| 5.1 | Me › Backup › Export JSON | The file can be found in Files / Downloads |
| 5.2 | Import JSON in another empty environment | All records are restored |
| 5.3 | Check persistent storage | Note whether it shows on (已开启) or off (未开启) |
| 5.4 | iOS: open in Safari and as a home-screen app | The two do not share data (system behaviour; confirms the docs) |

## 6. Screen readers and keyboard

| # | Action | Pass when |
|---|---|---|
| 6.1 | Turn on VoiceOver (iOS) or TalkBack (Android) and swipe through Today | Navigation, card titles and button names are read; no unnamed "button" |
| 6.2 | Data › Body, focus the weight chart | A summary (latest value and change) is read; the expanded data table reads row by row |
| 6.3 | Switch tabs | "已打开 …" (opened …) is announced |
| 6.4 | Desktop, keyboard only: Tab, Enter, Esc, keys 1–4 | Every control shows a focus ring; you can log a meal end to end |
| 6.5 | Turn on Reduce Motion in the system | Charts and page changes do not animate |

## 7. Submit

Fill in the [device test report](https://github.com/leenlbma/freebody/issues/new?template=device_report.yml). Hide personal information in screenshots first.
