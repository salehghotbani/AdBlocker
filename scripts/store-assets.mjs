// Render store artwork around genuine UI captures from tests/store-browser.mjs.
// No remote media, browser/store logos, ratings or fabricated performance scores.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir, mkdtemp, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const assets = path.join(root, 'store/assets');
const captures = path.join(root, 'artifacts/store-captures');
const profiles = path.join(root, '.cache/asset-profiles');
await mkdir(assets, { recursive: true }); await mkdir(profiles, { recursive: true });
const data = async file => 'data:image/png;base64,' + (await readFile(file)).toString('base64');
const logo = await data(path.join(root, 'extension/icons/128.png'));
const inter = 'data:font/woff2;base64,' + (await readFile(path.join(root, 'extension/fonts/InterVariable.woff2'))).toString('base64');
const layout = JSON.parse(await readFile(path.join(captures, 'chrome-layout.json'), 'utf8'));
const singleHeight = Math.ceil((layout.scopeBottom + 8) * 325 / layout.width);
const pairedHeight = Math.ceil((layout.scopeBottom + 8) * 270 / layout.width);
const light = await data(path.join(captures, 'chrome-popup-light.png'));
const dark = await data(path.join(captures, 'chrome-popup-dark.png'));
const paused = await data(path.join(captures, 'chrome-popup-paused.png'));
const before = await data(path.join(captures, 'chrome-reading-unfiltered.png'));
const after = await data(path.join(captures, 'chrome-reading-filtered.png'));
const profile = await mkdtemp(path.join(profiles, 'render-'));
let context;
try {
  context = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await context.newPage();
  const style = `*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#e2f7ed;background:#0b241d}main{width:1280px;height:800px;overflow:hidden;padding:48px;position:relative;background:radial-gradient(ellipse at 100% 0,#1f6850,transparent 65%),#0b241d}.brand{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:bold}.brand img{width:48px;height:48px}.overline{font-size:13px;letter-spacing:3px;color:#83c9af;margin:46px 0 18px}h1{font-size:60px;line-height:1.06;letter-spacing:-2px;margin:0 0 26px;max-width:660px}p{font-size:21px;line-height:1.6;color:#b8d9cb;max-width:630px}.note{position:absolute;bottom:25px;left:48px;font-size:12px;color:#9cbbaf}.popup-window{width:325px;height:492px;overflow:hidden;border-radius:15px;border:1px solid #4b816b;box-shadow:0 24px 60px #0006}.popup-window img{width:325px;display:block}.right{position:absolute;right:65px;top:145px}.tag{display:inline-block;border:1px solid #47775e;border-radius:24px;padding:10px 18px;margin:6px 4px 0 0;font-size:15px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:35px}.compare img{width:100%;border:1px solid #70a88d;border-radius:8px}.compare h2{font-size:20px;color:#d3eddf}.paired{position:absolute;right:50px;top:145px;display:flex;gap:20px}.paired .popup-window{width:270px;height:480px}.paired img{width:270px}.small-copy{max-width:500px}.small-copy h1{font-size:57px;max-width:480px}.small-copy p{max-width:430px}`;
  const polished = `@font-face{font-family:Inter;src:url('${inter}') format('woff2');font-weight:100 900}body{font-family:Inter,Arial,sans-serif}.popup-window{height:${singleHeight}px}.paired .popup-window{height:${pairedHeight}px}`;
  const brand = `<div class="brand"><img src="${logo}" alt="">AdBlocker</div>`;
  async function shot(name, body, size = { width: 1280, height: 800 }) {
    await page.setViewportSize(size);
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${style}${polished}</style></head><body>${body}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({ path: path.join(assets, name) });
  }
  await shot('01-clean-reading.png', `<main>${brand}<p class="overline">FREE AD BLOCKING</p><h1>More room for<br>real content.</h1><p>Clear ad controls.<br>Keep what matters in view.</p><span class="tag">Local filtering</span><span class="tag">No browsing-data collection</span><div class="right popup-window"><img src="${light}" alt="Actual popup"></div><p class="note">Actual interface • Demonstration page • No universal blocking-rate claim</p></main>`);
  await shot('02-reading-demo.png', `<main>${brand}<h1 style="font-size:42px;margin-top:28px">Keep the article. Hide marked ad placements.</h1><div class="compare"><section><h2>Protection paused</h2><img src="${before}"></section><section><h2>Protection enabled</h2><img src="${after}"></section></div><p>Article text, links and the search form remain usable.</p><p class="note">Controlled demonstration content; no live website or paid advertisement.</p></main>`);
  await shot('03-themes-and-counters.png', `<main>${brand}<div class="small-copy"><p class="overline">YOUR BROWSER, YOUR CHOICE</p><h1>Clear controls.<br>Day or night.</h1><p>Live placement counters.<br>Separate request counts.<br>Light and dark themes.</p><p>Counts are per page.<br>Several requests can belong to one ad.</p></div><div class="paired"><div class="popup-window"><img src="${light}"></div><div class="popup-window"><img src="${dark}"></div></div><p class="note">Actual interface captures • Native request counts may be unavailable in some contexts.</p></main>`);
  await shot('04-site-controls.png', `<main>${brand}<p class="overline">CONTROL WHERE FILTERING APPLIES</p><h1>Make room<br>for exceptions.</h1><p>Allow one site, save an exact-URL<br>exception, or pause once.</p><p>The interface turns gray<br>when protection is off.</p><div class="right popup-window"><img src="${paused}"></div><p class="note">Actual interface with a site exception on a controlled demonstration page.</p></main>`);
  await cp(path.join(captures, 'chrome-support.png'), path.join(assets, '05-optional-support.png'));
  // A genuine Firefox capture is kept separate from the other browser's UI.
  await cp(path.join(root, 'artifacts/firefox-filtered.png'), path.join(assets, 'firefox-filtering.png'));
  const promo = (width, height) => `<div style="width:${width}px;height:${height}px;overflow:hidden;position:relative;background:radial-gradient(circle at 50% 50%,#226f54,#0b241d 73%);display:grid;place-items:center"><div style="position:absolute;width:${height * .78}px;height:${height * .78}px;border:2px solid #7bd9ad66;border-radius:50%;box-shadow:0 0 0 35px #7bd9ad0c,0 0 0 80px #7bd9ad08"></div><img src="${logo}" style="position:relative;width:${height * .55}px;height:${height * .55}px"></div>`;
  await shot('promo-small-440x280.png', promo(440, 280), { width: 440, height: 280 });
  await shot('promo-marquee-1400x560.png', promo(1400, 560), { width: 1400, height: 560 });
  await cp(path.join(root, 'extension/icons/128.png'), path.join(assets, 'icon-128.png'));
  const provenance = JSON.parse(await readFile(path.join(captures, 'provenance.json'), 'utf8'));
  // Keep provenance portable; machine-local runtime paths do not belong in Git.
  delete provenance.runtime;
  await writeFile(path.join(assets, 'provenance.json'), JSON.stringify({ ...provenance,
    artwork: 'HTML/CSS frames around genuine UI captures; no fabricated counts, ratings, store approvals or third-party branding.',
    firefoxImages: 'Unannotated reading-demo capture from an actual Firefox temporary installation. Runtime report is artifacts/firefox-runtime.json.'
  }, null, 2) + '\n');
  console.log('PASS: five English-only 1280x800 images, actual Firefox capture, 128px icon and both promotional sizes rendered');
} finally {
  await context?.close();
  if (path.dirname(path.resolve(profile)) !== path.resolve(profiles)) throw new Error('Unexpected asset profile');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
    if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
    console.warn(`Windows retained a lock on isolated asset profile: ${profile}`);
  });
}
