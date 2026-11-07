# Project website

Run `node scripts/build-site.mjs` from the repository root to generate static HTML in `dist/pages/`. The build needs Node.js 20+ and does not install dependencies or fetch anything. The deploy workflow uploads only that directory to GitHub Pages from `main`.

Edit English and Persian copy in `content.mjs` and shared styles in `style.css`. The popup image is a cropped project screenshot with sample counters. The social card uses the project's shield artwork. The build bundles Inter and Shabnam with their license files.

The sitemap lives at `/AdBlocker/sitemap.xml` and can be submitted with a verified Search Console property. The site is hosted under a project path, so it does not control `robots.txt` for the `salehghotbani.github.io` host.
