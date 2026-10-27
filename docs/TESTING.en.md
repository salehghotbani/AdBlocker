# Version 1.1.0 validation report

[فارسی](TESTING.md) | **English**

## Interface changes after version 1.1.0 — 2026-10-27

- The new PNG logo is packaged in four sizes for all three browsers. Packaged icons match source bytes, and the loaded logo's transparency was checked.
- DOM tests passed in Edge for gray site/URL exceptions, one-time pauses, and global-off states; light/dark preference survives reopening and color returns when protection resumes.
- Actual extension/network integration, 13 unit tests, and four distribution/ZIP tests passed. These local checks are separate from the released-version CI runs below.
- Appearance was reviewed in [disabled light mode](images/popup-disabled-light.png) and [disabled dark mode](images/popup-disabled-dark.png).

## Version 1.1.0 CI result — 2026-10-27

**Both GitHub Actions runs passed** for released commit `18321f6b87fa455fab06024d52b01ea57bdd2891`: [run 40547121864](https://github.com/salehghotbani/AdBlocker/actions/runs/40547121864) and [run 40548395334](https://github.com/salehghotbani/AdBlocker/actions/runs/40548395334).

- Dependency installation, syntax and documentation links, all three browser builds, and ZIP packaging: passed.
- Thirteen unit tests and four distribution/ZIP tests: passed.
- DOM tests and actual extension installation/network blocking in Chromium on CI: passed, including all 145 domains, allowance of 17 useful hosts, and exception controls.
- Firefox validation and CI artifact upload: passed. Validation does not establish Firefox runtime testing.

The earlier delay was in test-browser installation; both runs have now finished with a final `success` status. The local and live results below are separate supporting evidence.

## Coverage fix validation — 2026-10-27

Executed on Windows with Node.js 24.18.0 and Edge 156.0.4314.42, using an isolated temporary browser profile and the actual unpacked extension.

- Unit tests: 13 passed. Distribution and ZIP checks: 4 passed. Syntax and documentation links: passed.
- Follow-up review reproduced and fixed missed cosmetic rescans after removal of protected content or its `role="main"`. Both regressions now pass in the DOM suite. `npm run package` was verified on Windows after fixing Python command selection; packaging also excludes Chromium's generated `_metadata`, verified with the actual cache left by the integration run. Edge network tests and Firefox validation passed again after these fixes.
- DOM suite: passed, including static/dynamic compound ad classes, ambiguous class preservation, protected articles, class-change recovery, and exact style restoration.
- Network integration: passed for all 145 domain entries and representative subdomains, with explicit browser blocking errors. All 17 useful-host fixtures stayed allowed. First-party ad scripts were blocked; useful scripts containing ad paths in queries and non-script fetches stayed allowed. Site/global/URL exceptions and one-time pauses passed.
- Firefox web-ext 10.8.0: zero errors, warnings, or notices. Firefox runtime and Chrome runtime were not tested in this session.
- Live [Turtlecute test](https://adblock.turtlecute.org/): **95%, 126 of 132 blocked**, both cosmetic and both script checks passed. Browser events independently recorded **123 requests blocked by the client**. One additional host (`extmaps-api.yandex.net`) timed out and was counted as blocked by the site; that timeout is not evidence of extension blocking. The two cosmetic checks do not issue network requests.

Six live checks stayed unblocked intentionally: `careers.hotjar.com`, `api.bugsnag.com`, `app.bugsnag.com`, `app.getsentry.com`, `business-api.tiktok.com`, and `grs.hicloud.com`. These careers, management, business API, and routing endpoints are excluded from blanket tracker rules. Shared hosting and primary social/content domains are also kept usable. Actual page navigation remains allowed for every domain rule.

The opt-in live check saves `artifacts/turtlecute-result.json` and `artifacts/turtlecute-result.png`. Run it in PowerShell with:

```powershell
$env:CHROMIUM_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:ADBLOCK_LIVE_TEST = '1'
npm run test:browser
```

Leave `ADBLOCK_LIVE_TEST` unset for deterministic local fixtures without external advertising requests. Live scores depend on DNS, timeouts, browser settings, and future changes to the site and are separate from the deterministic CI tests. Successful CI runs are explicitly linked above.

## Previous environment validation

The following historical execution used Node.js 24.19.0 and Chromium 154.0.8037.57. Its managed-browser restrictions do not apply to the successful Edge run above.

| Check | Result |
| --- | --- |
| Dependency installation using the lockfile | Passed: `npm ci` |
| Syntax of 12 JavaScript files and local links in 13 bilingual Markdown documents | Passed: `npm run check` |
| Three browser builds and ZIP packages | Passed: `npm run package` |
| Thirteen settings, worker, URL, and one-time-pause unit tests | Passed: `npm test` |
| Four distribution, icon, rule, and ZIP tests | Passed: `npm run test:dist` |
| Content-preservation and Persian popup tests in Chromium | Passed: `npm run test:dom` |
| Firefox validation using web-ext 10.8.0 | Passed: zero errors, warnings, or notices |
| Actual extension installation and network blocking in Chromium | Blocked by managed policy; command ran and exited with code 1 |
| Actual Firefox and Edge execution | Not run; these browsers are not installed in this environment |

## Test scope

Unit tests use mocked browser APIs. The DOM suite runs the actual script and interface in Chromium, but extension messaging is mocked. Distribution tests inspect Manifest V3 configuration, referenced files, source/output consistency, license documentation, PNG structure, network rules, and ZIP integrity.

The redesigned popup tests use mocked messaging and storage to check initial system-theme following, keyboard day/night selection, preference persistence on reopening, unchanged blocking settings, previous-theme restoration after a failed save, and no horizontal overflow at 390 pixels. Both theme screenshots are captured from this browser run.

`test:browser` requires unpacked extension installation to be permitted and fails if the worker cannot start. It does not report a successful run without the extension. Managed environment policies are left unchanged.

New tests cover distinct paths and queries, style restoration for excluded URLs, single-tab pauses, the first automatic reload, expiry on the next reload, SPA navigation, tab closure, unauthorized messages, and state restoration after worker restart. The full installation test also covers distinct URLs and one-time pauses; it was restricted in the historical environment below but subsequently passed in local Edge and Chromium on CI.

In that earlier environment, the browser reported: `Loading of unpacked extensions is disabled by the administrator`. Actual network blocking was therefore unverified only in that historical execution. Alongside successful validation, web-ext reported that its automatic update checker could not access the user configuration directory; that message belonged to the tool's updater, while extension validation reported zero errors and zero warnings. The npm cache was set to a writable directory for that execution; `.npmrc` defines an ignored local cache for subsequent runs.

## Rerunning

Commands are listed in the [contribution guide](../CONTRIBUTING.en.md). After a push, `.github/workflows/ci.yml` runs these checks, including the full Chromium integration test, in GitHub Actions. The successful version 1.1.0 runs are linked above; later commits must be checked against their own runs.
