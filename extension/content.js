(() => {
  'use strict';
  const api = globalThis.browser || chrome;
  const { normalize, isAllowed } = AdBlockSettings;
  const selector = [
    'ins.adsbygoogle',
    '[data-ad-client][data-ad-slot]',
    'iframe[id^="google_ads_iframe"]',
    'iframe[src*="//googleads.g.doubleclick.net/"]',
    'iframe[src*="//tpc.googlesyndication.com/"]',
    'iframe[src*="//ad.doubleclick.net/"]'
  ].join(',');
  const protectedContent = 'main,article,[role="main"],h1,video,audio,form';
  const hidden = new Map();
  let active = false;
  let frame = null;
  const roots = new Set();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') roots.add(record.target);
      for (const node of record.addedNodes) if (node.nodeType === 1) roots.add(node);
    }
    schedule();
  });

  function safeMatch(element) {
    if (!element.matches(selector) || element.matches(protectedContent) ||
        element.querySelector(protectedContent)) return false;
    if (element.tagName === 'IFRAME') {
      // Match the actual destination, never an ad URL inside a benign query string.
      try {
        const host = new URL(element.src, location.href).hostname;
        if (!isAllowed(host, ['doubleclick.net', 'googlesyndication.com'])) return false;
      } catch { return false; }
    }
    // Never hide a container that wraps the main document or player.
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
    }
    roots.clear();
  }

  function schedule() {
    if (active && frame === null) frame = requestAnimationFrame(scan);
  }

  function apply(value) {
    const settings = normalize(value);
    const enabled = settings.enabled && !isAllowed(location.hostname, settings.allowedSites);
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

  api.runtime.onMessage.addListener(message => {
    if (message?.type === 'settingsChanged') apply(message.settings);
  });
  // Fail open if the extension is updating or the worker is unavailable.
  api.runtime.sendMessage({ type: 'getSettings' }).then(result => {
    if (result?.settings) apply(result.settings);
  }).catch(() => {});
})();
