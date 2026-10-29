// Client-side YouTube ad handling in the isolated extension world. No player
// response rewriting, page-world bridge, stream blocking or content seeking.
(() => {
  'use strict';
  if (globalThis.AdBlockYouTube) return;
  const marker = 'data-adblocker-youtube';
  const skipSelector = '.ytp-ad-skip-button button,.ytp-ad-skip-button-modern button,.ytp-skip-ad-button button,.ytp-ad-skip-button-container button,' +
    '.ytp-ad-skip-button,.ytp-ad-skip-button-modern,.ytp-skip-ad-button';
  const evidenceSelector = skipSelector + ',.ytp-ad-preview-container,.ytp-ad-text,.ytp-ad-simple-ad-badge,.ytp-ad-player-overlay-instream-info';
  function supported() {
    if (!['www.youtube.com', 'www.youtube-nocookie.com'].includes(location.hostname) || location.protocol !== 'https:') return false;
    const url = new URL(location.href);
    return (url.pathname === '/watch' && /^[\w-]{11}$/.test(url.searchParams.get('v') || '')) || /^\/embed\/[\w-]{11}(?:\/|$)/.test(url.pathname);
  }
  function create() {
    let enabled = false, navigating = false, scheduled = false, timer = null, state = null;
    const source = video => video.currentSrc || video.getAttribute('src') || '';
    function restoreRate(record) {
      if (record.changedRate && record.video.playbackRate === record.appliedRate) {
        try { record.video.playbackRate = record.rate; } catch { /* Media may have been detached. */ }
      }
      record.changedRate = false;
    }
    function restore() {
      if (!state) return;
      const previous = state; state = null;
      restoreRate(previous);
      if (previous.changedMute && previous.video.muted === true) previous.video.muted = previous.muted;
      for (const name of ['loadstart','emptied','durationchange']) previous.video.removeEventListener(name, previous.mediaChanged);
      if (previous.player.getAttribute(marker) === 'ad' || (previous.temporarilyUnmarked && !previous.player.hasAttribute(marker))) {
        if (previous.marker === null) previous.player.removeAttribute(marker);
        else previous.player.setAttribute(marker, previous.marker);
      }
    }
    function presented(element) {
      if (!element || element.closest('[hidden],[aria-hidden="true"]')) return false;
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    }
    function confirmed(player) {
      return player.classList.contains('ad-showing') && [...player.querySelectorAll(evidenceSelector)].some(presented);
    }
    function check() {
      scheduled = false;
      if (!enabled || navigating || !supported()) { restore(); return; }
      const player = document.querySelector('#movie_player.html5-video-player');
      const video = player?.querySelector('video.html5-main-video');
      if (!player || !video || !player.isConnected || !video.isConnected) { restore(); return; }
      // Temporarily remove only our marker to inspect native UI visibility.
      // All reads/writes occur in this synchronous task, before the next paint.
      const ownedMarker = state?.player === player && player.getAttribute(marker) === 'ad';
      if (ownedMarker) { state.temporarilyUnmarked = true; player.removeAttribute(marker); }
      const ad = confirmed(player) && !video.error && !presented(player.querySelector('.ytp-error-content-wrap'));
      if (!ad) { restore(); return; }
      let locked = false;
      if (state && (state.player !== player || state.video !== video)) { locked = true; restore(); }
      if (!state) {
        state = { player, video, marker: player.getAttribute(marker), muted: video.muted, rate: video.playbackRate,
          changedMute: false, changedRate: false, appliedRate: 16, identity: null, duration: null, candidate: null,
          accelerationLocked: locked, muteAttempted: false, rateAttempted: false, lastSkip: 0 };
        const record = state;
        record.mediaChanged = () => {
          // A reused media element may already contain the real video while
          // old ad UI is disappearing. Never accelerate a replacement source.
          if (state !== record) return;
          if (record.identity !== null) { restoreRate(record); record.accelerationLocked = true; }
          record.candidate = null; schedule();
        };
        for (const name of ['loadstart','emptied','durationchange']) video.addEventListener(name, record.mediaChanged);
      }
      const current = state;
      if (current.identity !== null && (source(video) !== current.identity || video.duration !== current.duration)) {
        restoreRate(current); current.accelerationLocked = true;
      }
      const skip = [...player.querySelectorAll(skipSelector)].find(button =>
        presented(button) && (button.tagName === 'BUTTON' || button.getAttribute('role') === 'button') &&
        !button.disabled && button.getAttribute('aria-disabled') !== 'true');
      let clicked = false;
      if (skip && Date.now() - current.lastSkip >= 1000) {
        current.lastSkip = Date.now(); skip.click(); clicked = true;
        if (!player.isConnected || !video.isConnected || !confirmed(player)) { restore(); return; }
      }
      player.setAttribute(marker, 'ad');
      current.temporarilyUnmarked = false;
      if (!current.muteAttempted) {
        current.muteAttempted = true;
        if (!video.muted) { video.muted = true; current.changedMute = true; }
      }
      // Skippable ads use the site's button. For a short, confirmed ad media
      // source, bounded acceleration reduces the remaining wait without ever
      // assigning currentTime, calling play(), or touching the content stream.
      if (!clicked && !current.rateAttempted && !current.accelerationLocked && !video.paused &&
          video.readyState >= 2 && Number.isFinite(video.duration) && video.duration > 0 && video.duration <= 180) {
        const identity = source(video);
        if (!current.candidate || current.candidate.identity !== identity || current.candidate.duration !== video.duration) {
          current.candidate = { identity, duration: video.duration, since: Date.now() };
        } else if (Date.now() - current.candidate.since >= 100) {
          current.identity = identity; current.duration = video.duration; current.rateAttempted = true;
          if (video.playbackRate < current.appliedRate) {
            try { video.playbackRate = current.appliedRate; current.changedRate = true; } catch { /* Concealment/skip still work. */ }
          }
        }
      }
    }
    function schedule() {
      if (!enabled || scheduled) return;
      scheduled = true; queueMicrotask(() => { try { check(); } catch { restore(); } });
    }
    const observer = new MutationObserver(schedule);
    function setEnabled(value) {
      enabled = value === true;
      observer.disconnect(); clearInterval(timer); timer = null;
      if (!enabled) { restore(); return; }
      observer.observe(document, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['class','src','disabled','hidden','aria-hidden','aria-disabled'] });
      timer = setInterval(schedule, 250); schedule();
    }
    const start = () => { navigating = true; restore(); };
    const finish = () => { navigating = false; schedule(); };
    document.addEventListener('yt-navigate-start', start);
    document.addEventListener('yt-navigate-finish', finish);
    const pagehide = () => setEnabled(false); addEventListener('pagehide', pagehide);
    return Object.freeze({ setEnabled, destroy() {
      setEnabled(false); document.removeEventListener('yt-navigate-start', start);
      document.removeEventListener('yt-navigate-finish', finish); removeEventListener('pagehide', pagehide);
    } });
  }
  globalThis.AdBlockYouTube = Object.freeze({ create });
  const api = globalThis.browser || globalThis.chrome;
  if (!api?.runtime?.id) return;
  const controller = create(); let revision = 0;
  const apply = settings => {
    const value = AdBlockSettings.normalize(settings);
    controller.setEnabled(value.enabled && !AdBlockSettings.isAllowed(location.hostname, value.allowedSites) &&
      !value.allowedUrls.includes(AdBlockSettings.pageUrl(location.href)));
  };
  const refresh = () => {
    const current = ++revision;
    api.runtime.sendMessage({ type: 'getSettings' }).then(result => {
      if (current === revision && result?.settings) apply(result.settings);
    }).catch(() => { if (current === revision) controller.setEnabled(false); });
  };
  api.runtime.onMessage.addListener((message, sender) => {
    if (sender?.id === api.runtime.id && !sender.tab && message?.type === 'settingsChanged') { revision++; apply(message.settings); }
  });
  addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  refresh();
})();
