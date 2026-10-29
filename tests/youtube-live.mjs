// Opt-in real YouTube inventory observation. Never injects an ad or player API.
import { chromium } from 'playwright';
import { mkdir, mkdtemp, writeFile, rm, realpath, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
if (process.env.ADBLOCK_LIVE_YOUTUBE !== '1') throw new Error('Set ADBLOCK_LIVE_YOUTUBE=1 to visit YouTube');
const root = fileURLToPath(new URL('../', import.meta.url));
const base = path.join(root,'.cache/youtube-live'); await mkdir(base,{recursive:true});
const profile = process.env.ADBLOCK_YT_PROFILE ? await realpath(process.env.ADBLOCK_YT_PROFILE) : await mkdtemp(path.join(base,'profile-'));
if(path.dirname(path.resolve(profile))!==path.resolve(base)||!path.basename(profile).startsWith('profile-'))throw new Error('Only this project’s isolated audit profiles may be reused');
const output = path.join(root,'artifacts/youtube-live'); await mkdir(output,{recursive:true});
const ids = (process.env.ADBLOCK_YT_VIDEOS || 'eFeDpUVEy48,_gCXmKjDecU').split(',');
if (!ids.every(id => /^[a-zA-Z0-9_-]{11}$/.test(id))) throw new Error('Invalid public video ID');
const seconds = Number(process.env.ADBLOCK_YT_SECONDS || 90);
if (!Number.isInteger(seconds) || seconds < 10 || seconds > 600) throw new Error('Observation must be 10–600 seconds');
const toggleOnAd = process.env.ADBLOCK_YT_TOGGLE_ON_AD === '1';
const phases = toggleOnAd || process.env.ADBLOCK_YT_PHASE === 'off' ? [false] : [false,true];
const reports = []; let context;
const sourceHash=createHash('sha256').update(await readFile(path.join(root,'dist/stores/chrome/youtube.js'))).digest('hex');
const noExtension = process.env.ADBLOCK_YT_NO_EXTENSION === '1';
const tag = noExtension ? 'no-extension' : toggleOnAd ? 'toggle' : 'extension';
try {
  context = await chromium.launchPersistentContext(profile, {
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: process.env.ADBLOCK_YT_HEADED !== '1',
    viewport: { width: 1365, height: 900 }, locale: 'en-US', ignoreDefaultArgs: ['--disable-extensions'],
    args: ['--no-sandbox','--mute-audio','--enable-unsafe-extension-debugging']
  });
  let panel;
  if (!noExtension) {
    const cdp = await context.browser().newBrowserCDPSession();
    const previous=await cdp.send('Extensions.getExtensions');
    for(const item of previous.extensions||[]) if(item.name?.startsWith('AdBlocker')) await cdp.send('Extensions.uninstall',{id:item.id});
    const { id: extensionId } = await cdp.send('Extensions.loadUnpacked', { path: path.join(root,'dist/stores/chrome') });
    panel = await context.newPage(); await panel.goto(`chrome-extension://${extensionId}/popup.html`);
    await panel.waitForFunction(() => !document.getElementById('enabled').disabled);
  }
  for (const id of ids) for (const enabled of phases) {
    if (panel) await panel.evaluate(async enabled => {
      const result = await chrome.runtime.sendMessage({type:'setEnabled',enabled}); if(result.error) throw new Error(result.error);
    }, enabled);
    const page = await context.newPage(); page.setDefaultTimeout(12000);
    await page.bringToFront();
    await page.addInitScript(()=>{
      window.__youtubeAuditSkips=[];
      document.addEventListener('click',event=>{
        const control=event.target.closest?.('[class*="skip-ad"],[class*="ad-skip"]');
        if(control&&control.closest('#movie_player'))window.__youtubeAuditSkips.push({at:Date.now(),classes:String(control.className),trusted:event.isTrusted});
      },true);
    });
    const samples = [], playerResponses = [], mediaHttpErrors = [], networkErrors = [], actions = [];
    let blocked = 0, error = null, refusal = false, toggled = false, afterSeek = false, healthySince = null, mainCaptured = false, skipDiagnosed = false;
    page.on('requestfailed', req => {
      if(req.failure()?.errorText.includes('BLOCKED_BY_CLIENT')) blocked++;
      const url=new URL(req.url());
      if ((url.hostname.endsWith('.googlevideo.com')||url.hostname.endsWith('.youtube.com'))&&networkErrors.length<100)
        networkErrors.push({host:url.hostname,path:url.pathname,error:req.failure()?.errorText});
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if ((url.hostname.endsWith('.googlevideo.com')||url.hostname.endsWith('.youtube.com')) && response.status() >= 400) mediaHttpErrors.push({host:url.hostname,path:url.pathname,status:response.status()});
      if (!response.url().startsWith('https://www.youtube.com/youtubei/v1/player?')) return;
      playerResponses.push(response.json().then(value => ({
        adPlacements: value.adPlacements?.length || 0, playerAds: value.playerAds?.length || 0,
        adSlots: value.adSlots?.length || 0, status: value.playabilityStatus?.status
      })).catch(() => ({unreadable:true})));
    });
    try { await page.goto(`https://www.youtube.com/watch?v=${id}`,{waitUntil:'domcontentloaded',timeout:45000}); }
    catch (failure) { error = failure.message.split('\n')[0]; }
    for (const frame of page.frames()) {
      const reject = frame.getByRole('button',{name:'Reject all',exact:true}).first();
      if (await reject.isVisible().catch(() => false)) { await reject.click().then(()=>{refusal=true;}).catch(()=>{}); break; }
    }
    const deadline = Date.now()+seconds*1000; let screenshot = false, lastLog = 0, playRequested = false;
    while(Date.now()<deadline) {
      const state = await page.evaluate(() => {
        const player=document.querySelector('#movie_player.html5-video-player');
        const video=player?.querySelector('video.html5-main-video');
        const exists=selector=>[...(player?.querySelectorAll(selector)||[])].some(el=>el.getClientRects().length>0&&getComputedStyle(el).display!=='none');
        return { at:Date.now(),ad:player?.classList.contains('ad-showing')||false,
          adUi:exists('.ytp-ad-player-overlay,.ytp-ad-text,.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button,.ytp-ad-preview-container'),
          currentTime:video?.currentTime,duration:Number.isFinite(video?.duration)?video.duration:null,
          paused:video?.paused,ended:video?.ended,rate:video?.playbackRate,muted:video?.muted,readyState:video?.readyState,
          videoVisible:video?getComputedStyle(video).visibility!=='hidden'&&getComputedStyle(video).display!=='none':false,
          mediaError:video?.error?.code||null,
          playerError:document.querySelector('.ytp-error-content-wrap')?.textContent.trim().slice(0,200)||null,
          title:document.title,controller:player?.getAttribute('data-adblocker-youtube')||null };
      }).catch(()=>({at:Date.now(),unavailable:true}));
      samples.push(state);
      if (!state.paused && state.currentTime > 0) playRequested = true;
      if (state.paused && !state.playerError && !state.ended && !playRequested) {
        const play=page.locator('#movie_player .ytp-play-button').first();
        if(await play.isVisible().catch(()=>false)) await play.click({timeout:1000}).then(()=>{playRequested=true;}).catch(()=>{});
      }
      if(state.ad&&state.adUi&&state.readyState>=2&&state.currentTime>0.2&&!screenshot){
        await page.screenshot({path:path.join(output,`${tag}-${id}-${afterSeek?'mid':'pre'}-ad-before.png`)});screenshot=true;
      }
      if(toggleOnAd&&panel&&!toggled&&state.ad&&state.adUi&&state.readyState>=2&&state.currentTime>0.2){
        const controls=await page.evaluate(()=>[...document.querySelectorAll('#movie_player [class*="ytp-ad-"],#movie_player [class*="skip-ad"],#movie_player [class*="skip-ad"] button')]
          .filter(el=>el.getClientRects().length>0).slice(0,30).map(el=>({tag:el.tagName,classes:String(el.className),disabled:el.disabled,hidden:el.hidden})));
        await panel.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'setEnabled',enabled:true});if(r.error)throw new Error(r.error);});
        actions.push({type:'enabled-during-real-ad',at:Date.now(),afterSeek,videoTime:state.currentTime,controls});
        toggled=true;healthySince=null;
        await page.waitForTimeout(50);
        await page.screenshot({path:path.join(output,`${tag}-${id}-${afterSeek?'mid':'pre'}-ad-after.png`)}).catch(()=>{});
      }
      if(toggleOnAd&&toggled&&!state.ad&&state.readyState>=2&&!state.paused&&!state.playerError){
        healthySince??=Date.now();
        if(!mainCaptured&&Date.now()-healthySince>2000){
          await page.screenshot({path:path.join(output,`${tag}-${id}-main-resumed.png`)}).catch(()=>{});
          mainCaptured=true;actions.push({type:'main-playback-observed',at:Date.now(),videoTime:state.currentTime,rate:state.rate,muted:state.muted,visible:state.videoVisible});
        }
        if(process.env.ADBLOCK_YT_SEEK==='1'&&!afterSeek&&Date.now()-healthySince>12000&&state.duration>180){
          await panel.evaluate(async()=>{const r=await chrome.runtime.sendMessage({type:'setEnabled',enabled:false});if(r.error)throw new Error(r.error);});
          const progress=page.locator('#movie_player .ytp-progress-bar').first();
          const box=await progress.boundingBox();
          if(box){
            await progress.click({position:{x:box.width*.55,y:Math.max(1,box.height/2)},timeout:2000}).catch(()=>{});
            actions.push({type:'native-progress-seek',at:Date.now(),fraction:.55,from:state.currentTime});
            afterSeek=true;toggled=false;screenshot=false;healthySince=null;
          }
        }
      }else if(state.ad||state.paused||state.playerError)healthySince=null;
      if(toggleOnAd&&toggled&&state.ad&&!skipDiagnosed&&Date.now()-actions.find(action=>action.type==='enabled-during-real-ad').at>15000){
        skipDiagnosed=true;
        const diagnostic=await page.evaluate(()=>{
          const p=document.querySelector('#movie_player'),marker=p.getAttribute('data-adblocker-youtube');p.removeAttribute('data-adblocker-youtube');
          const buttons=[...p.querySelectorAll('button')].filter(el=>/skip/i.test(el.className));
          const result=buttons.map(el=>({html:el.outerHTML.slice(0,1500),visibility:getComputedStyle(el).visibility,display:getComputedStyle(el).display,
            box:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height},hiddenAncestor:el.closest('[hidden],[aria-hidden="true"]')?.className||null}));
          if(marker!==null)p.setAttribute('data-adblocker-youtube',marker);return {buttons:result,clicks:window.__youtubeAuditSkips};
        });
        actions.push({type:'native-skip-diagnostic',at:Date.now(),diagnostic});
        if(process.env.ADBLOCK_YT_TRUSTED_SKIP==='1'){
          const skip=page.locator('#movie_player button.ytp-skip-ad-button,#movie_player button.ytp-ad-skip-button-modern,#movie_player button.ytp-ad-skip-button').first();
          await skip.click({timeout:2000}).then(()=>actions.push({type:'manual-native-skip-control',at:Date.now()})).catch(failure=>actions.push({type:'manual-skip-unavailable',at:Date.now(),error:failure.message.split('\n')[0]}));
        }
      }
      if(Date.now()-lastLog>15000){console.log(`${id} ${enabled?'ON':'OFF'}: ad=${state.ad}, adUi=${state.adUi}, time=${state.currentTime}, ready=${state.readyState}, ${state.playerError||''}`);lastLog=Date.now();}
      if(state.ended&&!state.ad) break;
      if(state.playerError) break;
      await page.waitForTimeout(200);
    }
    await page.screenshot({path:path.join(output,`${tag}-${id}-${enabled?'on':'off'}-end.png`)}).catch(()=>{});
    const skipEvents=await page.evaluate(()=>window.__youtubeAuditSkips||[]).catch(()=>[]);
    const report={id,enabled,noExtension,toggleOnAd,actions,skipEvents,error,refusal,blocked,mediaHttpErrors,networkErrors,playerResponses:await Promise.all(playerResponses),samples};
    reports.push(report); await page.close();
    await writeFile(path.join(output,`${tag}-results.json`),JSON.stringify({browser:context.browser().version(),version:panel?await panel.evaluate(()=>chrome.runtime.getManifest().version):null,sourceHash,date:new Date().toISOString(),
      method:'Actual isolated browser, native YouTube player, no synthetic ads, no player-response injection. Browser audio output muted; media mute/rate are observed unchanged by harness. No accounts or personal profiles.',reports},null,2)+'\n');
  }
} finally {
  await context?.close();
  if(path.dirname(path.resolve(profile))!==path.resolve(base))throw new Error('Unexpected live profile');
  if(process.env.ADBLOCK_YT_KEEP_PROFILE==='1') console.log('Retained isolated audit profile: '+profile);
  else await rm(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100}).catch(error=>{
    if(process.platform!=='win32'||!['EPERM','EBUSY'].includes(error.code))throw error;
    console.warn('Windows retained a lock on isolated YouTube test profile');
  });
}
