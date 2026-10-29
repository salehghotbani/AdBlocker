# Validation report

**English** | [فارسی](TESTING.fa.md)

## Store publication finalization — 2026-10-29

- Prepared version 1.7.1 upload ZIPs and generated dashboard fields for Chrome, Edge and desktop Firefox, with approved publisher `saleh ghotbani` and GitHub-only public support. No public email, publisher account or receiving destination is invented. Chrome's documented public verified-contact-email requirement remains an owner-side blocker; all stores still need publisher account access. No submission or approval has occurred.
- All ten full listings now satisfy Edge's 250–10,000 character range; the previous Chinese description was too short. Targeted Persian-site filtering and best-effort YouTube media behavior are disclosed without a universal blocking claim. English-only artwork and actual Firefox imagery were refreshed; 64/128/300px icon outputs and both promo sizes are present. Paused-state captures wait for saved settings and settled counters.
- 38 unit tests, four distribution checks, six store checks, current Chromium/Edge store integration and actual Firefox passed locally. Both Firefox lints reported zero errors, warnings and notices. The new offline reviewer-source test extracts the source archive without dependencies/network access, runs its generators and compares every produced production file with all three upload ZIPs; kit integrity and its SHA-256 are verified. CI adds dashboard drift and reviewer-rebuild gates. [Submission material](../store/SUBMISSION.md), [policy review](../store/POLICY-REVIEW.md), [CI](https://github.com/salehghotbani/AdBlocker/actions).
- This preparation changes no blocking behavior or permissions. The 1.7.1 YouTube fix was confirmed by the user in their Chrome; that report does not establish real mid-roll or universal coverage. The older exact-URL fixture's intermittent Chromium failure remains documented; no retry is a proof of its elimination.

## Version 1.7.1 YouTube detection fix — 2026-10-29

- Added synthetic actual-media cases for modern `ytp-ad-badge--clean-player` and legacy `ytp-ad-badge` layouts with no available Skip, plus visible ad UI/Skip inside an `aria-hidden` ancestor. The new modern-badge regression times out against 1.7.0 before the fix, reproducing visible/audible ads; the corrected controller conceals/mutes these cases and restores normal media.
- Both packaged Chromium integration and actual Firefox integration use the modern badge with an accessibility-hidden ancestor. Existing hidden-container, ambiguous-state, source handoff, user overrides, position/rate restoration, pause and exception checks remain required. The opt-in live harness additionally records read-only observations from document start and can start with protection ON, avoiding inference from a later toggle or an unrelated auction.
- The user's installed 1.7.0 version was confirmed. The regression establishes a detection gap, not certainty that every advertisement in that user's session uses the same layout. No claim of universal or verified real mid-roll support is made. [YouTube scope and live results](YOUTUBE.md).

- Actual Chrome 156.0.8078.48, protection ON before navigation: 128/128 sampled playing-ad states with clean-player badge evidence were hidden/muted; automatic native Skip returned to visible unmuted main content. This is sampled evidence, not a universal rate. No playing ad inventory on the second video. [1.7.1 live report](YOUTUBE-LIVE-1.7.1-2026-10-29.json). CDN 403/player errors still limit full playback and real mid-roll verification.

## Version 1.7.0 YouTube media handling — 2026-10-29

- `npm run test:youtube` decodes a self-generated WebM in Chromium: synthetic pre/mid-roll, nested native Skip, normal content completion, position/rate/mute restoration, paused media, later user edits, source changes with stale ad UI, SPA navigation and global/site/URL exceptions. Packaged integration uses the actual isolated content script; Firefox runtime repeats media checks. Fixture results are not live-ad results.
- Real Chrome 156.0.8078.48: enable protection during the same real pre-roll, observe conceal/mute and automatic native Skip events, then visible unmuted main content at rate 1 through 49.23 seconds. No manual Skip action occurred in that run. Subsequent media-CDN HTTP 403/player failure prevents a full-playback claim. Earlier long ads sometimes remained concealed/muted with waiting.
- Real mid-roll remains **unverified**: a separate progress-bar seek with protection OFF stalled on CDN 403. A no-extension control also failed after about 45 seconds; the user's Chrome plays normally, so environment equivalence is not established. The supplied video served no ads in isolated trials and is not counted as a blocking success. [Detailed method](YOUTUBE.md), [sanitized live observations](YOUTUBE-LIVE-2026-10-29.json).
- The first 1.7.0 CI run passed both YouTube suites, then reproduced the existing native-counter fixture failure after an exception was removed (1 request observed instead of 2). The counter fixture now initiates its two real script requests sequentially after navigation and three exact zero-count observations while native counting is enabled, separating navigation reset from measured traffic. Exact counts remain required; no reload retries or smaller totals are accepted. Earlier parser/request policy tests remain unchanged. This isolates the test phases without claiming an independently proven Chromium root cause or changing production counters.
- CI runs deterministic media tests, existing protection/counter/DOM suites, packaging/localization, Firefox runtime and both Firefox lints. Live auctions are opt-in, excluded from CI. [Current CI](https://github.com/salehghotbani/AdBlocker/actions).

## Version 1.6.1 Soft98 compatibility and live audit — 2026-10-29

- Reproduced Soft98's destructive ad-block warning with the previous display-based filter. Live checks of the patched home/article pages preserve identical description text, ordinary-link resolution and the download panel while collapsing verified ad slots. No software was downloaded. [21-domain audit and limits](SITE-COMPATIBILITY.md), [sanitized observations](SITE-AUDIT-2026-10-29.json).
- DOM regressions require descendant geometry and article survival, four deduplicated outer placement counts, exact CSS values/priorities after site/URL/global exceptions, dynamic protected-content recovery and preservation of later site edits. Chromium and actual Firefox run a local fixture modelling the observed checks. No proprietary site bundle or remote script enters the packages.
- CI reproduced intermittent allowance/pause/counter failures in the older intercepted fixtures. Policy-transition and counter checks now use a real loopback HTTP server with a test-process-only DNS mapping for the ad host, with Playwright interception removed during those scenarios. The complete routed 156-host block/allow matrix remains separately asserted. Fresh script URLs and no-store responses isolate documents; three consecutive exact counter observations, 100 ms apart, precede strict assertions. No scenario reload/retry or incorrect count is accepted. These changes improve fixture isolation without establishing an independent browser root cause or changing production rules/counters/permissions.
- [CI run 40857395749](https://github.com/salehghotbani/AdBlocker/actions/runs/40857395749) passed the implementation at commit `cb10f0af24ccf9d9dc3a39a47f64e3239f89d660`. Follow-up runs exposed the fixture issues above; final main validation is linked from Actions below rather than treating that earlier run as proof of the final harness.
- 38 unit tests, four manual-distribution checks and five store checks remain required. DOM, actual Chromium/Edge and Firefox runtime suites cover the patch alongside existing controls/security checks. No permissions, dependencies, domain rules or browser API overrides were added. The live audit stays opt-in outside CI; the historical Turtlecute percentage is unchanged. Current CI is available in [Actions](https://github.com/salehghotbani/AdBlocker/actions).

## Version 1.6.0 store submission preparation — 2026-10-29

- 38 unit tests cover protection/update logic, support configuration, store channels and complete localization. Four manual-distribution checks and five store checks cover ZIP integrity, source/policy identity, restricted permissions/CSP, locales/fonts/licenses, local updater and exact image dimensions.
- DOM tests exercise explicit asset/network labels, safe-link rejection, address-copy and manual fallback with deliberately invalid test-only receiving details. They never enter production configuration or listing images.
- Chrome- and Edge-targeted builds run in isolated Edge profiles: English reading-demo ads collapse, search survives, counters/site exceptions work, support loads and no GitHub update request occurs. Actual Edge accepts its native manager action. CI also exercises actual Chromium. Ten-language DOM tests cover layout, RTL/Shabnam, persistence and failed-save recovery.
- Actual Firefox 153 test-build temporary installation exercises the real popup with test-only drivers in an isolated copy: local ad-script requests explicitly fail without reaching the server; counters, site/URL controls, pause expiry, all ten languages/RTL/Shabnam, themes, support and update help pass. Drivers are absent from upload ZIPs. Direct about:addons opening was rejected by Firefox; the action now opens bundled localized instructions, which are tested in the actual browser.
- Five 1280×800 English-only images, an icon and 440×280 / 1400×560 promos use real interface captures without locale/site claims. A separate unannotated image is captured in actual Firefox. No live-site, store approval, rating or percentage is invented. Typeface files are official releases with licenses.
- Firefox lint, runtime testing and store review remain distinct. The runtime suite tests its reported browser version, not every minimum version/device. Wallet ownership/payment receipt and public publication are untested; no receiving destination is invented. Private browsing is disabled in manifests. [Policy preflight](../store/POLICY-REVIEW.md).
- [CI run 40850884220](https://github.com/salehghotbani/AdBlocker/actions/runs/40850884220) passed for implementation commit `fbebb5246b4f9e69a80f7d9ff05be354b797b279`, including actual Chromium/Firefox integration, both Firefox lint checks with zero errors/warnings/notices, store artwork and submission-kit assembly. Store approval and account onboarding are separate from CI.

## Version 1.5.0 page counters — 2026-10-29

- 32 unit tests cover trusted-message authorization, main-frame scope, unavailable/malformed native counts, stale document snapshots, navigation checks and independence from protection commands. Four distribution tests also require the absence of feedback and request-stream permissions.
- DOM tests verify separate English-formatted values, keyboard/manual refresh, automatic two-second refresh, unavailable values, nested placement deduplication, removal and restoration. Theme and protection controls retain their existing checks.
- Actual Edge tests exercise the browser's native count and popup values with two blocked requests/two placements, dynamic additions, repeated reads, same-URL reload resets, tab isolation, site/URL/global exceptions, and absence of persisted counter history. Production manifests exercise the unavailable-count fallback when no toolbar activeTab grant exists. Numeric-count automation uses a separate test-only manifest with feedback permission; this permission is excluded from all release packages.
- Counters describe requests and currently filtered outermost main-document placements separately. They are not summed into unique ads, do not cover cosmetic placements inside child frames, and do not retain lifetime totals. The browser may limit native count access; unavailable values show a dash. Firefox runtime and OS toast delivery remain untested.
- Integration reproduced a pre-existing timing limit with the published worker too: very early parser requests on the next reload may start before asynchronous `webNavigation` expiry finishes. The pause regression now waits for expiry and requires its session rule removed, its UI state cleared, cosmetic filtering restored and a fresh request explicitly blocked; paused-document late requests and other-tab isolation remain required. This does not establish synchronous blocking of every early navigation request. Pause implementation is unchanged.
- Final CI and the release commit are recorded in the [v1.5.0 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.5.0). Filtering rules are unchanged; the previous Turtlecute result remains historical.

## Version 1.4.1 W3Schools placements — 2026-10-28

- DOM and actual-extension fixtures collapse the first-party sidebar promotion, sidebar ad video/audio containers and named leaderboard/inline/footer ad slots. Lesson text, code examples, tutorial video/audio, social links and the working editor/preview remain visible and usable. Dynamic ad insertion, protected-content recovery and exact style restoration after global/site/URL exceptions are checked. Matching IDs on unrelated sites remain unaffected.
- A live Edge check on the [HTML tutorial](https://www.w3schools.com/html/default.asp) verified six target containers hidden, the title and code example unchanged, the tutorial video link/social navigation preserved, and the real Try it Yourself Run button rendering its result. The sidebar ad player was not served in that live session; media-bearing ad slots are covered by deterministic fixtures.
- Opt-in reproduction: set `CHROMIUM_PATH` and `$env:ADBLOCK_LIVE_W3SCHOOLS='1'`, then run `npm run test:browser`. It saves `artifacts/w3schools-before.png`, `artifacts/w3schools-after.png` and `artifacts/w3schools-result.json` in an isolated test profile. This live check stays outside CI; the fixtures run in CI.
- Validation includes 28 unit tests, four distribution/ZIP tests, 156 restricted-host and 25 allowed-host fixtures, English/LTR UI, optional update APIs, Soft98 and CSP checks. No new permissions, domain rules or dependencies were added. The previous Turtlecute score is historical; it was not rerun for this cosmetic fix.
- Final CI for the release commit is linked from the [v1.4.1 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.4.1). Firefox runtime and OS toast display remain untested.

## Version 1.4.0 English defaults — 2026-10-28

- English popup text, accessible theme labels, worker validation errors, release notifications and manifest metadata are checked. The popup declares `lang="en"` and `dir="ltr"`; numbers and dates use English formatting. DOM and actual-extension tests use a Persian browser locale to verify the English default.
- Unsuffixed guides are now English, paired with `.fa.md` translations. Existing `.en.md` paths remain compatibility links. Package tests verify both English and Persian policy files; local Markdown links are checked.
- The first release-candidate CI run passed the English checks but failed the existing exact-URL fixture after global ruleset toggles. That scenario now uses a fresh tab and requires all three allowed scripts to execute, retaining the different-path/query blocking assertions and failure diagnostics. A browser-level root cause was not independently established.
- The 28 unit tests, four distribution/ZIP tests, DOM/theme/gray-state controls, network and same-site fixtures, Soft98 and missing-update-permission installation tests remain the validation scope. Filtering rules and permissions are unchanged; no new live blocking percentage is claimed.
- Final CI for the release commit is linked from the [v1.4.0 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.4.0). Firefox runtime and native OS toast display are outside this validation.

## Version 1.3.3 optional-API startup fix — 2026-10-28

- 28 unit tests pass, covering missing and partial alarms/notifications namespaces, an alarm API throwing `Internal error`, and rejected or stalled scheduler initialization. Settings, ruleset restoration, command authorization and temporary-pause expiry continue functioning.
- A second actual-browser installation removes both `alarms` and `notifications` permissions from a copied manifest. The real worker and popup still perform a manual update check, show a safe release link and manual-only status, toggle network protection and expire a pause on the next reload. This reproduces API absence without relying on a mock namespace. The normal installation still schedules its three-day alarm.
- DOM/UI tests and four distribution/ZIP tests pass. All 156 restricted-host and 21 allowed-host fixtures, same-site safeguards, Soft98 checks and CSP tests remain included. No new permissions, dependencies or remote endpoints were added; the previous live benchmark is historical and was not rerun for this startup fix.
- The screenshot identifies an undefined API; it does not establish why that installation lacked it. Distributed manifests declare both permissions. A stale/partial installation is a possible cause, rather than a confirmed diagnosis. Install the complete ZIP and reload the extension to apply its manifest. Core DNR errors are still returned to callers.
- Final CI for the versioned release commit is recorded in the [v1.3.3 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.3). Firefox runtime and OS toast delivery were not tested.

## Version 1.3.2 host restrictions — 2026-10-28

- The six hosts in the reported screenshots are now restricted for third-party requests. Browser fixtures explicitly block all 156 listed hosts and allow 21 other useful hosts. Direct navigation, first-party scripts/fetches on all six new hosts, and same-site Bugsnag dashboard-to-API requests pass. These local responses exercise browser policy, not full authenticated dashboards; cross-site integrations may need a site exception.
- Live Turtlecute in Edge: **100% as scored by the site, 132/132**. Browser events recorded **129 distinct requests explicitly blocked by the client**, including every newly added host; both cosmetic checks passed. The remaining `extmaps-api.yandex.net` check timed out and was counted as blocked by the site. It remains allowed by the extension; a timeout is not evidence of blocking. [Recorded screenshot](images/turtlecute-1.3.2.png).
- 25 unit tests, four distribution/ZIP tests, syntax/documentation checks, real extension/network tests and Firefox validation passed locally. No permissions or dependencies were added. Firefox runtime and OS toast display were not tested.
- Final CI for the versioned release commit and package checksums are recorded in the [v1.3.2 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.2). The live check stays opt-in; CI uses deterministic fixtures, including direct-navigation/first-party safeguards and Soft98 coverage.

## Version 1.3.1 Soft98 fix — 2026-10-28

- 25 unit tests, four distribution/ZIP tests, DOM checks, and actual Edge extension tests passed. All 150 advertising/tracking domains were explicitly blocked; 27 useful-host fixtures remained reachable, including Soft98, its forum/image/file hosts, Faradars and the main Kaprila website.
- Site-specific selectors collapse direct banners, related-ad placements, side-ad sections and the hosting card. Fixtures cover dynamic insertions, protection of real articles and search/download controls, restoration after site/URL/global exceptions, and absence of these rules on other hosts.
- A live [Soft98](https://soft98.ir/) check with the actual extension confirmed all four target containers were hidden. All six visible software descriptions were identical before and after filtering, and `beta.kaprila.com/a/loader.js` failed with explicit `ERR_BLOCKED_BY_CLIENT`. Screenshots were visually reviewed. Network failures alone were not counted as blocking.
- Opt-in reproduction in PowerShell: set `CHROMIUM_PATH` to a Chromium-based browser, set `$env:ADBLOCK_LIVE_SOFT98='1'`, then run `npm run test:browser`. It saves `artifacts/soft98-before.png`, `artifacts/soft98-after.png` and `artifacts/soft98-result.json` using an isolated test profile. The live check stays outside CI; deterministic Soft98 fixtures run in CI.
- The filtering fix passed [CI run 40585173675](https://github.com/salehghotbani/AdBlocker/actions/runs/40585173675) for commit `10747d1410687c8edf7e2c9a909c97a2891068aa`, including real Chromium integration and Firefox validation. Final CI for the versioned release commit and package checksums are recorded in the [v1.3.1 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.1).
- The historical Turtlecute percentage below was not rerun for this fix. Local browser execution used Edge; Firefox runtime and OS toast delivery were not tested. No browser permissions or dependencies were added.

## Version 1.3.0 update checks — 2026-10-28

- 25 unit tests, four distribution/ZIP tests, DOM checks, and actual Edge extension tests passed. The existing 149 blocked-domain and 20 allowed-host fixtures still pass.
- The manual button, native three-day alarm, alarm restoration after restart, numeric version comparison, concurrent-request deduplication, and notification deduplication were checked. Opening the popup reads cached status without a network request.
- The real anonymous GitHub metadata request succeeded and returned `v1.2.0`. A simulated newer release exercised the notification API and safe download link; operating-system toast delivery was not tested.
- Offline responses, rate limits, drafts, prereleases, invalid version tags, oversized metadata, unauthorized page messages, and untrusted release URLs were tested. Update requests do not delay protection changes, and CSP still rejects unrelated connections.
- Syntax/documentation checks, packaging, `npm audit`, and Firefox validation passed. Firefox runtime and Chrome runtime were not tested locally.
- The updater implementation passed [CI run 40582238496](https://github.com/salehghotbani/AdBlocker/actions/runs/40582238496) at commit `4ad773a8e46c4f65c5e0e52e513393545b7f200d`, including actual Chromium integration and Firefox validation. An earlier run failed the existing exact-URL fixture; the test now waits for allowed script execution and preserves diagnostics. The underlying timing cause was not independently established.
- Final CI for the versioned release commit and package checksums are recorded in the [v1.3.0 release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.0). The previous live Turtlecute result below is historical; this release does not change filtering rules or claim a new live score.

## Version 1.2.0 validation — 2026-10-27

- 16 unit tests, four distribution/ZIP tests, DOM checks, and actual Edge extension tests passed: 149 domains blocked and 20 useful hosts allowed.
- Exactly-once automatic reload, gray-state behavior, the actual version label, and refusal to reload another page after navigation were checked.
- Unauthorized-message rejection, minimized page messages, rollback after a failed save, and real CSP probes passed. `npm audit` reported no known advisories; Firefox validation reported zero errors or warnings.
- The live benchmark was rerun: **95%, 126/132**, with 123 explicit client-blocked requests. The site counted one additional host timeout as blocked. The four new hosts are outside this test's host list; broader coverage does not imply a guaranteed higher percentage on every site.
- See the [security-review scope and rule sources](SECURITY-REVIEW.md). CI status for the release commit is recorded in the [release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.2.0).

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

Commands are listed in the [contribution guide](../CONTRIBUTING.md). After a push, `.github/workflows/ci.yml` runs these checks, including the full Chromium integration test, in GitHub Actions. The successful version 1.1.0 runs are linked above; later commits must be checked against their own runs.
