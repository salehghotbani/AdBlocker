/* Chromium service worker / Firefox background script. */
if (typeof importScripts === 'function') importScripts('settings.js', 'updates.js');
const api = globalThis.browser || chrome;
const { normalize, hostname, isAllowed, allowRules, pageUrl, urlRule } = AdBlockSettings;
let pending = Promise.resolve();
let pausedTabs = {};
const updates = AdBlockUpdates.create(api);

async function readSettings() {
  return normalize((await api.storage.local.get('settings')).settings);
}

async function sync(settings) {
  const old = await api.declarativeNetRequest.getDynamicRules();
  await api.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(rule => rule.id),
    addRules: allowRules(settings.allowedSites, settings.allowedUrls)
  });
  await api.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: settings.enabled ? ['ads'] : [],
    disableRulesetIds: settings.enabled ? [] : ['ads']
  });
  await api.action.setBadgeText({ text: settings.enabled ? '' : 'OFF' });
  await api.action.setBadgeBackgroundColor({ color: '#64748b' });
}

async function syncSession() {
  const old = await api.declarativeNetRequest.getSessionRules();
  const rules = Object.entries(pausedTabs).map(([tabId, pause], index) => {
    const rule = urlRule(pause.url, index + 1);
    rule.condition.tabIds = [Number(tabId)];
    return rule;
  });
  const unchanged = old.length === rules.length && old.every(rule => {
    const next = rules.find(candidate => candidate.id === rule.id);
    return next && rule.action.type === next.action.type && rule.priority === next.priority &&
      rule.condition.regexFilter === next.condition.regexFilter &&
      rule.condition.tabIds?.[0] === next.condition.tabIds[0] &&
      rule.condition.tabIds.length === 1 && rule.condition.isUrlFilterCaseSensitive === true &&
      rule.condition.resourceTypes?.length === 1 && rule.condition.resourceTypes[0] === 'main_frame';
  });
  if (!unchanged) await api.declarativeNetRequest.updateSessionRules({ removeRuleIds: old.map(rule => rule.id), addRules: rules });
  await api.storage.session.set({ pausedTabs });
}

async function validateUrl(url) {
  if (!url || url.length > 1500) throw new Error('The URL must use HTTP/HTTPS, contain no credentials, and be at most 1,500 characters.');
  const rule = urlRule(url, 1);
  const result = await api.declarativeNetRequest.isRegexSupported({
    regex: rule.condition.regexFilter, isCaseSensitive: true
  });
  if (!result.isSupported) throw new Error('This URL is not supported by the browser exact-match rules.');
}

function enqueue(task) {
  const result = pending.then(task);
  pending = result.catch(error => console.error('AdBlocker:', error));
  return result;
}

async function broadcast(settings) {
  const tabs = await api.tabs.query({});
  await Promise.all(tabs.filter(tab => tab.id !== undefined).map(tab =>
    api.tabs.sendMessage(tab.id, { type: 'settingsChanged', settings: forContent(settings, tab) }).catch(() => {})
  ));
}

// Page scripts need only their effective state, never another site's exceptions
// or saved URLs, which may include private query parameters.
function forContent(settings, tab) {
  return { enabled: forTab(settings, tab).enabled };
}

function forTab(settings, tab) {
  const host = tab?.url ? hostname(tab.url) : null;
  const url = pageUrl(tab?.url);
  const paused = url && pausedTabs[tab?.id]?.url === url;
  return (host && isAllowed(host, settings.allowedSites)) ||
    (url && settings.allowedUrls.includes(url)) || paused ? { ...settings, enabled: false } : settings;
}

async function handle(message, sender) {
  const settings = await readSettings();
  if (message.type === 'getSettings') {
    const fromPage = sender.url?.startsWith(api.runtime.getURL(''));
    const tab = fromPage ? (Number.isInteger(message.tabId) ? await api.tabs.get(message.tabId) : null) : sender.tab;
    return { settings: fromPage ? settings : forContent(settings, tab),
      paused: Boolean(tab && pausedTabs[tab.id]?.url === pageUrl(tab.url)) };
  }
  if (message.type === 'setPause' && Number.isInteger(message.tabId) && typeof message.paused === 'boolean') {
    const tab = await api.tabs.get(message.tabId);
    const url = pageUrl(tab.url);
    if (!url || url !== pageUrl(message.url)) throw new Error('The page has changed. Reopen the extension popup.');
    await validateUrl(url);
    const previous = { ...pausedTabs };
    if (message.paused) pausedTabs[tab.id] = { url, awaitingReload: true };
    else delete pausedTabs[tab.id];
    try {
      await syncSession();
      await broadcast(settings);
      // Reload exactly once to recover resources that were already blocked.
      await api.tabs.reload(tab.id);
    } catch (error) {
      pausedTabs = previous;
      await syncSession();
      await broadcast(settings);
      throw error;
    }
    return { settings, paused: message.paused };
  }
  let next;
  if (message.type === 'setEnabled' && typeof message.enabled === 'boolean') {
    next = { ...settings, enabled: message.enabled };
  } else if (message.type === 'setSite' && typeof message.host === 'string'
      && typeof message.allowed === 'boolean') {
    const host = hostname(message.host);
    if (!host) throw new Error('The site address is invalid.');
    // Re-enabling a child of an excluded parent removes that parent exception.
    const sites = message.allowed ? [...settings.allowedSites, host] :
      settings.allowedSites.filter(site => !isAllowed(host, [site]));
    next = normalize({ ...settings, allowedSites: sites });
  } else if (message.type === 'setUrl' && typeof message.allowed === 'boolean') {
    const url = pageUrl(message.url);
    await validateUrl(url);
    const urls = settings.allowedUrls.filter(value => value !== url);
    if (message.allowed) urls.push(url);
    if (urls.length > 200) throw new Error('You can save up to 200 URL exceptions.');
    next = normalize({ ...settings, allowedUrls: urls });
  } else if (message.type === 'clearUrls') {
    next = { ...settings, allowedUrls: [] };
  } else if (message.type === 'clearSites') {
    next = { ...settings, allowedSites: [] };
  } else {
    throw new Error('Invalid request.');
  }
  // Apply network policy first; a failed API call must be visible to the UI.
  try {
    await sync(next);
    await api.storage.local.set({ settings: next });
  } catch (error) {
    // Undo a partial network update or failed settings write before reporting it.
    try { await sync(settings); }
    catch { console.error('AdBlocker: could not restore the previous network policy'); }
    throw error;
  }
  await broadcast(next);
  return { settings: next };
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !['getSettings', 'setEnabled', 'setSite', 'clearSites', 'setUrl', 'clearUrls', 'setPause',
    'getUpdateStatus', 'checkForUpdates'].includes(message.type)) return;
  // Content scripts may read settings, but only extension pages may change them.
  const extensionPage = sender.url?.startsWith(api.runtime.getURL(''));
  if (sender.id !== api.runtime.id || (message.type !== 'getSettings' && !extensionPage)) {
    sendResponse({ error: 'Access denied.' });
    return false;
  }
  const operation = message.type === 'getUpdateStatus' ? updates.getStatus().then(update => ({ update })) :
    message.type === 'checkForUpdates' ? updates.check().then(update => ({ update })) : enqueue(() => handle(message, sender));
  operation.then(sendResponse, error => sendResponse({ error: error.message }));
  return true;
});

if (typeof api.alarms?.onAlarm?.addListener === 'function') {
  api.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === AdBlockUpdates.ALARM) updates.check().catch(() => {});
  });
}
if (typeof api.notifications?.onClicked?.addListener === 'function') {
  api.notifications.onClicked.addListener(id => { updates.openUpdate(id).catch(() => {}); });
}

// Navigation expiry is queued with commands, so a worker restart cannot lose a pause.
async function expire(details, committed = false) {
  if (details.frameId !== 0 || !pausedTabs[details.tabId]) return;
  const pause = pausedTabs[details.tabId];
  if (pause.awaitingReload && pageUrl(details.url) === pause.url) {
    if (committed) {
      pause.awaitingReload = false;
      await api.storage.session.set({ pausedTabs });
    }
    return;
  }
  delete pausedTabs[details.tabId];
  await syncSession();
  await broadcast(await readSettings());
}
api.webNavigation.onBeforeNavigate.addListener(details => { enqueue(() => expire(details)); });
api.webNavigation.onCommitted.addListener(details => { enqueue(() => expire(details, true)); });
api.webNavigation.onHistoryStateUpdated.addListener(details => {
  enqueue(async () => {
    if (pausedTabs[details.tabId]?.url !== pageUrl(details.url)) await expire(details);
    await broadcast(await readSettings());
  });
});
api.tabs.onRemoved.addListener(tabId => { enqueue(async () => {
  if (pausedTabs[tabId]) { delete pausedTabs[tabId]; await syncSession(); }
}); });

enqueue(async () => {
  if (api.storage.local.setAccessLevel) {
    await api.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  }
  const saved = (await api.storage.session.get('pausedTabs')).pausedTabs || {};
  for (const tab of await api.tabs.query({})) {
    const pause = saved[tab.id];
    if (pause && pageUrl(tab.url) && pause.url === pageUrl(tab.url)) {
      if (tab.status === 'complete') pause.awaitingReload = false;
      pausedTabs[tab.id] = pause;
    }
  }
  await syncSession();
  await sync(await readSettings());
  // Optional update scheduling must not hold up settings or pause restoration.
  updates.initialize().catch(() => {});
});
