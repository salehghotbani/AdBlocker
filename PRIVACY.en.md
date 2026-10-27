# Privacy policy

[فارسی](PRIVACY.md) | **English**

This policy describes version 1.3.0 of the AdBlocker extension.

- The extension does not collect or transmit browsing history, page text, sign-in details, or form contents. Visited URLs are not automatically stored; only URLs explicitly selected as permanent exceptions are saved.
- The enabled/disabled setting, light/dark theme preference, excluded site names, and user-selected URLs including paths and query strings are saved in that browser's `storage.local`. These settings are not synchronized to the cloud. Selected URLs may contain sensitive parameters.
- For a one-time pause, the tab ID and URL are temporarily held in `storage.session`. The next reload after the automatic reload, navigation to another page, tab closure, or browser shutdown clears the pause. Worker suspension and restart alone do not clear it.
- The active tab's hostname is read for display in the popup and is not sent to a server.
- A local content script examines elements with specific advertising markers to hide those elements. Processing takes place inside the browser; page content is not collected.
- Local network rules are applied through the browser API. The filter list is not downloaded from an external server, and no remote executable code is loaded.
- The extension contains no analytics, telemetry, or advertising SDK. Playwright is a development test tool and is not included in installation packages.
- Messages sent to content scripts contain only that tab's effective protection state, not the saved site or URL exceptions. Chromium also restricts direct content-script access to `storage.local`.
- Protection changes automatically reload the current page. The tab's URL is checked first so a different page is not reloaded.

## Update checks

The button and three-day browser alarm contact only `https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest`. The first automatic check is scheduled about one minute after startup; closed browsers or sleeping devices may delay checks until the browser opens or the device wakes. GitHub sees the IP address and normal connection headers, as any Internet service does. Requests omit cookies and credentials and contain no browsing history, current site, exceptions, or installed version. Version comparison happens locally.

The last attempt/success times, latest version tag, error state, and last notified version are stored in `storage.local`. A notification is created once per newer version; visibility depends on browser and operating-system notification settings. Failed checks are not reported as up-to-date. Download links are constructed from a validated version tag and this repository's fixed release URL. No remote code, filter list, or installation file is automatically downloaded or executed.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Keep settings, exceptions, and update status locally, and temporary pauses in session memory |
| `declarativeNetRequest` | Apply blocking and exception rules through the browser |
| `activeTab` | Read the current site's hostname when the popup is opened |
| `webNavigation` | Detect page changes and expire one-time pauses without keeping browsing history |
| `alarms` | Check for updates every three days and restore scheduling |
| `notifications` | Notify about new versions and open a release after the user clicks |
| HTTP/HTTPS page access | Run cosmetic filtering and network rules on websites |

## Deleting data

“Clear site exceptions” deletes saved site names; “Clear URL exceptions” deletes saved URL exceptions. The resume control ends a temporary pause. Uninstalling the extension also removes its local settings. There is no backend or account where data could remain.

## Reporting an issue

Use repository Issues for general problems. Do not include private site names, browsing history, screenshots containing personal information, or sign-in details in public reports. For vulnerabilities, see [security reporting](SECURITY.en.md).
