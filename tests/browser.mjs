import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import http from 'node:http';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const profile = await mkdtemp(path.join(os.tmpdir(), 'adblocker-test-'));
const extension = path.join(root, 'dist/chrome');
const html = `<!doctype html><html><body>
<main><h1>Real article</h1><p id="story">The main story stays visible.</p>
<video id="player" controls></video><form id="login"><input placeholder="Email"></form></main>
<div class="banner sponsored" id="ordinary">Ordinary site content</div>
<ins class="adsbygoogle" id="ad" style="display:inline-block">Ad</ins>
<div data-ad-client="test" data-ad-slot="slot" id="protected"><article>Real content</article></div>
<iframe id="safe-frame" src="/frame?reference=//ad.doubleclick.net/"></iframe>
<script src="https://ads.doubleclick.net/adblocker-fixture.js"></script>
</body></html>`;
const server = http.createServer((req, res) => {
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
  context.on('console', message => {
    if (message.type() === 'error') console.error('Browser:', message.text());
  });
  // Satisfy external fixtures locally; no external website is contacted by this test.
  await context.route('https://ads.doubleclick.net/**', route => route.fulfill({
    contentType: 'application/javascript', body: 'window.adScriptLoaded = true;'
  }));
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    try { worker = await context.waitForEvent('serviceworker'); }
    catch { throw new Error('Extension did not start. Check browser extension errors and managed policies: this test requires unpacked extensions to be permitted. No DNR validation completed.'); }
  }
  const extensionId = new URL(worker.url()).host;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  const command = message => popup.evaluate(async message => {
    const result = await chrome.runtime.sendMessage(message);
    if (result.error) throw new Error(result.error);
    return result;
  }, message);
  const page = await context.newPage();
  const failures = [];
  page.on('requestfailed', req => failures.push({ url: req.url(), error: req.failure()?.errorText }));
  const url = `http://127.0.0.1:${server.address().port}`;
  await page.goto(url);
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  assert.equal(await page.evaluate(() => window.adScriptLoaded), undefined);
  assert.ok(failures.some(failure => failure.url.includes('adblocker-fixture.js') && failure.error.includes('BLOCKED')),
    `Expected actual DNR blocking; got ${JSON.stringify(failures)}`);
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
  assert.equal(await page.locator('#ad').isVisible(), true);
  console.log('PASS: re-enable site and global disable both affect network and cosmetics');
  await command({ type: 'setEnabled', enabled: true });
  const saved = await command({ type: 'getSettings' });
  assert.equal(saved.settings.enabled, true);
  await command({ type: 'setUrl', url: url + '/exact?campaign=one#section', allowed: true });
  await page.goto(url + '/exact?campaign=one');
  assert.equal(await page.evaluate(() => window.adScriptLoaded), true);
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
  await popup.bringToFront();
  await popup.reload();
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  assert.equal(await popup.locator('#enabled').isChecked(), true);
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  await popup.setViewportSize({ width: 350, height: 590 });
  await popup.screenshot({ path: path.join(root, 'artifacts/popup.png') });
  console.log('PASS: popup loads and reads persisted settings; screenshot saved');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
