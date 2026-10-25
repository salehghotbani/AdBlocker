# AdBlocker

[فارسی](README.md) | **English**

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Manifest V3](https://img.shields.io/badge/manifest-V3-blue)

A Manifest V3 extension for Chrome, Edge, and Firefox with a Persian interface. No backend, tracking, browsing-history collection, or transmission of browsing data.

## Interface preview

<p align="center"><img src="docs/images/popup.png" width="350" alt="Persian AdBlocker popup with global toggle, site exception and reload controls"></p>

This screenshot shows the actual interface rendered in a browser test with a sample site and mocked extension messaging. It does not establish that the extension was successfully installed.

## Features and limitations

- Blocks third-party requests to 60 advertising and related tracking domains using the browser's native `declarativeNetRequest` API, including selected Iranian ad-serving hosts.
- Hides specific Google Ads placements, including matching elements inserted after page load.
- Preserves `main`, `article`, main headings, forms, media players, and containers that contain these elements. Does not indiscriminately remove `.banner`, `.sponsored`, or elements containing the word “advertisement.”
- Provides a global toggle, site exceptions covering subdomains, exception reset, and settings stored on the current device.
- Restores previous element styles when disabled. Reload the page to recover resources whose network requests were already blocked.

**Removing every ad while preserving all main content on every site cannot be guaranteed.** This version is intentionally conservative. First-party ads, ads embedded in video streams (including some YouTube ads), native advertising, and providers outside the list may remain visible. Sites with ad-block detection may need an exception. The domain list is maintained locally and is not automatically downloaded. This project is not a complete implementation of EasyList or uBlock Origin.

## Build

Requires Node.js 20 or later. The extension itself and its build step have no runtime dependencies:

```sh
git clone https://github.com/salehghotbani/AdBlocker.git
cd AdBlocker
npm run build
```

Outputs are generated in `dist/chrome`, `dist/edge`, and `dist/firefox`. To create ZIP packages using Python 3:

```sh
npm run package
```

The `dist/adblocker-*-1.0.0.zip` files are unsigned packages.

## Local installation

### Chrome / Edge (120 or later)

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `dist/chrome` or `dist/edge`.
4. Pin the extension to the toolbar and reload existing tabs.

### Desktop Firefox (140 or later)

1. Open `about:debugging#/runtime/this-firefox`.
2. Select **Load Temporary Add-on**.
3. Open `dist/firefox/manifest.json`.

Temporary installations disappear when Firefox closes. Permanent installation requires Mozilla signing. Publishing to the three browser stores is a separate task and has not been performed. The manifest declares Android 142 as the minimum Android version, but Android has not been tested.

## Tests

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run package
npm test
npm run test:dist
npm run test:dom
npm run test:browser
```

- `npm test`: eight tests for settings, worker state restoration, exception rules, command serialization, and rejection of unauthorized changes. Browser APIs are mocked.
- `test:dist`: four tests covering generated manifests, file references, source copies, licensing, PNG icons, blocking rules, and ZIP integrity.
- `test:dom`: runs actual Chromium with mocked extension messaging. Checks article, form, video, and safe iframe preservation, dynamic ad hiding, style restoration, and interaction with the Persian popup. Does not test network blocking.
- `test:browser`: installs the extension and requires real blocking of an ad request, followed by allowance when the site is excluded or the extension is disabled. External fixture responses are provided locally; no advertising site is contacted. Requires a browser that permits unpacked extensions.

The default browser path is `/usr/bin/chromium`. On other systems, set `CHROMIUM_PATH` to a Chrome/Chromium executable. Playwright is only a development and test dependency and is not included in the extension.

Execution results and limitations are recorded in the [test report](docs/TESTING.en.md). After a push, CI is configured to build, run unit and DOM tests, install the actual extension in Chromium, and validate Firefox output. Check the result of the particular CI run; these instructions do not establish that CI has passed.

To validate Firefox output:

```sh
npm run lint:firefox
```

## Permissions and privacy

HTTP/HTTPS access is needed to apply rules and find ad placements on pages. `storage` holds local settings only; `activeTab` is used to display the current site after a user click. Browsing history is not collected. There is no analytics service, API key, backend, or remote code. Settings-change messages are accepted only from the extension's own pages.

## Rule development

The domain list is in `extension/ad-domains.json`; conservative cosmetic rules are in `extension/content.js`. Rebuild after changes and click Reload in the browser's extension manager. Before adding a domain, verify that it does not serve essential content, sign-in, or video. Main-frame navigation is intentionally never blocked, and listed domains are blocked only when used as third parties. Exceptions have higher priority than blocking rules.

## Documentation and license

- [Privacy policy](PRIVACY.en.md)
- [Contributing](CONTRIBUTING.en.md)
- [Security reporting](SECURITY.en.md)
- [Changelog](CHANGELOG.en.md)
- [Test report](docs/TESTING.en.md)

This project is available under the [MIT License](LICENSE). You may use, modify, and redistribute it while retaining the copyright and license notice. No warranty is provided for ad coverage or compatibility with every site. Playwright is an Apache-2.0 development tool and is not included in the extension package. Icons and rules are generated or maintained locally; no third-party filter list is redistributed in the package.

A [Persian license translation](LICENSE.fa.md) is available for reference; the English `LICENSE` file is authoritative.
