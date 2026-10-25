# Privacy policy

[فارسی](PRIVACY.md) | **English**

This policy describes version 1.0.0 of the AdBlocker extension.

- The extension does not store or transmit browsing history, visited page URLs, page text, sign-in details, or form contents.
- Only the enabled/disabled setting and the site names you explicitly exclude are saved in that browser's `storage.local`. These settings are not synchronized to the cloud.
- The active tab's hostname is read for display in the popup and is not sent to a server.
- A local content script examines elements with specific advertising markers to hide those elements. Processing takes place inside the browser; page content is not collected.
- Local network rules are applied through the browser API. The filter list is not downloaded from an external server, and no remote executable code is loaded.
- The extension contains no analytics, telemetry, or advertising SDK. Playwright is a development test tool and is not included in installation packages.

## Permissions

| Permission | Purpose |
| --- | --- |
| `storage` | Store local settings |
| `declarativeNetRequest` | Apply blocking and exception rules through the browser |
| `activeTab` | Read the current site's hostname when the popup is opened |
| HTTP/HTTPS page access | Run cosmetic filtering and network rules on websites |

## Deleting data

The “Clear site exceptions” control deletes the saved site-name list. Uninstalling the extension also removes its local settings. There is no backend or account where data could remain.

## Reporting an issue

Use repository Issues for general problems. Do not include private site names, browsing history, screenshots containing personal information, or sign-in details in public reports. For vulnerabilities, see [security reporting](SECURITY.en.md).
