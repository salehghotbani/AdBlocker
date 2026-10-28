# Changelog

**English** | [فارسی](CHANGELOG.fa.md)

## 1.5.0 — 2026-10-29

- Add separate live counters for blocked requests and hidden main-document ad placements, a refresh button, and the browser's per-tab request-count badge. The popup refreshes every two seconds while open.
- Deduplicate nested placements and remove disconnected/restored elements from the current count. Navigation resets the browser's request counter; counts remain isolated by tab.
- Show unavailable native counts as a dash without requesting debug permissions. Counter messages are restricted to trusted extension contexts, document changes are checked, and no counter history or request URLs are stored.
- Add unit, DOM and actual-browser regressions for counters alongside existing protection controls. No filtering rules, permissions or dependencies changed.

## 1.4.1 — 2026-10-28

- Collapse W3Schools sidebar course promotions, known sidebar ad-media slots, and named leaderboard/inline/footer ad containers on the main site.
- Preserve tutorial video/audio, lesson text, code examples, editor/preview controls, social navigation and site/URL exceptions. Media exceptions are limited to verified sidebar ad containers outside main/editor content.
- Add deterministic DOM/extension fixtures and an opt-in live check that compares tutorial examples and runs the real Try it Yourself editor. No permissions or third-party domain rules changed.

## 1.4.0 — 2026-10-28

- Make the popup, notifications, validation messages and browser listing metadata English by default, with left-to-right layout and English number/date formatting.
- Make unsuffixed guides English; preserve Persian translations in `.fa.md` files and keep `.en.md` compatibility links.
- Refresh the concise README and interface screenshots; package both English and Persian policies.
- Verify the English default in a Persian browser locale, alongside existing protection, update and missing-API regressions. No permissions or dependencies added; filtering rules unchanged.

## 1.3.3 — 2026-10-28

- Prevent missing alarms/notifications APIs from crashing worker registration or blocking settings and temporary-pause restoration.
- Isolate optional scheduling errors and delays from protection commands; retain manual update checks and safe release links when optional APIs are missing.
- Show manual-only status and complete-package/reload guidance instead of claiming automatic checks are available.
- Add unit tests for absent/partial/rejected/stalled APIs and a real-browser installation without the two update permissions, including pause expiry and network controls.

## 1.3.2 — 2026-10-28

- Restrict third-party requests to the six requested Hotjar, Bugsnag, Sentry, TikTok and Huawei hosts. Direct navigation and same-site requests remain permitted; cross-site business/API integrations can use a site exception.
- Add actual-browser checks for each host's first-party scripts/fetches, Bugsnag dashboard-to-API requests, and explicit blocking of all six in the live benchmark.
- Record the new Turtlecute result: 100% (132/132) as scored by the site, with 129 explicit client-blocked requests, two cosmetic checks and one host timeout. No permissions or dependencies added.
- Keep Windows-only temporary-profile cleanup locks from masking completed DOM test results; other cleanup and test errors still fail.

## 1.3.1 — 2026-10-28

- Block the observed Kaprila ad host and collapse Soft98's direct banners, related-ad grid, side-ad section, and hosting promotion using selectors restricted to the main site.
- Preserve shared image/download hosts, software descriptions, search and useful sidebar content; add live and fixture checks for exceptions, dynamic placements and exact style restoration.

## 1.3.0 — 2026-10-28

- Manual update check and a browser alarm every three days, restored after browser restart.
- One notification per newer version and a download link restricted to this repository's releases; public metadata requests omit cookies, credentials, and page data.
- Handle offline/rate-limit failures, concurrent checks, numeric version ordering, and invalid metadata; test message authorization and the narrow CSP connection exception.
- Synchronize the exact-URL browser fixture with allowed script execution, retaining failure diagnostics and checks for blocking on other paths.

## 1.2.0 — 2026-10-27

- New shared popup and browser logo with transparent PNG icons in four sizes.
- Grayscale site/URL exceptions, one-time pauses, and global-off states in both light and dark mode; color returns when protection resumes.
- Logo transparency/packaging checks and tests for gray state on reopening and preservation of the light/dark preference.
- Expand coverage from 145 to 149 hosts using documented Hotjar, Microsoft UET, and Segment endpoints.
- Reload the current page automatically after protection changes; avoid duplicate pause reloads and stale-page reloads.
- Limit page messages to effective protection state, restrict Chromium local-storage access, and restore network policy after a failed save.
- Explicit CSP blocks inline scripts, network connections, and active embedded content in extension pages; CI checks dependency advisories.
- Show the actual manifest version in the popup.

## 1.1.0 — 2026-10-27

- Reapply cosmetic filtering when protected descendants are removed or lose their main-content role.
- Make `npm run package` select the Python command for Windows/Linux, and exclude browser-generated `_metadata` from ZIPs.
- Expanded third-party ad/tracker coverage from 60 to 145 locally maintained domains, including regional telemetry endpoints.
- Added first-party ad-script path blocking and conservative static/dynamic ad-box selectors, preserving exceptions and main content.
- Browser regression checks require explicit blocking of every domain and preserve 17 useful hosts. Optional live Turtlecute check saves a report and screenshot.
- Fixed Windows test screenshot paths, ZIP path comparisons, Python selection, and temporary-profile cleanup retries.
- Redesigned popup with a protection card, consistent icons, and collapsible exception management.
- Light/dark themes with local persistence, initial system preference, keyboard access, and reduced-motion support.
- Screenshots of both themes and tests for persistence, storage-failure recovery, and horizontal overflow.
- One-time page pauses in a single tab, with automatic reload and expiry on the next reload or navigation.
- Permanent URL exceptions with exact path/query matching, reset controls, and privacy documentation.
- Tests for expiry, tab isolation, worker restoration, popup controls, and distinct URL paths.
- Paired Persian and English documentation with language navigation.
- Documentation link checks cover every Markdown file in the repository root and `docs/`.
- Both privacy and security policy translations are included in generated extension packages.
- Concise Persian and English READMEs with installation steps and a dedicated MIT license section.
- Manifest and ZIP versions now follow package.json to keep release assets consistent.

## 1.0.0

- Separate Manifest V3 outputs for Chrome, Edge, and Firefox.
- 60 local rules for advertising and related tracking domains.
- Conservative, dynamic cosmetic filtering with main-content safeguards.
- Persian popup, global toggle, site exceptions, and style restoration.
- Settings and worker tests, DOM and popup tests, full extension integration tests, and distribution checks.
- Installation documentation, interface screenshot, privacy policy, contribution guide, and MIT License.

Limitation: complete ad coverage is not guaranteed. Full execution across all three browsers on real websites has not been verified; local validation results are recorded in the [test report](docs/TESTING.md).
