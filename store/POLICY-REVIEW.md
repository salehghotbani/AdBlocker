# Store preflight — 2026-10-29

This records engineering checks against the official documents below. It is not store certification or a guarantee of approval. Publisher registration and final reviewer decisions remain outside the package tests.

| Official guidance | Implemented check |
| --- | --- |
| [Edge product accuracy/localization, 1.1 and 1.7](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | One blocking purpose; no invented ratings or global percentage; English artwork with no site claim; ten complete UI translations and browser-specific localized listing text. |
| [Edge privacy/permissions, 1.5 and 1.6](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | Edge-specific privacy URL; only required permissions; no telemetry; language/theme stay local. |
| [Edge financial disclosure, 1.8](https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies) | All features free; voluntary creator support disclosed; no wallet, mining, billing, signature or transaction functionality; vendor is not a sponsor. No receiving destination is invented. |
| [Mozilla development/source guidelines](https://extensionworkshop.com/documentation/publish/add-on-policies/) | Bundled readable code, auditable generator inputs, reviewer source ZIP and build instructions; bundled licensed fonts; no remote execution. |
| [Mozilla data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/) | Store build transmits no collected data; required consent category is `none`; desktop minimum 140 and Android compatibility metadata minimum 142. No Android listing claimed. |
| [Mozilla private-browsing/data rules](https://extensionworkshop.com/documentation/publish/add-on-policies/) | Private browsing is disabled with `incognito: not_allowed`, so exception URLs are not saved from private sessions. |
| [Firefox update controls](https://support.mozilla.org/en-US/kb/how-update-add-ons) | Real Firefox testing found direct `about:addons` creation blocked. The update action now opens a bundled, translated help page; it never reports a fictitious version check. |
| [Listing image guidance](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/) | Correct-size images; actual runtime capture for Firefox; controlled English demonstration content with no third-party advertising artwork. |

Actual Firefox temporary-install tests cover the production popup and filtering code with test-only drivers in an isolated copy. Drivers are excluded from every upload ZIP. They exercise native APIs, all languages, RTL/Shabnam, themes, counters, exceptions, pause expiry, support and update help. Edge-targeted builds are exercised in actual isolated Edge profiles; CI also runs Chromium integration.

Font files are unmodified official Shabnam 5.0.1 and Inter 4.1 releases with their license notices. No runtime font or translation request is made.

Mozilla currently announces policy changes effective **December 1, 2026**. Recheck the official policy before a submission on or after that date. No approval or signing has been obtained by preparing this kit.
