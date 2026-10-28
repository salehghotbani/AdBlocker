# AdBlocker

<img src="docs/images/logo.png" width="80" height="80" alt="AdBlocker logo">

**English** | [فارسی](README.fa.md)

An ad and tracker blocker for Chrome, Edge and Firefox. The interface and primary documentation are in English; Persian guides are available in `.fa.md` files. Browsing history and page content are not collected.

## Features

- Filters third-party requests to 156 listed hosts, specific ad-script paths and Soft98 banner placements.
- Global, site and exact-URL controls, plus a one-time pause. Protection changes reload the current page automatically.
- Light/dark themes and a gray appearance while protection is paused.
- Manual update checks and automatic checks every three days, with a notification and release link. No automatic installation; manual checks remain usable if optional APIs are unavailable.

| Light | Dark |
| --- | --- |
| <img src="docs/images/popup-light.png" width="250" alt="English light theme"> | <img src="docs/images/popup-dark.png" width="250" alt="English dark theme"> |

## Install and update

Download and extract your browser's ZIP from the [latest release](https://github.com/salehghotbani/AdBlocker/releases/latest).

| Browser | Installation |
| --- | --- |
| Chrome / Edge 120+ | Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, then select the extracted folder. |
| Firefox 140+ | Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select `manifest.json`. |

To update, replace **all files**, including `manifest.json`, in the installed folder and **reload the extension itself**, then reload open pages. Packages are unsigned; Firefox installation is temporary and ends when the browser closes. SHA-256 checksums accompany each release.

## Measured coverage

The [Turtlecute test](https://adblock.turtlecute.org/) reported **100% (132/132)** in Edge on 2026-10-28: 128/128 host checks, 2/2 cosmetic checks and 2/2 ad-script checks. Browser events confirmed **129 blocked requests**, and both cosmetic checks passed. One additional host timed out and was counted by the site; it was not blocked by the extension.

This is one recorded benchmark, not a universal blocking rate. Some video ads and cross-site integrations may need site-specific handling; use site or URL exceptions when needed. [Test results and CI](docs/TESTING.md).

## Build

Requires Node.js 20+ and Python 3. Run `npm run build` or `npm run package`; browser folders and ZIPs are generated in `dist/`. See [Contributing](CONTRIBUTING.md).

## License

[MIT](LICENSE) — © 2026 Saleh Ghotbani. Use, modification and redistribution are permitted with the copyright and license notice retained. Provided without warranty.

[Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md) · [Security reporting](SECURITY.md) · [Security review](docs/SECURITY-REVIEW.md)
