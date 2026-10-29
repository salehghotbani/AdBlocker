// Real media playback against a clearly synthetic local ad fixture. This suite
// does not establish that a real YouTube advertising auction was served.
import { chromium } from 'playwright';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url));
const base=path.join(root,'.cache/youtube-tests');await mkdir(base,{recursive:true});
const profile=await mkdtemp(path.join(base,'profile-'));
const script=await readFile(path.join(root,'extension/youtube.js'),'utf8');
const css=await readFile(path.join(root,'extension/youtube.css'),'utf8');
const fixture=await readFile(path.join(root,'tests/fixtures/youtube-player.html'),'utf8');
const media=await readFile(path.join(root,'tests/fixtures/youtube-media.webm'));
let context;
try{
  context=await chromium.launchPersistentContext(profile,{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--mute-audio']});
  await context.route('https://www.youtube.com/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('.webm')){
      const range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
      const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),media.length-1):media.length-1;
      return route.fulfill({status:range?206:200,contentType:'video/webm',body:media.subarray(start,end+1),headers:{'accept-ranges':'bytes',...(range?{'content-range':`bytes ${start}-${end}/${media.length}`}:{})}});
    }
    return route.fulfill({contentType:'text/html',body:fixture});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);
  await page.goto('https://www.youtube.com/watch?v=YtFixture01');
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  await page.addStyleTag({content:css});await page.addScriptTag({content:script});
  await page.evaluate(()=>{window.controller=AdBlockYouTube.create();controller.setEnabled(true);});
  await page.evaluate(()=>fixture.content(3,1.25));
  const before=await page.locator('video').evaluate(video=>({time:video.currentTime,rate:video.playbackRate,muted:video.muted}));
  await page.waitForTimeout(300);
  const normal=await page.locator('video').evaluate(video=>({time:video.currentTime,rate:video.playbackRate,muted:video.muted,visible:getComputedStyle(video).visibility}));
  assert.ok(normal.time>before.time);assert.equal(normal.rate,1.25);assert.equal(normal.muted,false);assert.equal(normal.visible,'visible');
  // Native badge layouts can show an unskippable ad without legacy ad text.
  // aria-hidden is accessibility metadata, not visual concealment.
  for (const [badge, accessibilityHidden] of [['ytp-ad-badge--clean-player',false],['ytp-ad-badge',false],['ytp-ad-text',true]]) {
    await page.evaluate(({badge,accessibilityHidden})=>{
      const ui=document.querySelector('.ytp-ad-module'),label=ui.querySelector('span');
      label.className=badge;label.textContent='Sponsored';
      if(accessibilityHidden)ui.setAttribute('aria-hidden','true');else ui.removeAttribute('aria-hidden');
    },{badge,accessibilityHidden});
    await page.evaluate(()=>fixture.content(0,1.25));await page.evaluate(()=>fixture.ad(false));
    await page.waitForFunction(()=>document.querySelector('#movie_player').getAttribute('data-adblocker-youtube')==='ad',null,{timeout:1500});
    assert.equal(await page.locator('video').evaluate(video=>getComputedStyle(video).visibility),'hidden',badge);
    assert.equal(await page.locator('video').evaluate(video=>video.muted),true,badge);
    await page.evaluate(()=>fixture.finishAd());
    await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').muted===false);
  }
  await page.evaluate(()=>{document.querySelector('.ytp-ad-module').removeAttribute('aria-hidden');document.querySelector('.ytp-ad-module span').className='ytp-ad-text';});
  // Pre-roll: normal media resumes at the start after an accelerated short ad.
  await page.evaluate(()=>fixture.content(0,1.25));await page.evaluate(()=>fixture.ad(false));
  await page.waitForFunction(()=>document.querySelector('#movie_player').getAttribute('data-adblocker-youtube')==='ad'&&document.querySelector('video').playbackRate===16);
  assert.equal(await page.locator('video').evaluate(video=>getComputedStyle(video).visibility),'hidden');
  assert.equal(await page.locator('video').evaluate(video=>video.muted),true);
  await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>0.2);
  assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),1.25);
  assert.equal(await page.locator('video').evaluate(video=>video.muted),false);
  assert.ok(await page.locator('video').evaluate(video=>video.currentTime<5&&!video.error));
  // Mid-roll: use the site's own skip button and retain the content position.
  await page.evaluate(()=>{
    const button=document.querySelector('.ytp-ad-skip-button'),wrapper=document.createElement('yt-button-shape');
    wrapper.className='ytp-skip-ad-button';wrapper.setAttribute('aria-hidden','true');button.className='yt-spec-button-shape-next';button.replaceWith(wrapper);wrapper.append(button);
    window.nativeSkipClicks=0;button.addEventListener('click',()=>window.nativeSkipClicks++);
  });
  await page.evaluate(()=>fixture.content(6,1.5));await page.evaluate(()=>fixture.ad(true));
  await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').currentTime>=6);
  const middle=await page.locator('video').evaluate(video=>({time:video.currentTime,rate:video.playbackRate,muted:video.muted,error:video.error}));
  assert.ok(middle.time<10);assert.equal(middle.rate,1.5);assert.equal(middle.muted,false);assert.equal(middle.error,null);
  assert.equal(await page.evaluate(()=>window.nativeSkipClicks),1,'visually presented native Skip remains usable inside an aria-hidden accessibility wrapper');
  // A replacement content source may arrive before the ad UI is removed.
  await page.evaluate(()=>fixture.ad(false));
  await page.waitForFunction(()=>document.querySelector('video').playbackRate===16);
  await page.evaluate(()=>{const video=document.querySelector('video');video.src='/fixture-content.webm?transition';video.load();});
  await page.waitForFunction(()=>document.querySelector('video').readyState>=2);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),1,'replacement main source keeps the browser reset rate and is never accelerated');
  await page.evaluate(()=>{controller.setEnabled(false);});
  assert.equal(await page.locator('video').evaluate(video=>video.muted),false);
  assert.equal(await page.locator('#movie_player').getAttribute('data-adblocker-youtube'),null);
  assert.equal(await page.locator('video').evaluate(video=>getComputedStyle(video).visibility),'visible');
  // Native ad class without visible ad UI must never alter ordinary content.
  await page.evaluate(()=>{document.querySelector('.ytp-ad-module').hidden=true;controller.setEnabled(true);});
  await page.waitForTimeout(350);
  assert.equal(await page.locator('#movie_player').getAttribute('data-adblocker-youtube'),null);
  assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),1);
  // Site/user changes made during an ad are retained during cleanup.
  await page.evaluate(()=>fixture.finishAd());
  await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2&&document.querySelector('video').playbackRate===1.5);
  await page.evaluate(()=>fixture.ad(false));await page.waitForFunction(()=>document.querySelector('video').playbackRate===16);
  await page.evaluate(()=>{const video=document.querySelector('video');video.playbackRate=2;video.muted=false;controller.setEnabled(false);});
  assert.equal(await page.locator('video').evaluate(video=>video.playbackRate),2);
  assert.equal(await page.locator('video').evaluate(video=>video.muted),false);
  await page.evaluate(()=>fixture.finishAd());
  await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2);
  // Paused ads stay paused; no automated play/seek is used to force progress.
  await page.evaluate(async()=>{await fixture.ad(false);document.querySelector('video').pause();controller.setEnabled(true);});
  await page.waitForFunction(()=>document.querySelector('#movie_player').getAttribute('data-adblocker-youtube')==='ad');
  const pausedTime=await page.locator('video').evaluate(video=>video.currentTime);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('video').evaluate(video=>video.paused),true);
  assert.equal(await page.locator('video').evaluate(video=>video.currentTime),pausedTime);
  assert.notEqual(await page.locator('video').evaluate(video=>video.playbackRate),16);
  await page.evaluate(()=>document.dispatchEvent(new Event('yt-navigate-start')));
  assert.equal(await page.locator('#movie_player').getAttribute('data-adblocker-youtube'),null);
  assert.equal(await page.locator('video').evaluate(video=>video.muted),false);
  await page.evaluate(()=>{document.querySelector('#movie_player').classList.remove('ad-showing');history.pushState({},'', '/shorts/YtFixture01');document.dispatchEvent(new Event('yt-navigate-finish'));});
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#movie_player').getAttribute('data-adblocker-youtube'),null);
  await page.evaluate(()=>{fixture.finishAd();history.pushState({},'', '/watch?v=YtFixture01');document.dispatchEvent(new Event('yt-navigate-finish'));});
  await page.waitForFunction(()=>!fixture.inAd&&document.querySelector('video').readyState>=2);
  await page.evaluate(()=>fixture.content(18,1));
  await page.waitForFunction(()=>document.querySelector('video').ended);
  assert.equal(await page.locator('video').evaluate(video=>video.error),null,'normal content reaches its own natural ending');
  assert.ok(await page.locator('video').evaluate(video=>video.currentTime>=19.5));
  await page.evaluate(()=>controller.destroy());
  assert.equal(/\.currentTime\s*=|\.play\s*\(|\.fetch\s*\(|\beval\s*\(|new Function/.test(script),false,'production controller never seeks, starts playback or rewrites network/page code');
  console.log('PASS: synthetic pre/mid-roll with real media, native skip, conceal/mute, source handoff, unchanged content position/rate, ambiguous-state fail-open and disable/user overrides');
}finally{
  await context?.close();if(path.dirname(path.resolve(profile))!==path.resolve(base))throw new Error('Unexpected YouTube test profile');
  await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100}).catch(error=>{if(process.platform!=='win32'||!['EPERM','EBUSY'].includes(error.code))throw error;console.warn('Windows retained a lock on isolated YouTube fixture profile');});
}
