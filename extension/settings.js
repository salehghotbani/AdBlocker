(function (root) {
  'use strict';
  const DEFAULTS = { enabled: true, allowedSites: [] };
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
        .filter(site => typeof site === 'string').map(hostname).filter(Boolean))].sort()
    };
  }
  function isAllowed(host, sites) {
    return sites.some(site => host === site || host.endsWith(`.${site}`));
  }
  // Whole-frame allowance preserves third-party resources on an excluded site.
  // An initiator allowance also covers requests made by its service workers.
  function allowRules(sites) {
    return sites.length ? [
      { id: 1, priority: 10000, action: { type: 'allowAllRequests' }, condition: {
        requestDomains: sites, resourceTypes: ['main_frame']
      } },
      { id: 2, priority: 10000, action: { type: 'allow' }, condition: {
        initiatorDomains: sites
      } }
    ] : [];
  }
  root.AdBlockSettings = { DEFAULTS, hostname, normalize, isAllowed, allowRules };
})(globalThis);
