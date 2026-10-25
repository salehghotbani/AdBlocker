/* Chromium service worker / Firefox background script. */
if (typeof importScripts === 'function') importScripts('settings.js');
const api = globalThis.browser || chrome;
const { normalize, hostname, isAllowed, allowRules } = AdBlockSettings;
let pending = Promise.resolve();

async function readSettings() {
  return normalize((await api.storage.local.get('settings')).settings);
}

async function sync(settings) {
  const old = await api.declarativeNetRequest.getDynamicRules();
  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(rule => rule.id),
    addRules: allowRules(settings.allowedSites)
  });
  await api.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: settings.enabled ? ['ads'] : [],
    disableRulesetIds: settings.enabled ? [] : ['ads']
  });
  await api.action.setBadgeText({ text: settings.enabled ? '' : 'OFF' });
  await api.action.setBadgeBackgroundColor({ color: '#64748b' });
}

function enqueue(task) {
  const result = pending.then(task);
  pending = result.catch(error => console.error('AdBlocker:', error));
  return result;
}

async function broadcast(settings) {
  const tabs = await api.tabs.query({});
  await Promise.all(tabs.filter(tab => tab.id !== undefined).map(tab =>
    api.tabs.sendMessage(tab.id, { type: 'settingsChanged', settings: forTab(settings, tab) }).catch(() => {})
  ));
}

function forTab(settings, tab) {
  const host = tab?.url ? hostname(tab.url) : null;
  return host && isAllowed(host, settings.allowedSites) ? { ...settings, enabled: false } : settings;
}

async function handle(message, sender) {
  const settings = await readSettings();
  if (message.type === 'getSettings') return { settings: forTab(settings, sender.tab) };
  let next;
  if (message.type === 'setEnabled' && typeof message.enabled === 'boolean') {
    next = { ...settings, enabled: message.enabled };
  } else if (message.type === 'setSite' && typeof message.host === 'string'
      && typeof message.allowed === 'boolean') {
    const host = hostname(message.host);
    if (!host) throw new Error('نشانی سایت معتبر نیست.');
    // Re-enabling a child of an excluded parent removes that parent exception.
    const sites = message.allowed ? [...settings.allowedSites, host] :
      settings.allowedSites.filter(site => !isAllowed(host, [site]));
    next = normalize({ ...settings, allowedSites: sites });
  } else if (message.type === 'clearSites') {
    next = { ...settings, allowedSites: [] };
  } else {
    throw new Error('درخواست نامعتبر است.');
  }
  // Apply network policy first; a failed API call must be visible to the UI.
  await sync(next);
  await api.storage.local.set({ settings: next });
  await broadcast(next);
  return { settings: next };
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !['getSettings', 'setEnabled', 'setSite', 'clearSites'].includes(message.type)) return;
  // Content scripts may read settings, but only extension pages may change them.
  const extensionPage = sender.url?.startsWith(api.runtime.getURL(''));
  if (sender.id !== api.runtime.id || (message.type !== 'getSettings' && !extensionPage)) {
    sendResponse({ error: 'دسترسی مجاز نیست.' });
    return false;
  }
  enqueue(() => handle(message, sender)).then(sendResponse, error => sendResponse({ error: error.message }));
  return true;
});

// Reconcile persisted state every time the worker starts, including browser restart.
enqueue(async () => sync(await readSettings()));
