# Project website

Run `node scripts/build-site.mjs` from the repository root to generate static HTML in `dist/pages/`. The build needs Node.js 20+ and does not install dependencies or fetch anything. The deploy workflow uploads only that directory to GitHub Pages from `main`.

Edit English and Persian copy in `content.mjs` and shared styles in `style.css`. The popup image is a cropped project screenshot with sample counters. The social card uses the project's shield artwork.

The site uses the device's font for Latin text and bundles smaller versions of Shabnam for Persian. To regenerate the website fonts, install `fonttools[woff]` and run this command for both `Shabnam` and `Shabnam-Bold`, replacing `<variant>` each time. The website build copies the subsets and their licenses without requiring Python.

```text
python -m fontTools.subset extension/fonts/<variant>.woff2 --unicodes=U+0600-06FF,U+0750-077F,U+08A0-08FF,U+200C-200D,U+FB50-FDFF,U+FE70-FEFF --layout-features=* --name-IDs=* --flavor=woff2 --output-file=website/assets/<variant>.web.woff2
```

The GitHub Pages custom domain is `adblocker.ghotbani.ir`. Its DNS-only CNAME points to `salehghotbani.github.io`. The production sitemap is at [sitemap.xml](https://adblocker.ghotbani.ir/sitemap.xml) and is advertised in [robots.txt](https://adblocker.ghotbani.ir/robots.txt).
