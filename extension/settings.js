(function (root) {
  'use strict';
  const DEFAULTS = { enabled: true, allowedSites: [], allowedUrls: [] };
  function pageUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
      url.hash = '';
      return url.href;
    } catch { return null; }
  }
  function urlRule(url, id) {
    return { id, priority: 10000, action: { type: 'allowAllRequests' }, condition: {
      regexFilter: '^' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$',
      isUrlFilterCaseSensitive: true, resourceTypes: ['main_frame']
    } };
  }
  function hostname(value) {
    try {
      const url = new URL(value.includes('://') ? value : `https://${value}`);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      return url.hostname.toLowerCase().replace(/\.$/, '') || null;
    } catch { return null; }
  }
  function normalize(value = {}) {
    if (!value || typeof value !== 'object') value = {};
    return {
      enabled: value.enabled !== false,
      allowedSites: [...new Set((Array.isArray(value.allowedSites) ? value.allowedSites : [])
        .filter(site => typeof site === 'string').map(hostname).filter(Boolean))].sort(),
      allowedUrls: [...new Set((Array.isArray(value.allowedUrls) ? value.allowedUrls : [])
        .map(pageUrl).filter(Boolean))].sort()
    };
  }
  function isAllowed(host, sites) {
    return sites.some(site => host === site || host.endsWith(`.${site}`));
  }
  // Whole-frame allowance preserves third-party resources on an excluded site.
  // An initiator allowance also covers requests made by its service workers.
  function allowRules(sites, urls = []) {
    const rules = sites.length ? [
      { id: 1, priority: 10000, action: { type: 'allowAllRequests' }, condition: {
        requestDomains: sites, resourceTypes: ['main_frame']
      } },
      { id: 2, priority: 10000, action: { type: 'allow' }, condition: {
        initiatorDomains: sites
      } }
    ] : [];
    return rules.concat(urls.map((url, index) => urlRule(url, index + 100)));
  }
  root.AdBlockSettings = { DEFAULTS, hostname, normalize, isAllowed, allowRules, pageUrl, urlRule };
})(globalThis);
