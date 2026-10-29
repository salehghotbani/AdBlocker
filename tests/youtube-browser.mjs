// Actual packaged content scripts in Chromium's isolated world, with a clearly
// synthetic player. Live ad-auction evidence belongs to youtube-live.mjs.
import { chromium } from 'playwright';
import { mkdir,mkdtemp,readFile,rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),base=path.join(root,'.cache/youtube-extension');
await mkdir(base,{recursive:true});const profile=await mkdtemp(path.join(base,'profile-'));
const extension=path.join(root,'dist/stores/chrome');
const html=await readFile(path.join(root,'tests/fixtures/youtube-player.html'),'utf8');
const media=await readFile(path.join(root,'tests/fixtures/youtube-media.webm'));
let context;
try{
 context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--no-sandbox','--mute-audio',`--load-extension=${extension}`,`--disable-extensions-except=${extension}`]});
 await context.route('https://www.youtube.com/**',route=>{
  if(new URL(route.request().url()).pathname.endsWith('.webm'))return route.fulfill({contentType:'video/webm',body:media});
  return route.fulfill({contentType:'text/html',body:html});
 });
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const panel=await context.newPage();await panel.goto(`chrome-extension://${new URL(worker.url()).host}/popup.html`);
 const command=message=>panel.evaluate(async message=>{const result=await chrome.runtime.sendMessage(message);if(result.error)throw new Error(result.error);return result;},message);
 await command({type:'getSettings'});
 const page=await context.newPage();await page.goto('https://www.youtube.com/watch?v=YtFixture01');
 await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
 await page.evaluate(()=>fixture.content(0,1.25));await page.evaluate(()=>fixture.ad(false));
 await page.waitForFunction(()=>document.querySelector('#movie_player').getAttribute('data-adblocker-youtube')==='ad');
 assert.equal(await page.locator('video').evaluate(video=>getComputedStyle(video).visibility),'hidden');
 await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>.2);
 assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),1.25);
 assert.equal(await page.locator('video').evaluate(video=>video.muted),false);
 assert.equal(await page.locator('video').evaluate(video=>video.error),null);
 // The settings message must reach this separate early content script too.
 for(const [type,scope] of [['setEnabled',{enabled:false}],['setSite',{host:'www.youtube.com',allowed:true}],['setUrl',{url:page.url(),allowed:true}]]){
  await command({type,...scope});await page.evaluate(()=>fixture.ad(false));
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#movie_player').getAttribute('data-adblocker-youtube'),null,`${type} disables media intervention`);
  assert.equal(await page.locator('video').evaluate(video=>getComputedStyle(video).visibility),'visible');
  await page.evaluate(()=>fixture.finishAd());await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2);
  await command(type==='setEnabled'?{type,enabled:true}:type==='setSite'?{type,host:scope.host,allowed:false}:{type,url:scope.url,allowed:false});
 }
 await page.evaluate(()=>fixture.content(6,1.5));await page.evaluate(()=>fixture.ad(true));
 await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>=6);
 assert.ok(await page.locator('video').evaluate(video=>video.currentTime<10&&!video.error));
 console.log('PASS: packaged isolated YouTube controller, synthetic pre/mid-roll playback, real native media, global/site/URL exceptions and unchanged main video');
}finally{
 await context?.close();if(path.dirname(path.resolve(profile))!==path.resolve(base))throw new Error('Unexpected YouTube extension profile');
 await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100}).catch(error=>{if(process.platform!=='win32'||!['EPERM','EBUSY'].includes(error.code))throw error;console.warn('Windows retained an isolated YouTube extension test profile');});
}
