# Version 1.6.1 security and coverage review

## Version 1.7.0 YouTube media handling — 2026-10-29

The new script runs in the isolated extension world on explicit HTTPS desktop watch/embed matches, without additional permissions, remote code, stream interception, MAIN-world bridge or prototype overrides. It confirms native ad state plus presented ad UI; clicks are restricted to enabled native Skip controls. Only owned mute/rate/marker changes are restored, with source/duration changes locking acceleration to protect content handoff. It never seeks content or calls play. Runtime settings changes require the extension sender and no sender tab; settings reads retain revision guards. The temporary media identity is neither logged nor stored by the extension.

Local actual-media tests exercise restoration, user overrides, exceptions and navigation in packaged Chromium/Firefox builds. Live evidence and its unresolved mid-roll/full-playback limits are [documented separately](YOUTUBE.md). Passing these checks is not a guarantee that no vulnerability or playback regression exists. No credentials, personal profiles or signed media URLs enter the public report.

## Version 1.6.1 compatibility patch — 2026-10-29

The Soft98 correction uses fixed local CSS properties on existing verified placements. It adds no main-world injection, browser API override, detector/global patch, remote code, permission or domain rule. Original values and priorities are restored independently without overwriting later site edits. Protected article/form/media checks and trusted-message boundaries remain in place. Local Chromium/Firefox fixtures and DOM restoration/counter tests cover the change; live audit data is sanitized before entering this repository. This is the stated review scope, not a guarantee of zero vulnerabilities.

## Version 1.6.0 store channels and voluntary support — 2026-10-29

Store builds replace the manual updater with a local module that opens a fixed native extension-manager URL where supported, or bundled localized help in Firefox. Actual Firefox testing rejected direct about:addons navigation. The module makes no fetch, schedules no alarm, installs no update, requests no update permission and never claims a latest-version check. CSP removes the GitHub exception (`connect-src 'none'`). Blocking/message authorization are shared with the manual edition.

The support page is bundled and optional. All blocking remains free. Build-time support configuration rejects non-HTTPS/credentialed/executable links, unknown fields (including secrets), invalid address formats, unsupported network identifiers and duplicate asset/network entries. This is syntax validation, not ownership, checksum or token verification; the creator must verify receiving details before publication. Rendered labels use textContent/read-only inputs; there is no HTML interpolation, remote widget, wallet SDK, automatic clipboard read, signature or transaction flow. Address copy is user-initiated and has manual fallback. Unconfigured financial support stays hidden rather than using a sample destination.

Ten-language translations and licensed fonts are local and rendered as text. Locale choices are allowlisted; default/fallback is English, failed writes restore the previous selection and RTL is explicit. No translation/font server is contacted. Private browsing is explicitly disabled to avoid retaining private-session URLs. Edge's public privacy/listing files are browser-specific. Test-only Firefox drivers are confined to an isolated copy and excluded from upload packages.

Tests cover store isolation, unsafe configuration, copy/fallback, CSP, packaged fonts/locales/licenses and ZIP contents. Chromium and real Firefox runtime tests use controlled demonstration content. Accounts, verified receiving details and final store review remain publication requirements. See [policy preflight](../store/POLICY-REVIEW.md), [submission instructions](../store/SUBMISSION.md) and [validation results](TESTING.md).

## Version 1.5.0 local counters — 2026-10-29

The popup reads the browser's native per-tab badge count and locally counts currently filtered outermost placements in the main document. Counts are never added into a unique-ad total, persisted or transmitted. No `webRequest` stream, `getMatchedRules` history, debug feedback permission, new host access or dependencies are introduced. Only this extension's pages can request counters; content replies validate the sender and use a temporary document token to reject snapshots across reloads. Unavailable APIs/permissions return unavailable values, and optional reads have a timeout outside the protection queue.

The [native badge API](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#method-setExtensionActionOptions) resets counts on navigation. Chromium restricts numeric badge reads to feedback/activeTab grants; the existing toolbar grant is used. Programmatically opening a popup URL does not grant activeTab. Browser tests check production-permission fallback and use a separate, test-only installation with feedback permission to check native numeric counts; packaged manifests explicitly exclude that permission. Firefox runtime remains untested. See [validation results](TESTING.md).

The existing one-time pause expires through asynchronous navigation events. Early parser requests can race rule removal on a fast reload; the published worker reproduced this too. Tests require the pause and session rule to clear, cosmetic filtering to resume and a fresh request to be explicitly blocked after expiry, without claiming synchronous prevention of all early requests. The pause implementation is unchanged. See the [validation limits](TESTING.md) and [Chrome's rule evaluation](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#rule-evaluation).

## Version 1.4.1 W3Schools cosmetic scope — 2026-10-28

The [tutorial markup](https://www.w3schools.com/html/default.asp) and its public [provider integration](https://www.w3schools.com/lib/uic_prov.js?v=1.5.3) identify the sidebar promotion and ad slots. Selectors apply only on `w3schools.com` and `www.w3schools.com`. The normal media safeguard is relaxed only inside the named right-sidebar ad slots, outside semantic main/article and main/editor containers; forms, headings and articles remain protected. Tutorial media, examples and editor fixtures are explicitly tested. Provider/account scripts, cookies, account status and general-purpose W3Schools hosts are unchanged; no new network/permission scope is introduced. In the live test, the sidebar ad player was not served, while the sidebar promotion and real editor checks were verified. See the [test report](TESTING.md).

## Version 1.4.0 language and documentation defaults — 2026-10-28

Interface, notification and validation text now defaults to English, with an LTR popup and English number/date formatting. Unsuffixed guides are English and Persian translations use `.fa.md`; compatibility links preserve older `.en.md` paths. Both language policies are packaged. These are local text/layout changes: no permissions, executable sources, CSP connections, collection behavior or filtering rules were expanded. Existing authorization, safe-link, missing-API and policy-restoration checks remain enabled.

## Version 1.3.3 optional API isolation — 2026-10-28

Optional alarm/notification listeners are feature-detected before registration. Scheduler initialization runs outside the protection-command dependency chain; missing APIs and scheduling failures are reported through capability status, while manual checks remain available. Notification deduplication is recorded only after successful notification creation. No permission prompts, timer-based worker keepalive, new permissions or wider CSP connections were introduced. Existing core policy errors remain surfaced, not suppressed. Real-browser coverage removes both update permissions and verifies manual checks, network controls and temporary-pause expiry. [Chrome requires the alarms manifest permission](https://developer.chrome.com/docs/extensions/reference/api/alarms); an undefined API alone does not establish the state of the user's installed manifest.

## Version 1.3.2 requested host restrictions — 2026-10-28

At the user's request, `careers.hotjar.com`, `api.bugsnag.com`, `app.bugsnag.com`, `app.getsentry.com`, `business-api.tiktok.com` and `grs.hicloud.com` now use the existing third-party-only blocking policy. These hosts are not all ad-delivery endpoints: [Bugsnag documents its dashboard/data API](https://developer.smartbear.com/bugsnag/docs/data-access-base-server-url), and [TikTok documents its business API](https://business-api.tiktok.com/portal). Cross-site integrations to these hosts are intentionally restricted and can be permitted using site exceptions. Direct navigation is excluded from domain block rules; actual-browser fixtures also verify first-party scripts/fetches and same-site Bugsnag dashboard-to-API requests. These are request-policy fixtures, not full authenticated-service tests.

No permissions, dependencies, executable code or remote endpoints were added. The live benchmark explicitly client-blocked all six hosts. Its 100% score includes one unrelated timeout; see the [measured results and limits](TESTING.md).

## Version 1.3.1 Soft98 rule review — 2026-10-28

The [Soft98 page](https://soft98.ir/) directly includes `https://beta.kaprila.com/a/loader.js` and ad containers with `.abdd`, `.abdds` and `kaprila_soft98_ir_` IDs. The dedicated ad host is blocked; shared image/file servers, Faradars, the main Kaprila site and hosting CDNs remain allowed. Cosmetic rules are limited to `soft98.ir` and `www.soft98.ir`, preserving the existing protected-content and exception checks. No permissions, outbound update endpoints or executable sources are added. Live before/after checks preserved all six software descriptions; see the [test report](TESTING.md).

## Version 1.3.0 update checks — 2026-10-28

The update checker adds `alarms` and `notifications`. Its only permitted outbound connection is this repository's fixed GitHub latest-release API endpoint. Metadata is limited to 1 MiB with a ten-second timeout; version tags are validated, redirects/cookies/credentials are denied, and download links are rebuilt locally. No browsing data or installed version is included in the request. GitHub receives the IP address and ordinary connection headers, as disclosed in the privacy policy. No remote code or automatic installation is introduced.

Only this extension's own pages may request or read update checks. Tests cover invalid metadata and URLs, offline/rate-limit errors, numeric version comparison, notification deduplication, and continued protection changes while an update request is pending. Native alarms, safe links, cached popup reads, and rejection of unrelated CSP connections were checked in the real browser. OS toast delivery was not tested. See the [validation report](TESTING.md) and [release CI result](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.0).

## Version 1.2.0 baseline review

The historical review below describes version 1.2.0 before update checks added the two permissions and narrowly scoped network exception above.

Reviewed on 2026-10-27. This is a source review with automated regression and browser checks, not an independent penetration test or a guarantee that no vulnerabilities exist. The extension has no runtime dependencies or remote executable code.

## Security controls checked

- Only messages from this extension's own pages may change settings. Content scripts and foreign extension IDs are rejected for privileged commands.
- Page messages and broadcasts contain only the effective protection state, excluding saved sites and URLs with potentially sensitive query parameters. Chromium local storage is restricted to trusted extension contexts; Firefox retains its isolated content-script model.
- Failed settings writes trigger restoration of the previous network policy. A failed restoration is logged and is not reported as success.
- Extension-page CSP permits local scripts and denies inline scripts, embedded objects, foreign base URLs, network connections, frames, and form submissions. Real-browser probes confirmed rejection of inline script execution and a foreign base URL.
- Automatic reload checks the current tab URL first. Regression tests cover exactly one reload, existing background-owned pause reloads, and refusal to reload a different page after navigation.
- Settings remain local; the logo is bundled. No new browser permission was added.

## Recorded checks

- 16 unit tests and four distribution/ZIP tests passed.
- DOM tests passed for gray states, logo transparency, theme persistence, automatic reloads, and stale-page handling.
- Actual Edge extension tests passed for 149 blocked domains, 20 useful allowed hosts, CSP enforcement, exceptions, and automatic page reload.
- `npm audit` reported zero known advisories for the locked development dependencies. CI now runs `npm audit --audit-level=low`.
- Mozilla web-ext validation reported zero errors, warnings, and notices. Firefox runtime was not tested.
- CI status for the published release commit is linked in the [release notes](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.2.0).

Private vulnerability reporting is enabled in the repository's Security section. Report sensitive findings privately.

## Coverage improvement

Four dedicated ad/analytics hosts were added without blocking their general-purpose parent domains. Browser fixtures verify that the parent websites remain reachable.

| Added hosts | Primary evidence |
| --- | --- |
| `static.hotjar.com` | [Hotjar's own tracking-code implementation](https://github.com/hotjar/hotjar-js/blob/main/src/utils.ts) |
| `bat.bing.com` | [Microsoft UET documentation](https://github.com/MicrosoftDocs/Advertising/blob/main/advertising/msa-help/hlp_BA_CONC_UET_FAQ_2.md) |
| `api.segment.io`, `cdn.segment.com` | [Twilio Segment's SDK and collection endpoints](https://segment.com/blog/twilio-segment-edge-sdk/) |

The live Turtlecute result remains 95% (126/132). That test does not exercise every new host. One timeout contributes to the site's score; browser events independently recorded 123 client-blocked network requests, plus two successful cosmetic checks. This is a measured result for one setup, not a universal protection percentage. Functional careers, management, business API, and routing endpoints remain allowed.
