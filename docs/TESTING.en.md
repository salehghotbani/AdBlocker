# Version 1.0.0 validation report

[فارسی](TESTING.md) | **English**

This report records local execution on October 25, 2026, with Node.js 24.19.0 and Chromium 154.0.8037.57. It does not establish a successful CI run or complete testing across every browser and real website.

| Check | Result |
| --- | --- |
| Dependency installation using the lockfile | Passed: `npm ci` |
| Syntax of 11 JavaScript files and local links in 13 bilingual Markdown documents | Passed: `npm run check` |
| Three browser builds and ZIP packages | Passed: `npm run package` |
| Eight settings and worker unit tests | Passed: `npm test` |
| Four distribution, icon, rule, and ZIP tests | Passed: `npm run test:dist` |
| Content-preservation and Persian popup tests in Chromium | Passed: `npm run test:dom` |
| Firefox validation using web-ext 10.8.0 | Passed: zero errors, warnings, or notices |
| Actual extension installation and network blocking in Chromium | Blocked by managed policy; command ran and exited with code 1 |
| Actual Firefox and Edge execution | Not run; these browsers are not installed in this environment |

## Test scope

Unit tests use mocked browser APIs. The DOM suite runs the actual script and interface in Chromium, but extension messaging is mocked. Distribution tests inspect Manifest V3 configuration, referenced files, source/output consistency, license documentation, PNG structure, network rules, and ZIP integrity.

`test:browser` requires unpacked extension installation to be permitted and fails if the worker cannot start. It does not report a successful run without the extension. Managed environment policies are left unchanged.

The browser reports: `Loading of unpacked extensions is disabled by the administrator`. Actual network blocking is therefore unverified. Alongside successful validation, web-ext reports that its automatic update checker cannot access the user configuration directory; that message belongs to the tool's updater, while extension validation reports zero errors and zero warnings. The npm cache was set to a writable directory for execution; `.npmrc` defines an ignored local cache for subsequent runs.

## Rerunning

Commands are listed in the [contribution guide](../CONTRIBUTING.en.md). After a push, `.github/workflows/ci.yml` is configured to run these checks, including the full Chromium integration test, in GitHub Actions. Its result must be checked separately.
