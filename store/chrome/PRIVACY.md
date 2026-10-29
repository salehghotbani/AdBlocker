# AdBlocker privacy policy — Google Chrome

AdBlocker store editions (version 1.7.1) are free and have no account, subscription, analytics or embedded payment processor.

- Advertising markers are examined locally to hide ad placements. Browser network rules block listed requests locally. Browsing history, page text, form contents and sign-in information are not collected or transmitted by the extension.
- Global protection, language/theme preferences, selected site exceptions and explicitly saved exact-URL exceptions are kept in browser-local storage. Selected URLs can contain sensitive query parameters. One-time pauses temporarily store a tab ID and URL in session memory and expire on reload/navigation, tab closure or browser shutdown. Private/incognito browsing is disabled in the manifest and is not supported.
- Translations and font files are bundled, including Shabnam for Persian/Arabic and Inter for Latin scripts. No translation or font service is contacted.
- Page counters are local, per-page measurements, not a browsing history. The browser's native request count and filtered main-document placement count are not saved or sent to a server.
- The active page's URL and hostname are used locally for controls and to avoid reloading a different page. Content scripts receive only effective protection state, not saved exception lists.
- Updates are delivered by the browser's extension store. Store builds make no GitHub release requests, schedule no update alarm, show no update notifications and download no executable code or filter lists. Extension pages enforce `connect-src 'none'`.
- Clicking Support opens a bundled page. If financial support is configured, it displays reviewed public receiving addresses and/or an external HTTPS support link. Nothing is sent automatically. Copying an address writes it to the clipboard only after a click; clipboard contents are never read. No wallet is connected, no signature or transaction is requested, no payment is detected and no amount/address history is recorded. Public blockchain transactions may be visible to others. An external support provider or blockchain service has its own privacy practices.
- Issue and source links open GitHub only when clicked. Those sites see normal connection information, such as the IP address, according to their own policies.

- On supported YouTube pages, an isolated script examines native ad UI and temporary media state locally to conceal/mute ads, use Skip and restore playback settings. Media identity is kept only in memory and is not logged or transmitted by the extension. YouTube itself can observe DOM/media changes.

## Permissions

`storage` keeps settings and temporary pauses. `declarativeNetRequest` applies browser rules. `activeTab` supports current-page controls and native counters. `webNavigation` expires temporary pauses without retaining history. HTTP/HTTPS page access enables cosmetic filtering across websites. Store editions request neither `alarms`, `notifications`, `webRequest`, debug feedback, wallet access nor clipboard-read permissions.

## Data removal and contact

Clear site/URL exceptions in the popup to delete them, or uninstall to remove browser-local settings. Resume protection to end a one-time pause. There is no extension backend or payment account. For support use [repository Issues](https://github.com/salehghotbani/AdBlocker/issues); report security findings privately through the repository's Security tab when available. Never post private URLs, credentials or wallet recovery phrases.
