# Interface languages and typography

English remains the initial interface language, regardless of the browser's locale. Use the Language selector in the popup or support page to choose another language. The choice is saved locally; an invalid preference falls back to English. A failed save restores the previous selection.

| Language | Code | Direction | Font |
| --- | --- | --- | --- |
| English | en | LTR | Bundled Inter |
| Persian | fa | RTL | Bundled Shabnam |
| Arabic | ar | RTL | Bundled Shabnam |
| Spanish | es | LTR | Bundled Inter |
| French | fr | LTR | Bundled Inter |
| German | de | LTR | Bundled Inter |
| Brazilian Portuguese | pt-BR | LTR | Bundled Inter |
| Simplified Chinese | zh-CN | LTR | Installed system CJK fonts |
| Japanese | ja | LTR | Installed system CJK fonts |
| Turkish | tr | LTR | Bundled Inter |

Hebrew is not included. Static labels, accessible names, dynamic states, counters/dates, support information and Firefox's local update help are localized. Currency symbols, network identifiers, product names and URLs remain unchanged. The manifest's localized metadata follows browser conventions; this does not override the popup's explicit English default.

Translations are maintained in [localization/translations.json](../localization/translations.json). Run `npm run locales` after editing. It validates complete coverage and matching substitutions, generates readable `extension/locale-data.js`, native manifest messages and ten localized descriptions per store. `npm run check:locales` rejects stale generated outputs. All translation text is rendered as text, not HTML or executable code.

[Bundled font provenance and licenses](../extension/fonts/README.md). Unmodified Shabnam 5.0.1 and Inter 4.1 files are included in upload/source archives. No font or translation service is contacted. Chinese and Japanese use installed CJK fonts to avoid remote downloads or large unnecessary binaries.

DOM tests check all ten languages, direction, layout overflow, native Shabnam loading, persistence and failed-save recovery. The actual Firefox temporary-install test also exercises these in the real extension popup. Listing images are English-only and contain no locale-specific or site-specific advertising claim.
