# AdBlocker

**فارسی** | [English](README.en.md)

افزونهٔ مسدودسازی تبلیغات و ردیاب‌ها برای Chrome، Edge و Firefox، با رابط فارسی و بدون جمع‌آوری اطلاعات مرورگر.

## امکانات

- مسدودسازی ۱۴۵ دامنهٔ تبلیغاتی و ردیابی و اسکریپت‌های تبلیغاتی مشخص.
- پنهان‌سازی جایگاه‌های تبلیغ ثابت و پویا، با حفظ فرم‌ها و پخش‌کننده‌ها.
- روشن/خاموش‌کردن، استثنای سایت یا URL، توقف یک‌بارهٔ صفحه و حالت روز/شب.

| حالت روز | حالت شب |
| --- | --- |
| <img src="docs/images/popup-light.png" width="250" alt="حالت روز"> | <img src="docs/images/popup-dark.png" width="250" alt="حالت شب"> |

## نصب

از [آخرین Release](https://github.com/salehghotbani/AdBlocker/releases/latest)، ZIP مرورگر خود را دانلود و استخراج کنید.

| مرورگر | روش نصب |
| --- | --- |
| Chrome 120+ | در `chrome://extensions`، گزینهٔ **Developer mode** و سپس **Load unpacked** را بزنید و پوشهٔ استخراج‌شده را انتخاب کنید. |
| Edge 120+ | همین مراحل را در `edge://extensions` انجام دهید. |
| Firefox 140+ | در `about:debugging#/runtime/this-firefox`، گزینهٔ **Load Temporary Add-on** و سپس `manifest.json` را انتخاب کنید. |

بسته‌ها بدون امضا هستند؛ نصب Firefox موقت است و با بستن مرورگر حذف می‌شود. پس از نصب یا به‌روزرسانی، صفحه‌های باز را دوباره بارگذاری کنید.

همهٔ تبلیغات، به‌ویژه تبلیغات داخل ویدیو، حذف نمی‌شوند. اگر سایتی درست کار نکرد، از استثنای سایت یا صفحه استفاده کنید. [نتایج و محدودیت‌های تست](docs/TESTING.md)

## ساخت از سورس

نیازمندی‌ها: Node.js 20+ و Python 3 برای ZIP.

```sh
npm run build
npm run package
```

خروجی‌ها در `dist/chrome`، `dist/edge` و `dist/firefox` و ZIPها در `dist/` ساخته می‌شوند. [راهنمای توسعه و تست](CONTRIBUTING.md)

## لایسنس

[MIT](LICENSE) — © 2026 Saleh Ghotbani. استفاده، تغییر و بازتوزیع با حفظ اعلان حق مؤلف و متن لایسنس مجاز است؛ نرم‌افزار بدون ضمانت ارائه می‌شود. [ترجمهٔ فارسی](LICENSE.fa.md)

[حریم خصوصی](PRIVACY.md) · [تغییرات](CHANGELOG.md) · [گزارش امنیتی](SECURITY.md)
