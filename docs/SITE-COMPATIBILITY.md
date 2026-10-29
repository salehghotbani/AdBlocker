# Live site compatibility — 2026-10-29

**English** | [فارسی](SITE-COMPATIBILITY.fa.md)

The current filters do **not** remove every advertisement on popular sites. This audit covers 21 domains, with additional Soft98 article and YouTube watch-page checks. The Soft98 failure was reproduced and corrected in the 1.6.1 candidate. Other rows describe the 1.6.0 baseline; the patch changes only Soft98 treatment and CSS restoration, without adding network rules.

## Selection and method

International candidates were informed by [Similarweb's August 2026 global estimates](https://www.similarweb.com/blog/research/market-research/most-visited-websites/). [NetAPI's Iran list](https://netapi.com/top-websites/ir/) provides additional country context. Iranian publishers and the two user-reported sites were added deliberately. This is a representative convenience sample, **not** the exact top 21 by Iranian traffic or a statistically weighted effectiveness score. Country rankings vary with measurement and VPN traffic.

Actual desktop Edge 156.0.4314.50 ran the production store build in a fresh isolated profile, with protection OFF and then ON. Each visit waited for scripts and ordinary lazy loading. No account, subscription, CAPTCHA solver, personal browser profile or broad cookie acceptance was used. W3Schools and Weather were subsequently checked using their explicit cookie-refusal control. The baseline tests and follow-ups are distinguished in the [sanitized evidence](SITE-AUDIT-2026-10-29.json).

Only explicit `ERR_BLOCKED_BY_CLIENT` failures against listed hosts are counted below. A tracking request is not a removed visual ad. Fewer requests, a blank placeholder, an HTTP error or absent ad inventory cannot establish complete blocking. Native request counts are requests, not unique advertisements. Screenshots, downloaded site bundles and raw page text stay in ignored local audit folders; the public evidence excludes those, cookies, headers and IP addresses.

## Results

| Site / page | Explicit listed-host blocks ON | Observed result and limit |
| --- | ---: | --- |
| Soft98 home and software article | 2 each | **Observed failure fixed.** Direct/related/sidebar placements collapse; article text and ordinary links survive interaction. Details below. |
| Varzesh3 | 0 | Several direct image banners remain visible. Unsupported placements. |
| Zoomit | 2 | Analytics requests blocked; the large direct top banner remains. Partial coverage. |
| Digiato | 1 | Google Analytics blocked. This alone does not establish visual ad removal. |
| Asriran | 1 | Analytics blocked; complete visual coverage is not established. |
| Tabnak | 1 | Analytics blocked; complete visual coverage is not established. |
| Namnak | 5 | Yektanet and analytics requests explicitly blocked. Remaining inventory is not exhaustively checked. |
| Aparat home | 1 | Analytics blocked. In-video advertising is not established by the home-page check. |
| Digikala | 0 | No explicit network blocking observed. Store product promotions were not classified as removable third-party ad slots. |
| Google search | 0 | CAPTCHA/unusual-traffic page; search-ad effectiveness **unknown**. No CAPTCHA was bypassed. |
| YouTube home / watch page | 2 / 3 | DoubleClick requests blocked. The public sample video played for about 8 seconds OFF and ON; neither run showed a video ad. **In-stream ad removal remains unverified.** |
| Facebook | 0 | Logged-out entry page; sponsored-feed ads untested. |
| Instagram | 0 | Logged-out entry page; sponsored-feed ads untested. |
| X | 0 | Navigation failed with `ERR_HTTP_RESPONSE_CODE_FAILURE` in both states; unknown. |
| TikTok | 0 | Login/entry view; personalized-feed ads untested. |
| Reddit | 0 | Network-security block in both states; unknown. |
| Yahoo | 29 | Several ad/measurement providers blocked, including DoubleClick, Google ad scripts and Taboola. Empty labelled ad spaces remain. Partial coverage. |
| CNN | 6 | Ad/measurement endpoints blocked; the cookie dialog remained in the baseline. No full-page or video-ad success claimed. |
| BBC | 0 | No explicit listed-host blocking observed. Ad removal not demonstrated. |
| Weather | 10 in baseline and refusal follow-up | Ad endpoints blocked; the baseline had a consent overlay and reserved space. Refusal follow-up is recorded separately; not a full-coverage claim. |
| W3Schools HTML tutorial | 1 in baseline; 2 after refusal | Known cosmetic slots collapse and lesson content remains. The baseline had a consent dialog; explicit-refusal follow-up is recorded separately. Course navigation and every house promotion are not treated as ads. |

No aggregate percentage is calculated: several sites did not serve comparable inventory, and login, region, consent, bot checks and randomized ad auctions affect the observations. This also does not update the separate historical Turtlecute benchmark.

## Soft98 correction

The site's ordinary-link checks inspect ad placement display and descendant geometry. With the previous `display:none` filtering, a live reproduction replaced the content with an instruction to disable the blocker. Hiding that instruction would leave the article missing.

The patch instead clips the verified ad containers vertically with zero height and hidden overflow, retaining their display and descendant layout. It adds no injected main-world script, remote code, browser-API override, detector global, broad exception or permission. Network blocking remains enabled. The existing main/article/form/media safeguards still apply; containers that become real article content are restored.

Live OFF/ON comparison preserved all six home-page software descriptions and both matched description sections on the tested article. The download panel stayed present and its actual link resolved on hover; **no software archive was downloaded or executed**. Scrolling/hovering did not trigger the destructive warning in those visits. This covers the observed current implementation and two URLs, not every future Soft98 detector or all anti-adblock systems.

DOM tests require retained child geometry, article survival, exact original CSS values/priorities, preservation of subsequent site edits, site/URL/global exceptions and deduplicated counters. Actual Chromium and Firefox additionally run a local compatibility fixture modelling the observed checks; it does not copy the site's proprietary bundle. The audit itself is opt-in, outside CI.

## Reproduce

Build store packages with `npm run package:stores`, then in PowerShell:

```powershell
$env:CHROMIUM_PATH='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
$env:ADBLOCK_LIVE_SITES='1'
$env:ADBLOCK_SITE_FILTER='soft98,soft98-article'
node tests/live-sites.mjs
```

Omit `ADBLOCK_SITE_FILTER` to audit the complete sample, or select comma-separated names from the harness. Results and screenshots go to `artifacts/live-sites/`; isolated profiles and diagnostic site responses stay under `.cache/live-sites/`. Use a browser that permits unpacked extensions. Live observations may change on repetition. [Automated validation](TESTING.md).
