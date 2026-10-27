import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const profileRoot = path.join(root, '.cache', 'browser-profiles');
await mkdir(profileRoot, { recursive: true });
const profile = await mkdtemp(path.join(profileRoot, 'adblocker-test-'));
const extension = path.join(root, 'dist/chrome');
const html = `<!doctype html><html><body>
<main><h1>Real article</h1><p id="story">The main story stays visible.</p>
<video id="player" controls></video><form id="login"><input placeholder="Email"></form></main>
<div class="banner sponsored" id="ordinary">Ordinary site content</div>
<ins class="adsbygoogle" id="ad" style="display:inline-block">Ad</ins>
<div data-ad-client="test" data-ad-slot="slot" id="protected"><article>Real content</article></div>
<iframe id="safe-frame" src="/frame?reference=//ad.doubleclick.net/"></iframe>
<script src="https://ads.doubleclick.net/adblocker-fixture.js"></script>
<script src="/pagead.js?campaign=test"></script>
<script src="/widget/ads.fixture.js"></script>
<script src="/reader.js?reference=/widget/ads.js"></script>
</body></html>`;
const server = http.createServer((req, res) => {
  if (/^\/(pagead\.js|widget\/ads\.fixture\.js|reader\.js)/.test(req.url)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(req.url.startsWith('/reader.js') ? 'window.readerLoaded = true;' :
      req.url.startsWith('/pagead.js') ? 'window.pageAdLoaded = true;' : 'window.widgetAdLoaded = true;');
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(req.url.startsWith('/frame') ? '<p>Useful embedded content</p>' : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  context.setDefaultTimeout(15000);
  // Satisfy external fixtures locally; no external website is contacted by this test.
  await context.route('https://ads.doubleclick.net/**', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.adScriptLoaded = true;'
  }));
  await context.route('https://*/adblocker-probe', route => route.fulfill({
    contentType: 'text/plain', body: 'Local network fixture'
  }));
  let updateRequests = 0;
  await context.route('https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest', route => {
    updateRequests++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      tag_name: 'v9.0.0', draft: false, prerelease: false, html_url: 'https://foreign.example/'
    }) });
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    try { worker = await context.waitForEvent('serviceworker'); }
    catch { throw new Error('Extension did not start. Check browser extension errors and managed policies: this test requires unpacked extensions to be permitted. No DNR validation completed.'); }
  }
  const extensionId = new URL(worker.url()).host;
  // Capture notification API calls without showing synthetic v9.0.0 OS toasts.
  await worker.evaluate(() => {
    globalThis.updateNotificationCalls = [];
    chrome.notifications.create = async (id, options) => {
      globalThis.updateNotificationCalls.push({ id, options }); return id;
    };
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  await popup.evaluate(() => {
    window.policyViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.policyViolations.push(event.violatedDirective));
    const script = document.createElement('script');
    script.textContent = 'window.inlineShouldNotRun = true';
    document.head.append(script);
    const base = document.createElement('base'); base.href = 'https://foreign.example/';
    document.head.append(base);
  });
  await popup.waitForFunction(() => window.policyViolations.some(value => value.startsWith('script-src')) &&
    window.policyViolations.includes('base-uri'));
  assert.equal(await popup.evaluate(() => window.inlineShouldNotRun), undefined);
  assert.ok((await popup.evaluate(() => document.baseURI)).startsWith(`chrome-extension://${extensionId}/`));
  console.log('PASS: real extension CSP rejects inline script execution and foreign base URLs');
  const command = message => popup.evaluate(async message => {
    const result = await chrome.runtime.sendMessage(message);
    if (result.error) throw new Error(result.error);
    return result;
  }, message);
  const alarm = await popup.evaluate(() => chrome.alarms.get('adblocker-update-check'));
  assert.equal(alarm.periodInMinutes, 4320, 'native alarm is scheduled every three days');
  assert.equal(updateRequests, 0, 'initial popup status reads cached data without a network request');
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('9.0.0'));
  assert.equal(await popup.locator('#updateLink').getAttribute('href'),
    'https://github.com/salehghotbani/AdBlocker/releases/tag/v9.0.0');
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => !document.getElementById('checkUpdates').disabled);
  assert.equal(updateRequests, 1, 'rapid manual checks share cached release data');
  assert.equal(await worker.evaluate(() => globalThis.updateNotificationCalls.length), 1,
    'one notification request is made for the newer version');
  assert.equal((await command({ type: 'getUpdateStatus' })).update.available, true);
  assert.equal(await popup.evaluate(async () => {
    try { await fetch('https://foreign.example/data'); return true; } catch { return false; }
  }), false, 'CSP allows the release endpoint but blocks unrelated network connections');
  console.log('PASS: native three-day update alarm, real metadata fetch, cached checks and safe update UI');
  if (process.env.ADBLOCK_LIVE_UPDATES === '1') {
    await context.unroute('https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest');
    await popup.evaluate(() => chrome.storage.local.remove('updateState'));
    const liveUpdate = (await command({ type: 'checkForUpdates' })).update;
    assert.equal(liveUpdate.error, null, 'live anonymous GitHub metadata check must succeed');
    assert.ok(liveUpdate.lastChecked > 0 && liveUpdate.latestTag);
    console.log(`PASS: live anonymous GitHub update metadata: ${liveUpdate.latestTag}`);
  }
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', req => failures.push({ url: req.url(), error: req.failure()?.errorText }));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await page.evaluate(() => window.adScriptLoaded), undefined);
  assert.ok(failures.some(failure => failure.url.includes('adblocker-fixture.js') && failure.error.includes('BLOCKED')),
    `Expected actual DNR blocking; got ${JSON.stringify(failures)}`);
  for (const marker of ['pageAdLoaded', 'widgetAdLoaded']) {
    assert.equal(await page.evaluate(key => window[key], marker), undefined);
  }
  for (const file of ['/pagead.js?campaign=test', '/widget/ads.fixture.js']) {
    assert.ok(failures.some(failure => failure.url === url + file && failure.error.includes('BLOCKED')), file);
  }
  assert.equal(await page.evaluate(() => window.readerLoaded), true, 'ad path inside a useful script query stays allowed');
  assert.equal(await page.evaluate(() => fetch('/pagead.js').then(res => res.ok)), true,
    'path rules only block script resources');
  const domains = JSON.parse(await readFile(path.join(root, 'extension/ad-domains.json'), 'utf8'));
  const trackerHosts = [...domains, 'stats.g.doubleclick.net', 'cdn.mouseflow.com',
    'config.unityads.unity3d.com', 'data.mistat.india.xiaomi.com', 'data.mistat.rus.xiaomi.com'];
  const allowedHosts = ['www.google.com', 'accounts.google.com', 's3.amazonaws.com',
    'useful-bucket.s3.amazonaws.com', 'www.youtube.com', 'www.facebook.com', 'www.linkedin.com',
    'www.reddit.com', 'www.tiktok.com', 'grs.hicloud.com', 'extmaps-api.yandex.net',
    'careers.hotjar.com', 'app.bugsnag.com', 'api.bugsnag.com', 'app.getsentry.com',
    'business-api.tiktok.com', 'google-analytics.com.example.org', 'www.bing.com',
    'www.hotjar.com', 'www.segment.com'];
  const probe = hosts => page.evaluate(hosts => Promise.all(hosts.map(async host => {
    try { await fetch(`https://${host}/adblocker-probe`, { method: 'HEAD', mode: 'no-cors' }); return false; }
    catch { return true; }
  })), hosts);
  assert.ok((await probe(trackerHosts)).every(Boolean), 'every advertising/tracking domain is blocked');
  for (const host of trackerHosts) {
    assert.ok(failures.some(failure => failure.url === `https://${host}/adblocker-probe` &&
      failure.error.includes('BLOCKED')), `Browser must report client blocking for ${host}`);
  }
  assert.ok((await probe(allowedHosts)).every(blocked => !blocked), 'shared services, dashboards and lookalike domains remain usable');
  console.log(`PASS: ${domains.length} domains blocked by the browser; ${allowedHosts.length} useful hosts allowed; first-party ad scripts blocked; benign script queries and fetches allowed`);
  for (const id of ['story', 'player', 'login', 'ordinary', 'protected', 'safe-frame']) {
    assert.equal(await page.locator(`#${id}`).isVisible(), true, `${id} must be preserved`);
  }
  console.log('PASS: actual network blocking; article, video, form, banner and safe iframe preserved');
  await page.evaluate(() => {
    const ad = document.createElement('ins'); ad.className = 'adsbygoogle'; ad.id = 'late';
    document.body.append(ad);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('late')).display === 'none');
  await page.evaluate(() => {
    const article = document.createElement('article'); article.textContent = 'New real content';
    document.getElementById('late').append(article);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('late')).display !== 'none');
  console.log('PASS: dynamic ads hidden; elements restored when real article content appears');
  await command({ type: 'setSite', host: '127.0.0.1', allowed: true });
  await page.waitForFunction(() => document.getElementById('ad').style.display === 'inline-block');
  await page.reload();
  assert.equal(await page.evaluate(() => window.adScriptLoaded), true);
  assert.equal(await page.evaluate(() => window.pageAdLoaded && window.widgetAdLoaded), true);
  assert.ok((await probe(domains)).every(blocked => !blocked), 'site exception permits all tracker requests');
  assert.equal(await page.locator('#ad').isVisible(), true);
  console.log('PASS: site exception restores cosmetic styles and allows network resources after reload');
  await command({ type: 'setSite', host: '127.0.0.1', allowed: false });
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await page.evaluate(() => window.adScriptLoaded), undefined);
  await command({ type: 'setEnabled', enabled: false });
  await page.waitForFunction(() => document.getElementById('ad').style.display === 'inline-block');
  await page.reload();
  assert.equal(await page.evaluate(() => window.adScriptLoaded), true);
  assert.equal(await page.evaluate(() => window.pageAdLoaded && window.widgetAdLoaded), true);
  assert.equal(await page.locator('#ad').isVisible(), true);
  console.log('PASS: re-enable site and global disable both affect network and cosmetics');
  await command({ type: 'setEnabled', enabled: true });
  const saved = await command({ type: 'getSettings' });
  assert.equal(saved.settings.enabled, true);
  await command({ type: 'setUrl', url: url + '/exact?campaign=one#section', allowed: true });
  await page.goto(url + '/exact?campaign=one');
  try {
    // Wait for the observable result of the routed script, rather than racing
    // its execution with an immediate evaluation after navigation.
    await page.waitForFunction(() => window.adScriptLoaded === true);
  } catch (error) {
    const diagnostic = await popup.evaluate(async () => ({
      rules: await chrome.declarativeNetRequest.getDynamicRules(),
      settings: (await chrome.storage.local.get('settings')).settings
    }));
    const documentState = await page.evaluate(() => ({
      readyState: document.readyState, pageAdLoaded: window.pageAdLoaded,
      widgetAdLoaded: window.widgetAdLoaded, readerLoaded: window.readerLoaded,
      scripts: [...document.scripts].map(script => script.src)
    }));
    throw new Error(`Exact-URL fixture did not load: ${JSON.stringify({ url: page.url(),
      failures: failures.slice(-8), documentState, ...diagnostic })}`, { cause: error });
  }
  assert.equal(await page.locator('#ad').isVisible(), true);
  for (const path of ['/other', '/exact?campaign=two']) {
    await page.goto(url + path);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    assert.equal(await page.evaluate(() => window.adScriptLoaded), undefined);
  }
  await command({ type: 'clearUrls' });
  await page.goto(url + '/paused');
  const tabId = await popup.evaluate(async target => {
    const tabs = await chrome.tabs.query({});
    return tabs.find(tab => tab.url === target).id;
  }, page.url());
  await command({ type: 'setPause', tabId, url: page.url(), paused: true });
  await page.waitForFunction(() => window.adScriptLoaded === true);
  assert.equal((await popup.evaluate(tabId => chrome.runtime.sendMessage({ type: 'getSettings', tabId }), tabId)).paused, true);
  const other = await context.newPage();
  await other.goto(url + '/paused');
  await other.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await other.evaluate(() => window.adScriptLoaded), undefined);
  await other.close();
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await page.evaluate(() => window.adScriptLoaded), undefined);
  console.log('PASS: permanent URL distinguishes paths/query; one-time pause allows one reload in one tab only');
  await page.bringToFront();
  await popup.reload();
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  let automaticLoads = 0;
  page.on('domcontentloaded', () => automaticLoads++);
  await popup.waitForFunction(() => !document.getElementById('siteEnabled').disabled);
  await popup.locator('#siteEnabled').click();
  await page.waitForFunction(() => window.adScriptLoaded === true);
  assert.equal(automaticLoads, 1, 'disabling current site reloads it automatically once');
  assert.equal(await popup.locator('html').getAttribute('data-protection'), 'off');
  await popup.locator('#siteEnabled').click();
  await page.waitForFunction(() => window.adScriptLoaded === undefined &&
    getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(automaticLoads, 2, 're-enabling current site reloads it automatically once');
  console.log('PASS: actual popup site toggles reload the page automatically, without confirmation');
  await popup.bringToFront();
  assert.equal(await popup.locator('#enabled').isChecked(), true);
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await popup.setViewportSize({ width: 390, height: 600 });
  await popup.screenshot({ path: path.join(root, 'artifacts/popup.png') });
  console.log('PASS: popup loads and reads persisted settings; screenshot saved');
  // Opt-in external check. Kept out of CI because DNS/network failures can inflate
  // this site's score; the local fixtures above require explicit browser blocking.
  if (process.env.ADBLOCK_LIVE_TEST === '1') {
    const live = await context.newPage();
    await live.setViewportSize({ width: 1280, height: 960 });
    const blockedRequests = [];
    live.on('requestfailed', request => {
      if (request.failure()?.errorText.includes('BLOCKED_BY_CLIENT')) blockedRequests.push(request.url());
    });
    await live.goto('https://adblock.turtlecute.org/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await live.waitForFunction(() => /Total\s*:\s*\d+/.test(document.querySelector('#adb_test_r')?.textContent),
      null, { timeout: 60000 });
    const report = await live.evaluate(() => ({
      score: document.body.style.getPropertyValue('--liquid-title'),
      totals: document.querySelector('#adb_test_r').textContent.trim(),
      log: document.querySelector('#test_log').innerText
    }));
    report.blockedByClient = blockedRequests;
    await writeFile(path.join(root, 'artifacts/turtlecute-result.json'), JSON.stringify(report, null, 2) + '\n');
    await live.screenshot({ path: path.join(root, 'artifacts/turtlecute-result.png') });
    console.log(`LIVE Turtlecute: ${report.score}; ${report.totals}; ${blockedRequests.length} requests explicitly blocked by client`);
    assert.ok(blockedRequests.length > 100, 'expect actual extension blocking, not only network errors');
    await live.close();
  }
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
    if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
    console.warn(`Windows retained a lock on the isolated test profile: ${profile}`);
  });
}
