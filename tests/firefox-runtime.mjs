// Actual Firefox with a temporary add-on. Test-only scripts exercise the real
// popup in Firefox itself because automation cannot inspect moz-extension tabs.
// No test hook, debugging permission or driver enters a submission package.
import { firefox } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
const root = fileURLToPath(new URL('../', import.meta.url));
const testRoot = path.join(root, '.cache/firefox-runtime'); await mkdir(testRoot, { recursive: true });
const work = await mkdtemp(path.join(testRoot, 'run-'));
const profile = path.join(work, 'profile'), extension = path.join(work, 'extension');
await mkdir(profile); await cp(path.join(root, 'dist/stores/firefox'), extension, { recursive: true });
const token = randomUUID();
const reports = new Map();
let resolveReports, rejectReports;
const completed = new Promise((resolve, reject) => { resolveReports = resolve; rejectReports = reject; });
const timeout = setTimeout(() => rejectReports(new Error('Firefox runtime report timed out')), 90000);
// Handle errors immediately even if they occur before awaiting the reports.
completed.catch(() => {});
const fixture = await readFile(path.join(root, 'tests/fixtures/reading-store-demo.html'), 'utf8');
let adRequests = 0;
const server = http.createServer(async (request, response) => {
  if (request.url === '/report' && request.method === 'POST') {
    let body = ''; for await (const chunk of request) { body += chunk; if (body.length > 50000) { response.writeHead(413).end(); return; } }
    const report = JSON.parse(body);
    if (report.token !== token) { response.writeHead(403).end(); return; }
    reports.set(report.stage, report);
    if (report.error) rejectReports(new Error(report.stage + ': ' + report.error));
    if (reports.has('popup') && reports.has('support') && reports.has('updates')) resolveReports();
    response.end('ok'); return;
  }
  if (request.url.startsWith('/pagead.js')) {
    adRequests++; response.setHeader('Content-Type', 'application/javascript'); response.end('document.documentElement.dataset.adLoaded="true";'); return;
  }
  response.setHeader('Content-Type', 'text/html'); response.end(fixture);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const reportFromTab = `async function report(stage, detail) {
  const tabs = await browser.tabs.query({}); const tab = tabs.find(item => item.url === ${JSON.stringify(origin + '/')});
  if (!tab) throw new Error('Test page missing');
  await browser.tabs.sendMessage(tab.id, { type: 'test-runtime-report', payload: { token: ${JSON.stringify(token)}, stage, ...detail } });
}
async function until(predicate, label) {
  const start = Date.now(); while (Date.now() - start < 15000) { try { if (await predicate()) return; } catch {} await new Promise(resolve => setTimeout(resolve, 75)); }
  throw new Error('Timed out: ' + label);
}
function check(value, label) { if (!value) throw new Error(label); }
async function state() {
  const tab = (await browser.tabs.query({})).find(item => item.url === ${JSON.stringify(origin + '/')});
  return browser.tabs.sendMessage(tab.id, { type: 'test-runtime-state' });
}
`;
await writeFile(path.join(extension, 'test-content.js'), `
browser.runtime.onMessage.addListener((message, sender) => {
  if (sender.id !== browser.runtime.id) return;
  if (message.type === 'test-runtime-report') return fetch(${JSON.stringify(origin + '/report')}, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(message.payload)}).then(()=>true);
  if (message.type === 'test-runtime-state') return Promise.resolve({ hidden: getComputedStyle(document.getElementById('top-ad')).display === 'none', article: Boolean(document.querySelector('article')?.getClientRects().length) });
});`);
await writeFile(path.join(extension, 'test-launch.js'), `
let testStarted = false;
async function startTest() {
  if (testStarted) return; const tab = (await browser.tabs.query({})).find(item => item.url === ${JSON.stringify(origin + '/')});
  if (!tab || tab.status !== 'complete') return; testStarted = true;
  await browser.tabs.create({url:browser.runtime.getURL('popup.html'),active:false});
}
browser.tabs.onUpdated.addListener(()=>startTest()); startTest();`);
await writeFile(path.join(extension, 'test-popup.js'), reportFromTab + `
(async () => { try {
  await until(()=>!document.getElementById('enabled').disabled && document.getElementById('placementCount').textContent === '3','popup startup/counters');
  check(document.documentElement.lang === 'en','English default');
  check(document.getElementById('updateStatus').textContent.includes('Firefox Add-ons'),'native store update status');
  const languages = ['en','fa','ar','es','fr','de','pt-BR','zh-CN','ja','tr'];
  const select = document.getElementById('language'); check(select.options.length === 10,'language count');
  for (const language of languages) {
    select.value = language; select.dispatchEvent(new Event('change',{bubbles:true}));
    await until(()=>document.documentElement.lang===language && !select.disabled,'language '+language);
    check(document.documentElement.dir === (['fa','ar'].includes(language)?'rtl':'ltr'),'direction '+language);
    check(document.body.scrollWidth <= 391,'no horizontal overflow '+language);
    if (['fa','ar'].includes(language)) { await document.fonts.load('14px Shabnam'); check(document.fonts.check('14px Shabnam'),'bundled Shabnam'); }
  }
  select.value='en'; select.dispatchEvent(new Event('change',{bubbles:true})); await until(()=>document.documentElement.lang==='en'&&!select.disabled,'English restored');
  document.querySelector('[data-theme-choice="dark"]').click(); await until(()=>document.getElementById('themeStatus').textContent==='Dark theme saved.','dark theme saved');
  document.querySelector('[data-theme-choice="light"]').click(); await until(()=>document.getElementById('themeStatus').textContent==='Light theme saved.','light theme saved');
  check((await state()).hidden,'initial filtering');
  document.getElementById('siteEnabled').click(); await until(async()=>!(await state()).hidden,'site exception');
  await until(()=>!document.getElementById('siteEnabled').disabled,'site enabled'); document.getElementById('siteEnabled').click(); await until(async()=>(await state()).hidden,'site protection restored');
  await until(()=>!document.getElementById('urlEnabled').disabled,'URL enabled'); document.getElementById('urlEnabled').click(); await until(async()=>!(await state()).hidden,'URL exception');
  await until(()=>!document.getElementById('urlEnabled').disabled,'URL reset enabled'); document.getElementById('urlEnabled').click(); await until(async()=>(await state()).hidden,'URL protection restored');
  await until(()=>!document.getElementById('pause').disabled,'pause enabled'); document.getElementById('pause').click(); await until(async()=>!(await state()).hidden,'one-time pause');
  const tab=(await browser.tabs.query({})).find(item=>item.url===${JSON.stringify(origin + '/')});
  await browser.tabs.reload(tab.id);
  await until(async()=>(await state()).hidden,'pause expiry');
  const settings=await browser.runtime.sendMessage({type:'getSettings',tabId:tab.id}); check(settings.paused===false,'pause state expired');
  const manager=await browser.runtime.sendMessage({type:'checkForUpdates'}); check(!manager.error,'Firefox update help opens');
  await report('popup',{passed:true,languages:10,font:'Shabnam',checks:['startup','filters','counters','site','URL','pause','themes','languages','local update help']});
  await browser.tabs.create({url:browser.runtime.getURL('support.html'),active:false});
} catch(error) {await report('popup',{error:error.message});} })();`);
await writeFile(path.join(extension, 'test-support.js'), reportFromTab + `
(async()=>{try {
  await until(()=>document.documentElement.dataset.language==='en','support initialization');
  check(document.querySelector('h1').textContent.includes('web'),'support page');
  check(document.querySelectorAll('script[src^="https:"]').length===0,'no remote scripts');
  const expected=Boolean(AdBlockDistribution.support.url||AdBlockDistribution.support.crypto.length);
  check(!document.getElementById('financial').hidden===expected,'support configuration');
  await report('support',{passed:true});
}catch(error){await report('support',{error:error.message});}})();`);
await writeFile(path.join(extension, 'test-update-help.js'), reportFromTab + `(async()=>{try{await until(()=>document.documentElement.dataset.language==='en','help initialization');check(document.querySelector('h1').textContent==='Manage browser updates','help text');await report('updates',{passed:true});}catch(error){await report('updates',{error:error.message});}})();`);
for (const [name, script] of [['popup.html','test-popup.js'],['support.html','test-support.js'],['update-help.html','test-update-help.js']]) {
  const file = path.join(extension, name); await writeFile(file, (await readFile(file, 'utf8')).replace('</body>', `<script src="${script}"></script></body>`));
}
const manifestFile = path.join(extension, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
manifest.background.scripts.push('test-launch.js');
manifest.content_scripts.push({ matches: ['http://127.0.0.1/*'], js: ['test-content.js'], run_at: 'document_idle' });
await writeFile(manifestFile, JSON.stringify(manifest, null, 2));

// Firefox's standard Remote Debugging Protocol, also used by web-ext, only for
// temporary installation on this isolated, loopback-bound test browser.
async function installTemporary(port) {
  let socket;
  for (let tries = 0; tries < 50; tries++) {
    try { socket = await new Promise((resolve, reject) => { const item=net.createConnection(port,'127.0.0.1');item.once('connect',()=>resolve(item));item.once('error',reject); }); break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  if (!socket) throw new Error('Firefox debugger did not start');
  let buffer = Buffer.alloc(0), pending, ready;
  const greeting = new Promise(resolve => { ready = resolve; });
  socket.on('data', chunk => {
    buffer=Buffer.concat([buffer,chunk]);
    while (true) {
      const colon=buffer.indexOf(':'); if(colon<0)return; const size=Number(buffer.subarray(0,colon).toString());
      if(!Number.isSafeInteger(size)||size<0||size>1000000){socket.destroy();return;}
      if(buffer.length<colon+1+size)return;
      const message=JSON.parse(buffer.subarray(colon+1,colon+1+size).toString());buffer=buffer.subarray(colon+1+size);
      if(ready){ready();ready=null;continue;}
      if(pending&&message.from===pending.to){const done=pending;pending=null;clearTimeout(done.timer);message.error?done.reject(new Error(message.message||message.error)):done.resolve(message);}
    }
  });
  socket.on('error', error => { if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;} });
  const request=message=>new Promise((resolve,reject)=>{
    pending={to:message.to,resolve,reject,timer:setTimeout(()=>{pending=null;reject(new Error('Firefox debugger request timeout'));},10000)};
    const bytes=Buffer.from(JSON.stringify(message));socket.write(Buffer.concat([Buffer.from(bytes.length+':'),bytes]));
  });
  try { await greeting; const actor=await request({to:'root',type:'getRoot'});
    const result=await request({to:actor.addonsActor,type:'installTemporaryAddon',addonPath:extension,openDevTools:false});
    assert.equal(result.addon.id,manifest.browser_specific_settings.gecko.id);
  } finally { socket.destroy(); }
}
const reservation = net.createServer(); await new Promise(resolve=>reservation.listen(0,'127.0.0.1',resolve));
const debugPort=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
let context;
try {
  context=await firefox.launchPersistentContext(profile,{headless:true,viewport:{width:1280,height:800},args:['--start-debugger-server',String(debugPort)],
    firefoxUserPrefs:{'devtools.debugger.remote-enabled':true,'devtools.debugger.prompt-connection':false,'devtools.debugger.force-local':true}});
  await installTemporary(debugPort);
  const page=await context.newPage();await page.goto(origin+'/');
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('top-ad')).display==='none');
  assert.equal(await page.evaluate(()=>new Promise(resolve=>{const script=document.createElement('script');script.src='/pagead.js?initial';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.append(script);})),false,'Firefox explicitly blocks local ad-script fixture');
  assert.equal(adRequests,0,'no initial blocked script reaches the local server');
  await completed;
  const finalBlocked=await page.evaluate(()=>new Promise(resolve=>{const script=document.createElement('script');script.src='/pagead.js?after-expiry';script.onload=()=>resolve(true);script.onerror=()=>resolve(false);document.body.append(script);}));
  assert.equal(finalBlocked,false,'network blocking resumes after pause expiry');
  await context.route('https://soft98.ir/adblocker-fixture', async route => route.fulfill({
    contentType: 'text/html', body: await readFile(path.join(root,'tests/fixtures/soft98-compat.html'),'utf8')
  }));
  const soft98 = await context.newPage(); await soft98.goto('https://soft98.ir/adblocker-fixture');
  await soft98.waitForFunction(() => ['abddh','abdds','sbds','hosting-ad'].every(id => document.getElementById(id).getBoundingClientRect().height === 0));
  await soft98.locator('#continue').hover();
  assert.equal(await soft98.locator('#post').isVisible(),true,'Firefox preserves article after site checks');
  assert.equal(await soft98.locator('#ad-child').evaluate(el => el.getBoundingClientRect().width),200);
  await soft98.close();
  const youtubeHtml=await readFile(path.join(root,'tests/fixtures/youtube-player.html'),'utf8');
  const youtubeMedia=await readFile(path.join(root,'tests/fixtures/youtube-media.webm'));
  await context.route('https://www.youtube.com/**',route=>route.fulfill({
    contentType:new URL(route.request().url()).pathname.endsWith('.webm')?'video/webm':'text/html',
    body:new URL(route.request().url()).pathname.endsWith('.webm')?youtubeMedia:youtubeHtml
  }));
  const youtube=await context.newPage();await youtube.goto('https://www.youtube.com/watch?v=YtFixture01');
  await youtube.waitForFunction(()=>document.querySelector('video').readyState>=2);
  await youtube.evaluate(()=>fixture.content(0,1.25));await youtube.evaluate(()=>fixture.ad(false));
  await youtube.waitForFunction(()=>document.querySelector('#movie_player').getAttribute('data-adblocker-youtube')==='ad');
  assert.equal(await youtube.locator('video').evaluate(video=>getComputedStyle(video).visibility),'hidden');
  await youtube.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>.2);
  assert.equal(await youtube.locator('video').evaluate(video=>video.playbackRate),1.25);
  assert.equal(await youtube.locator('video').evaluate(video=>video.muted),false);
  await youtube.evaluate(()=>fixture.content(6,1.5));await youtube.evaluate(()=>fixture.ad(true));
  await youtube.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>=6);
  assert.ok(await youtube.locator('video').evaluate(video=>video.currentTime<10&&!video.error));
  await youtube.close();
  await mkdir(path.join(root,'artifacts'),{recursive:true});
  await writeFile(path.join(root,'artifacts/firefox-runtime.json'),JSON.stringify({browser:context.browser()?.version(),soft98Compatibility:true,youtubeSyntheticMedia:true,reports:[...reports.values()].map(({token:ignored,...item})=>item)},null,2)+'\n');
  await page.screenshot({path:path.join(root,'artifacts/firefox-filtered.png'),animations:'disabled'});
  console.log('PASS: actual Firefox temporary install, local network blocking, real popup, ten languages/RTL/Shabnam, counters, exceptions, pause expiry, support, local update help and Soft98 compatibility fixture');
} finally {
  clearTimeout(timeout);await context?.close();await new Promise(resolve=>server.close(resolve));
  if(path.dirname(path.resolve(work))!==path.resolve(testRoot))throw new Error('Unexpected Firefox test directory');
  await rm(work,{recursive:true,force:true,maxRetries:3,retryDelay:100}).catch(error=>{if(process.platform!=='win32'||!['EPERM','EBUSY'].includes(error.code))throw error;console.warn('Windows retained a lock on isolated Firefox test profile');});
}
