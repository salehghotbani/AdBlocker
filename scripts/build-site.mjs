import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { copy } from '../website/content.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('dist/pages/', root);
const repo = 'https://github.com/salehghotbani/AdBlocker';
const site = 'https://adblocker.ghotbani.ir/';
const basePath = new URL(site).pathname;
const locales = ['en', 'fa'];
const url = lang => `${site}${lang === 'en' ? '' : 'fa/'}`;
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const paths = {
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4"/>',
  github: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 4l-4 16"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
  filter: '<path d="M3 5h18l-7 8v5l-4 2v-7z"/>',
  sliders: '<path d="M4 7h8m4 0h4M4 17h4m4 0h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  bars: '<path d="M4 4v16h16M8 16v-4m5 4V8m5 8V5"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 5v2"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M7 6.5h.1m3 0h.1"/>',
};
const icon = name => `<svg class="${name}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
const button = (href, label, glyph, primary = false) => `<a class="button ${primary ? 'primary' : 'secondary'}" href="${href}">${icon(glyph)}${escape(label)}</a>`;
const report = (href, label) => `<a class="text-link" href="${href}">${escape(label)}${icon('arrow')}</a>`;
const doc = (file, lang, prefix = '') => `${repo}/blob/main/${prefix}${file}${lang === 'fa' ? '.fa' : ''}.md`;
const csp = "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; base-uri 'none'; form-action 'none'";

function render(lang) {
  const t = copy[lang];
  const fa = lang === 'fa';
  const other = fa ? 'en' : 'fa';
  const assets = `${fa ? '../' : ''}assets/`;
  const canonical = url(lang);
  const socialImage = `${site}assets/share.jpg`;
  const socialAlt = 'AdBlocker shield logo and the words More room for real content';
  const metadata = {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'AdBlocker',
    url: canonical, inLanguage: lang, description: t.description, applicationCategory: 'BrowserApplication',
    softwareRequirements: 'Desktop Chrome 120+, Microsoft Edge 120+, or Firefox 140+',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Saleh Ghotbani', url: 'https://github.com/salehghotbani' },
    license: `${repo}/blob/main/LICENSE`, downloadUrl: `${repo}/releases/latest`, image: socialImage,
  };
  return `<!doctype html>
<html lang="${lang}" dir="${fa ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${escape(csp)}">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="theme-color" content="#101817">
  <title>${escape(t.title)}</title>
  <meta name="description" content="${escape(t.description)}">
  <link rel="canonical" href="${canonical}">
${[...locales, 'x-default'].map(item => `  <link rel="alternate" hreflang="${item}" href="${url(item === 'x-default' ? 'en' : item)}">`).join('\n')}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="AdBlocker">
  <meta property="og:locale" content="${fa ? 'fa_IR' : 'en_US'}">
  <meta property="og:locale:alternate" content="${fa ? 'en_US' : 'fa_IR'}">
  <meta property="og:title" content="${escape(t.title)}">
  <meta property="og:description" content="${escape(t.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${socialImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${socialAlt}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${assets}logo.png" type="image/png">
  <link rel="stylesheet" href="${assets}style.css">
  <script type="application/ld+json">${JSON.stringify(metadata).replaceAll('<', '\\u003c')}</script>
</head>
<body>
  <a class="skip" href="#main">${escape(t.skip)}</a>
  <header class="site-head">
    <div class="wrap head-inner">
      <a class="brand" href="./"><img src="${assets}logo.png" width="128" height="128" alt="">AdBlocker</a>
      <nav class="nav" aria-label="${escape(t.navLabel)}">
${t.nav.map((label, i) => `        <a href="#${['features', 'tests', 'install'][i]}">${escape(label)}</a>`).join('\n')}
      </nav>
      <a class="language" href="${fa ? '../' : 'fa/'}" hreflang="${other}" lang="${other}">${icon('globe')}${escape(t.language)}</a>
    </div>
  </header>
  <main id="main">
    <section class="wrap hero" aria-labelledby="headline">
      <div class="hero-copy">
        <p class="eyebrow">${escape(t.kicker)}</p>
        <h1 id="headline">${escape(t.heading[0])} <span>${escape(t.heading[1])}</span></h1>
        <p class="intro">${escape(t.intro)}</p>
        <div class="actions">${button('#install', t.primary, 'download', true)}${button(repo, t.source, 'github')}</div>
      </div>
      <figure class="product">
        <div class="stage">
          <div class="browser" aria-hidden="true"><div class="browser-bar"><i></i><i></i><i></i><span></span></div><div class="browser-body"><i></i><i></i><b></b><i></i></div></div>
          <img class="popup" src="${assets}popup.webp" width="390" height="617" alt="" fetchpriority="high">
        </div>
        <figcaption>${escape(t.caption)}</figcaption>
      </figure>
    </section>
    <ul class="wrap facts">
${t.facts.map(([n, label]) => `      <li><span aria-hidden="true">${escape(n)}</span>${escape(label)}</li>`).join('\n')}
    </ul>
    <section id="features" class="section light">
      <div class="wrap">
        <p class="eyebrow">${escape(t.featureLabel)}</p>
        <h2>${escape(t.featureTitle)}</h2>
        <p class="section-intro">${escape(t.featureIntro)}</p>
        <div class="feature-grid">
${t.features.map(([glyph, heading, description]) => `          <article class="feature"><div class="glyph">${icon(glyph)}</div><h3>${escape(heading)}</h3><p>${escape(description)}</p></article>`).join('\n')}
        </div>
      </div>
    </section>
    <section id="tests" class="section wrap">
      <p class="eyebrow">${escape(t.proofLabel)}</p>
      <h2>${escape(t.proofTitle)}</h2>
      <div class="proof-grid">
        <article class="proof"><h3>Turtlecute</h3><strong class="metric" aria-hidden="true"><bdi>${fa ? '۱۳۲ / ۱۳۲' : '132 / 132'}</bdi></strong><p>${escape(t.proofIntro)}</p><p class="note">${escape(t.proofNote)}</p>${report(doc('TESTING', lang, 'docs/'), t.proofLink)}</article>
        <article class="proof"><h3>${escape(t.youtubeTitle)}</h3><p>${escape(t.youtube)}</p>${report(doc('YOUTUBE', lang, 'docs/'), t.youtubeLink)}</article>
      </div>
    </section>
    <section id="install" class="section light">
      <div class="wrap">
        <p class="eyebrow">${escape(t.installLabel)}</p>
        <h2>${escape(t.installTitle)}</h2>
        <p class="section-intro">${escape(t.installIntro)}</p>
        <div class="install-grid">
${[
    ['Chrome 120+', 'chrome://extensions', t.chromium],
    ['Microsoft Edge 120+', 'edge://extensions', t.chromium],
    ['Firefox 140+', 'about:debugging#/runtime/this-firefox', t.firefox],
  ].map(([browser, address, [open, instructions]]) => `          <article class="card"><h3>${icon('browser')}<bdi>${browser}</bdi></h3><p>${escape(open)}</p><code>${address}</code><p>${escape(instructions)}</p></article>`).join('\n')}
        </div>
        <div class="actions">${button(`${repo}/releases/latest`, t.download, 'download', true)}${button(`${doc('README', lang)}#${fa ? encodeURIComponent('ساخت-از-سورس') : 'build'}`, t.build, 'github')}</div>
      </div>
    </section>
    <section class="section wrap faq">
      <h2>${escape(t.faqTitle)}</h2>
${t.faq.map(([q, a]) => `      <details><summary>${escape(q)}</summary><p>${escape(a)}</p></details>`).join('\n')}
    </section>
  </main>
  <footer class="site-foot"><div class="wrap foot-inner">
    <p>${escape(t.footerLine)}</p>
    <div class="foot-links"><a href="${doc('PRIVACY', lang)}">${escape(t.privacy)}</a><a href="${repo}/blob/main/LICENSE">${escape(t.license)}</a><a href="${repo}/issues">${escape(t.support)}</a></div>
  </div></footer>
</body>
</html>\n`;
}

await mkdir(new URL('assets/', output), { recursive: true });
await mkdir(new URL('fa/', output), { recursive: true });
const files = {
  'logo.png': 'store/assets/icon-128.png', 'popup.webp': 'website/assets/popup.webp', 'share.jpg': 'website/assets/share.jpg',
  'style.css': 'website/style.css',
  ...Object.fromEntries(['InterVariable.woff2', 'Shabnam.woff2', 'Shabnam-Bold.woff2',
    'LICENSE-Inter.txt', 'LICENSE-Shabnam.txt', 'LICENSE-Apache-2.0.txt'].map(name => [name, `extension/fonts/${name}`])),
};
await Promise.all(Object.entries(files).map(([target, source]) => copyFile(new URL(source, root), new URL(`assets/${target}`, output))));
await Promise.all([
  writeFile(new URL('index.html', output), render('en')),
  writeFile(new URL('fa/index.html', output), render('fa')),
  writeFile(new URL('404.html', output), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><link rel="stylesheet" href="${basePath}assets/style.css"><title>Page not found | AdBlocker</title></head>
<body><main class="wrap section"><p class="eyebrow">404</p><h1>${copy.en.notFound}</h1><div class="actions">${button(basePath, copy.en.home, 'arrow', true)}<a class="button secondary" href="${basePath}fa/" lang="fa">${copy.fa.home}</a></div></main></body></html>\n`),
  writeFile(new URL('robots.txt', output), `User-agent: *\nAllow: /\nSitemap: ${site}sitemap.xml\n`),
  writeFile(new URL('sitemap.xml', output), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${locales.map(lang => `  <url><loc>${url(lang)}</loc>${[...locales, 'x-default'].map(alt => `<xhtml:link rel="alternate" hreflang="${alt}" href="${url(alt === 'x-default' ? 'en' : alt)}"/>`).join('')}</url>`).join('\n')}
</urlset>\n`),
]);
console.log(`GitHub Pages site built in ${fileURLToPath(output)}`);
