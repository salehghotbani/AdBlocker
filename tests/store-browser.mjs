import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const profiles = path.join(root, '.cache/store-profiles');
const captures = path.join(root, 'artifacts/store-captures');
await mkdir(profiles, { recursive: true }); await mkdir(captures, { recursive: true });
const fixture = await readFile(path.join(root, 'tests/fixtures/reading-store-demo.html'), 'utf8');
for (const channel of ['chrome', 'edge']) {
  const profile = await mkdtemp(path.join(profiles, `${channel}-`));
  const extension = path.join(root, 'dist/stores', channel);
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
      viewport: { width: 1280, height: 800 }, ignoreDefaultArgs: ['--disable-extensions'],
      args: ['--no-sandbox', `--load-extension=${extension}`, `--disable-extensions-except=${extension}`]
    });
    context.setDefaultTimeout(15000);
    let releaseRequests = 0;
    await context.route('https://api.github.com/**', route => { releaseRequests++; return route.abort(); });
    await context.route('https://reading-demo.example/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const errors = []; worker.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const id = new URL(worker.url()).host;
    const page = await context.newPage(); await page.goto('https://reading-demo.example/');
    await page.waitForFunction(() => getComputedStyle(document.getElementById('top-ad')).display === 'none');
    assert.equal(await page.locator('article').isVisible(), true);
    await page.locator('#search').click(); assert.match(await page.locator('#search-result').textContent(), /still works/);
    const panel = await context.newPage();
    await page.bringToFront(); await panel.goto(`chrome-extension://${id}/popup.html`);
    await panel.waitForFunction(() => document.getElementById('placementCount').textContent === '3');
    assert.equal(await panel.locator('#updateSchedule').textContent(), 'Managed by browser');
    assert.equal(await panel.locator('#checkUpdates').textContent(), 'Open extension manager');
    assert.equal(await panel.locator('#updateLink').isVisible(), false);
    const command = message => panel.evaluate(message => chrome.runtime.sendMessage(message), message);
    assert.equal((await command({ type: 'getUpdateStatus' })).update.managedByStore, true);
    const manifest = await panel.evaluate(() => chrome.runtime.getManifest());
    assert.equal(manifest.permissions.includes('alarms'), false);
    assert.equal(manifest.permissions.includes('notifications'), false);
    await page.screenshot({ path: path.join(captures, `${channel}-reading-filtered.png`) });
    await panel.setViewportSize({ width: 390, height: 960 });
    await panel.getByRole('button', { name: 'Light theme', exact: true }).click();
    await panel.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await panel.evaluate(() => document.fonts.ready);
    const scope = await panel.locator('.scope-card').boundingBox();
    await writeFile(path.join(captures, `${channel}-layout.json`), JSON.stringify({ width:390, scopeBottom:scope.y+scope.height })+'\n');
    await panel.screenshot({ path: path.join(captures, `${channel}-popup-light.png`), fullPage: true, animations: 'disabled' });
    await panel.getByRole('button', { name: 'Dark theme', exact: true }).click();
    await panel.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await panel.screenshot({ path: path.join(captures, `${channel}-popup-dark.png`), fullPage: true, animations: 'disabled' });
    const support = await context.newPage(); await support.goto(`chrome-extension://${id}/support.html`);
    await support.waitForFunction(() => document.readyState === 'complete');
    assert.match(await support.locator('h1').textContent(), /web/);
    const config = JSON.parse(await readFile(path.join(root, 'config/support.json'), 'utf8'));
    assert.equal(await support.locator('#financial').isVisible(), Boolean(config.url || config.crypto.length));
    assert.equal(await support.locator('.crypto-card').count(), config.crypto.length);
    assert.equal(await support.locator('script[src^="https:"]').count(), 0);
    await support.screenshot({ path: path.join(captures, `${channel}-support.png`) });
    await support.close();
    await page.bringToFront(); await panel.reload();
    await panel.waitForFunction(() => !document.getElementById('siteEnabled').disabled);
    await panel.locator('#siteEnabled').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('top-ad')).display !== 'none');
    await panel.waitForFunction(() => document.documentElement.dataset.protection === 'off');
    await panel.waitForFunction(() => !document.getElementById('siteEnabled').disabled &&
      document.getElementById('placementCount').textContent === '0');
    await panel.screenshot({ path: path.join(captures, `${channel}-popup-paused.png`), fullPage: true, animations: 'disabled' });
    await page.screenshot({ path: path.join(captures, `${channel}-reading-unfiltered.png`) });
    await panel.locator('#siteEnabled').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('top-ad')).display === 'none');
    assert.equal(releaseRequests, 0);
    if (channel === 'edge') {
      const manager = await command({ type: 'checkForUpdates' });
      assert.equal(manager.error, undefined, 'actual Edge accepts its native extension-manager URL');
      assert.equal(manager.update.managedByStore, true);
    }
    assert.equal(errors.length, 0, errors.join('\n'));
    console.log(`PASS: ${channel} store build runs, filters reading demo, preserves search, supports exceptions/counters, loads support and never fetches releases`);
  } finally {
    await context?.close();
    if (path.dirname(path.resolve(profile)) !== path.resolve(profiles)) throw new Error('Unexpected store test profile');
    await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
      if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
      console.warn(`Windows retained a lock on isolated store profile: ${profile}`);
    });
  }
}
await writeFile(path.join(captures, 'provenance.json'), JSON.stringify({
  version: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version,
  content: 'Local English reading demonstration; actual store-edition popup and filtering; no live-site screenshots or mock counters.',
  runtime: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  firefox: 'This harness exercises Chromium only; Firefox is tested separately by tests/firefox-runtime.mjs.'
}, null, 2) + '\n');
