import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const settingsCode = await readFile(new URL('../extension/settings.js', import.meta.url), 'utf8');
const backgroundCode = await readFile(new URL('../extension/background.js', import.meta.url), 'utf8');
async function harness(saved) {
  let listener;
  let storage = saved;
  let dynamic = [];
  let enabled = [];
  let fail = false;
  const broadcasts = [];
  const errors = [];
  const api = {
    storage: { local: { async get() { return { settings: storage }; }, async set({ settings }) { storage = settings; } } },
    declarativeNetRequest: {
      async getDynamicRules() { return dynamic; },
      async updateDynamicRules({ addRules }) { dynamic = addRules; },
      async updateEnabledRulesets({ enableRulesetIds }) {
        if (fail) throw new Error('DNR unavailable');
        enabled = enableRulesetIds;
      }
    },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    tabs: {
      async query() { return [{ id: 1, url: 'https://allowed.example' }]; },
      async sendMessage(id, message) { broadcasts.push({ id, message }); }
    },
    runtime: { id: 'fixture', getURL: path => `chrome-extension://fixture/${path}`,
      onMessage: { addListener(fn) { listener = fn; } } }
  };
  const context = vm.createContext({ chrome: api, URL, console: {
    ...console, error: (...args) => errors.push(args)
  } });
  vm.runInContext(settingsCode, context);
  vm.runInContext(backgroundCode, context);
  const send = (message, sender = { id: 'fixture', url: 'chrome-extension://fixture/popup.html' }) =>
    new Promise(resolve => listener(message, sender, resolve));
  await send({ type: 'getSettings' }); // awaits startup reconciliation
  return { send, broadcasts, errors, get stored() { return storage; }, get dynamic() { return dynamic; },
    get enabled() { return enabled; }, fail() { fail = true; } };
}

test('worker startup restores persisted disabled ruleset and site exceptions', async () => {
  const h = await harness({ enabled: false, allowedSites: ['allowed.example'] });
  assert.deepEqual(Array.from(h.enabled), []);
  assert.equal(h.dynamic.length, 2);
  assert.equal(h.dynamic[0].condition.requestDomains[0], 'allowed.example');
});
test('site changes persist, broadcast and apply to nested frames of excluded top-level site', async () => {
  const h = await harness();
  const result = await h.send({ type: 'setSite', host: 'allowed.example', allowed: true });
  assert.equal(result.settings.allowedSites[0], 'allowed.example');
  assert.equal(h.dynamic[0].action.type, 'allowAllRequests');
  assert.equal(h.broadcasts.at(-1).message.settings.enabled, false);
  const frame = await h.send({ type: 'getSettings' }, {
    id: 'fixture', url: 'https://third-party.example/frame', tab: { url: 'https://allowed.example' }
  });
  assert.equal(frame.settings.enabled, false);
  await h.send({ type: 'setSite', host: 'news.allowed.example', allowed: false });
  assert.equal(h.dynamic.length, 0);
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
  assert.equal(h.errors.length, 1, 'simulated API failure is logged');
});
