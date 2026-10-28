// Browser DOM integration without installing an extension. Some managed browsers
// forbid unpacked extensions; this harness does NOT claim to exercise DNR APIs.
import { chromium } from 'playwright';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const settingsScript = await readFile(new URL('extension/settings.js', root), 'utf8');
const contentScript = await readFile(new URL('extension/content.js', root), 'utf8');
const { version } = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
await mkdir(new URL('.cache/dom-profiles/', root), { recursive: true });
const profile = await mkdtemp(fileURLToPath(new URL('.cache/dom-profiles/profile-', root)));
const context = await chromium.launchPersistentContext(profile, { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', locale: 'fa-IR', headless: true, args: ['--no-sandbox'] });
try {
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  await page.route('https://fixture.example/**', route => route.fulfill({
    contentType: 'text/html', body: `<!doctype html><main><h1>Article</h1><p id="story">Main content</p>
    <video id="player" controls></video><form id="login"><input></form></main>
    <div id="ordinary" class="banner sponsored">Useful banner</div>
    <div id="foreign-abdd" class="abdd">Unrelated content on another host</div>
    <div id="kaprila_soft98_ir_side">Unrelated ID on another host</div>
    <div id="right"><div class="sidesection" id="foreign-promo"><a id="upperfeatureshowcaselink">Useful link on another host</a></div>
    <div id="vidpos"><video controls></video></div></div>
    <ins id="ad" class="adsbygoogle" style="display:inline-block!important">Advertisement</ins>
    <div id="static-ad" class="adbox banner_ads adsbox" style="display:block!important">Ad</div>
    <div id="text-content" class="textads">Useful text with a single ambiguous class</div>
    <div id="compound-protected" class="textads adsbox"><article>Useful story</article></div>
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
  await page.waitForFunction(() => document.getElementById('static-ad').offsetHeight === 0);
  for (const id of ['story', 'player', 'login', 'ordinary', 'protected', 'safe', 'text-content', 'compound-protected',
    'foreign-abdd', 'kaprila_soft98_ir_side', 'foreign-promo', 'vidpos']) {
    assert.equal(await page.locator(`#${id}`).isVisible(), true, `${id} must be preserved`);
  }
  console.log('PASS: ad hidden; main article, player, form, banner, safe iframe retained');
  await page.evaluate(() => {
    const el = document.createElement('ins'); el.className = 'adsbygoogle'; el.id = 'dynamic';
    document.body.append(el);
    const box = document.createElement('div'); box.id = 'dynamic-box';
    box.className = 'textads banner-ads banner_ads ad-unit afs_ads ad-zone ad-space adsbox';
    box.textContent = 'Ad'; document.body.append(box);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display === 'none');
  await page.waitForFunction(() => document.getElementById('dynamic-box').offsetHeight === 0);
  await page.evaluate(() => document.getElementById('dynamic-box').className = 'ordinary');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic-box')).display !== 'none');
  await page.evaluate(() => {
    const article = document.createElement('article'); article.textContent = 'Real new story';
    document.getElementById('dynamic').append(article);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display !== 'none');
  console.log('PASS: dynamically added ad hidden, then restored when real article is inserted');
  await page.evaluate(() => document.querySelector('#dynamic article').remove());
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display === 'none');
  await page.evaluate(() => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div id="changing-role" role="main">Useful content</div>';
    document.getElementById('dynamic').append(wrapper);
  });
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display !== 'none');
  await page.evaluate(() => document.getElementById('changing-role').removeAttribute('role'));
  await page.waitForFunction(() => getComputedStyle(document.getElementById('dynamic')).display === 'none');
  console.log('PASS: removing protected content or its role reapplies filtering to ancestor ad boxes');
  await page.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: {
    enabled: true, allowedSites: ['fixture.example']
  } }));
  assert.equal(await page.locator('#ad').isVisible(), true);
  assert.deepEqual(await page.locator('#static-ad').evaluate(el => [el.style.display, el.style.getPropertyPriority('display')]), ['block', 'important']);
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

  // Minimal structures observed on Soft98, without copying site articles or ads.
  const soft98 = await context.newPage();
  const soft98Fixture = `<!doctype html><main><h1>Downloads</h1><article id="download-post">
    <a id="download-link" href="/files/example.zip">Download</a><p>Software description</p></article></main>
    <form id="search"><input></form><div class="abdd" id="abddh" style="display:flex!important">Direct banner</div>
    <div class="abdd" id="abdds"><div id="kaprila_soft98_ir_related-top-post">Related ads</div></div>
    <aside><section id="useful-sidebar">Useful software list</section><div id="sbds"><section class="cbdd">
    <header>Advertising</header><div class="cbddb"><div class="abdds"><div id="kaprila_soft98_ir_side">Ad</div></div></div>
    </section></div><div class="cbdd" id="hosting-ad"><header>Hosting promotion</header>
    <div class="cbddb abdd">Direct banner</div></div><div class="cbdd" id="useful-card"><div class="cbddb">Useful card</div></div></aside>
    <div class="abdd" id="protected-soft98"><article>Real article</article></div>`;
  await soft98.route('https://soft98.ir/**', route => route.fulfill({ contentType: 'text/html', body: soft98Fixture }));
  await soft98.goto('https://soft98.ir/');
  await soft98.evaluate(() => {
    window.chrome = { runtime: {
      onMessage: { addListener(listener) { window.contentListener = listener; } },
      async sendMessage() { return { settings: { enabled: true } }; }
    } };
  });
  await soft98.addScriptTag({ content: settingsScript });
  await soft98.addScriptTag({ content: contentScript });
  const soft98Hidden = ['abddh', 'abdds', 'sbds', 'hosting-ad'];
  await soft98.waitForFunction(ids => ids.every(id => getComputedStyle(document.getElementById(id)).display === 'none'), soft98Hidden);
  for (const id of ['download-post', 'download-link', 'search', 'useful-sidebar', 'useful-card', 'protected-soft98']) {
    assert.equal(await soft98.locator(`#${id}`).isVisible(), true, id);
  }
  await soft98.evaluate(() => {
    const placement = document.createElement('div'); placement.id = 'kaprila_soft98_ir_dynamic';
    placement.textContent = 'Delayed ad'; document.body.append(placement);
  });
  await soft98.waitForFunction(() => getComputedStyle(document.getElementById('kaprila_soft98_ir_dynamic')).display === 'none');
  await soft98.evaluate(() => {
    const content = document.createElement('article'); content.textContent = 'Real new content';
    document.getElementById('hosting-ad').append(content);
  });
  await soft98.waitForFunction(() => getComputedStyle(document.getElementById('hosting-ad')).display !== 'none');
  await soft98.evaluate(() => document.querySelector('#hosting-ad article').remove());
  await soft98.waitForFunction(() => getComputedStyle(document.getElementById('hosting-ad')).display === 'none');
  for (const settings of [{ enabled: false }, { enabled: true, allowedSites: ['soft98.ir'] },
    { enabled: true, allowedUrls: ['https://soft98.ir/'] }]) {
    await soft98.evaluate(settings => window.contentListener({ type: 'settingsChanged', settings }), settings);
    assert.deepEqual(await soft98.locator('#abddh').evaluate(el => [el.style.display, el.style.getPropertyPriority('display')]), ['flex', 'important']);
    for (const id of soft98Hidden) assert.equal(await soft98.locator(`#${id}`).isVisible(), true, id);
    await soft98.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: { enabled: true } }));
    await soft98.waitForFunction(ids => ids.every(id => getComputedStyle(document.getElementById(id)).display === 'none'), soft98Hidden);
  }
  await soft98.close();
  console.log('PASS: Soft98 direct, Kaprila and hosting slots collapse; dynamic ads, protected content and exact style restoration work; selectors stay off other hosts');

  const w3 = await context.newPage();
  const w3Fixture = await readFile(new URL('tests/fixtures/w3schools.html', root), 'utf8');
  await w3.route('https://www.w3schools.com/**', route => route.fulfill({ contentType: 'text/html', body: w3Fixture }));
  await w3.goto('https://www.w3schools.com/html/default.asp');
  await w3.evaluate(() => { window.chrome = { runtime: {
    onMessage: { addListener(listener) { window.contentListener = listener; } },
    async sendMessage() { return { settings: { enabled: true } }; }
  } }; });
  await w3.addScriptTag({ content: settingsScript });
  await w3.addScriptTag({ content: contentScript });
  const w3Ads = ['sale-slot', 'footer-skyscraper', 'vidpos', 'stickypos', 'mainLeaderboard', 'midcontentadcontainer', 'bottomads'];
  await w3.waitForFunction(ids => ids.every(id => getComputedStyle(document.getElementById(id)).display === 'none'), w3Ads);
  for (const id of ['topnav', 'lesson', 'code-sample', 'tryitform', 'iframeResult', 'lesson-video', 'lesson-audio', 'yt_container', 'social-links', 'useful-sidebar']) {
    assert.equal(await w3.locator(`#${id}`).isVisible(), true, id);
  }
  await w3.locator('#editor').fill('Still editable');
  await w3.locator('#run').click();
  assert.equal(await w3.locator('#preview').textContent(), 'Still editable');
  await w3.evaluate(() => {
    document.getElementById('vidpos').remove();
    const slot = document.createElement('div'); slot.id = 'vidpos';
    slot.innerHTML = '<video controls></video>'; document.getElementById('right').append(slot);
  });
  await w3.waitForFunction(() => getComputedStyle(document.getElementById('vidpos')).display === 'none');
  await w3.evaluate(() => {
    const article = document.createElement('article'); article.id = 'slot-article'; article.textContent = 'Real lesson';
    document.getElementById('stickypos').append(article);
  });
  await w3.waitForFunction(() => getComputedStyle(document.getElementById('stickypos')).display !== 'none');
  await w3.evaluate(() => document.getElementById('slot-article').remove());
  await w3.waitForFunction(() => getComputedStyle(document.getElementById('stickypos')).display === 'none');
  for (const settings of [{ enabled: false }, { enabled: true, allowedSites: ['w3schools.com'] },
    { enabled: true, allowedUrls: ['https://www.w3schools.com/html/default.asp'] }]) {
    await w3.evaluate(settings => window.contentListener({ type: 'settingsChanged', settings }), settings);
    for (const id of w3Ads) assert.equal(await w3.locator(`#${id}`).isVisible(), true, id);
    assert.deepEqual(await w3.locator('#sale-slot').evaluate(el => [el.style.display, el.style.getPropertyPriority('display')]), ['flex', 'important']);
    await w3.evaluate(() => window.contentListener({ type: 'settingsChanged', settings: { enabled: true } }));
    await w3.waitForFunction(ids => ids.every(id => getComputedStyle(document.getElementById(id)).display === 'none'), w3Ads);
  }
  await w3.close();
  console.log('PASS: W3Schools promotion/ad-media slots collapse, lessons/editor/preview/tutorial media and social links remain usable, dynamic slots and exceptions work');

  // Render the real popup using a mock transport only; logic and styles are real.
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 390, height: 600 });
  await popup.emulateMedia({ colorScheme: 'light' });
  await popup.route('https://popup.example/**', async route => {
    const file = new URL(route.request().url()).pathname.slice(1) || 'popup.html';
    if (!['popup.html', 'popup.css', 'popup.js', 'settings.js', 'updates.js', 'theme.js'].includes(file) &&
        !/^icons\/(16|32|48|128)\.png$/.test(file)) return route.abort();
    await route.fulfill({ body: await readFile(new URL(`extension/${file}`, root)),
      contentType: file.endsWith('.png') ? 'image/png' : file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'application/javascript' });
  });
  await popup.addInitScript(({ version }) => {
    window.popupReloads = [];
    window.mockUpdate = { currentVersion: version, latestTag: null, available: false, lastChecked: 0, error: null };
    window.fixtureTabUrl = 'https://example.com/story';
    let settings = JSON.parse(localStorage.getItem('fixture-settings') ||
      '{"enabled":true,"allowedSites":[],"allowedUrls":[]}');
    let paused = false;
    window.chrome = {
      storage: { local: {
        async get() { return { theme: localStorage.getItem('theme') }; },
        async set({ theme }) {
          if (window.rejectThemeSave) throw new Error('Simulated storage failure');
          localStorage.setItem('theme', theme);
        }
      } },
      runtime: { getManifest() { return { version }; }, async sendMessage(message) {
        if (message.type === 'getUpdateStatus' || message.type === 'checkForUpdates') return { update: window.mockUpdate };
        if (message.type === 'setEnabled') settings.enabled = message.enabled;
        if (message.type === 'setSite') settings.allowedSites = message.allowed ? [message.host] : [];
        if (message.type === 'clearSites') settings.allowedSites = [];
        if (message.type === 'setUrl') settings.allowedUrls = message.allowed ? [message.url] : [];
        if (message.type === 'clearUrls') settings.allowedUrls = [];
        if (message.type === 'setPause') { paused = message.paused; window.popupReloads.push(1); }
        localStorage.setItem('fixture-settings', JSON.stringify(settings));
        return { settings, paused };
      } },
      tabs: { async query() { return [{ id: 1, url: window.fixtureTabUrl }]; },
        async get() { return { id: 1, url: window.fixtureTabUrl }; },
        async reload(id) { window.popupReloads.push(id); } }
    };
  }, { version });
  await popup.goto('https://popup.example/');
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  const assertProtection = async expected => {
    await popup.waitForFunction(expected => {
      const channels = getComputedStyle(document.getElementById('reload')).backgroundColor
        .match(/[\d.]+/g).slice(0, 3).map(Number);
      const neutral = channels.every(value => value === channels[0]);
      return document.documentElement.dataset.protection === expected && neutral === (expected === 'off');
    }, expected);
    const appearance = await popup.evaluate(() => {
      const color = (selector, property) => getComputedStyle(document.querySelector(selector))[property]
        .match(/[\d.]+/g).slice(0, 3).map(Number);
      return {
        background: color('body', 'backgroundColor'),
        accent: color('#reload', 'backgroundColor'),
        text: color('#reload', 'color'),
        filter: getComputedStyle(document.querySelector('.brand-logo')).filter
      };
    });
    const neutral = color => color.every(value => value === color[0]);
    assert.equal(neutral(appearance.accent), expected === 'off', 'accent reflects actual page protection');
    if (expected === 'off') {
      assert.ok(neutral(appearance.background), 'disabled background is gray');
      assert.ok(neutral(appearance.text), 'disabled text is gray');
    }
    assert.equal(appearance.filter, expected === 'off' ? 'grayscale(1)' : 'none');
  };
  await assertProtection('on');
  assert.equal(await popup.evaluate(() => navigator.language), 'fa-IR');
  assert.equal(await popup.locator('html').getAttribute('lang'), 'en');
  assert.equal(await popup.locator('html').getAttribute('dir'), 'ltr');
  assert.equal(await popup.locator('#totalCount').textContent(), '0');
  assert.equal(/[\u0600-\u06ff]/u.test(await popup.locator('body').innerText()), false, 'English is the default even in a Persian browser locale');
  assert.equal(await popup.locator('#version').textContent(), `v${version}`);
  await popup.waitForFunction(() => [...document.querySelectorAll('.brand-logo')]
    .every(image => image.complete && image.naturalWidth === 128));
  assert.equal(await popup.locator('.brand-logo').first().evaluate(image => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, 1, 1).data[3];
  }), 0, 'logo background is transparent');
  await popup.emulateMedia({ colorScheme: 'dark' });
  await popup.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await popup.emulateMedia({ colorScheme: 'light' });
  await popup.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  assert.equal(await popup.locator('#enabled').isChecked(), true);
  await popup.locator('#exceptions summary').click();
  await popup.locator('#siteEnabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('excluded'));
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 1, 'site change reloads once without confirmation');
  await popup.getByRole('button', { name: 'Light theme', exact: true }).click();
  await popup.waitForFunction(() => localStorage.getItem('theme') === 'light');
  await assertProtection('off');
  await mkdir(new URL('artifacts/', root), { recursive: true });
  await popup.screenshot({ path: fileURLToPath(new URL('artifacts/popup-disabled-light.png', root)), fullPage: true, animations: 'disabled' });
  await popup.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await popup.waitForFunction(() => localStorage.getItem('theme') === 'dark');
  await assertProtection('off');
  await popup.screenshot({ path: fileURLToPath(new URL('artifacts/popup-disabled-dark.png', root)), fullPage: true, animations: 'disabled' });
  await popup.reload();
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => localStorage.getItem('theme')), 'dark', 'gray state preserves theme preference');
  await popup.locator('#exceptions summary').click();
  await popup.locator('#clear').click();
  await popup.waitForFunction(() => document.getElementById('siteEnabled').checked);
  await assertProtection('on');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 1, 'clearing the current exception reloads after reopening');
  await popup.locator('#enabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('off'));
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 2, 'global change reloads current page once');
  await popup.locator('#enabled').check();
  await popup.waitForFunction(() => document.getElementById('status').textContent === 'Protection is on');
  await assertProtection('on');
  await popup.locator('#urlEnabled').uncheck();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('URL'));
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 4, 'URL exception reloads current page');
  assert.equal(await popup.locator('#pause').isDisabled(), true);
  await popup.locator('#clearUrls').click();
  await popup.waitForFunction(() => document.getElementById('urlEnabled').checked);
  await assertProtection('on');
  await popup.locator('#pause').click();
  await popup.waitForFunction(() => document.getElementById('status').textContent.includes('Temporarily'));
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 6, 'pause is reloaded only by the background');
  await popup.locator('#pause').click();
  await popup.waitForFunction(() => document.getElementById('status').textContent === 'Protection is on');
  await assertProtection('on');
  await popup.locator('#exceptions summary').click();
  await popup.emulateMedia({ colorScheme: 'dark' });
  await popup.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await popup.getByRole('button', { name: 'Light theme', exact: true }).focus();
  await popup.keyboard.press('Enter');
  await popup.waitForFunction(() => localStorage.getItem('theme') === 'light');
  const lightBackground = await popup.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);
  await popup.emulateMedia({ colorScheme: 'light' });
  await popup.emulateMedia({ colorScheme: 'dark' });
  assert.equal(await popup.locator('html').getAttribute('data-theme'), 'light');
  await popup.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await popup.waitForFunction(() => localStorage.getItem('theme') === 'dark');
  await popup.reload();
  await popup.waitForFunction(() => !document.querySelector('[data-theme-choice="dark"]').disabled);
  assert.equal(await popup.locator('html').getAttribute('data-theme'), 'dark');
  assert.equal(await popup.getByRole('button', { name: 'Dark theme', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.notEqual(await popup.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), lightBackground);
  assert.equal(await popup.locator('#enabled').isChecked(), true, 'theme changes preserve blocking settings');
  assert.equal(await popup.locator('#urlEnabled').isChecked(), true);
  assert.equal(await popup.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
  await mkdir(new URL('artifacts/', root), { recursive: true });
  await popup.screenshot({ path: fileURLToPath(new URL('artifacts/popup-dark.png', root)), fullPage: true, animations: 'disabled' });
  await popup.getByRole('button', { name: 'Light theme', exact: true }).click();
  await popup.waitForFunction(() => localStorage.getItem('theme') === 'light');
  await popup.reload();
  await popup.waitForFunction(() => !document.querySelector('[data-theme-choice="light"]').disabled);
  assert.equal(await popup.locator('html').getAttribute('data-theme'), 'light');
  await popup.screenshot({ path: fileURLToPath(new URL('artifacts/popup-light.png', root)), fullPage: true, animations: 'disabled' });
  await popup.screenshot({ path: fileURLToPath(new URL('artifacts/popup.png', root)), fullPage: true, animations: 'disabled' });
  await popup.evaluate(() => { window.rejectThemeSave = true; });
  await popup.getByRole('button', { name: 'Dark theme', exact: true }).click();
  await popup.waitForFunction(() => document.getElementById('message').textContent.includes('theme'));
  assert.equal(await popup.locator('html').getAttribute('data-theme'), 'light', 'failed save restores prior theme');
  assert.equal(await popup.evaluate(() => localStorage.getItem('theme')), 'light');
  await popup.evaluate(() => { window.mockUpdate = { latestTag: 'v9.0.0', latestVersion: '9.0.0', available: true,
    releaseUrl: 'javascript:alert(1)', lastChecked: Date.now(), error: null }; });
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('9.0.0'));
  assert.equal(await popup.locator('#updateLink').getAttribute('href'), 'https://github.com/salehghotbani/AdBlocker/releases/tag/v9.0.0');
  assert.equal(await popup.locator('#updateLink').getAttribute('rel'), 'noopener noreferrer');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 0, 'update checks do not reload a website');
  await popup.evaluate(() => { window.mockUpdate = { available: false, lastChecked: Date.now(), error: null }; });
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('up to date'));
  assert.equal(await popup.locator('#updateLink').isVisible(), false);
  await popup.evaluate(() => { window.mockUpdate = { available: false, error: 'network' }; });
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => document.getElementById('updateStatus').textContent.includes('internet'));
  await popup.evaluate(() => { window.mockUpdate = { available: false, automaticChecks: false, notificationsAvailable: false }; });
  await popup.locator('#checkUpdates').click();
  await popup.waitForFunction(() => document.getElementById('updateSchedule').textContent === 'Manual checks');
  assert.match(await popup.locator('#updateStatus').textContent(), /reload the extension/i);
  assert.equal(await popup.locator('#enabled').isEnabled(), true, 'optional update API failures leave protection controls usable');
  await popup.evaluate(() => { window.fixtureTabUrl = 'https://other.example/changed'; });
  await popup.locator('#enabled').uncheck();
  await assertProtection('off');
  assert.equal(await popup.evaluate(() => window.popupReloads.length), 0, 'a stale popup must not reload a different page');
  console.log('PASS: English popup defaults to LTR and Latin digits even with a Persian browser locale; site/global switches and reset work');
  console.log('PASS: permanent URL toggle, URL reset, one-time pause and resume controls work');
  console.log('PASS: system theme, keyboard selection, day/night persistence, save-failure recovery and layout');
  console.log('PASS: logo loads with transparency; disabled site, URL, pause and global states are gray in both themes; reopening preserves preference and re-enabling restores color');
  console.log('PASS: protection changes reload once automatically; pause does not double reload; stale popup does not reload another page');
  console.log('PASS: manual update states and safe download link render without touching site protection or reloading a page');
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
    if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(error.code)) throw error;
    console.warn(`Windows retained a lock on the isolated DOM test profile: ${profile}`);
  });
}
