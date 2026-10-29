# Bundled fonts

No font is fetched at runtime. Font binaries are unmodified official release files.

- Shabnam 5.0.1: [official release](https://github.com/rastikerdar/shabnam-font/releases/tag/v5.0.1); Shabnam.woff2 and Shabnam-Bold.woff2 from dist/. Copyright Saber Rastikerdar; SIL OFL 1.1. The upstream notice also attributes Roboto glyphs/data under Apache 2.0. See LICENSE-Shabnam.txt and LICENSE-Apache-2.0.txt.
- Inter 4.1: [official release](https://github.com/rsms/inter/releases/tag/v4.1); InterVariable.woff2 from docs/font-files/. Copyright The Inter Project Authors; SIL OFL 1.1. See LICENSE-Inter.txt.

Persian and Arabic use Shabnam. Latin-script UI uses Inter. Chinese and Japanese use appropriate installed system CJK fonts, avoiding a large bundled CJK font or a remote font request. Typography is shared by popup and support pages.
