// Browser DOM integration without installing an extension. Some managed browsers
// forbid unpacked extensions; this harness does NOT claim to exercise DNR APIs.
import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const settingsScript = await readFile(new URL('extension/settings.js', root), 'utf8');
const contentScript = await readFile(new URL('extension/content.js', root), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  await page.route('https://fixture.example/**', route => route.fulfill({
    contentType: 'text/html', body: `<!doctype html><main><h1>Article</h1><p id="story">Main content</p>
    <video id="player" controls></video><form id="login"><input></form></main>
    <div id="ordinary" class="banner sponsored">Useful banner</div>
    <ins id="ad" class="adsbygoogle" style="display:inline-block!important">Advertisement</ins>
    <div data-ad-slot="a" data-ad-client="b" id="protected"><article>Useful story</article></div>
    <iframe id="safe" src="about:blank?reference=//ad.doubleclick.net/"></iframe>`
  }));
  await page.goto('https://fixture.example/');
  await page.evaluate(() => {
    window.chrome = { runtime: {
      onMessage: { addListener(listener) { window.contentListener = listener; } },
      async sendMessage() { return { settings: { enabled: true, allowedSites: [] } }; }
    } };
  });
  await page.addScriptTag({ content: settingsScript });
  await page.addScriptTag({ content: contentScript });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  for (const id of ['story', 'player', 'login', 'ordinary', 'protected', 'safe']) {
    assert.equal(await page.locator(`#${id}`).isVisible(), true, `${id} must be preserved`);
  }
  console.log('PASS: ad hidden; main article, player, form, banner, safe iframe retained');
  await page.evaluate(() => {
    const el = document.createElement('ins'); el.className = 'adsbygoogle'; el.id = 'dynamic';
    document.body.append(el);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display === 'none');
  await page.evaluate(() => {
    const article = document.createElement('article'); article.textContent = 'Real new story';
    document.getElementById('dynamic').append(article);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display !== 'none');
  console.log('PASS: dynamically added ad hidden, then restored when real article is inserted');
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: {
    enabled: true, allowedSites: ['fixture.example']
  } }));
  assert.equal(await page.locator('#ad').isVisible(), true);
  assert.deepEqual(await page.locator('#ad').evaluate(el => [el.style.getPropertyValue('display'), el.style.getPropertyPriority('display')]), ['inline-block', 'important']);
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: { enabled: true, allowedSites: [] } }));
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: { enabled: false, allowedSites: [] } }));
  assert.equal(await page.locator('#ad').isVisible(), true);
  console.log('PASS: site exception and global disable restore original inline styles');
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: {
    enabled: true, allowedSites: [], allowedUrls: ['https://fixture.example/']
  } }));
  assert.equal(await page.locator('#ad').isVisible(), true);
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: {
    enabled: true, allowedSites: [], allowedUrls: ['https://fixture.example/other']
  } }));
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  console.log('PASS: exact URL exception restores content without disabling a different path');
  await page.evaluate(() => {
    window.contentListener({ type: 'settingsChanged', settings: { enabled: false } });
    dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ad')).display === 'none');
  console.log('PASS: back/forward cache restoration refreshes an expired pause');

  // Render the real popup using a mock transport only; logic and styles are real.
  const popup = await browser.newPage({ viewport: { width: 350, height: 590 } });
  await popup.route('https://popup.example/**', async route => {
    const file = new URL(route.request().url()).pathname.slice(1) || 'popup.html';
    if (!['popup.html', 'popup.css', 'popup.js', 'settings.js'].includes(file)) return route.abort();
    await route.fulfill({ body: await readFile(new URL(`extension/${file}`, root)),
      contentType: file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript' });
  });
  await popup.addInitScript(() => {
    let settings = { enabled: true, allowedSites: [], allowedUrls: [] };
    let paused = false;
    window.chrome = {
      runtime: { async sendMessage(message) {
        if (message.type === 'setEnabled') settings.enabled = message.enabled;
        if (message.type === 'setSite') settings.allowedSites = message.allowed ? [message.host] : [];
        if (message.type === 'clearSites') settings.allowedSites = [];
        if (message.type === 'setUrl') settings.allowedUrls = message.allowed ? [message.url] : [];
        if (message.type === 'clearUrls') settings.allowedUrls = [];
        if (message.type === 'setPause') paused = message.paused;
        return { settings, paused };
      } },
      tabs: { async query() { return [{ id: 1, url: 'https://example.com/story' }]; }, async reload() {} }
    };
  });
  await popup.goto('https://popup.example/');
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  assert.equal(await popup.locator('#enabled').isChecked(), true);
  await popup.locator('#siteEnabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('استثنا'));
  await popup.locator('#clear').click();
  await popup.waitForFunction(() => document.getElementById('siteEnabled').checked);
  await popup.locator('#enabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('خاموش'));
  await popup.locator('#enabled').check();
  await popup.waitForFunction(() => document.getElementById('status').textContent === 'مسدودسازی فعال است');
  await popup.locator('#urlEnabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('URL'));
  assert.equal(await popup.locator('#pause').isDisabled(), true);
  await popup.locator('#clearUrls').click();
  await popup.waitForFunction(() => document.getElementById('urlEnabled').checked);
  await popup.locator('#pause').click();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('موقت'));
  await popup.locator('#pause').click();
  await popup.waitForFunction(() => document.getElementById('status').textContent === 'مسدودسازی فعال است');
  await mkdir(new URL('artifacts/', root), { recursive: true });
  await popup.screenshot({ path: new URL('artifacts/popup.png', root).pathname, fullPage: true });
  console.log('PASS: real Persian popup renders; site/global switches and reset work with mocked transport');
  console.log('PASS: permanent URL toggle, URL reset, one-time pause and resume controls work');
} finally { await browser.close(); }
