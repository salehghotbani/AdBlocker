# Reviewer notes

Version 1.7.0. Free, open-source ad/tracker blocker. No login or payment is needed to test any feature. MIT license. English is the initial UI; nine other selectable languages and localized descriptions are included. Fonts are bundled with their own licenses. Private browsing is disabled in the manifest.

## YouTube media behavior

Version 1.7.0 adds an isolated document-start script on explicit HTTPS YouTube desktop/embed matches. It requires native ad state plus presented ad UI, conceals/mutes ads, uses enabled native Skip controls and attempts bounded acceleration for stable short ad media. It never seeks content, calls play, replaces streams, injects MAIN-world code or requests new permissions. Media identity stays in memory; no player data is collected. Site/global/URL exceptions restore owned changes. Actual-media fixtures and Firefox integration are provided. Real pre-roll was observed; real mid-roll, full-video reliability and universal coverage remain unverified. Native Skip may leave waiting. See [validation](../docs/YOUTUBE.md).

## Reproduce the build

Use Node.js 20+ and Python 3. `npm ci --ignore-scripts --no-audit --no-fund`, then `npm run package:stores`. Upload ZIPs are in `dist/stores/`. Select the matching browser ZIP; `manifest.json` is at its root. Store editions are distinct from the GitHub/manual-install builds. Generated local rules come from `extension/ad-domains.json` and `scripts/build.mjs`; no remote code or runtime dependency is bundled. Source package is included in the submission kit.

## Permissions and network behavior

- `declarativeNetRequest`: local third-party host and ad-script-path blocking, plus explicit user exceptions.
- HTTP/HTTPS host access and isolated content scripts: inspect ad markers locally and collapse targeted placements; protect article/main/form/media content.
- `activeTab`: current-page controls, safe reload checks and native badge count when available.
- `storage`: settings and explicitly saved exceptions; one-time tab pauses in session memory.
- `webNavigation`: expire pauses on top-level navigation/SPA route changes and refresh effective protection.

No `webRequest`, debug feedback, alarms, notifications, wallet, clipboard-read or payment permissions are requested. Store pages use `connect-src 'none'`; update delivery belongs to the browser. The manager action opens the native extension manager where supported. The Firefox build opens bundled translated update instructions because direct `about:addons` navigation is disallowed. Neither action claims a new release was checked.

## Free model and voluntary support

All blocking features are free, without subscription, account, paid whitelist or gated capability. Support is a user-initiated link to a local `support.html` page. Public receiving details are bundled from `config/support.json` only after creator confirmation. When none are configured, no payment/address control is exposed. There are no remote widgets, wallet connections, signatures, transactions, payment detection or receipt tracking. Copying an address writes only the displayed address after a click, with manual-copy fallback. A voluntary contribution never changes filtering.

## Functional checks

Use Soft98 or another public page with marked ad placements. Toggle a site exception and confirm content returns after reload; restore protection and confirm the targeted placements collapse. W3Schools also has narrowly scoped cosmetic selectors. No guarantee of blocking every ad or avoiding every page break is made. Exact-URL exceptions preserve scheme/port/path case/query and ignore fragments.

Open the popup on a web page; hidden main-document placements update while the popup is open. Network and placement counts remain separate. Native count access can be unavailable, particularly when an extension URL is opened without a toolbar activeTab grant. No counter history is stored.

One-time pause expiry uses asynchronous navigation events. Very early requests on the next reload can race expiry; regression checks require explicit blocking after rule removal. See the full validation report.

## Validation scope

Chromium and actual Firefox temporary-install integration tests exercise store builds in isolated profiles. Firefox's real popup is driven by test-only scripts in a copied extension, then results are reported through the local fixture; no test driver is shipped. Unit and packaging tests cover localization, font licenses, updater isolation, support configuration, policies and ZIP integrity. See POLICY-REVIEW.md and the runtime report for exact scope; approval and minimum-version coverage are not inferred from one browser version.
