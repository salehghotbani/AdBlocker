# Changelog

[فارسی](CHANGELOG.md) | **English**

## Unreleased

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

Limitation: complete ad coverage is not guaranteed. Full execution across all three browsers on real websites has not been verified; local validation results are recorded in the [test report](docs/TESTING.en.md).
