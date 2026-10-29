import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdtemp, rm, mkdir, readFile, writeFile, cp } from 'node:fs/promises';
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
let fixtureNavigations = 0, counterNavigations = 0;
const server = http.createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url.startsWith('/adblocker-fixture.js') || req.url.startsWith('/counter.js')) {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(req.url.startsWith('/counter.js') ? 'window.remoteAdLoaded = true;' : 'window.adScriptLoaded = true;');
    return;
  }
  if (req.url.startsWith('/adblocker-probe') || ['/late-paused','/after-pause','/extra'].includes(req.url)) {
    res.setHeader('Content-Type', 'text/plain'); res.end('Native local network fixture'); return;
  }
  if (/^\/(pagead\.js|widget\/ads\.fixture\.js|reader\.js)/.test(req.url)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(req.url.startsWith('/reader.js') ? 'window.readerLoaded = true;' :
      req.url.startsWith('/pagead.js') ? 'window.pageAdLoaded = true;' : 'window.widgetAdLoaded = true;');
    return;
  }
  res.setHeader('Content-Type', 'text/html');
  if (req.url.startsWith('/counter-')) {
    res.end(req.url === '/counter-blank' ? '<!doctype html><h1>Useful page</h1>' :
      `<!doctype html><h1>Useful page</h1><ins class="adsbygoogle" id="ad">Ad</ins>
      <div class="textads adsbox"><ins class="adsbygoogle">Nested ad</ins></div>
      <script src="${adOrigin}/counter.js?document=${++counterNavigations}"></script><script src="/pagead.js?document=${counterNavigations}"></script>`);
    return;
  }
  // A fresh resource URL prevents earlier blocked/routed loads from being
  // reused across different document-policy scenarios. Every scenario still
  // requires actual execution or explicit client blocking of the same host.
  res.end(req.url.startsWith('/frame') ? '<p>Useful embedded content</p>' : html.replace(
    'https://ads.doubleclick.net/adblocker-fixture.js',
    `${adOrigin}/adblocker-fixture.js?document=${++fixtureNavigations}`));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const adOrigin = `http://ads.doubleclick.net:${server.address().port}`;
// Only fixture hostnames are resolved to loopback. No production manifest,
// browser profile or system DNS setting is modified.
const nativeArgs = ['--no-proxy-server', '--host-resolver-rules=MAP ads.doubleclick.net 127.0.0.1'];
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    locale: 'fa-IR',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox', ...nativeArgs, `--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  context.setDefaultTimeout(15000);
  // Satisfy external fixtures locally; no external website is contacted by this test.
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
    globalThis.navigationTrace = [];
    for (const [name, source] of [['before', chrome.webNavigation.onBeforeNavigate], ['committed', chrome.webNavigation.onCommitted]]) {
      source.addListener(details => {
        if (details.frameId !== 0) return;
        const record = { name, tabId: details.tabId, url: details.url, documentId: details.documentId, timeStamp: details.timeStamp };
        globalThis.navigationTrace.push(record);
        if (globalThis.navigationTrace.length > 40) globalThis.navigationTrace.shift();
        chrome.storage.session.get('pausedTabs').then(value => { record.pauses = value.pausedTabs; });
      });
    }
    chrome.notifications.create = async (id, options) => {
      globalThis.updateNotificationCalls.push({ id, options }); return id;
    };
  });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  assert.equal(await popup.locator('html').getAttribute('lang'), 'en');
  assert.equal(await popup.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(await popup.locator('#checkUpdates').textContent(), 'Check for updates');
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
  await popup.waitForFunction(async () => (await chrome.alarms.get('adblocker-update-check'))?.periodInMinutes === 4320);
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
  const restrictedHosts = ['careers.hotjar.com', 'api.bugsnag.com', 'app.bugsnag.com',
    'app.getsentry.com', 'business-api.tiktok.com', 'grs.hicloud.com'];
  for (const host of restrictedHosts) assert.ok(domains.includes(host), host);
  const allowedHosts = ['www.google.com', 'accounts.google.com', 's3.amazonaws.com',
    'useful-bucket.s3.amazonaws.com', 'www.youtube.com', 'www.facebook.com', 'www.linkedin.com',
    'www.reddit.com', 'www.tiktok.com', 'extmaps-api.yandex.net',
    'google-analytics.com.example.org', 'www.bing.com',
    'www.hotjar.com', 'www.segment.com', 'kaprila.com', 'faradars.org',
    'soft98.ir', 'forum.soft98.ir', 'img.soft98.ir', 'file3.soft98.ir', 'cdn.hostdl.com',
    'www.w3schools.com', 'campus.w3schools.com', 'order.w3schools.com', 'profile.w3schools.com'];
  const probe = (hosts, port = null) => page.evaluate(({ hosts, port }) => Promise.all(hosts.map(async host => {
    try { await fetch(`${port ? 'http://' + host + ':' + port : 'https://' + host}/adblocker-probe`, { method: 'HEAD', mode: 'no-cors' }); return false; }
    catch { return true; }
  })), { hosts, port });
  assert.ok((await probe(trackerHosts)).every(Boolean), 'every advertising/tracking domain is blocked');
  for (const host of trackerHosts) {
    assert.ok(failures.some(failure => failure.url === `https://${host}/adblocker-probe` &&
      failure.error.includes('BLOCKED')), `Browser must report client blocking for ${host}`);
  }
  assert.ok((await probe(allowedHosts)).every(blocked => !blocked), 'shared services and lookalike domains remain usable');
  console.log(`PASS: ${domains.length} domains blocked by the browser; ${allowedHosts.length} useful hosts allowed; first-party ad scripts blocked; benign script queries and fetches allowed`);
  // These requested hosts also provide functional services. Exercise direct
  // navigation and same-site resources as well as the third-party block above.
  await context.route('https://*/adblocker-first-party', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><main><h1>Provider page</h1></main><script src="/adblocker-first-party.js"></script>'
  }));
  await context.route('https://*/adblocker-first-party.js', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.firstPartyLoaded = true;'
  }));
  const providerPage = await context.newPage();
  for (const host of restrictedHosts) {
    await providerPage.goto(`https://${host}/adblocker-first-party`);
    await providerPage.waitForFunction(() => window.firstPartyLoaded === true);
    assert.equal(await providerPage.locator('h1').textContent(), 'Provider page', host);
    assert.equal(await providerPage.evaluate(() => fetch('/adblocker-probe', { method: 'HEAD' }).then(response => response.ok)), true, host);
  }
  await providerPage.goto('https://app.bugsnag.com/adblocker-first-party');
  assert.equal(await providerPage.evaluate(() => fetch('https://api.bugsnag.com/adblocker-probe', { mode: 'no-cors' }).then(() => true)), true,
    'same-site dashboard-to-API requests remain allowed');
  await providerPage.close();
  console.log('PASS: six newly restricted hosts still allow direct navigation, first-party scripts/fetches and same-site API use');
  await command({ type: 'setSite', host: '127.0.0.1', allowed: true });
  assert.ok((await probe(domains)).every(blocked => !blocked), 'site exception permits every routed tracker-host fixture');
  await command({ type: 'setSite', host: '127.0.0.1', allowed: false });
  // Allowance, pause and native-count tests below use real loopback HTTP traffic
  // with DNS-mapped ad hosts, without Playwright request interception.
  await context.unrouteAll({ behavior: 'wait' });
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
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
  assert.ok((await probe(['ads.doubleclick.net'], server.address().port)).every(blocked => !blocked), 'site exception permits native local cross-origin requests');
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
  // Isolate URL exceptions from the frame used for global ruleset toggles.
  // The same allowed/blocked requests are exercised in a fresh top-level tab.
  const urlPage = await context.newPage();
  urlPage.on('requestfailed', request => failures.push({ url: request.url(), error: request.failure()?.errorText }));
  await command({ type: 'setUrl', url: url + '/exact?campaign=one#section', allowed: true });
  await urlPage.goto(url + '/exact?campaign=one');
  try {
    // Wait for the observable result of the routed script, rather than racing
    // its execution with an immediate evaluation after navigation.
    await urlPage.waitForFunction(() => window.adScriptLoaded === true && window.pageAdLoaded === true && window.widgetAdLoaded === true);
  } catch (error) {
    const diagnostic = await popup.evaluate(async () => ({
      rules: await chrome.declarativeNetRequest.getDynamicRules(),
      settings: (await chrome.storage.local.get('settings')).settings
    }));
    const documentState = await urlPage.evaluate(() => ({
      readyState: document.readyState, pageAdLoaded: window.pageAdLoaded,
      widgetAdLoaded: window.widgetAdLoaded, readerLoaded: window.readerLoaded,
      scripts: [...document.scripts].map(script => script.src)
    }));
    throw new Error(`Exact-URL fixture did not load: ${JSON.stringify({ url: urlPage.url(),
      failures: failures.slice(-8), documentState, ...diagnostic })}`, { cause: error });
  }
  assert.equal(await urlPage.locator('#ad').isVisible(), true);
  for (const path of ['/other', '/exact?campaign=two']) {
    await urlPage.goto(url + path);
    await urlPage.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    assert.equal(await urlPage.evaluate(() => window.adScriptLoaded), undefined);
  }
  await command({ type: 'clearUrls' });
  await urlPage.close();
  await page.goto(url + '/paused');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  const tabId = await popup.evaluate(async target => {
    const tabs = await chrome.tabs.query({});
    return tabs.find(tab => tab.url === target).id;
  }, page.url());
  const ungrantedCounters = (await command({ type: 'getCounters', tabId, url: page.url() })).counters;
  assert.equal(ungrantedCounters.requests, null, 'an automated extension URL has no toolbar activeTab grant');
  assert.equal(ungrantedCounters.placements, 1);
  console.log('PASS: production permissions show unavailable network count honestly without a toolbar grant; cosmetic count remains usable');
  await command({ type: 'setPause', tabId, url: page.url(), paused: true });
  try { await page.waitForFunction(() => window.adScriptLoaded === true); }
  catch (error) {
    const diagnostic = await popup.evaluate(async tabId => ({
      state: await chrome.runtime.sendMessage({ type: 'getSettings', tabId }),
      session: await chrome.storage.session.get('pausedTabs'),
      rules: await chrome.declarativeNetRequest.getSessionRules(),
      frame: await chrome.webNavigation.getFrame({ tabId, frameId: 0 })
    }), tabId);
    const scripts = await page.evaluate(() => ({ pageAdLoaded: window.pageAdLoaded, widgetAdLoaded: window.widgetAdLoaded,
      adScriptLoaded: window.adScriptLoaded, urls: [...document.scripts].map(script => script.src) }));
    throw new Error(`Paused document did not allow scripts: ${JSON.stringify({ ...diagnostic, scripts,
      trace: await worker.evaluate(() => globalThis.navigationTrace), failures: failures.slice(-10) })}`, { cause: error });
  }
  assert.equal((await popup.evaluate(tabId => chrome.runtime.sendMessage({ type: 'getSettings', tabId }), tabId)).paused, true);
  assert.equal(await page.evaluate(url => fetch(url, { mode: 'no-cors' }).then(() => true, () => false), adOrigin + '/late-paused'), true,
    'the committed paused document retains its allowance for late requests');
  const other = await context.newPage();
  await other.goto(url + '/paused');
  await other.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await other.evaluate(() => window.adScriptLoaded), undefined);
  await other.close();
  await page.reload();
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  // webNavigation expiry is asynchronous: very early parser requests can race
  // it. Require protection after expiry, without treating that race as a
  // synchronous browser guarantee that the API does not provide.
  assert.equal((await command({ type: 'getSettings', tabId })).paused, false);
  assert.equal(await popup.evaluate(async () => (await chrome.declarativeNetRequest.getSessionRules()).length), 0);
  assert.equal(await page.evaluate(url => fetch(url, { mode: 'no-cors' }).then(() => true, () => false), adOrigin + '/after-pause'), false);
  console.log('PASS: permanent URL distinguishes paths/query; pause is tab-isolated, expires on reload and restores network blocking after expiry');
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
  const soft98 = await context.newPage();
  await context.route('https://soft98.ir/adblocker-fixture', async route => route.fulfill({
    contentType: 'text/html', body: await readFile(path.join(root, 'tests/fixtures/soft98-compat.html'), 'utf8')
  }));
  await soft98.goto('https://soft98.ir/adblocker-fixture');
  await soft98.waitForFunction(() => ['abddh', 'abdds', 'sbds', 'hosting-ad'].every(id =>
    document.getElementById(id).getBoundingClientRect().height === 0));
  await soft98.locator('#continue').hover();
  assert.equal(await soft98.locator('#ad-child').evaluate(el => el.getBoundingClientRect().width), 200);
  for (const id of ['post', 'search', 'useful-sidebar']) assert.equal(await soft98.locator(`#${id}`).isVisible(), true, id);
  await command({ type: 'setSite', host: 'soft98.ir', allowed: true });
  await soft98.waitForFunction(() => document.getElementById('abddh').getBoundingClientRect().height > 0);
  await soft98.reload();
  assert.equal(await soft98.locator('#hosting-ad').isVisible(), true);
  await command({ type: 'setSite', host: 'soft98.ir', allowed: false });
  await soft98.reload();
  await soft98.waitForFunction(() => document.getElementById('abdds').getBoundingClientRect().height === 0);
  await soft98.close();
  console.log('PASS: actual extension collapses Soft98 ad slots, preserves downloads/search/sidebar, and respects site exceptions');
  const w3 = await context.newPage();
  await context.route('https://www.w3schools.com/adblocker-fixture', async route => route.fulfill({
    contentType: 'text/html', body: await readFile(path.join(root, 'tests/fixtures/w3schools.html'))
  }));
  await w3.goto('https://www.w3schools.com/adblocker-fixture');
  await w3.waitForFunction(() => ['sale-slot', 'vidpos', 'stickypos', 'mainLeaderboard'].every(id =>
    getComputedStyle(document.getElementById(id)).display === 'none'));
  for (const id of ['lesson', 'lesson-video', 'lesson-audio', 'iframeResult', 'social-links']) assert.equal(await w3.locator(`#${id}`).isVisible(), true, id);
  await w3.locator('#editor').fill('Working example');
  await w3.locator('#run').click();
  assert.equal(await w3.locator('#preview').textContent(), 'Working example');
  await command({ type: 'setSite', host: 'w3schools.com', allowed: true });
  await w3.waitForFunction(() => getComputedStyle(document.getElementById('sale-slot')).display === 'flex');
  await command({ type: 'setSite', host: 'w3schools.com', allowed: false });
  await w3.waitForFunction(() => getComputedStyle(document.getElementById('sale-slot')).display === 'none');
  await w3.close();
  console.log('PASS: actual extension filters W3Schools ad slots while preserving tutorial media, the working editor and site exceptions');
  await checkMissingUpdatePermissions();
  await checkPageCounters();

  if (process.env.ADBLOCK_LIVE_W3SCHOOLS === '1') {
    const live = await context.newPage();
    await live.setViewportSize({ width: 1365, height: 1000 });
    await command({ type: 'setSite', host: 'w3schools.com', allowed: true });
    await live.goto('https://www.w3schools.com/html/default.asp', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await live.locator('#upperfeatureshowcaselink').waitFor({ state: 'visible' });
    const heading = await live.locator('#main h1').textContent();
    const examples = await live.locator('#main .w3-code').allTextContents();
    assert.ok(examples.length > 0, 'record real tutorial code examples before filtering');
    await live.screenshot({ path: path.join(root, 'artifacts/w3schools-before.png') });
    await command({ type: 'setSite', host: 'w3schools.com', allowed: false });
    await live.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    const slots = ['#right .sidesection:has(> #upperfeatureshowcaselink)', '#right #vidpos', '#right #stickypos', '#mainLeaderboard', '#midcontentadcontainer', '#bottomads'];
    await live.waitForFunction(selectors => selectors.every(selector => {
      const element = document.querySelector(selector);
      return !element || getComputedStyle(element).display === 'none';
    }), slots);
    assert.equal(await live.locator('#main h1').textContent(), heading);
    assert.deepEqual(await live.locator('#main .w3-code').allTextContents(), examples, 'real tutorial examples are unchanged');
    assert.equal(await live.locator('#yt_container').isVisible(), true, 'the tutorial video link is preserved');
    assert.equal(await live.locator('#right .sharethis').isVisible(), true, 'social navigation is preserved');
    const tryLink = await live.locator('a[href*="tryit.asp?filename=tryhtml_default"]').first().getAttribute('href');
    assert.ok(tryLink, 'the real Try it Yourself link remains available');
    await live.screenshot({ path: path.join(root, 'artifacts/w3schools-after.png') });
    const report = await live.evaluate(selectors => ({
      url: location.href, heading: document.querySelector('#main h1').textContent,
      exampleCount: document.querySelectorAll('#main .w3-code').length,
      placements: selectors.map(selector => ({ selector, displays: [...document.querySelectorAll(selector)].map(element => getComputedStyle(element).display) })),
      sidebarVideoCount: document.querySelectorAll('#right #vidpos video, #right #stickypos video').length
    }), slots);
    const editor = await context.newPage();
    await editor.goto(new URL(tryLink, live.url()).href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await editor.locator('#runbtn').waitFor({ state: 'visible' });
    await editor.locator('#runbtn').click();
    await editor.frameLocator('#iframeResult').locator('h1').waitFor({ state: 'visible' });
    report.editorHeading = await editor.frameLocator('#iframeResult').locator('h1').textContent();
    await writeFile(path.join(root, 'artifacts/w3schools-result.json'), JSON.stringify(report, null, 2) + '\n');
    await editor.close();
    await live.close();
    console.log('LIVE W3Schools: sidebar promotion/ad slots hidden, code examples and tutorial video preserved; real Try it editor runs');
  }

  if (process.env.ADBLOCK_LIVE_SOFT98 === '1') {
    const live = await context.newPage();
    await live.setViewportSize({ width: 1365, height: 1000 });
    await command({ type: 'setSite', host: 'soft98.ir', allowed: true });
    await live.goto('https://soft98.ir/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await live.locator('#abdds').waitFor({ state: 'visible' });
    await live.screenshot({ path: path.join(root, 'artifacts/soft98-before.png'), fullPage: true });
    const beforePosts = await live.locator('.cbddpb:visible').allTextContents();
    assert.ok(beforePosts.length > 0, 'record real software descriptions before filtering');
    await command({ type: 'setSite', host: 'soft98.ir', allowed: false });
    const liveFailures = [];
    live.on('requestfailed', request => liveFailures.push({ url: request.url(), error: request.failure()?.errorText }));
    await live.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
    await live.waitForFunction(() => ['abddh', 'abdds', 'sbds'].every(id => {
      const element = document.getElementById(id);
      return element && element.getBoundingClientRect().height === 0;
    }));
    assert.ok(liveFailures.some(item => item.url.startsWith('https://beta.kaprila.com/') && item.error?.includes('BLOCKED_BY_CLIENT')),
      'Kaprila loader must be explicitly blocked, not fail from DNS or network errors');
    await live.screenshot({ path: path.join(root, 'artifacts/soft98-after.png'), fullPage: true });
    // The site's own script rewrites semantic tags after load; compare the
    // visible software descriptions rather than assuming <article> survives.
    assert.deepEqual(await live.locator('.cbddpb:visible').allTextContents(), beforePosts,
      'all real software descriptions remain visible and unchanged');
    const report = await live.evaluate(() => ({
      url: location.href, visiblePosts: [...document.querySelectorAll('.cbddpb')].filter(el => el.getClientRects().length > 0).length,
      placements: ['#abddh', '#abdds', '#sbds', '.cbdd:has(> .cbddb.abdd)'].map(selector => ({
        selector, heights: [...document.querySelectorAll(selector)].map(el => el.getBoundingClientRect().height)
      }))
    }));
    assert.ok(report.placements.every(slot => slot.heights.every(height => height === 0)),
      'remaining ad containers must stay collapsed after site initialization');
    await writeFile(path.join(root, 'artifacts/soft98-result.json'), JSON.stringify({ ...report, failures: liveFailures }, null, 2) + '\n');
    await live.close();
    console.log('LIVE Soft98: ad containers collapsed, articles visible, Kaprila loader explicitly blocked; report/screenshots saved');
  }
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
    for (const host of restrictedHosts) {
      assert.ok(blockedRequests.some(url => new URL(url).hostname === host),
        `Live check must explicitly client-block ${host}, not rely on a timeout`);
    }
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

// Reproduce a stale/partial unpacked installation with both optional update
// permissions absent, using the real packaged worker, popup and DNR APIs.
async function checkMissingUpdatePermissions() {
  const compatRoot = path.join(root, '.cache', 'compat-extensions');
  await mkdir(compatRoot, { recursive: true });
  const compatExtension = await mkdtemp(path.join(compatRoot, 'missing-updates-'));
  const compatProfile = await mkdtemp(path.join(profileRoot, 'missing-updates-'));
  let compatContext;
  try {
    await cp(extension, compatExtension, { recursive: true,
      filter: source => !source.split(path.sep).includes('_metadata') });
    const manifestPath = path.join(compatExtension, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.permissions = manifest.permissions.filter(permission => !['alarms', 'notifications'].includes(permission));
    await writeFile(manifestPath, JSON.stringify(manifest));
    compatContext = await chromium.launchPersistentContext(compatProfile, {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', ...nativeArgs, `--disable-extensions-except=${compatExtension}`, `--load-extension=${compatExtension}`]
    });
    compatContext.setDefaultTimeout(15000);
    await compatContext.route('https://api.github.com/repos/salehghotbani/AdBlocker/releases/latest', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ tag_name: 'v9.0.0', draft: false, prerelease: false })
    }));
    const worker = compatContext.serviceWorkers()[0] || await compatContext.waitForEvent('serviceworker');
    const panel = await compatContext.newPage();
    await panel.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
    await panel.waitForFunction(() => !document.getElementById('enabled').disabled);
    assert.equal(await panel.evaluate(() => typeof chrome.alarms?.onAlarm), 'undefined');
    assert.equal(await panel.evaluate(() => typeof chrome.notifications?.onClicked), 'undefined');
    const command = message => panel.evaluate(async message => {
      const response = await chrome.runtime.sendMessage(message);
      if (response.error) throw new Error(response.error);
      return response;
    }, message);
    await panel.locator('#checkUpdates').click();
    await panel.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('9.0.0'));
    const update = (await command({ type: 'getUpdateStatus' })).update;
    assert.equal(update.available, true);
    assert.equal(update.automaticChecks, false);
    assert.equal(update.notificationsAvailable, false);
    assert.equal(await panel.locator('#updateSchedule').textContent(), 'Manual checks');
    assert.match(await panel.locator('#updateStatus').textContent(), /reload the extension/i);
    await compatContext.unrouteAll({ behavior: 'wait' });
    const page = await compatContext.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/missing-updates`);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    await command({ type: 'setEnabled', enabled: false });
    await page.reload();
    await page.waitForFunction(() => window.adScriptLoaded === true);
    await command({ type: 'setEnabled', enabled: true });
    await page.reload();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    const tabId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, page.url());
    await command({ type: 'setPause', tabId, url: page.url(), paused: true });
    await page.waitForFunction(() => window.adScriptLoaded === true);
    await page.reload();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    assert.equal((await command({ type: 'getSettings', tabId })).paused, false);
    assert.equal(await page.evaluate(url => fetch(url, { mode: 'no-cors' }).then(() => true, () => false), adOrigin + '/after-pause'), false);
    console.log('PASS: missing alarms/notifications permissions preserve manual update checks, network controls and pause expiry in the actual browser');
  } finally {
    await compatContext?.close();
    for (const [directory, base] of [[compatProfile, profileRoot], [compatExtension, compatRoot]]) {
      if (path.dirname(path.resolve(directory)) !== path.resolve(base)) throw new Error('Unexpected compatibility test directory');
      await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
        if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
        console.warn(`Windows retained a lock on the isolated compatibility test directory: ${directory}`);
      });
    }
  }
}

// Opening an extension URL in automation does not grant activeTab. Only this
// isolated test copy receives feedback permission to read the native count;
// the shipped manifests must never include that debugging permission.
async function checkPageCounters() {
  const copies = path.join(root, '.cache', 'compat-extensions');
  await mkdir(copies, { recursive: true });
  const copy = await mkdtemp(path.join(copies, 'counters-'));
  const counterProfile = await mkdtemp(path.join(profileRoot, 'counters-'));
  let browser;
  try {
    await cp(extension, copy, { recursive: true, filter: source => !source.split(path.sep).includes('_metadata') });
    const manifestPath = path.join(copy, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    assert.equal(manifest.permissions.includes('declarativeNetRequestFeedback'), false);
    manifest.permissions.push('declarativeNetRequestFeedback');
    await writeFile(manifestPath, JSON.stringify(manifest));
    browser = await chromium.launchPersistentContext(counterProfile, {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', ...nativeArgs, `--disable-extensions-except=${copy}`, `--load-extension=${copy}`]
    });
    browser.setDefaultTimeout(15000);
    const origin = `http://127.0.0.1:${server.address().port}`;
    const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
    const page = await browser.newPage();
    await page.goto(`${origin}/counter-blank`);
    const panel = await browser.newPage();
    const panelUrl = `chrome-extension://${new URL(worker.url()).host}/popup.html`;
    await panel.goto(panelUrl);
    const command = message => panel.evaluate(async message => {
      const result = await chrome.runtime.sendMessage(message);
      if (result.error) throw new Error(result.error);
      return result;
    }, message);
    await command({ type: 'getSettings' });
    const tabId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, page.url());
    const read = (id = tabId, url = page.url()) => command({ type: 'getCounters', tabId: id, url }).then(result => result.counters);
    const waitForCounters = async (expected, id = tabId, url = page.url()) => {
      // Native badge updates can arrive after request/DOM completion. A single
      // matching sample need not be settled; require three consecutive reads.
      const deadline = Date.now() + 15000, samples = [];
      let consecutive = 0;
      while (Date.now() < deadline) {
        const actual = await read(id, url); samples.push(actual);
        consecutive = actual.requests === expected.requests && actual.placements === expected.placements ? consecutive + 1 : 0;
        if (consecutive === 3) return actual;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const native = await panel.evaluate(id => chrome.declarativeNetRequest.getMatchedRules({ tabId: id }), id);
      throw new Error(`Native counters did not settle: ${JSON.stringify({ expected, samples: samples.slice(-10), native })}`);
    };
    await panel.waitForFunction(async ({ tabId, url }) => {
      const result = await chrome.runtime.sendMessage({ type: 'getCounters', tabId, url });
      return result.counters?.requests === 0 && result.counters?.placements === 0;
    }, { tabId, url: page.url() });
    await page.goto(`${origin}/counter-fixture`);
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    await waitForCounters({ requests: 2, placements: 2 });
    assert.deepEqual(await read(), { requests: 2, placements: 2 });
    assert.deepEqual(await read(), { requests: 2, placements: 2 }, 'reads never increment counts');
    await panel.evaluate(() => chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true }));
    assert.deepEqual(await read(), { requests: 2, placements: 2 }, 'reinitialization does not reset the browser count');
    await page.bringToFront();
    await panel.reload();
    await panel.waitForFunction(() => document.getElementById('requestCount').textContent === '2' &&
      document.getElementById('placementCount').textContent === '2');
    await page.evaluate(() => {
      const wrapper = document.createElement('div'); wrapper.className = 'textads adsbox'; wrapper.id = 'new-ad';
      wrapper.innerHTML = '<ins class="adsbygoogle">New ad</ins>'; document.body.append(wrapper);
    });
    await panel.waitForFunction(() => document.getElementById('placementCount').textContent === '3');
    await page.evaluate(() => document.getElementById('new-ad').remove());
    assert.deepEqual(await read(), { requests: 2, placements: 2 });
    await page.reload();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    await waitForCounters({ requests: 2, placements: 2 });
    assert.deepEqual(await read(), { requests: 2, placements: 2 }, 'same-URL reload resets native counts');
    const other = await browser.newPage();
    await other.goto(`${origin}/counter-other`);
    await other.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
    await other.evaluate(url => fetch(url).catch(() => {}), adOrigin + '/extra');
    const otherId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(tab => tab.url === url).id, other.url());
    await waitForCounters({ requests: 3, placements: 2 }, otherId, other.url());
    assert.deepEqual(await read(otherId, other.url()), { requests: 3, placements: 2 });
    assert.deepEqual(await read(), { requests: 2, placements: 2 }, 'counts are isolated by tab');
    for (const [type, scope] of [['setSite', { host: '127.0.0.1' }], ['setUrl', { url: page.url() }]]) {
      await command({ type, ...scope, allowed: true });
      await page.reload();
      await page.waitForFunction(() => window.remoteAdLoaded && window.pageAdLoaded);
      await waitForCounters({ requests: 0, placements: 0 });
      assert.deepEqual(await read(), { requests: 0, placements: 0 }, 'allowed requests do not inflate native count');
      await command({ type, ...scope, allowed: false });
      await page.reload();
      await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
      await waitForCounters({ requests: 2, placements: 2 });
      assert.deepEqual(await read(), { requests: 2, placements: 2 });
    }
    await command({ type: 'setEnabled', enabled: false });
    await page.reload();
    await page.waitForFunction(() => window.remoteAdLoaded && window.pageAdLoaded);
    assert.equal((await read()).placements, 0);
    await command({ type: 'setEnabled', enabled: true });
    await page.goto(`${origin}/counter-blank`);
    await panel.waitForFunction(async ({ tabId, url }) => {
      const result = await chrome.runtime.sendMessage({ type: 'getCounters', tabId, url });
      return result.counters?.requests === 0 && result.counters?.placements === 0;
    }, { tabId, url: page.url() });
    const storage = await panel.evaluate(async () => ({ local: await chrome.storage.local.get(null), session: await chrome.storage.session.get(null) }));
    assert.equal(/counter|placements|requests/i.test(JSON.stringify(storage)), false, 'no counter history is persisted');
    console.log('PASS: actual native/UI counters, nested deduplication, dynamic updates, navigation resets, tab isolation, site/URL/global exceptions and no stored counter history');
  } finally {
    await browser?.close();
    for (const [directory, base] of [[counterProfile, profileRoot], [copy, copies]]) {
      if (path.dirname(path.resolve(directory)) !== path.resolve(base)) throw new Error('Unexpected counter test directory');
      await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
        if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
        console.warn(`Windows retained a lock on the isolated counter test directory: ${directory}`);
      });
    }
  }
}
