# Privacy policy

**English** | [فارسی](PRIVACY.fa.md)

This policy describes version 1.7.1 of the manual-install AdBlocker extension. Store editions have a separate [store privacy policy](store/PRIVACY.md).

- The extension does not collect or transmit browsing history, page text, sign-in details, or form contents. Visited URLs are not automatically stored; only URLs explicitly selected as permanent exceptions are saved.
- The enabled/disabled setting, interface language, light/dark theme preference, excluded site names, and user-selected URLs including paths and query strings are saved in that browser's `storage.local`. These settings are not synchronized to the cloud. Selected URLs may contain sensitive parameters. Private browsing is disabled in the manifest and is not supported.
- Translation dictionaries and licensed fonts are bundled locally; no font or translation service is contacted.
- For a one-time pause, the tab ID and URL are temporarily held in `storage.session`. The next reload after the automatic reload, navigation to another page, tab closure, or browser shutdown clears the pause. Worker suspension and restart alone do not clear it.
- The active tab's hostname is read for display in the popup and is not sent to a server.
- A local content script examines elements with specific advertising markers to hide those elements. Processing takes place inside the browser; page content is not collected.
- Local network rules are applied through the browser API. The filter list is not downloaded from an external server, and no remote executable code is loaded.
- The extension contains no analytics, telemetry, or advertising SDK. Playwright is a development test tool and is not included in installation packages.
- Messages sent to content scripts contain only that tab's effective protection state, not the saved site or URL exceptions. Chromium also restricts direct content-script access to `storage.local`.
- Protection changes automatically reload the current page. The tab's URL is checked first so a different page is not reloaded.
- The popup reads the browser's native per-tab request count and counts currently filtered main-document ad placements locally. Nested placements count once. These are separate per-page measurements, not a unique-ad total or a lifetime history. Counts, document tokens and request URLs are not saved or transmitted. Missing native counts are shown as unavailable.

- On supported YouTube pages, an isolated script examines native ad UI and temporary media state locally to conceal/mute ads, use Skip and restore playback settings. Media identity is kept only in memory and is not logged or transmitted by the extension. YouTube itself can observe DOM/media changes.

## Update checks

If the browser does not expose scheduling or notification APIs, protection and manual checks remain available. The popup reports the limitation; the extension does not request extra permissions or substitute a background timer.

The button and three-day browser alarm contact only `https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest`. The first automatic check is scheduled about one minute after startup; closed browsers or sleeping devices may delay checks until the browser opens or the device wakes. GitHub sees the IP address and normal connection headers, as any Internet service does. Requests omit cookies and credentials and contain no browsing history, current site, exceptions, or installed version. Version comparison happens locally.

The last attempt/success times, latest version tag, error state, and last notified version are stored in `storage.local`. A notification is created once per newer version; visibility depends on browser and operating-system notification settings. Failed checks are not reported as up-to-date. Download links are constructed from a validated version tag and this repository's fixed release URL. No remote code, filter list, or installation file is automatically downloaded or executed.

## Voluntary support

Every blocking feature remains free. The Support link opens a bundled local page; financial controls appear only when the creator's real public receiving details are configured. A displayed address can be copied after an explicit click, with manual-copy fallback. Clipboard contents are never read. The extension does not connect a wallet, request signatures, send or detect payments, or record amounts. Public blockchain transactions can be visible to others; clicked external support links have their own provider policies. No payment SDK or tracking pixel is embedded.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Keep settings, exceptions, and update status locally, and temporary pauses in session memory |
| `declarativeNetRequest` | Apply blocking and exception rules through the browser |
| `activeTab` | Read the current site's hostname and native request-count badge when the popup is opened from the toolbar |
| `webNavigation` | Detect page changes and expire one-time pauses without keeping browsing history |
| `alarms` | Check for updates every three days and restore scheduling |
| `notifications` | Notify about new versions and open a release after the user clicks |
| HTTP/HTTPS page access | Run cosmetic filtering and network rules on websites |

## Deleting data

“Clear site exceptions” deletes saved site names; “Clear URL exceptions” deletes saved URL exceptions. The resume control ends a temporary pause. Uninstalling the extension also removes its local settings. There is no backend or account where data could remain.

## Reporting an issue

Use repository Issues for general problems. Do not include private site names, browsing history, screenshots containing personal information, or sign-in details in public reports. For vulnerabilities, see [security reporting](SECURITY.md).
