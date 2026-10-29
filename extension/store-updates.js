// Update delivery belongs to the browser; this module never fetches releases.
(() => {
  'use strict';
  const names = { chrome: 'Chrome Web Store', edge: 'Microsoft Edge Add-ons', firefox: 'Firefox Add-ons' };
  function create(api) {
    const channel = globalThis.AdBlockDistribution?.channel;
    if (!names[channel]) throw new Error('Invalid store channel');
    const status = () => ({ managedByStore: true, storeName: names[channel], currentVersion: api.runtime.getManifest().version,
      available: false, automaticChecks: true, notificationsAvailable: true, openHelp: channel === 'firefox' });
    async function check() {
      const url = channel === 'firefox' ? api.runtime.getURL('update-help.html') :
        channel === 'edge' ? `edge://extensions/?id=${encodeURIComponent(api.runtime.id)}` : `chrome://extensions/?id=${encodeURIComponent(api.runtime.id)}`;
      await api.tabs.create({ url });
      return status();
    }
    return { initialize: async () => {}, getStatus: async () => status(), check, openUpdate: async () => {} };
  }
  globalThis.AdBlockUpdates = Object.freeze({ create, releaseUrl: () => null });
})();
