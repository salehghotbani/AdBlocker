import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const settingsCode = await readFile(new URL('../extension/settings.js', import.meta.url), 'utf8');
const backgroundCode = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
async function harness(saved, savedSession = {}, options = {}) {
  let listener;
  let storage = saved;
  let dynamic = [];
  let sessionRules = [];
  let session = structuredClone(savedSession);
  const tabs = [{ id: 1, url: 'https://allowed.example' }, { id: 2, url: 'https://other.example' }];
  const handlers = {};
  const event = name => ({ addListener(fn) { handlers[name] = fn; } });
  const reloads = [];
  let enabled = [];
  let fail = false;
  let failStorage = false;
  let storageAccess;
  const broadcasts = [];
  const errors = [];
  const updateCalls = [];
  let updateGate = Promise.resolve({});
  const api = {
    storage: {
      local: { async get() { return { settings: storage }; },
        async set({ settings }) { if (failStorage) throw new Error('Storage unavailable'); storage = settings; },
        async setAccessLevel({ accessLevel }) { storageAccess = accessLevel; } },
      session: { async get() { return structuredClone(session); }, async set(value) { session = structuredClone(value); } }
    },
    declarativeNetRequest: {
      async getDynamicRules() { return dynamic; },
      async getSessionRules() { return sessionRules; },
      async updateSessionRules({ addRules }) { sessionRules = addRules; },
      async isRegexSupported() { return { isSupported: true }; },
      async updateDynamicRules({ addRules }) { dynamic = addRules; },
      async updateEnabledRulesets({ enableRulesetIds }) {
        if (fail) throw new Error('DNR unavailable');
        enabled = enableRulesetIds;
      }
    },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    alarms: { onAlarm: event('alarm') },
    notifications: { onClicked: event('notification') },
    tabs: {
      async query() { return tabs; },
      async get(id) { const tab = tabs.find(tab => tab.id === id); if (!tab) throw new Error('No tab'); return tab; },
      async reload(id) { reloads.push(id); },
      onRemoved: event('removed'),
      async sendMessage(id, message) { broadcasts.push({ id, message }); }
    },
    webNavigation: { onBeforeNavigate: event('before'), onCommitted: event('committed'), onHistoryStateUpdated: event('history') },
    runtime: { id: 'fixture', getURL: path => `chrome-extension://fixture/${path}`,
      onMessage: { addListener(fn) { listener = fn; } } }
  };
  if (options.missingApis) { delete api.alarms; delete api.notifications; }
  if (options.partialApis) { api.alarms = {}; api.notifications = {}; }
  const context = vm.createContext({ chrome: api, URL, AdBlockUpdates: {
    ALARM: 'adblocker-update-check', create() { return {
      async initialize() { await options.initialize?.(); }, async getStatus() { updateCalls.push('status'); return {}; },
      async check() { updateCalls.push('check'); return updateGate; }, async openUpdate(id) { updateCalls.push(id); }
    }; }
  }, console: {
    ...console, error: (...args) => errors.push(args)
  } });
  vm.runInContext(settingsCode, context);
  vm.runInContext(backgroundCode, context);
  const send = (message, sender = { id: 'fixture', url: 'chrome-extension://fixture/popup.html' }) =>
    new Promise(resolve => listener(message, sender, resolve));
  await send({ type: 'getSettings' }); // awaits startup reconciliation
  return { send, broadcasts, errors, tabs, reloads, updateCalls,
    blockUpdates() { let finish; updateGate = new Promise(resolve => { finish = resolve; }); return finish; },
    async emit(name, details) { handlers[name](details); await send({ type: 'getSettings' }); },
    get session() { return session; }, get sessionRules() { return sessionRules; },
    get stored() { return storage; }, get dynamic() { return dynamic; },
    get enabled() { return enabled; }, get storageAccess() { return storageAccess; },
    fail() { fail = true; }, failStorage() { failStorage = true; } };
}

test('worker startup restores persisted disabled ruleset and site exceptions', async () => {
  const h = await harness({ enabled: false, allowedSites: ['allowed.example'] });
  assert.deepEqual(Array.from(h.enabled), []);
  assert.equal(h.dynamic.length, 2);
  assert.equal(h.dynamic[0].condition.requestDomains[0], 'allowed.example');
});

test('missing optional APIs do not prevent startup, settings, pause expiry or manual update commands', async () => {
  for (const options of [{ missingApis: true }, { partialApis: true }]) {
    const h = await harness({ enabled: false, allowedSites: ['allowed.example'] }, {}, options);
    assert.deepEqual(Array.from(h.enabled), []);
    assert.equal(h.dynamic.length, 2);
    assert.equal(h.errors.length, 0);
    assert.equal((await h.send({ type: 'setEnabled', enabled: true })).settings.enabled, true);
    await h.send({ type: 'checkForUpdates' });
    assert.deepEqual(h.updateCalls, ['check']);
    await h.send({ type: 'setPause', tabId: 2, url: h.tabs[1].url, paused: true });
    await h.emit('committed', { tabId: 2, frameId: 0, url: h.tabs[1].url });
    await h.emit('before', { tabId: 2, frameId: 0, url: h.tabs[1].url });
    assert.equal(h.sessionRules.length, 0);
  }
});

test('stalled or rejected update scheduling cannot delay core startup and settings', async () => {
  for (const initialize of [() => new Promise(() => {}), async () => { throw new Error('Internal error'); }]) {
    const h = await harness({ enabled: false }, {}, { initialize });
    assert.deepEqual(Array.from(h.enabled), []);
    assert.equal((await h.send({ type: 'setEnabled', enabled: true })).settings.enabled, true);
    assert.equal(h.errors.length, 0);
  }
});
test('site changes persist, broadcast and apply to nested frames of excluded top-level site', async () => {
  const h = await harness();
  const result = await h.send({ type: 'setSite', host: 'allowed.example', allowed: true });
  assert.equal(result.settings.allowedSites[0], 'allowed.example');
  assert.equal(h.dynamic[0].action.type, 'allowAllRequests');
  assert.equal(h.broadcasts.find(item => item.id === 1).message.settings.enabled, false);
  const frame = await h.send({ type: 'getSettings' }, {
    id: 'fixture', url: 'https://third-party.example/frame', tab: { url: 'https://allowed.example' }
  });
  assert.equal(frame.settings.enabled, false);
  await h.send({ type: 'setSite', host: 'news.allowed.example', allowed: false });
  assert.equal(h.dynamic.length, 0);
});

test('permanent URL exception applies to exact top-level URL and its child frames only', async () => {
  const h = await harness();
  const url = 'https://allowed.example/story?q=1';
  h.tabs[0].url = url;
  await h.send({ type: 'setUrl', url: url + '#intro', allowed: true });
  assert.equal(h.stored.allowedUrls[0], url);
  assert.equal(h.dynamic.length, 1);
  const frame = await h.send({ type: 'getSettings' }, { id: 'fixture', tab: h.tabs[0] });
  assert.equal(frame.settings.enabled, false);
  h.tabs[0].url = 'https://allowed.example/another';
  assert.equal((await h.send({ type: 'getSettings' }, { id: 'fixture', tab: h.tabs[0] })).settings.enabled, true);
  await h.send({ type: 'clearUrls' });
  assert.equal(h.dynamic.length, 0);
});

test('one-time pause reloads once, expires on next reload, and is isolated to its tab', async () => {
  const h = await harness();
  const url = h.tabs[0].url;
  await h.send({ type: 'setPause', tabId: 1, url, paused: true });
  assert.deepEqual(h.reloads, [1]);
  assert.equal(h.stored, undefined, 'temporary URL is never persisted in local settings');
  assert.equal(h.sessionRules[0].condition.tabIds[0], 1);
  assert.equal((await h.send({ type: 'getSettings', tabId: 1 })).paused, true);
  assert.equal((await h.send({ type: 'getSettings', tabId: 2 })).paused, false);
  await h.emit('before', { tabId: 1, frameId: 0, url });
  await h.emit('committed', { tabId: 1, frameId: 0, url });
  assert.equal(h.session.pausedTabs[1].awaitingReload, false);
  await h.emit('before', { tabId: 1, frameId: 1, url: 'https://frame.example/' });
  assert.equal(h.sessionRules.length, 1, 'iframe navigation does not expire the top-level pause');
  await h.emit('before', { tabId: 1, frameId: 0, url });
  assert.equal(h.sessionRules.length, 0);
  assert.equal((await h.send({ type: 'getSettings', tabId: 1 })).paused, false);
});

test('temporary state survives worker suspension, expires on SPA route change or tab close', async () => {
  const pausedTabs = { 1: { url: 'https://allowed.example/', awaitingReload: false },
    999: { url: 'https://closed.example/', awaitingReload: false } };
  const h = await harness(undefined, { pausedTabs });
  assert.equal(h.sessionRules.length, 1, 'stale tabs are discarded');
  h.tabs[0].url = 'https://allowed.example/new';
  await h.emit('history', { tabId: 1, frameId: 0, url: h.tabs[0].url });
  assert.equal(h.sessionRules.length, 0);
  await h.send({ type: 'setPause', tabId: 1, url: h.tabs[0].url, paused: true });
  await h.emit('removed', 1);
  assert.equal(h.sessionRules.length, 0);
});

test('stale popup and content scripts cannot pause another page or save URL exceptions', async () => {
  const h = await harness();
  assert.ok((await h.send({ type: 'setPause', tabId: 1, url: 'https://stale.example', paused: true })).error);
  assert.equal(h.sessionRules.length, 0);
  const sender = { id: 'fixture', url: 'https://site.example', tab: h.tabs[0] };
  for (const message of [{ type: 'setPause', tabId: 1, url: h.tabs[0].url, paused: true },
    { type: 'setUrl', url: h.tabs[0].url, allowed: true }]) assert.ok((await h.send(message, sender)).error);
});
test('content scripts cannot mutate settings', async () => {
  const h = await harness();
  const result = await h.send({ type: 'setEnabled', enabled: false },
    { id: 'fixture', url: 'https://website.example', tab: { id: 1 } });
  assert.ok(result.error);
  assert.equal(h.stored, undefined);
});
test('concurrent commands are serialized without losing site exceptions', async () => {
  const h = await harness();
  await Promise.all(['one.example', 'two.example'].map(host => h.send({ type: 'setSite', host, allowed: true })));
  assert.deepEqual(Array.from(h.stored.allowedSites), ['one.example', 'two.example']);
});
test('network API failure is returned and is not persisted as success', async () => {
  const h = await harness();
  h.fail();
  const result = await h.send({ type: 'setEnabled', enabled: false });
  assert.match(result.error, /DNR unavailable/);
  assert.equal(h.stored, undefined);
  assert.equal(h.errors.length, 2, 'persistent API failure and failed rollback are both logged');
  assert.match(h.errors[0].join(' '), /could not restore/);
});

test('page messages and broadcasts disclose only effective protection, not private exceptions', async () => {
  const secretUrl = 'https://private.example/report?token=private-value';
  const h = await harness({ enabled: true, allowedSites: ['private.example'], allowedUrls: [secretUrl] });
  assert.equal(h.storageAccess, 'TRUSTED_CONTEXTS');
  const response = await h.send({ type: 'getSettings' }, { id: 'fixture', url: h.tabs[1].url, tab: h.tabs[1] });
  assert.deepEqual(JSON.parse(JSON.stringify(response.settings)), { enabled: true });
  await h.send({ type: 'setSite', host: 'allowed.example', allowed: true });
  for (const item of h.broadcasts) {
    assert.deepEqual(Object.keys(item.message.settings), ['enabled']);
    assert.equal(JSON.stringify(item).includes('private-value'), false);
  }
  assert.equal((await h.send({ type: 'getSettings' })).settings.allowedUrls[0], secretUrl,
    'trusted popup retains access to exception management');
});

test('a failed settings save restores the previous network policy without broadcasting success', async () => {
  const h = await harness();
  h.failStorage();
  const response = await h.send({ type: 'setSite', host: 'allowed.example', allowed: true });
  assert.match(response.error, /Storage unavailable/);
  assert.equal(h.stored, undefined);
  assert.equal(h.dynamic.length, 0, 'failed exception is rolled back');
  assert.deepEqual(Array.from(h.enabled), ['ads']);
  assert.equal(h.broadcasts.length, 0);
});

test('a foreign extension or forged page URL cannot issue privileged commands', async () => {
  const h = await harness();
  for (const sender of [
    { id: 'foreign', url: 'chrome-extension://fixture/popup.html' },
    { id: 'fixture', url: 'https://site.example/?next=chrome-extension://fixture/popup.html' }
  ]) assert.ok((await h.send({ type: 'setEnabled', enabled: false }, sender)).error);
  assert.equal(h.stored, undefined);
});

test('only extension pages may trigger update checks or read update metadata', async () => {
  const h = await harness();
  for (const type of ['checkForUpdates', 'getUpdateStatus']) {
    const result = await h.send({ type }, { id: 'fixture', url: 'https://site.example', tab: h.tabs[0] });
    assert.ok(result.error);
  }
  assert.equal(h.updateCalls.length, 0);
  await h.send({ type: 'checkForUpdates' });
  await h.send({ type: 'getUpdateStatus' });
  assert.deepEqual(h.updateCalls, ['check', 'status']);
  await h.emit('alarm', { name: 'unrelated' });
  assert.deepEqual(h.updateCalls, ['check', 'status']);
  await h.emit('alarm', { name: 'adblocker-update-check' });
  assert.deepEqual(h.updateCalls, ['check', 'status', 'check']);
});

test('an in-flight update request does not block a protection command', async () => {
  const h = await harness();
  const finish = h.blockUpdates();
  const update = h.send({ type: 'checkForUpdates' });
  try {
    const change = await Promise.race([
      h.send({ type: 'setEnabled', enabled: false }),
      new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Update blocked protection')), 1000); timer.unref(); })
    ]);
    assert.equal(change.settings.enabled, false);
  } finally { finish({}); await update; }
});
