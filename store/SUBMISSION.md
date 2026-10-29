# Store submission kit

This kit prepares publication; it does not mean an account was registered, a store submission was made, or a listing was approved. Version 1.7.1 is free in every channel. English is the default listing language; LISTING.fa.md is optional Persian listing text.

Publisher: **saleh ghotbani**. Public support: [GitHub Issues](https://github.com/salehghotbani/AdBlocker/issues). The owner has not authorized a public email. No email, wallet address, legal identity or publisher account is invented by this kit.

Current publication targets: **Edge and Firefox desktop only**. The owner has deferred Chrome publication. Chrome build/source material is retained for compatibility work, but its upload ZIP and dashboard folder are excluded from the active submission kit.

## Start here

The combined ZIP contains `START-HERE.md`, the two active browser upload ZIPs, a reviewer source ZIP, listings in ten languages, artwork and permission/privacy answers. Use the matching browser's `DASHBOARD.json` for copy/paste field values and `REVIEWER-NOTES.md` for testing notes. These JSON files are preparation material, not an upload API or proof of submission.

| Store | Dashboard | Current owner-side requirement |
| --- | --- | --- |
| Chrome (deferred) | Not an active publication target | Do not register, enter contact information or submit on the owner’s behalf. |
| Edge | [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) | Register/verify the publisher account. Use the GitHub support URL for the optional support-contact field. |
| Firefox | [AMO Developer Hub](https://addons.mozilla.org/developers/) | Register/sign in to the publisher account. Use GitHub as Support website; leave optional public support email blank. Select desktop only and listed distribution. |

Private account sign-in/verification is distinct from public listing fields. Do not put credentials or verification codes in this repository. Complete account/eligibility and any required identity/trader declarations with the owner's real information; this kit does not select a legal status. Chrome registration availability depends on the owner's actual location; consult the [official registration guide](https://developer.chrome.com/docs/webstore/register).

## Build and assets

1. Run `npm run package` and `npm run package:stores`.
2. Run `npm run locales`, `npm run store:fields`, `npm run check:store-fields`, `npm test`, `npm run test:dist`, `npm run test:stores` and the Chromium integration suites. Set `CHROMIUM_PATH` to the test browser executable.
3. Run `npm run test:store-browser` and `npm run test:firefox`, then `npm run store:assets` to refresh captures and artwork. The Firefox test needs the Playwright Firefox test browser (`npx playwright install firefox`). See assets/provenance.json for capture scope.
4. Run `npm run store:kit`, then `npm run test:store-kit`. The latter rebuilds the extracted reviewer source without npm dependencies/network access and compares every produced upload file. See [reviewer build instructions](BUILD.md).
5. The combined kit has its own `.zip.sha256` file; `SHA256SUMS-submission-1.7.1.txt` inside the kit covers its active uploads and source; the separate `SHA256SUMS-stores-1.7.1.txt` covers all reference builds. ZIP metadata can differ across machines; extracted production file bytes must match.

| Destination | Upload file | Images |
| --- | --- | --- |
| Chrome Web Store (deferred; reference build only) | adblocker-chrome-store-1.7.1.zip | assets/01 through 05 (1280×800), icon-128.png, optional 440×280 / 1400×560 promos |
| Edge Add-ons | adblocker-edge-store-1.7.1.zip | Same five English images, icon-300.png and optional promos |
| Firefox Add-ons (desktop) | adblocker-firefox-store-1.7.1.zip | icon-64.png and assets/firefox-filtering.png, an actual Firefox runtime capture; use a caption outside the image |

The Firefox ZIP is an unsigned submission package; AMO performs signing. Keep `adblocker@salehghotbani.local` stable across updates. Do not upload the entire submission-kit ZIP as the extension. Never upload the manual GitHub build to a store.

## Dashboard fields

- Name/summary/full description: use the selected browser's `listings/en.md`, with optional localized text from the other nine files. For Edge, use `edge/listings/` and `edge/PRIVACY.md` so the public listing/policy does not advertise other browsers. The top-level LISTING guides are reference material, not a replacement for the browser-specific files.
- Price: Free. No account, subscription or paid capabilities. Disclose voluntary support transparently in the description/reviewer notes. If a dashboard asks about monetization, explain the actual configured support method; do not describe it as an in-app feature purchase.
- Publisher name: `saleh ghotbani`. Public support website: `https://github.com/salehghotbani/AdBlocker/issues`. No public email is authorized. Chrome publication is deferred by the owner. Account registration details must be entered by the owner.
- Privacy URL: `https://github.com/salehghotbani/AdBlocker/blob/main/store/BROWSER/PRIVACY.md`, with BROWSER replaced by chrome, edge or firefox. These must be public before submission.
- Purpose: local blocking of listed ads/tracking requests and targeted placements, with per-site controls. Use REVIEWER-NOTES.md for permission explanations.
- Data disclosures: the extension itself does not collect/transmit browsing or payment data. Local settings/selected exceptions and user-initiated external support links are described in PRIVACY.md. Do not claim “no data ever leaves the browser” for a clicked external link or blockchain transfer.
- AMO: no payment/non-free service is required to use functionality. Existing `data_collection_permissions.required = ["none"]` reflects the no-collection store implementation. No Android listing until Android runtime is tested.
- AMO source upload: include the reviewer source ZIP because custom generators produce rules/localization/channel metadata, even though the shipped JavaScript is readable. `README-REVIEWER.md` at the source root gives the offline build steps.

## Remaining publication requirements

- Obtain access to the actual Chrome, Edge and Mozilla publisher dashboards; register/pay or verify identity where their current flow requires it. Enable account security according to the dashboard. No store credentials belong in Git.
- Configure real receiving details under config/support.json if financial support is to be active. The current checked-in state may be intentionally empty until the owner supplies public addresses. Verify address ownership and full asset/network details independently; the build checks syntax, not ownership, checksum correctness or whether a token/network combination is supported by a wallet.
- Firefox runtime gate: `npm run test:firefox` temporarily installs an isolated copy into actual Firefox and checks filtering, exceptions, pause expiry, counters, ten languages, support and the local update-help action. The copy's test drivers never enter the upload ZIP. This tests the reported browser version, not every historical/minimum version or every device; mobile remains out of scope.
- Review all listing text/images and submit the matching ZIP in each dashboard. Monitor reviewer feedback. Store approval and review timing are controlled by the stores.
- Once real store URLs exist, add verified listing links to README. Use store-native updates for store users; retain the separate GitHub channel for manual installs.

English remains the initial UI language until explicitly changed. Supported languages: English, Persian, Arabic, Spanish, French, German, Brazilian Portuguese, Simplified Chinese, Japanese and Turkish. Hebrew is not included. Fonts and translations are local; Shabnam serves Persian/Arabic. Private browsing is disabled and must not be advertised as supported. Read [policy preflight](POLICY-REVIEW.md) before uploading.

## Official specifications consulted

- [Chrome listing images](https://developer.chrome.com/docs/webstore/images)
- [Chrome publication](https://developer.chrome.com/docs/webstore/publish/)
- [Edge publication](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension)
- [Firefox submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Firefox listing images](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/)
- [Mozilla source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)

No store submission has been made. Store acceptance, name availability and account eligibility must be resolved in the actual dashboards. [فارسی: راهنمای کوتاه](SUBMISSION.fa.md).
