# Contributing

[فارسی](CONTRIBUTING.md) | **English**

Create a branch in the existing checkout for your changes. Each cloud task already has an isolated environment; creating another Git worktree is unnecessary.

## Setup

Requires Node.js 20 or later, Python 3 for ZIP packaging, and a Chromium browser that permits the required tests.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run package
npm test
npm run test:dist
npm run test:dom
npm run test:browser
npm run lint:firefox
```

Set `CHROMIUM_PATH` if your browser is installed elsewhere. Full integration testing requires permission to install unpacked extensions. Report failures and environment limitations; do not remove tests or alter managed browser policies. CI prepares a Chromium test browser in GitHub Actions.

## New rules

Include the exact advertising domain, your rationale, and a reproducible public example in your proposed change. Do not submit cookies, tokens, private URLs, or personal data. Do not block a general-purpose service, shared CDN, or primary video host without investigating its role.

For cosmetic rules, check that articles, sign-in forms, video, safe iframes, and mobile layouts remain usable. Avoid broad selectors such as `[class*="ad"]` and removing elements based only on their text. Disabling the extension must restore the previous element style.

## Documentation and generated output

`dist/`, `node_modules/`, and test outputs are generated and are not committed. The documentation screenshot is stored in `docs/images/popup.png`. To update it, run `npm run test:dom` and copy `artifacts/popup.png`; the screenshot uses test data.

Document feature, limitation, and privacy changes in README, CHANGELOG, and PRIVACY where relevant. Keep the Persian and English versions synchronized and link each version to its counterpart. Submitted contributions are licensed under the project's MIT License.
