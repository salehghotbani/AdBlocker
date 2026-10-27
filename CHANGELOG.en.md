# Changelog

[فارسی](CHANGELOG.md) | **English**

## Unreleased

- Redesigned popup with a protection card, consistent icons, and collapsible exception management.
- Light/dark themes with local persistence, initial system preference, keyboard access, and reduced-motion support.
- Screenshots of both themes and tests for persistence, storage-failure recovery, and horizontal overflow.
- One-time page pauses in a single tab, with automatic reload and expiry on the next reload or navigation.
- Permanent URL exceptions with exact path/query matching, reset controls, and privacy documentation.
- Tests for expiry, tab isolation, worker restoration, popup controls, and distinct URL paths.
- Paired Persian and English documentation with language navigation.
- Documentation link checks cover every Markdown file in the repository root and `docs/`.
- Both privacy and security policy translations are included in generated extension packages.

## 1.0.0

- Separate Manifest V3 outputs for Chrome, Edge, and Firefox.
- 60 local rules for advertising and related tracking domains.
- Conservative, dynamic cosmetic filtering with main-content safeguards.
- Persian popup, global toggle, site exceptions, and style restoration.
- Settings and worker tests, DOM and popup tests, full extension integration tests, and distribution checks.
- Installation documentation, interface screenshot, privacy policy, contribution guide, and MIT License.

Limitation: complete ad coverage is not guaranteed. Full execution across all three browsers on real websites has not been verified; local validation results are recorded in the [test report](docs/TESTING.en.md).
