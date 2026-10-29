# Store preflight — 2026-10-29

This records engineering checks against the official documents below. It is not store certification or a guarantee of approval. Publisher registration and final reviewer decisions remain outside the package tests.

| Official guidance | Implemented check |
| --- | --- |
| [Chrome account setup](https://developer.chrome.com/docs/webstore/set-up-account) | Approved publisher is `saleh ghotbani`, GitHub-only public support, no public email. Chrome publication is deferred by the owner. Its documented contact-email requirement is reference information for any future owner-authorized submission. No account is registered by this kit. |
| [Chrome privacy and single-purpose policies](https://developer.chrome.com/docs/webstore/program-policies/policies) | Copy/paste purpose and permission reasons, bundled-only execution and local data disclosures in each browser's DASHBOARD.json; Chrome policy includes the Limited Use statement. |
| [Edge listing fields](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension) | All ten full descriptions are 250–10,000 characters; Chinese was expanded to meet the minimum. 300px logo, five 1280×800 English images and both promo sizes supplied. Public support uses a URL rather than an email. |
| [Edge product accuracy/localization, 1.1 and 1.7](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | One blocking purpose; no invented ratings or global percentage; English artwork with no site claim; ten complete UI translations and browser-specific localized listing text. |
| [Edge privacy/permissions, 1.5 and 1.6](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | Edge-specific privacy URL; only required permissions; no telemetry; language/theme stay local. |
| [Edge financial disclosure, 1.8](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | All features free; voluntary creator support disclosed; no wallet, mining, billing, signature or transaction functionality; vendor is not a sponsor. No receiving destination is invented. |
| [Mozilla development/source guidelines](https://extensionworkshop.com/documentation/publish/add-on-policies/) | Bundled readable code, auditable generator inputs, reviewer source ZIP and build instructions; bundled licensed fonts; no remote execution. |
| [Mozilla data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) | Store build transmits no collected data; required consent category is `none`; desktop minimum 140 and Android compatibility metadata minimum 142. No Android listing claimed. |
| [Mozilla private-browsing/data rules](https://extensionworkshop.com/documentation/publish/add-on-policies/) | Private browsing is disabled with `incognito: not_allowed`, so exception URLs are not saved from private sessions. |
| [Firefox update controls](https://support.mozilla.org/en-US/kb/how-update-add-ons) | Real Firefox testing found direct `about:addons` creation blocked. The update action now opens a bundled, translated help page; it never reports a fictitious version check. |
| [Listing image guidance](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/) | Correct-size images; actual runtime capture for Firefox; controlled English demonstration content with no third-party advertising artwork. |
| [Mozilla custom-generator/source requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/) | Reviewer ZIP has README-REVIEWER.md, all generator inputs and local fonts/licenses. A test extracts it without node_modules and rebuilds all three store folders offline; every file is compared with the upload ZIP. |

Actual Firefox temporary-install tests cover the production popup and filtering code with test-only drivers in an isolated copy. Drivers are excluded from every upload ZIP. They exercise native APIs, all languages, RTL/Shabnam, themes, counters, exceptions, pause expiry, support and update help. Edge-targeted builds are exercised in actual isolated Edge profiles; CI also runs Chromium integration.

Font files are unmodified official Shabnam 5.0.1 and Inter 4.1 releases with their license notices. No runtime font or translation request is made.

Mozilla currently announces policy changes effective **December 1, 2026**. Recheck the official policy before a submission on or after that date. No approval or signing has been obtained by preparing this kit.

Engineering checks passed locally for version 1.7.1: 38 unit tests, four manual-distribution checks, six store checks, actual store-edition runtime tests and actual Firefox, both Firefox lints with zero notices/warnings/errors, and the offline reviewer rebuild. CI reruns these gates. Earlier Chromium exact-URL fixtures have shown intermittent early-request failures; a retry is not evidence that this concern is eliminated. Production filtering logic is unchanged by this publication-preparation update. [Full validation](../docs/TESTING.md).

Before publishing, the owner must complete account verification and any applicable account identity/trader fields for the active Edge/Firefox targets. Support destinations are not payment destinations: current financial support configuration is empty. Do not claim a store approval, verified publisher status or an active donation method.
