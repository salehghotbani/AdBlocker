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

When changing page pauses, check expiry on the next reload, ordinary and SPA navigation, tab closure, and worker restoration. URL exceptions must not cover another path or query, and a paused tab must not affect another tab. Use synthetic test URLs without sensitive data.

`dist/`, `node_modules/`, and test outputs are generated and are not committed. Documentation screenshots are stored in `docs/images/popup.png`, `docs/images/popup-light.png`, and `docs/images/popup-dark.png`. To update them, run `npm run test:dom` and copy the three matching files from `artifacts/`; screenshots use test data. Check interface changes in both themes, with keyboard navigation and a saved preference.

Document feature, limitation, and privacy changes in README, CHANGELOG, and PRIVACY where relevant. Keep the Persian and English versions synchronized and link each version to its counterpart. Submitted contributions are licensed under the project's MIT License.
