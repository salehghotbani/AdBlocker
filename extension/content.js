(() => {
  'use strict';
  const api = globalThis.browser || chrome;
  const { normalize, isAllowed, pageUrl } = AdBlockSettings;
  // Soft98 serves direct banners from its shared image/download hosts as well
  // as Kaprila placements. Keep these layout-specific rules on the main site.
  const siteSelectors = ['soft98.ir', 'www.soft98.ir'].includes(location.hostname) ? [
    '.abdd', '.abdds', '#sbds', '[id^="kaprila_soft98_ir_"]',
    '.cbdd:has(> .cbddb.abdd)'
  ] : [];
  const w3Schools = ['w3schools.com', 'www.w3schools.com'].includes(location.hostname);
  // First-party course promotions and named ad slots share the site's host.
  if (w3Schools) siteSelectors.push(
    '#right .sidesection:has(> #upperfeatureshowcaselink)',
    '#right #footer-skyscraper', '#right #stickypos', '#right #vidpos',
    '#mainLeaderboard', '#midcontentadcontainer', '#bottomads',
    '#tryitLeaderboard', '#exercise_main_leaderboard', '#sqlstickyadcontainer', '#bottomad'
  );
  const selector = [
    'ins.adsbygoogle',
    '.adbox.banner_ads.adsbox',
    '.textads.adsbox',
    '[data-ad-client][data-ad-slot]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[src*="//googleads.g.doubleclick.net/"]',
    'iframe[src*="//tpc.googlesyndication.com/"]',
    'iframe[src*="//ad.doubleclick.net/"]',
    ...siteSelectors
  ].join(',');
  const protectedContent = 'main,article,[role="main"],h1,video,audio,form';
  const hidden = new Map();
  let active = false;
  let frame = null;
  const roots = new Set();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' || record.removedNodes.length) roots.add(record.target);
      for (const node of record.addedNodes) if (node.nodeType === 1) roots.add(node);
    }
    schedule();
  });

  function safeMatch(element) {
    // Only these verified sidebar ad slots may contain advertising media.
    // Tutorial players, editors and semantic main/article/form content stay protected.
    const sidebarAd = w3Schools && element.matches('#right #vidpos, #right #stickypos, #right #footer-skyscraper') &&
      !element.closest('main,article,[role="main"],#main,#container');
    const protectedSelector = sidebarAd ? 'main,article,[role="main"],h1,form' : protectedContent;
    if (!element.matches(selector) || element.matches(protectedSelector) ||
        element.querySelector(protectedSelector)) return false;
    if (element.tagName === 'IFRAME') {
      // Match the actual destination, never an ad URL inside a benign query string.
      try {
        const host = new URL(element.src, location.href).hostname;
        if (!isAllowed(host, ['doubleclick.net', 'googlesyndication.com'])) return false;
      } catch { return false; }
    }
    // Never hide document roots.
    return !['HTML', 'BODY'].includes(element.tagName);
  }

  function restore(element, previous) {
    // Preserve subsequent site changes rather than overwriting its new style.
    if (element.style.getPropertyValue('display') === 'none' &&
        element.style.getPropertyPriority('display') === 'important') {
      if (previous.value) element.style.setProperty('display', previous.value, previous.priority);
      else element.style.removeProperty('display');
    }
    hidden.delete(element);
  }

  function hide(element) {
    if (hidden.has(element) || !safeMatch(element)) return;
    hidden.set(element, {
      value: element.style.getPropertyValue('display'),
      priority: element.style.getPropertyPriority('display')
    });
    element.style.setProperty('display', 'none', 'important');
  }

  function scan() {
    frame = null;
    if (!active) return;
    for (const [element, previous] of hidden) {
      if (!element.isConnected || !safeMatch(element)) restore(element, previous);
    }
    for (const root of roots) {
      if (!root.isConnected) continue;
      if (root.nodeType === 1) hide(root);
      root.querySelectorAll(selector).forEach(hide);
      // A removed article or changed role can make an ancestor ad box eligible
      // again, even when the changed descendant is not itself an ad placement.
      for (let ancestor = root.parentElement?.closest(selector); ancestor;
        ancestor = ancestor.parentElement?.closest(selector)) hide(ancestor);
    }
    roots.clear();
  }

  function schedule() {
    if (active && frame === null) frame = requestAnimationFrame(scan);
  }

  function apply(value) {
    const settings = normalize(value);
    const enabled = settings.enabled && !isAllowed(location.hostname, settings.allowedSites) &&
      !settings.allowedUrls.includes(pageUrl(location.href));
    if (active === enabled) return;
    active = enabled;
    if (active) {
      roots.add(document.documentElement);
      observer.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ['class', 'id', 'src', 'data-ad-client', 'data-ad-slot', 'role']
      });
      schedule();
    } else {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      roots.clear();
      for (const [element, previous] of hidden) restore(element, previous);
    }
  }

  let revision = 0;
  api.runtime.onMessage.addListener(message => {
    if (message?.type === 'settingsChanged') { revision++; apply(message.settings); }
  });
  // Fail open if the extension is updating or the worker is unavailable.
  function refresh() {
    const current = ++revision;
    api.runtime.sendMessage({ type: 'getSettings' }).then(result => {
      if (current === revision && result?.settings) apply(result.settings);
    }).catch(() => {});
  }
  addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  refresh();
})();
