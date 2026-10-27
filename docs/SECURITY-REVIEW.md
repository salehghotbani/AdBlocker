# Version 1.3.1 security and coverage review

## Version 1.3.1 Soft98 rule review — 2026-10-28

The [Soft98 page](https://soft98.ir/) directly includes `https://beta.kaprila.com/a/loader.js` and ad containers with `.abdd`, `.abdds` and `kaprila_soft98_ir_` IDs. The dedicated ad host is blocked; shared image/file servers, Faradars, the main Kaprila site and hosting CDNs remain allowed. Cosmetic rules are limited to `soft98.ir` and `www.soft98.ir`, preserving the existing protected-content and exception checks. No permissions, outbound update endpoints or executable sources are added. Live before/after checks preserved all six software descriptions; see the [test report](TESTING.en.md).

## Version 1.3.0 update checks — 2026-10-28

The update checker adds `alarms` and `notifications`. Its only permitted outbound connection is this repository's fixed GitHub latest-release API endpoint. Metadata is limited to 1 MiB with a ten-second timeout; version tags are validated, redirects/cookies/credentials are denied, and download links are rebuilt locally. No browsing data or installed version is included in the request. GitHub receives the IP address and ordinary connection headers, as disclosed in the privacy policy. No remote code or automatic installation is introduced.

Only this extension's own pages may request or read update checks. Tests cover invalid metadata and URLs, offline/rate-limit errors, numeric version comparison, notification deduplication, and continued protection changes while an update request is pending. Native alarms, safe links, cached popup reads, and rejection of unrelated CSP connections were checked in the real browser. OS toast delivery was not tested. See the [validation report](TESTING.en.md) and [release CI result](https://github.com/salehghotbani/AdBlocker/releases/tag/v1.3.0).

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
