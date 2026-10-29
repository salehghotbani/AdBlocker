# AdBlocker

<img src="docs/images/logo.png" width="80" height="80" alt="AdBlocker logo">

**English** | [فارسی](README.fa.md)

A free, open-source ad and tracker blocker for Chrome, Edge and Firefox. The interface starts in English and supports ten selectable languages; primary documentation is English with `.fa.md` Persian guides. Browsing history and page content are not collected.

## Features

- Filters third-party requests to 156 listed hosts, specific ad-script paths and Soft98/W3Schools ad placements.
- Global, site and exact-URL controls, plus a one-time pause. Protection changes reload the current page automatically.
- Light/dark themes and a gray appearance while protection is paused.
- [Ten interface languages](docs/LANGUAGES.md), RTL layouts, bundled Shabnam for Persian/Arabic and Inter for Latin scripts; no remote fonts. Private browsing is not supported.
- Live per-page counters for blocked requests and hidden ad placements, plus the browser's request-count badge. Counts are separate: several requests can belong to one ad. Placement counts cover the main document; unavailable values show a dash. No counter history is saved.
- Store editions delegate updates to the browser, without GitHub checks or update-notification permissions. Manual-install editions retain the optional three-day GitHub update checks.
- Every blocking feature is free. [Voluntary support](SUPPORT.md) never unlocks a feature or buys an advertising exception.

| Light | Dark |
| --- | --- |
| <img src="docs/images/popup-light.png" width="250" alt="English light theme"> | <img src="docs/images/popup-dark.png" width="250" alt="English dark theme"> |

## Install and update

Store submissions are being prepared; no approved store listing is claimed. [Submission guide, English/Persian descriptions and images](store/SUBMISSION.md). Build the three upload ZIPs with `npm run package:stores`; assemble the source, images and documentation with `npm run store:kit`. Store editions and manual-install packages have separate update channels.

Download and extract your browser's ZIP from the [latest release](https://github.com/salehghotbani/AdBlocker/releases/latest).

| Browser | Installation |
| --- | --- |
| Chrome / Edge 120+ | Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, then select the extracted folder. |
| Firefox 140+ | Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select `manifest.json`. |

To update, replace **all files**, including `manifest.json`, in the installed folder and **reload the extension itself**, then reload open pages. Packages are unsigned; Firefox installation is temporary and ends when the browser closes. SHA-256 checksums accompany each release.

## Measured coverage

The [Turtlecute test](https://adblock.turtlecute.org/) reported **100% (132/132)** in Edge on 2026-10-28: 128/128 host checks, 2/2 cosmetic checks and 2/2 ad-script checks. Browser events confirmed **129 blocked requests**, and both cosmetic checks passed. One additional host timed out and was counted by the site; it was not blocked by the extension.

This is one recorded benchmark, not a universal blocking rate. Some video ads and cross-site integrations may need site-specific handling; use site or URL exceptions when needed. [Test results and CI](docs/TESTING.md).

The [live audit of 21 popular domains](docs/SITE-COMPATIBILITY.md) records partial coverage and unknown results explicitly. Direct banners remain on sites such as Varzesh3 and Zoomit; YouTube in-stream ad removal is unverified. Version 1.6.1 fixes the observed Soft98 content-replacement warning while retaining article/download controls.

## Build

Requires Node.js 20+ and Python 3. Run `npm run build` or `npm run package`; browser folders and ZIPs are generated in `dist/`. See [Contributing](CONTRIBUTING.md).

## License

[MIT](LICENSE) — © 2026 Saleh Ghotbani. Use, modification and redistribution are permitted with the copyright and license notice retained. Bundled fonts retain their [own licenses](extension/fonts/README.md). Provided without warranty.

[Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md) · [Security reporting](SECURITY.md) · [Security review](docs/SECURITY-REVIEW.md)
