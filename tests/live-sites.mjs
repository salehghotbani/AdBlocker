// Opt-in public-site audit. No accounts, personal profile or consent bypass.
// Network errors and absent ad inventory are never treated as blocking success.
import { chromium } from 'playwright';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

if (process.env.ADBLOCK_LIVE_SITES !== '1') throw new Error('Set ADBLOCK_LIVE_SITES=1 to contact public sites');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'artifacts/live-sites');
const cache = path.join(root, '.cache/live-sites');
await mkdir(output, { recursive: true }); await mkdir(cache, { recursive: true });
const profile = await mkdtemp(path.join(cache, 'profile-'));
const extension = path.join(root, 'dist/stores/edge');
const domains = JSON.parse(await readFile(path.join(root, 'extension/ad-domains.json'), 'utf8'));
const all = [
  ['soft98', 'https://soft98.ir/'], ['soft98-article', 'https://soft98.ir/security/firewall/14349-windows-firewall-control.html'],
  ['varzesh3', 'https://www.varzesh3.com/'],
  ['zoomit', 'https://www.zoomit.ir/'], ['digiato', 'https://digiato.com/'],
  ['asriran', 'https://www.asriran.com/'], ['tabnak', 'https://www.tabnak.ir/'],
  ['namnak', 'https://namnak.com/'], ['aparat', 'https://www.aparat.com/'],
  ['digikala', 'https://www.digikala.com/'],
  ['google', 'https://www.google.com/search?q=wireless+headphones'],
  ['youtube', 'https://www.youtube.com/'], ['youtube-video', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'],
  ['facebook', 'https://www.facebook.com/'],
  ['instagram', 'https://www.instagram.com/'], ['x', 'https://x.com/'],
  ['tiktok', 'https://www.tiktok.com/'], ['reddit', 'https://www.reddit.com/'],
  ['yahoo', 'https://www.yahoo.com/'], ['cnn', 'https://www.cnn.com/'],
  ['bbc', 'https://www.bbc.com/'], ['weather', 'https://weather.com/'],
  ['w3schools', 'https://www.w3schools.com/html/default.asp']
];
const selected = process.env.ADBLOCK_SITE_FILTER?.split(',');
const sites = selected ? all.filter(([name]) => selected.includes(name)) : all;
const reports = [];
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true,
    viewport: { width: 1365, height: 1000 }, locale: 'en-US',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  });
  let worker = context.serviceWorkers()[0];
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
  await popup.waitForFunction(() => !document.getElementById('enabled').disabled);
  const enable = enabled => popup.evaluate(async enabled => {
    const result = await chrome.runtime.sendMessage({ type: 'setEnabled', enabled });
    if (result.error) throw new Error(result.error);
  }, enabled);
  for (const [name, url] of sites) {
    const report = { name, url, observations: [] };
    for (const enabled of [false, true]) {
      await enable(enabled);
      const page = await context.newPage(); page.setDefaultTimeout(6000);
      const failures = [], responses = [], pageErrors = []; let requests = 0;
      page.on('pageerror', error => pageErrors.push(error.message.slice(0, 220)));
      page.on('request', () => requests++);
      page.on('requestfailed', request => {
        let host = ''; try { host = new URL(request.url()).hostname; } catch {}
        failures.push({ host, type: request.resourceType(), error: request.failure()?.errorText,
          listedHost: domains.some(domain => host === domain || host.endsWith('.' + domain)) });
      });
      if (name.startsWith('soft98')) page.on('response', response => {
        const address = new URL(response.url());
        if (address.hostname !== 'soft98.ir' || !['document','script'].includes(response.request().resourceType())) return;
        responses.push((async () => {
          const body = await response.text().catch(() => '');
          if (body.length > 2_000_000) return;
          const filename = address.pathname.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'index';
          await writeFile(path.join(cache, `${enabled ? 'on' : 'off'}-${filename}.txt`), body);
        })());
      });
      let error = null, status = null;
      try { status = (await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }))?.status(); }
      catch (failure) { error = failure.message.split('\n')[0]; }
      await page.waitForTimeout(name.startsWith('soft98') ? 10000 : 6000);
      let consentAction = null;
      // Use only an explicit refusal offered by the site; never accept tracking
      // or remove a consent/access dialog through CSS or JavaScript.
      if (['w3schools','weather'].includes(name)) {
        for (const frame of page.frames()) {
          const reject = frame.getByText(name === 'weather' ? 'Reject all' : 'Decline', { exact: true }).first();
          if (await reject.isVisible().catch(() => false)) {
            await reject.click({ timeout: 2500 }).then(() => { consentAction = 'explicit refusal'; }).catch(() => {});
            if (consentAction) { await page.waitForTimeout(1800); break; }
          }
        }
      }
      // Trigger ordinary lazy-loaded placements, then return to the reading area.
      await page.evaluate(() => window.scrollTo(0, Math.min(900, document.body?.scrollHeight || 0))).catch(() => {});
      await page.waitForTimeout(1500); await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      if (name === 'youtube-video') {
        await page.locator('video').evaluate(video => { video.muted = true; }).catch(() => {});
        await page.locator('.ytp-play-button').first().click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(8000);
      }
      const snapshot = await page.evaluate(() => {
        const visible = element => Boolean(element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
        const body = document.body?.innerText || '';
        const warning = body.split('\n').filter(line => /ad.?block|مسدود.?کننده|اد.?بلا[کك]|تبلیغ.{0,30}(غیر.?فعال|خاموش)/i.test(line)).map(line => line.trim().slice(0, 160)).slice(0, 5);
        const adHints = [...document.querySelectorAll('ins.adsbygoogle,[data-ad-client][data-ad-slot],[id*="ad-container"],[id*="ad-slot"],[class*="ad-slot"],[data-testid*="ad-"],.abdd,.abdds,#sbds,[id^="kaprila_"],iframe')]
          .filter(visible).slice(0, 35).map(el => ({ tag: el.tagName, id: el.id.slice(0, 90), class: String(el.className).slice(0, 100), srcHost: (() => { try { return el.src ? new URL(el.src, location.href).hostname : null; } catch { return null; } })() }));
        return { title: document.title, finalUrl: location.href, textLength: body.length,
          video: location.hostname === 'www.youtube.com' && location.pathname === '/watch' ? {
            error: document.querySelector('.ytp-error')?.textContent.trim().slice(0, 180),
            adShowing: Boolean(document.querySelector('.html5-video-player.ad-showing')),
            readyState: document.querySelector('video')?.readyState,
            currentTime: document.querySelector('video')?.currentTime
          } : undefined,
          soft98: location.hostname === 'soft98.ir' ? {
            posts: [...document.querySelectorAll('.cbddpb')].map(el => ({ text: el.textContent.trim(), visible: visible(el) })),
            slots: [...document.querySelectorAll('#abddh,#abdds,#sbds,.cbdd:has(> .cbddb.abdd)')].map(el => ({id: el.id, height: el.getBoundingClientRect().height, display: getComputedStyle(el).display})),
            downloadPanel: Boolean(document.querySelector('#dbdll')),
            gate: Boolean(document.querySelector('#cbdb > .tbd_ibd'))
          } : undefined,
          headings: [...document.querySelectorAll('h1,h2')].filter(visible).slice(0, 8).map(el => el.textContent.trim().slice(0, 100)),
          warning, adHints, hiddenByImportantDisplay: document.querySelectorAll('[style*="display: none !important"]').length,
          gateHints: { challenge: /just a moment|verify you are human|checking your browser|access denied|request rejected|unusual traffic|blocked by network security/i.test(document.title + '\n' + body.slice(0, 1200)),
            login: /log in|sign in|login|ورود/.test(body.slice(0, 3000)), consent: /before you continue|consent|accept all cookies/i.test(body.slice(0, 3000)) } };
      }).catch(() => ({}));
      if (snapshot.soft98) for (const post of snapshot.soft98.posts) {
        post.sha256 = createHash('sha256').update(post.text).digest('hex');
        post.length = post.text.length; delete post.text;
      }
      const blocked = failures.filter(item => item.error?.includes('BLOCKED_BY_CLIENT'));
      let interaction;
      if (name.startsWith('soft98')) {
        const link = page.locator('.cbddf .btn-success, #dbdll .dbdlll, #dbdll .jbdedbdlll').first();
        if (await link.count()) {
          await link.hover().catch(() => {}); await page.waitForTimeout(1600);
          interaction = await page.evaluate(() => ({ title: document.title,
            posts: document.querySelectorAll('.cbddpb').length,
            link: document.querySelector('.cbddf .btn-success, #dbdll .dbdlll, #dbdll .jbdedbdlll')?.getAttribute('href'),
            destructiveWarning: /افزونه حذف/.test(document.querySelector('#cbdb > .tbd_ibd')?.textContent || '') }));
        }
      }
      const observation = { enabled, status, error, requests, blocked, pageErrors, interaction, consentAction, otherFailures: failures.filter(item => !item.error?.includes('BLOCKED_BY_CLIENT')), ...snapshot };
      if (!error) await page.screenshot({ path: path.join(output, `${name}-${enabled ? 'on' : 'off'}.png`), animations: 'disabled', timeout: 10000 }).catch(() => {});
      await Promise.allSettled(responses); await page.close();
      report.observations.push(observation);
      console.log(`${name} ${enabled ? 'ON' : 'OFF'}: HTTP ${status}; ${blocked.length} explicit client blocks; ${snapshot.textLength || 0} text chars; warning ${snapshot.warning?.length || 0}; ${error || ''}`);
    }
    reports.push(report);
    const filename = selected?.length === 1 ? `${sites[0][0]}-results.json` : selected && sites.every(([name]) => name.startsWith('soft98')) ? 'soft98-results.json' : 'results.json';
    await writeFile(path.join(output, filename), JSON.stringify({ version: JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version,
      browser: context.browser()?.version(), date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }), scope: 'Logged-out desktop Edge, same isolated profile, sequential OFF/ON public-page observations; ad inventory and network vary; no blanket success inference.', sites: reports }, null, 2) + '\n');
  }
} finally {
  await context?.close();
  if (path.dirname(path.resolve(profile)) !== path.resolve(cache)) throw new Error('Unexpected audit profile');
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(error => {
    if (process.platform !== 'win32' || !['EPERM','EBUSY'].includes(error.code)) throw error;
    console.warn('Windows retained a lock on isolated audit profile');
  });
}
