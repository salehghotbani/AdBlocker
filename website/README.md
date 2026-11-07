# Project website

Run `node scripts/build-site.mjs` from the repository root to generate static HTML in `dist/pages/`. The build needs Node.js 20+ and does not install dependencies or fetch anything. The deploy workflow uploads only that directory to GitHub Pages from `main`.

Edit English and Persian copy in `content.mjs` and shared styles in `style.css`. The popup image is a cropped project screenshot with sample counters. The social card uses the project's shield artwork. The build bundles Inter and Shabnam with their license files.

The GitHub Pages custom domain is `adblocker.ghotbani.ir`. Its DNS-only CNAME points to `salehghotbani.github.io`. The production sitemap is at [sitemap.xml](https://adblocker.ghotbani.ir/sitemap.xml) and is advertised in [robots.txt](https://adblocker.ghotbani.ir/robots.txt).
